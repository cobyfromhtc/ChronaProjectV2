import { getPb } from './pb'
import { RecordModel } from 'pocketbase'

// =============================================================
// Prisma-compatible database adapter backed by Pocketbase (SQLite)
// =============================================================
//
// This module replaces the original `@prisma/client`-based `db` export.
// It exposes the same surface area the Chrona API routes already use
// (`db.user.findUnique`, `db.persona.findMany`, `db.$transaction`, etc.)
// and translates those calls into Pocketbase admin REST requests.
//
// **Scope**: covers the patterns actually exercised by the Chrona codebase
// (equality/NOT/IN/gt/lt/AND/OR/contains where-clauses, include-relations,
// select-field subsets, orderBy, pagination, count, create, update,
// updateMany, delete, $transaction, BigInt-as-string serialization).
//
// **Limitations** (documented in the schema migration's worklog entry):
//   * Compound @@unique constraints are NOT enforced by Pocketbase —
//     we query-before-insert/update for the affected collections.
//   * `onDelete: SetNull` (only on storylineMessages.replyToId) must be
//     handled here: null the FK before deleting the parent.
//   * Default values are injected here, not at the DB layer.
//   * `users` is an auth collection: create needs `password`+`passwordConfirm`;
//     `email`, `username`, `password`, `verified`, `tokenKey` are built-in.
//
// **Type strategy**: We return `any` for records to avoid friction with
// Prisma-generated types. Existing call sites treat records as loosely
// typed objects, so this is safe.
// =============================================================

// ---------- Where clause translation ----------

type WhereValue = string | number | boolean | Date | null | undefined | object
type WhereCondition =
  | { not?: WhereValue; in?: WhereValue[]; notIn?: WhereValue[]; contains?: string; startsWith?: string; endsWith?: string; gt?: WhereValue; gte?: WhereValue; lt?: WhereValue; lte?: WhereValue; equals?: WhereValue; isSet?: boolean }
  | WhereValue
type WhereInput = { [field: string]: WhereCondition } & { AND?: WhereInput[]; OR?: WhereInput[]; NOT?: WhereInput[] }

function pbEscape(value: WhereValue): string {
  if (value === null || value === undefined) {
    return '""'
  }
  if (value instanceof Date) {
    // Pocketbase stores dates as ISO 8601 with timezone; use UTC
    return `"${value.toISOString().replace('T', ' ').replace('Z', '')}"`
  }
  if (typeof value === 'string') {
    // Escape single quotes/backslashes for the PB filter string
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    return `"${escaped}"`
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  // number
  return String(value)
}

function translateWhereClause(where: WhereInput | undefined): string {
  if (!where || Object.keys(where).length === 0) return ''
  const parts: string[] = []

  // Map Prisma field names to PB-managed field names for filter operands.
  // (Same mapping as translateOrderBy — PB stores createdAt as `created` etc.)
  const mapField = (field: string): string => {
    if (field === 'createdAt') return 'created'
    if (field === 'updatedAt') return 'updated'
    if (field === 'joinedAt') return 'created' // storylineMembers
    return field
  }

  for (const [rawField, cond] of Object.entries(where)) {
    const field = mapField(rawField)
    if (rawField === 'AND' || rawField === 'OR' || rawField === 'NOT') {
      const subClauses = (cond as WhereInput[]) || []
      const subParts = subClauses.map((s) => translateWhereClause(s)).filter(Boolean)
      if (subParts.length === 0) continue
      if (rawField === 'AND') parts.push(`(${subParts.join(' && ')})`)
      if (rawField === 'OR') parts.push(`(${subParts.join(' || ')})`)
      if (rawField === 'NOT') parts.push(`!(${subParts.join(' && ')})`)
      continue
    }

    // Prisma compound unique constraint names (e.g. `senderId_receiverId`)
    // — flatten into individual field equality conditions.
    if (rawField.includes('_') && cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      const c = cond as Record<string, unknown>
      const subParts: string[] = []
      for (const [subField, subVal] of Object.entries(c)) {
        const mappedSub = mapField(subField)
        subParts.push(`${mappedSub} = ${pbEscape(subVal as WhereValue)}`)
      }
      if (subParts.length) parts.push(`(${subParts.join(' && ')})`)
      continue
    }

    if (cond === null || cond === undefined) {
      parts.push(`${field} = ""`)
      continue
    }
    if (typeof cond !== 'object' || cond instanceof Date) {
      // Bare equality (string/number/boolean/Date)
      parts.push(`${field} = ${pbEscape(cond as WhereValue)}`)
      continue
    }

    // Object condition: { not, in, contains, gt, ... }
    const c = cond as Record<string, unknown>
    if ('equals' in c) {
      parts.push(`${field} = ${pbEscape(c.equals as WhereValue)}`)
    }
    if ('not' in c) {
      if (c.not === null || c.not === undefined) {
        parts.push(`${field} != ""`)
      } else {
        parts.push(`${field} != ${pbEscape(c.not as WhereValue)}`)
      }
    }
    if ('in' in c && Array.isArray(c.in)) {
      const orParts = c.in.map((v) => `${field} = ${pbEscape(v as WhereValue)}`)
      if (orParts.length) parts.push(`(${orParts.join(' || ')})`)
    }
    if ('notIn' in c && Array.isArray(c.notIn)) {
      const andParts = c.notIn.map((v) => `${field} != ${pbEscape(v as WhereValue)}`)
      if (andParts.length) parts.push(`(${andParts.join(' && ')})`)
    }
    if ('contains' in c && typeof c.contains === 'string') {
      const escaped = c.contains.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '\\%').replace(/_/g, '\\_')
      parts.push(`${field} ~ "%${escaped}%"`)
    }
    if ('startsWith' in c && typeof c.startsWith === 'string') {
      const escaped = c.startsWith.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '\\%').replace(/_/g, '\\_')
      parts.push(`${field} ~ "${escaped}%"`)
    }
    if ('endsWith' in c && typeof c.endsWith === 'string') {
      const escaped = c.endsWith.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '\\%').replace(/_/g, '\\_')
      parts.push(`${field} ~ "%${escaped}"`)
    }
    if ('gt' in c) parts.push(`${field} > ${pbEscape(c.gt as WhereValue)}`)
    if ('gte' in c) parts.push(`${field} >= ${pbEscape(c.gte as WhereValue)}`)
    if ('lt' in c) parts.push(`${field} < ${pbEscape(c.lt as WhereValue)}`)
    if ('lte' in c) parts.push(`${field} <= ${pbEscape(c.lte as WhereValue)}`)
    if ('isSet' in c) {
      parts.push(c.isSet ? `${field} != ""` : `${field} = ""`)
    }
  }

  return parts.join(' && ')
}

// ---------- orderBy translation ----------

type OrderByInput = Record<string, 'asc' | 'desc'>
type OrderByArray = Array<OrderByInput>
function translateOrderBy(orderBy: OrderByInput | OrderByArray | undefined): string {
  if (!orderBy) return ''
  // Support both shapes Prisma accepts:
  //   orderBy: { field: 'asc' }                              // single
  //   orderBy: [{ field1: 'asc' }, { field2: 'desc' }]        // array of single-key objects
  const arr: OrderByInput[] = Array.isArray(orderBy) ? orderBy : [orderBy]
  const parts: string[] = []
  for (const obj of arr) {
    for (const [field, dir] of Object.entries(obj)) {
      // Map Prisma field names to PB-managed field names for sort:
      // createdAt -> created, updatedAt -> updated, joinedAt -> created (storylineMembers)
      let pbField = field
      if (field === 'createdAt' || field === 'joinedAt') pbField = 'created'
      else if (field === 'updatedAt') pbField = 'updated'
      else if (field === 'lastMessageAt') pbField = 'updated'
      // Pocketbase sort syntax: "field" or "-field" for descending
      parts.push(dir === 'desc' ? `-${pbField}` : pbField)
    }
  }
  return parts.join(',')
}

// ---------- include / select translation ----------

type IncludeInput = Record<string, boolean | object>
type SelectInput = Record<string, boolean>

function pickFields(record: any, select: SelectInput | undefined): any {
  if (!select) return record
  const out: any = { id: record.id, created: record.created, updated: record.updated }
  for (const [field, include] of Object.entries(select)) {
    if (!include) continue
    if (field === '_count') {
      // Prisma's _count virtual field — populated by normalizeRecord from expand.
      // Pass it through as-is (it's already on the record if any back-relations expanded).
      if (record._count) out._count = record._count
    } else {
      out[field] = record[field]
    }
  }
  return out
}

// ---------- default values per collection ----------

const DEFAULTS: Record<string, Record<string, () => any>> = {
  users: () => ({
    role: 'member',
    isOfficial: false,
    isBanned: false,
    isSuspended: false,
    isFrozen: false,
    isMuted: false,
    warningCount: 0,
    chronos: 0,
    purchasedSlots: 0,
    dailyImagesUsed: 0,
    hasFirstPurchaseBonus: false,
    contentMaturity: 'safe',
    theme: 'dark',
    navigationMode: 'static',
  }),
  personas: () => ({
    isActive: false,
    isOnline: false,
    nsfwEnabled: false,
    themeEnabled: false,
  }),
  conversations: () => ({}),
  messages: () => ({ content: '' }),
  friendRequests: () => ({ status: 'pending' }),
  friendships: () => ({ isFavourite: false }),
  dmRequests: () => ({ status: 'pending' }),
  follows: () => ({}),
  storylines: () => ({
    boostChronos: 0,
    boostTier: 0,
    isPublic: true,
    isAdult: false,
    isOfficial: false,
    requireApproval: false,
    accentColor: '#8b5cf6',
  }),
  storylineCategories: () => ({ position: 0, collapsed: false }),
  storylineChannels: () => ({ type: 'text', position: 0, locked: false, slowMode: 0 }),
  storylineRoles: () => ({
    color: '#8b5cf6',
    position: 0,
    canManageChannels: false,
    canManageRoles: false,
    canKickMembers: false,
    canBanMembers: false,
    canManageMessages: false,
    canInvite: true,
    canChangeSettings: false,
    isAdmin: false,
  }),
  storylineMembers: () => ({ role: 'member' }),
  storylineInvites: () => ({ uses: 0 }),
  storylineMessages: () => ({ content: '' }),
  storylineBoosts: () => ({}),
  scenarioLikes: () => ({}),
  scenarios: () => ({
    category: 'romance',
    isPublic: true,
    isFeatured: false,
    viewCount: 0,
    chatCount: 0,
    likeCount: 0,
    contentRating: 'safe',
  }),
  notifications: () => ({ isRead: false, isDismissed: false }),
  chronosTransactions: () => ({}),
  profileThemes: () => ({
    price: 100,
    isSystem: true,
    isActive: true,
  }),
  marketplacePersonas: () => ({
    price: 0,
    downloads: 0,
    revenue: 0,
    isActive: true,
    isFeatured: false,
    notifyOnPurchase: true,
  }),
  moderationActions: () => ({ targetType: 'user' }),
  achievements: () => ({
    category: 'general',
    tier: 1,
    requirement: 1,
    isHidden: false,
    isActive: true,
  }),
  userAchievements: () => ({ progress: 0, completed: false }),
  reports: () => ({ status: 'pending' }),
  adminLogs: () => ({}),
  blocks: () => ({}),
  personaConnections: () => ({}),
  imageRecords: () => ({ uploadType: 'avatar' }),
}

// ---------- compound unique constraints (query-before-insert) ----------

const COMPOUND_UNIQUES: Record<string, Array<{ fields: string[] }>> = {
  conversations: [{ fields: ['personaAId', 'personaBId'] }],
  friendRequests: [{ fields: ['senderId', 'receiverId'] }],
  friendships: [{ fields: ['userId', 'friendId'] }],
  dmRequests: [{ fields: ['senderId', 'receiverId'] }],
  blocks: [{ fields: ['blockerId', 'blockedId'] }],
  follows: [{ fields: ['followerId', 'followingId'] }],
  storylineCategories: [{ fields: ['storylineId', 'name'] }],
  storylineChannels: [{ fields: ['storylineId', 'name'] }],
  storylineChannelPermissions: [{ fields: ['channelId', 'roleId'] }],
  storylineMembers: [{ fields: ['storylineId', 'userId'] }],
  storylineRoles: [{ fields: ['storylineId', 'name'] }],
  storylineBans: [{ fields: ['storylineId', 'userId'] }],
  storylineMessageReactions: [{ fields: ['messageId', 'userId', 'emoji'] }],
  storylinePinnedMessages: [{ fields: ['storylineId', 'messageId'] }],
  storylineReviews: [{ fields: ['storylineId', 'userId'] }],
  marketplacePurchases: [{ fields: ['marketplacePersonaId', 'buyerId'] }],
  userAchievements: [{ fields: ['userId', 'achievementId'] }],
  storylineChannelMutes: [{ fields: ['channelId', 'userId'] }],
  storylineChannelUnreads: [{ fields: ['channelId', 'userId'] }],
  wikiArticles: [{ fields: ['storylineId', 'slug'] }],
  scenarioLikes: [{ fields: ['scenarioId', 'userId'] }],
}

// ---------- Model adapter ----------

interface FindUniqueArgs {
  where: Record<string, any>
  include?: IncludeInput
  select?: SelectInput
}
interface FindFirstArgs {
  where?: WhereInput
  include?: IncludeInput
  select?: SelectInput
  orderBy?: OrderByInput | OrderByArray
}
interface FindManyArgs {
  where?: WhereInput
  include?: IncludeInput
  select?: SelectInput
  orderBy?: OrderByInput | OrderByArray
  skip?: number
  take?: number
}
interface CreateArgs {
  data: Record<string, any>
  select?: SelectInput
  include?: IncludeInput
}
interface UpdateArgs {
  where: Record<string, any>
  data: Record<string, any>
  select?: SelectInput
  include?: IncludeInput
}
interface UpdateManyArgs {
  where: WhereInput
  data: Record<string, any>
}
interface DeleteArgs {
  where: Record<string, any>
}
interface CountArgs {
  where?: WhereInput
}
interface UpsertArgs {
  where: Record<string, any>
  create: Record<string, any>
  update: Record<string, any>
  select?: SelectInput
  include?: IncludeInput
}

// Fields that PB manages internally (don't send on create/update)
// Note: for auth collections, email/username/password/passwordConfirm ARE valid input fields
// (PB knows to hash the password and validate email format). Only id/created/updated/
// verified/tokenKey are truly PB-managed and should be stripped on write.
const PB_MANAGED_FIELDS = new Set(['id', 'created', 'updated', 'verified', 'tokenKey'])

// Date-like field names — auto-convert ISO strings to Date instances on read
// so that legacy code calling `.toISOString()` on these fields keeps working.
const DATE_FIELD_NAMES = new Set([
  'dateOfBirth',
  'suspendedUntil',
  'mutedUntil',
  'dailyImagesResetAt',
  'lastDailyClaimAt',
  'lastMessageAt',
  'lastReadAt',
  'lastDailyClaimAt',
  'expiresAt',
  'editedAt',
  'reviewedAt',
  'completedAt',
  'pinnedUntil',
])

// JSON field names — PB json fields return structured data (arrays/objects),
// but legacy Prisma code expects JSON strings and calls JSON.parse on them.
// Re-stringify these on read so JSON.parse(record.tags) keeps working.
const JSON_FIELD_NAMES = new Set([
  'tags',
  'personalitySpectrums',
  'bigFive',
  'hexaco',
  'strengths',
  'flaws',
  'values',
  'fears',
  'likes',
  'dislikes',
  'hobbies',
  'skills',
  'languages',
  'habits',
  'speechPatterns',
  'disc',
  'enneagramType',
  'strengthsFinder',
  'rpPreferredGenders',
  'rpGenres',
  'rpLimits',
  'rpThemes',
  'nsfwKinks',
  'nsfwContentWarnings',
  'socialLinks',
  'initialMessages',
  'data',
])

// Reverse map: PB collection name → list of Prisma relation names that point to it.
// Used by normalizeRecord to alias expanded back-relations and their _count values
// under the Prisma relation names that legacy code expects.
// (One PB collection may back multiple Prisma relations, e.g. `follows` backs
// both `followers` and `following` — disambiguated by filter at query time.)
const PB_TO_PRISMA_RELATION_NAMES: Record<string, string[]> = {
  storylineMembers: ['members', 'storylineMembers'],
  storylineChannels: ['channels'],
  storylineRoles: ['roles'],
  storylineCategories: ['categories'],
  storylineBans: ['bans'],
  storylineBoosts: ['boosts', 'storylineBoosts'],
  storylineInvites: ['invites'],
  storylineReviews: ['reviews', 'storylineReviews'],
  storylinePinnedMessages: ['pinnedMessages'],
  storylineMessageReactions: ['reactions'],
  storylineThreads: ['threads'],
  storylineThreadMessages: ['threadMessages'],
  storylineChannelPermissions: ['permissions'],
  storylineChannelMutes: ['mutedBy'],
  storylineChannelUnreads: ['unreadBy'],
  personas: ['personas'],
  messages: ['messages', 'sentMessages'],
  storylineMessages: ['storylineMessages'],
  notifications: ['notifications'],
  chronosTransactions: ['chronosTransactions'],
  moderationActions: ['moderationActionsReceived', 'moderationActionsGiven'],
  profileThemes: ['ownedThemes'],
  storylines: ['ownedStorylines'],
  follows: ['followers', 'following'],
  friendRequests: ['sentRequests', 'receivedRequests'],
  friendships: ['friends', 'friendsOf'],
  blocks: ['blockedUsers', 'blockedBy'],
  personaConnections: ['connections'],
  scenarios: ['scenarios'],
  scenarioLikes: ['likes'],
  dmRequests: ['receivedDmRequests', 'sentDmRequests'],
  marketplacePersonas: ['marketplaceListing', 'listings'],
  marketplacePurchases: ['purchases'],
  conversations: ['conversationsAsA', 'conversationsAsB'],
  wikiArticles: ['wikiArticles', 'wikiEdits'],
}

// Precise back-relation map: Prisma relation name → [PB child collection, FK field].
// Used by normalizeRecord to map `expand[<childColl>_via_<fkField>]` back to the
// correct Prisma relation name (especially for self-referential relations where
// the same child collection backs multiple Prisma relations, e.g. follows backs
// both `followers` and `following`).
const BACK_RELATION_NAME_TO_PRISMA: Record<string, [string, string]> = {
  // Storyline back-relations
  members: ['storylineMembers', 'storylineId'],
  channels: ['storylineChannels', 'storylineId'],
  roles: ['storylineRoles', 'storylineId'],
  categories: ['storylineCategories', 'storylineId'],
  bans: ['storylineBans', 'storylineId'],
  boosts: ['storylineBoosts', 'storylineId'],
  invites: ['storylineInvites', 'storylineId'],
  reviews: ['storylineReviews', 'storylineId'],
  wikiArticles: ['wikiArticles', 'storylineId'],
  pinnedMessages: ['storylinePinnedMessages', 'storylineId'],
  // StorylineChannel back-relations
  permissions: ['storylineChannelPermissions', 'channelId'],
  mutedBy: ['storylineChannelMutes', 'channelId'],
  unreadBy: ['storylineChannelUnreads', 'channelId'],
  // StorylineMessage back-relations
  reactions: ['storylineMessageReactions', 'messageId'],
  threads: ['storylineThreads', 'messageId'],
  // StorylineThread back-relations
  threadMessages: ['storylineThreadMessages', 'threadId'],
  // User back-relations
  personas: ['personas', 'userId'],
  notifications: ['notifications', 'userId'],
  chronosTransactions: ['chronosTransactions', 'userId'],
  moderationActionsReceived: ['moderationActions', 'targetId'],
  moderationActionsGiven: ['moderationActions', 'adminId'],
  ownedThemes: ['profileThemes', 'ownerId'],
  ownedStorylines: ['storylines', 'ownerId'],
  storylineMembers: ['storylineMembers', 'userId'],
  storylineReviews: ['storylineReviews', 'userId'],
  wikiEdits: ['wikiArticles', 'lastEditedBy'],
  // Self-referential social relations (disambiguated by FK field)
  followers: ['follows', 'followingId'],
  following: ['follows', 'followerId'],
  sentRequests: ['friendRequests', 'senderId'],
  receivedRequests: ['friendRequests', 'receiverId'],
  friends: ['friendships', 'userId'],
  friendsOf: ['friendships', 'friendId'],
  blockedUsers: ['blocks', 'blockerId'],
  blockedBy: ['blocks', 'blockedId'],
  // Persona back-relations
  connections: ['personaConnections', 'personaId'],
  scenarios: ['scenarios', 'personaId'],
  likes: ['scenarioLikes', 'scenarioId'],
  sentMessages: ['messages', 'senderId'],
  storylineMessages: ['storylineMessages', 'senderId'],
  storylineBoosts: ['storylineBoosts', 'personaId'],
  receivedDmRequests: ['dmRequests', 'receiverId'],
  sentDmRequests: ['dmRequests', 'senderId'],
  marketplaceListing: ['marketplacePersonas', 'creatorId'],
  conversationsAsA: ['conversations', 'personaAId'],
  conversationsAsB: ['conversations', 'personaBId'],
  // Marketplace back-relations
  purchases: ['marketplacePurchases', 'marketplacePersonaId'],
  listings: ['marketplacePersonas', 'creatorId'],
  // Conversation back-relations
  messages: ['messages', 'conversationId'],
}

class ModelAdapter<TCollection extends string = string> {
  constructor(
    private readonly collection: TCollection,
    private readonly options: { isAuth?: boolean } = {}
  ) {}

  private async getExpandFields(include?: IncludeInput, select?: SelectInput): Promise<string | undefined> {
    // Merge include and select — Prisma treats them similarly for relation expansion.
    // A `select: { user: { select: { username: true } } }` should expand `user` just
    // like `include: { user: true }` would.
    const merged: IncludeInput = { ...(include as any) }
    if (select) {
      for (const [k, v] of Object.entries(select)) {
        if (v && typeof v === 'object') {
          // select with nested object → treat as include for expand purposes
          if (!merged[k]) merged[k] = v as any
        } else if (v === true && !(k in merged)) {
          // Plain scalar select like `select: { id: true }` — no expand needed
        }
      }
    }
    const obj = merged
    if (!obj || Object.keys(obj).length === 0) return undefined
    // PB supports nested expand via dot notation (e.g. "friend,friend.personas").
    // Walk the include tree and emit every leaf path.
    // Also handle Prisma's `_count: { select: { members: true } }` by expanding
    // the referenced relation so we can count it client-side in normalizeRecord.
    // Map Prisma relation names (e.g. `storyline`) to PB field names (`storylineId`)
    // since PB relation fields are stored with the `Id` suffix.
    const mapName = (n: string): string => {
      // Don't map PB-managed/system fields or names that already end in Id
      if (n === '_count' || n.endsWith('Id') || n === 'id') return n
      // Prisma's relation name → PB's back-relation expand path.
      // PB 0.23 uses the syntax `<childCollection>_via_<foreignKeyField>` for
      // back-relation expansion. Each entry maps a Prisma relation name to
      // [childCollection, foreignKeyField] so we can build the expand path.
      // Note: for self-referential back-relations (e.g. `followers` and
      // `following` both on `follows`), the FK field disambiguates which
      // direction of the relation to expand.
      const BACK_RELATION_MAP: Record<string, [string, string]> = {
        // Storyline back-relations (all point to storylines via storylineId)
        members: ['storylineMembers', 'storylineId'],
        channels: ['storylineChannels', 'storylineId'],
        roles: ['storylineRoles', 'storylineId'],
        categories: ['storylineCategories', 'storylineId'],
        bans: ['storylineBans', 'storylineId'],
        boosts: ['storylineBoosts', 'storylineId'],
        invites: ['storylineInvites', 'storylineId'],
        reviews: ['storylineReviews', 'storylineId'],
        wikiArticles: ['wikiArticles', 'storylineId'],
        pinnedMessages: ['storylinePinnedMessages', 'storylineId'],
        // StorylineChannel back-relations
        permissions: ['storylineChannelPermissions', 'channelId'],
        mutedBy: ['storylineChannelMutes', 'channelId'],
        unreadBy: ['storylineChannelUnreads', 'channelId'],
        // StorylineMessage back-relations
        reactions: ['storylineMessageReactions', 'messageId'],
        threads: ['storylineThreads', 'messageId'],
        // StorylineThread back-relations
        threadMessages: ['storylineThreadMessages', 'threadId'],
        // StorylineRole back-relations (members with this role)
        // 'members' is already mapped above to storylineMembers_via_storylineId;
        // for StorylineRole.members we'd need storylineMembers_via_roleId, but
        // since the adapter doesn't know the parent collection here, we leave
        // this case to be handled by explicit count queries in route handlers.
        // User back-relations
        personas: ['personas', 'userId'],
        notifications: ['notifications', 'userId'],
        chronosTransactions: ['chronosTransactions', 'userId'],
        moderationActionsReceived: ['moderationActions', 'targetId'],
        moderationActionsGiven: ['moderationActions', 'adminId'],
        ownedThemes: ['profileThemes', 'ownerId'],
        ownedStorylines: ['storylines', 'ownerId'],
        storylineMembers: ['storylineMembers', 'userId'],
        storylineReviews: ['storylineReviews', 'userId'],
        wikiEdits: ['wikiArticles', 'lastEditedBy'],
        // Self-referential social relations (disambiguated by FK field)
        followers: ['follows', 'followingId'],
        following: ['follows', 'followerId'],
        sentRequests: ['friendRequests', 'senderId'],
        receivedRequests: ['friendRequests', 'receiverId'],
        friends: ['friendships', 'userId'],
        friendsOf: ['friendships', 'friendId'],
        blockedUsers: ['blocks', 'blockerId'],
        blockedBy: ['blocks', 'blockedId'],
        // Persona back-relations
        connections: ['personaConnections', 'personaId'],
        scenarios: ['scenarios', 'personaId'],
        likes: ['scenarioLikes', 'scenarioId'], // (used on Scenario)
        sentMessages: ['messages', 'senderId'],
        storylineMessages: ['storylineMessages', 'senderId'],
        storylineBoosts: ['storylineBoosts', 'personaId'],
        receivedDmRequests: ['dmRequests', 'receiverId'],
        sentDmRequests: ['dmRequests', 'senderId'],
        marketplaceListing: ['marketplacePersonas', 'creatorId'],
        conversationsAsA: ['conversations', 'personaAId'],
        conversationsAsB: ['conversations', 'personaBId'],
        // Marketplace back-relations
        purchases: ['marketplacePurchases', 'marketplacePersonaId'],
        listings: ['marketplacePersonas', 'creatorId'],
        // Conversation back-relations
        messages: ['messages', 'conversationId'],
      }
      if (n in BACK_RELATION_MAP) {
        const [childColl, fkField] = BACK_RELATION_MAP[n]
        return `${childColl}_via_${fkField}`
      }
      // Default: assume it's a many-to-one forward relation, append 'Id' suffix
      return `${n}Id`
    }
    const out: string[] = []
    // Prisma's nested include/where/select structure looks like:
    //   include: { user: { select: { username: true } }, storyline: { include: { owner: ..., channels: ... } } }
    // The inner `include` and `select` are Prisma KEYWORDS, not relation names.
    // When we encounter them as object values, we need to:
    //   - emit the parent path (so PB expands the parent relation)
    //   - recurse into the keyword's object to expand nested relations
    const walk = (obj: IncludeInput, prefix: string) => {
      for (const [k, v] of Object.entries(obj)) {
        // Prisma's _count virtual relation — expand the underlying relation so we can count.
        if (k === '_count' && v && typeof v === 'object') {
          const select = (v as any).select
          if (select && typeof select === 'object') {
            for (const ck of Object.keys(select)) {
              const mappedCk = mapName(ck)
              const path = prefix ? `${prefix}.${mappedCk}` : mappedCk
              out.push(path)
            }
          }
          continue
        }
        // Skip Prisma keywords that aren't relation names
        if (k === 'where' || k === 'orderBy' || k === 'take' || k === 'skip' || k === 'cursor' || k === 'distinct') {
          continue
        }
        const mappedK = mapName(k)
        const path = prefix ? `${prefix}.${mappedK}` : mappedK
        if (v === true) {
          out.push(path)
        } else if (v && typeof v === 'object') {
          // Emit this path so PB expands the relation
          out.push(path)
          // Now look for nested `include`/`select`/`where` keywords and recurse into them.
          const child = v as any
          if (child.include && typeof child.include === 'object') {
            walk(child.include, path)
          }
          if (child.select && typeof child.select === 'object') {
            // `select` doesn't trigger further expand, but if any of the selected
            // fields are themselves relations (objects), PB needs them expanded.
            for (const [sk, sv] of Object.entries(child.select)) {
              if (sv && typeof sv === 'object') {
                walk({ [sk]: sv } as IncludeInput, path)
              }
            }
          }
        } else if (v === false || v == null) {
          // skip
        } else {
          out.push(path)
        }
      }
    }
    walk(obj, '')
    return out.length ? out.join(',') : undefined
  }

  // Strip out fields that Pocketbase doesn't accept on write (managed internally)
  private stripManaged(data: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(data)) {
      // id/created/updated/verified/tokenKey are PB-managed on all collections
      if (PB_MANAGED_FIELDS.has(k)) continue
      out[k] = v
    }
    return out
  }

  // Convert any Date instances to ISO date strings (Pocketbase expects strings for date fields)
  private convertDatesForWrite(data: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v instanceof Date) {
        // PB date fields store as "YYYY-MM-DD HH:MM:SS.000Z" or similar;
        // we use the SDK's expected format which is ISO 8601 with .000Z
        out[k] = v.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '') + '.000Z'
      } else if (v === undefined) {
        // skip undefined; PB will use default
        continue
      } else {
        out[k] = v
      }
    }
    return out
  }

  private applyDefaults(data: Record<string, any>): Record<string, any> {
    const defaultsFn = DEFAULTS[this.collection]
    if (!defaultsFn) return data
    const defaults = defaultsFn()
    const merged = { ...defaults }
    for (const [k, v] of Object.entries(data)) {
      // Only override defaults with provided values; let PB default null/empty
      if (v !== undefined) merged[k] = v
    }
    return merged
  }

  private async enforceCompoundUnique(data: Record<string, any>, excludeId?: string): Promise<void> {
    const constraints = COMPOUND_UNIQUES[this.collection]
    if (!constraints) return
    const pb = await getPb()
    for (const { fields } of constraints) {
      // Build a filter checking if any existing record matches all the constraint fields
      const filterParts = fields.map((f) => {
        const v = data[f]
        if (v === undefined || v === null || v === '') return `${f} = ""`
        return `${f} = ${pbEscape(v)}`
      })
      if (excludeId) filterParts.push(`id != "${excludeId}"`)
      const filter = filterParts.join(' && ')
      try {
        const existing = await pb.collection(this.collection).getList(1, 1, {
          filter: filter as any,
          requestKey: `${this.collection}-compound-unique-${Math.random()}`,
        } as any)
        if (existing.items.length > 0) {
          throw new Error(
            `Compound unique constraint violation on ${this.collection}(${fields.join(',')})`
          )
        }
      } catch (err: any) {
        // If the error is from our throw above, re-throw
        if (err?.message?.includes('Compound unique constraint')) throw err
        // Otherwise it's a PB error - log and skip (defensive)
        console.error(`[db] compound unique check failed for ${this.collection}:`, err)
      }
    }
  }

  // ============== findUnique ==============
  async findUnique(args: FindUniqueArgs): Promise<any | null> {
    const pb = await getPb()
    const where = args.where || {}
    let id: string | undefined
    let filter = ''

    // Support any unique-field lookup (id, username, email, etc.)
    if (where.id) {
      id = where.id
    } else {
      // Build a filter from the where clause (non-id lookups)
      const filterStr = translateWhereClause(where as WhereInput)
      filter = filterStr
    }

    try {
      let record: any
      if (id) {
        record = await pb.collection(this.collection).getOne(id, {
          expand: await this.getExpandFields(args.include, args.select),
          // Give each request a unique requestKey so the SDK's auto-cancellation
          // logic (if it's somehow still enabled) doesn't dedup parallel calls.
          requestKey: `${this.collection}-getOne-${id}-${Math.random()}`,
        } as any)
      } else {
        // Use getList with limit 1 + filter
        const list = await pb.collection(this.collection).getList(1, 1, {
          filter: (filter || '') as any,
          expand: await this.getExpandFields(args.include, args.select),
          requestKey: `${this.collection}-findUnique-${Math.random()}`,
        } as any)
        if (list.items.length === 0) return null
        record = list.items[0]
      }
      return pickFields(this.normalizeRecord(record), args.select)
    } catch (err: any) {
      // 404 = not found
      if (err?.status === 404 || err?.isAbort) return null
      throw err
    }
  }

  // ============== findFirst ==============
  async findFirst(args: FindFirstArgs): Promise<any | null> {
    const pb = await getPb()
    const filter = translateWhereClause(args.where as WhereInput) || ''
    const sort = translateOrderBy(args.orderBy)
    try {
      const list = await pb.collection(this.collection).getList(1, 1, {
        filter: (filter || '') as any,
        sort: (sort || '') as any,
        expand: await this.getExpandFields(args.include, args.select),
        requestKey: `${this.collection}-findFirst-${Math.random()}`,
      } as any)
      if (list.items.length === 0) return null
      return pickFields(this.normalizeRecord(list.items[0]), args.select)
    } catch (err: any) {
      if (err?.status === 404) return null
      throw err
    }
  }

  // ============== findMany ==============
  async findMany(args: FindManyArgs): Promise<any[]> {
    const pb = await getPb()
    const filter = translateWhereClause(args.where as WhereInput) || ''
    const sort = translateOrderBy(args.orderBy)
    const page = args.skip !== undefined && args.take !== undefined ? Math.floor(args.skip / args.take) + 1 : 1
    const perPage = args.take ?? 500 // PB max is 500; if not specified, fetch all in batches

    const allItems: any[] = []
    let currentPage = page
    const fetchAll = args.take === undefined
    do {
      const list = await pb.collection(this.collection).getList(currentPage, perPage, {
        filter: (filter || '') as any,
        sort: (sort || '') as any,
        expand: await this.getExpandFields(args.include, args.select),
        requestKey: `${this.collection}-findMany-p${currentPage}-${Math.random()}`,
      } as any)
      allItems.push(...list.items.map((r) => this.normalizeRecord(r)))
      if (!fetchAll) break
      currentPage++
      if (currentPage > list.totalPages) break
    } while (fetchAll && allItems.length < 5000 /* safety cap */)

    const result = args.take !== undefined && args.skip !== undefined ? allItems.slice(args.skip % args.take, (args.skip % args.take) + args.take) : allItems
    return args.select ? result.map((r) => pickFields(r, args.select)) : result
  }

  // ============== create ==============
  async create(args: CreateArgs): Promise<any> {
    const pb = await getPb()
    let data = this.stripManaged(args.data)
    data = this.applyDefaults(data)
    // Stringify JSON fields (tags, etc.) - PB json fields store structured data natively
    // But the original code JSON.stringifies these before sending. Keep them as objects
    // since PB json fields accept structured data. If they're already strings, leave them.
    data = this.maybeStringifyJson(data)
    // Convert any Date instances to PB-expected date strings
    data = this.convertDatesForWrite(data)

    // Enforce compound unique constraints (query-before-insert)
    await this.enforceCompoundUnique(data)

    if (this.options.isAuth) {
      // For auth collections, password and passwordConfirm must be present
      // Chrona sends `password` directly; we add passwordConfirm
      if (data.password) {
        data.passwordConfirm = data.password
      }
    }

    // Pass expand so PB returns related records in the response
    const expand = await this.getExpandFields(args.include, args.select)
    const record = await pb.collection(this.collection).create(data, {
      expand: expand as any,
      requestKey: `${this.collection}-create-${Math.random()}`,
    } as any)
    return this.normalizeRecord(record)
  }

  // ============== createMany ==============
  // Creates multiple records in parallel. PB has no native batch-create API,
  // so we issue N parallel create() calls. Returns { count: number }.
  async createMany(args: { data: any[] | Record<string, any> }): Promise<{ count: number }> {
    const pb = await getPb()
    const dataArray = Array.isArray(args.data) ? args.data : Object.values(args.data)
    let count = 0
    // Issue creates sequentially to avoid compound-unique race conditions
    // (each create runs enforceCompoundUnique which queries PB; parallel calls
    // could pass the check simultaneously and then both insert).
    for (const item of dataArray) {
      let data = this.stripManaged(item)
      data = this.applyDefaults(data)
      data = this.maybeStringifyJson(data)
      data = this.convertDatesForWrite(data)
      await this.enforceCompoundUnique(data)
      if (this.options.isAuth && data.password) {
        data.passwordConfirm = data.password
      }
      await pb.collection(this.collection).create(data, {
        requestKey: `${this.collection}-createMany-${count}-${Math.random()}`,
      } as any)
      count++
    }
    return { count }
  }

  // ============== update ==============
  async update(args: UpdateArgs): Promise<any> {
    const pb = await getPb()
    let data = this.stripManaged(args.data)
    data = this.maybeStringifyJson(data)
    data = this.convertDatesForWrite(data)
    const where = args.where || {}
    if (!where.id) {
      // find-then-update
      const existing = await this.findUnique({ where })
      if (!existing) throw new Error(`${this.collection} not found for update`)
      where.id = existing.id
    }
    // Re-check compound uniques if any constraint field changed
    await this.enforceCompoundUnique(data, where.id)

    // Pass expand so PB returns related records in the response
    const expand = await this.getExpandFields(args.include, args.select)
    const record = await pb.collection(this.collection).update(where.id, data, {
      expand: expand as any,
      requestKey: `${this.collection}-update-${where.id}-${Math.random()}`,
    } as any)
    return pickFields(this.normalizeRecord(record), args.select)
  }

  // ============== updateMany ==============
  async updateMany(args: UpdateManyArgs): Promise<{ count: number }> {
    const pb = await getPb()
    let data = this.stripManaged(args.data)
    data = this.maybeStringifyJson(data)
    data = this.convertDatesForWrite(data)
    const filter = translateWhereClause(args.where as WhereInput) || ''
    // getList all matching, then patch each
    let page = 1
    let count = 0
    while (true) {
      const list = await pb.collection(this.collection).getList(page, 100, {
        filter: (filter || '') as any,
        requestKey: `${this.collection}-updateMany-list-p${page}-${Math.random()}`,
      } as any)
      if (list.items.length === 0) break
      for (const item of list.items) {
        await pb.collection(this.collection).update(item.id, data, {
          requestKey: `${this.collection}-updateMany-upd-${item.id}-${Math.random()}`,
        } as any)
        count++
      }
      if (page >= list.totalPages) break
      page++
    }
    return { count }
  }

  // ============== delete ==============
  async delete(args: DeleteArgs): Promise<void> {
    const pb = await getPb()
    const where = args.where || {}
    if (!where.id) {
      const existing = await this.findUnique({ where })
      if (!existing) throw new Error(`${this.collection} not found for delete`)
      where.id = existing.id
    }
    // SetNull semantics for storylineMessages.replyToId
    if (this.collection === 'storylineMessages') {
      try {
        await pb.collection(this.collection).update(where.id, { replyToId: '' } as any, {
          requestKey: `${this.collection}-delete-null-self-${Math.random()}`,
        } as any)
        // Null out any messages that reply to this one
        const replies = await pb.collection(this.collection).getList(1, 500, {
          filter: `replyToId = "${where.id}"` as any,
          requestKey: `${this.collection}-delete-list-replies-${Math.random()}`,
        } as any)
        for (const r of replies.items) {
          await pb.collection(this.collection).update(r.id, { replyToId: '' } as any, {
            requestKey: `${this.collection}-delete-null-reply-${r.id}-${Math.random()}`,
          } as any)
        }
      } catch {
        /* ignore */
      }
    }
    await pb.collection(this.collection).delete(where.id, {
      requestKey: `${this.collection}-delete-${where.id}-${Math.random()}`,
    } as any)
  }

  // ============== deleteMany ==============
  async deleteMany(args: { where: WhereInput }): Promise<{ count: number }> {
    const pb = await getPb()
    const filter = translateWhereClause(args.where as WhereInput) || ''
    let page = 1
    let count = 0
    while (true) {
      const list = await pb.collection(this.collection).getList(page, 100, {
        filter: (filter || '') as any,
        requestKey: `${this.collection}-deleteMany-list-p${page}-${Math.random()}`,
      } as any)
      if (list.items.length === 0) break
      for (const item of list.items) {
        await pb.collection(this.collection).delete(item.id, {
          requestKey: `${this.collection}-deleteMany-del-${item.id}-${Math.random()}`,
        } as any)
        count++
      }
      if (page >= list.totalPages) break
      page++
    }
    return { count }
  }

  // ============== count ==============
  async count(args: CountArgs = {}): Promise<number> {
    const pb = await getPb()
    const filter = translateWhereClause(args.where as WhereInput) || ''
    // getList with perPage=1 returns totalItems efficiently
    const list = await pb.collection(this.collection).getList(1, 1, {
      filter: (filter || '') as any,
      requestKey: `${this.collection}-count-${Math.random()}`,
    } as any)
    return list.totalItems
  }

  // ============== aggregate ==============
  // Supports the subset of Prisma's aggregate API actually used by Chrona:
  //   { _count: true, _sum: { fieldName: true }, _max: { fieldName: true }, _min: {...}, _avg: {...} }
  // Implementation: fetch all matching records (capped at 500 per page, paginated)
  // and compute aggregations client-side. This is fine for Chrona's data volumes.
  async aggregate(args: {
    where?: WhereInput
    _count?: boolean | Record<string, true>
    _sum?: Record<string, true>
    _max?: Record<string, true>
    _min?: Record<string, true>
    _avg?: Record<string, true>
  }): Promise<any> {
    const pb = await getPb()
    const filter = translateWhereClause(args.where as WhereInput) || ''
    // Fetch all matching records (paginated, capped at 5000 for safety)
    const all: any[] = []
    let page = 1
    const perPage = 500
    while (true) {
      const list = await pb.collection(this.collection).getList(page, perPage, {
        filter: (filter || '') as any,
        requestKey: `${this.collection}-aggregate-p${page}-${Math.random()}`,
      } as any)
      all.push(...list.items)
      if (page >= list.totalPages || all.length >= 5000) break
      page++
    }
    const result: any = {}
    if (args._count === true) result._count = all.length
    else if (args._count && typeof args._count === 'object') {
      result._count = {}
      for (const f of Object.keys(args._count)) result._count[f] = all.length
    }
    if (args._sum) {
      result._sum = {}
      for (const f of Object.keys(args._sum)) {
        result._sum[f] = all.reduce((acc, r) => acc + (typeof r[f] === 'number' ? r[f] : 0), 0)
      }
    }
    if (args._max) {
      result._max = {}
      for (const f of Object.keys(args._max)) {
        const nums = all.map((r) => (typeof r[f] === 'number' ? r[f] : -Infinity))
        result._max[f] = nums.length ? Math.max(...nums) : null
      }
    }
    if (args._min) {
      result._min = {}
      for (const f of Object.keys(args._min)) {
        const nums = all.map((r) => (typeof r[f] === 'number' ? r[f] : Infinity))
        result._min[f] = nums.length ? Math.min(...nums) : null
      }
    }
    if (args._avg) {
      result._avg = {}
      for (const f of Object.keys(args._avg)) {
        const nums = all.map((r) => (typeof r[f] === 'number' ? r[f] : 0)).filter((n) => n !== 0)
        result._avg[f] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
      }
    }
    return result
  }

  // ============== groupBy ==============
  // Prisma's groupBy: groups records by the specified fields and returns
  // one row per distinct combination, with optional _count/_sum/_max/_min/_avg
  // aggregations per group. Implementation fetches all matching records and
  // groups client-side.
  async groupBy(args: {
    by: string[]
    where?: WhereInput
    _count?: boolean | Record<string, true>
    _sum?: Record<string, true>
    _max?: Record<string, true>
    _min?: Record<string, true>
    _avg?: Record<string, true>
    orderBy?: Record<string, 'asc' | 'desc'>
    take?: number
    skip?: number
  }): Promise<any[]> {
    const pb = await getPb()
    const filter = translateWhereClause(args.where as WhereInput) || ''
    const all: any[] = []
    let page = 1
    const perPage = 500
    while (true) {
      const list = await pb.collection(this.collection).getList(page, perPage, {
        filter: (filter || '') as any,
        requestKey: `${this.collection}-groupBy-p${page}-${Math.random()}`,
      } as any)
      all.push(...list.items)
      if (page >= list.totalPages || all.length >= 5000) break
      page++
    }
    // Group records by composite key (the `by` fields)
    const groups = new Map<string, { _key: Record<string, any>; _records: any[] }>()
    for (const r of all) {
      const keyObj: Record<string, any> = {}
      for (const f of args.by) keyObj[f] = r[f]
      const keyStr = JSON.stringify(keyObj)
      if (!groups.has(keyStr)) groups.set(keyStr, { _key: keyObj, _records: [] })
      groups.get(keyStr)!._records.push(r)
    }
    let result = Array.from(groups.values()).map((g) => {
      const row: any = { ...g._key }
      if (args._count === true) row._count = g._records.length
      else if (args._count && typeof args._count === 'object') {
        row._count = {}
        for (const f of Object.keys(args._count)) row._count[f] = g._records.length
      }
      if (args._sum) {
        row._sum = {}
        for (const f of Object.keys(args._sum)) row._sum[f] = g._records.reduce((a, r) => a + (typeof r[f] === 'number' ? r[f] : 0), 0)
      }
      if (args._max) {
        row._max = {}
        for (const f of Object.keys(args._max)) {
          const nums = g._records.map((r) => (typeof r[f] === 'number' ? r[f] : -Infinity))
          row._max[f] = nums.length ? Math.max(...nums) : null
        }
      }
      if (args._min) {
        row._min = {}
        for (const f of Object.keys(args._min)) {
          const nums = g._records.map((r) => (typeof r[f] === 'number' ? r[f] : Infinity))
          row._min[f] = nums.length ? Math.min(...nums) : null
        }
      }
      if (args._avg) {
        row._avg = {}
        for (const f of Object.keys(args._avg)) {
          const nums = g._records.map((r) => (typeof r[f] === 'number' ? r[f] : 0)).filter((n) => n !== 0)
          row._avg[f] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
        }
      }
      return row
    })
    // Apply orderBy on aggregated fields (e.g. { _count: 'desc' })
    if (args.orderBy) {
      for (const [f, dir] of Object.entries(args.orderBy)) {
        result.sort((a, b) => {
          const av = (a as any)[f] ?? (a._count && (a._count as any)[f]) ?? 0
          const bv = (b as any)[f] ?? (b._count && (b._count as any)[f]) ?? 0
          if (typeof av === 'number' && typeof bv === 'number') return dir === 'desc' ? bv - av : av - bv
          return dir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv))
        })
      }
    }
    // Apply skip/take
    if (args.skip) result = result.slice(args.skip)
    if (args.take) result = result.slice(0, args.take)
    return result
  }

  // ============== upsert ==============
  async upsert(args: UpsertArgs): Promise<any> {
    const existing = await this.findUnique({ where: args.where })
    if (existing) {
      return this.update({ where: args.where, data: args.update, select: args.select, include: args.include })
    }
    return this.create({ data: { ...args.where, ...args.create }, select: args.select, include: args.include })
  }

  // ============== JSON field handling ==============
  // The original Prisma code stored arrays/objects as JSON.stringify(...) into String fields.
  // The new PB schema declares these as `json` fields. PB json fields accept structured data
  // natively, but if the caller already stringified (legacy behavior), we parse it back so
  // PB stores the structured value.
  private maybeStringifyJson(data: Record<string, any>): Record<string, any> {
    const JSON_FIELDS = new Set([
      'tags',
      'personalitySpectrums',
      'bigFive',
      'hexaco',
      'strengths',
      'flaws',
      'values',
      'fears',
      'likes',
      'dislikes',
      'hobbies',
      'skills',
      'languages',
      'habits',
      'speechPatterns',
      'disc',
      'enneagramType',
      'strengthsFinder',
      'rpPreferredGenders',
      'rpGenres',
      'rpLimits',
      'rpThemes',
      'nsfwKinks',
      'nsfwContentWarnings',
      'socialLinks',
      'initialMessages',
      'data',
    ])
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(data)) {
      if (JSON_FIELDS.has(k) && typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
        try {
          out[k] = JSON.parse(v)
          continue
        } catch {
          /* fallthrough - keep as string */
        }
      }
      out[k] = v
    }
    return out
  }

  // ============== normalize PB record to Prisma-like shape ==============
  // PB records have id, created, updated, plus schema fields.
  // Prisma records have id, createdAt, updatedAt, plus schema fields.
  // We translate to make existing API code work without modification.
  // Date-like fields are converted back to Date instances so that
  // `.toISOString()` calls in legacy code keep working.
  private normalizeRecord(record: any): any {
    if (!record) return record
    if (Array.isArray(record)) return record.map((r) => this.normalizeRecord(r))
    if (typeof record !== 'object') return record
    const out: any = { ...record }
    // Map PB-managed fields to Prisma-equivalent names (keep both for compatibility)
    if (record.id) out.id = record.id
    if (record.created) out.createdAt = record.created
    if (record.updated) out.updatedAt = record.updated
    // Re-stringify PB json fields so legacy `JSON.parse(record.tags)` calls
    // in API routes keep working. PB json fields return structured data
    // (arrays/objects), but the original Prisma code stored JSON strings in
    // String? fields. Without this, `JSON.parse(["a","b"])` would throw
    // because String(["a","b"]) = "a,b" which isn't valid JSON.
    for (const jsonField of JSON_FIELD_NAMES) {
      const v = out[jsonField]
      if (v == null) continue
      if (typeof v === 'object') {
        // Already structured — re-stringify for backward compat with JSON.parse
        out[jsonField] = JSON.stringify(v)
      }
    }
    // Expand relations into nested objects if present
    if (record.expand) {
      for (const [rel, val] of Object.entries(record.expand)) {
        // For one-to-many, val is array; for many-to-one, val is object
        // Recursively normalize expanded records so nested createdAt/updatedAt
        // and date fields are also converted.
        const normalized = Array.isArray(val)
          ? val.map((v) => this.normalizeRecord(v))
          : this.normalizeRecord(val)
        // Determine the Prisma relation name(s) for this expand key.
        // PB returns either:
        //  - Forward relation: `userId`, `storylineId`, etc. (many-to-one)
        //  - Back-relation: `storylineMembers_via_storylineId`, `personas_via_userId`, etc.
        // We alias both under the Prisma relation name that legacy code expects.
        let prismaNames: string[] = []
        if (rel.endsWith('Id')) {
          // Forward relation — strip 'Id' suffix to get Prisma relation name
          prismaNames = [rel.slice(0, -2)]
          // Keep the scalar FK field intact (don't overwrite record.storylineId)
          // — only set the Prisma alias
          for (const name of prismaNames) out[name] = normalized
        } else if (rel.includes('_via_')) {
          // Back-relation — extract child collection and FK field
          const [childColl, fkField] = rel.split('_via_')
          // Look up Prisma relation name(s) that map to this back-relation
          prismaNames = PB_TO_PRISMA_RELATION_NAMES[childColl]?.filter(() => true) || [childColl]
          // More precise: filter by FK field too (for self-referential relations)
          // Build reverse lookup from FK field
          const matchingPrismaNames = Object.entries(BACK_RELATION_NAME_TO_PRISMA)
            .filter(([, [c, fk]]) => c === childColl && fk === fkField)
            .map(([name]) => name)
          if (matchingPrismaNames.length > 0) prismaNames = matchingPrismaNames
          // Set the property under the Prisma relation name(s)
          for (const name of prismaNames) out[name] = normalized
          // Also set under the raw PB key for direct access if needed
          out[rel] = normalized
        } else {
          // Plain collection-name expand (fallback) — set directly + alias
          out[rel] = normalized
          const aliases = PB_TO_PRISMA_RELATION_NAMES[rel]
          if (aliases) for (const alias of aliases) out[alias] = normalized
        }
        // Auto-populate Prisma's _count virtual relation: if `expand[rel]` is an
        // array, set `_count[rel] = array.length` so legacy code like
        // `record._count.members` keeps working without an extra fetch.
        if (Array.isArray(val)) {
          if (!out._count) out._count = {}
          out._count[rel] = val.length
          // Alias _count under each Prisma relation name that maps to this expand
          for (const name of prismaNames) out._count[name] = val.length
          // Also check the child collection name alias
          if (rel.includes('_via_')) {
            const childColl = rel.split('_via_')[0]
            const aliases = PB_TO_PRISMA_RELATION_NAMES[childColl]
            if (aliases) for (const alias of aliases) out._count[alias] = val.length
          } else if (!rel.endsWith('Id')) {
            const aliases = PB_TO_PRISMA_RELATION_NAMES[rel]
            if (aliases) for (const alias of aliases) out._count[alias] = val.length
          }
        }
      }
    }
    // Date strings -> Date instances (Prisma returns Date for DateTime fields)
    for (const dateField of DATE_FIELD_NAMES) {
      if (typeof out[dateField] === 'string' && out[dateField]) {
        // PB returns dates like "2026-10-09 02:46:00.000Z" — Date can parse that
        const parsed = new Date(out[dateField])
        if (!isNaN(parsed.getTime())) {
          out[dateField] = parsed
        }
      }
    }
    return out
  }
}

// =============================================================
// db export — mirrors the Prisma client surface area used by Chrona
// =============================================================

class DbAdapter {
  user = new ModelAdapter('users', { isAuth: true })
  persona = new ModelAdapter('personas')
  conversation = new ModelAdapter('conversations')
  message = new ModelAdapter('messages')
  friendRequest = new ModelAdapter('friendRequests')
  friendship = new ModelAdapter('friendships')
  dmRequest = new ModelAdapter('dmRequests')
  block = new ModelAdapter('blocks')
  follow = new ModelAdapter('follows')
  storyline = new ModelAdapter('storylines')
  storylineCategory = new ModelAdapter('storylineCategories')
  storylineChannel = new ModelAdapter('storylineChannels')
  storylineChannelPermission = new ModelAdapter('storylineChannelPermissions')
  storylineMember = new ModelAdapter('storylineMembers')
  storylineRole = new ModelAdapter('storylineRoles')
  storylineInvite = new ModelAdapter('storylineInvites')
  storylineBan = new ModelAdapter('storylineBans')
  storylineMessage = new ModelAdapter('storylineMessages')
  storylineMessageReaction = new ModelAdapter('storylineMessageReactions')
  storylinePinnedMessage = new ModelAdapter('storylinePinnedMessages')
  storylineBoost = new ModelAdapter('storylineBoosts')
  storylineReview = new ModelAdapter('storylineReviews')
  personaConnection = new ModelAdapter('personaConnections')
  chronosTransaction = new ModelAdapter('chronosTransactions')
  report = new ModelAdapter('reports')
  adminLog = new ModelAdapter('adminLogs')
  notification = new ModelAdapter('notifications')
  marketplacePersona = new ModelAdapter('marketplacePersonas')
  marketplacePurchase = new ModelAdapter('marketplacePurchases')
  moderationAction = new ModelAdapter('moderationActions')
  achievement = new ModelAdapter('achievements')
  userAchievement = new ModelAdapter('userAchievements')
  storylineThread = new ModelAdapter('storylineThreads')
  storylineThreadMessage = new ModelAdapter('storylineThreadMessages')
  storylineChannelMute = new ModelAdapter('storylineChannelMutes')
  storylineChannelUnread = new ModelAdapter('storylineChannelUnreads')
  wikiArticle = new ModelAdapter('wikiArticles')
  scenario = new ModelAdapter('scenarios')
  scenarioLike = new ModelAdapter('scenarioLikes')
  imageRecord = new ModelAdapter('imageRecords')
  profileTheme = new ModelAdapter('profileThemes')

  // ============== $transaction (sequential, no real atomicity) ==============
  // Pocketbase doesn't support cross-collection transactions, so we execute
  // the operations sequentially. If any fails, earlier writes have already
  // been committed. Callers that need atomicity should structure their logic
  // to be resilient to partial failures or check state on failure.
  async $transaction<T>(operations: Array<Promise<T> | ((tx?: any) => Promise<T>)>): Promise<T[]> {
    const results: T[] = []
    for (const op of operations) {
      if (typeof op === 'function') {
        results.push(await (op as (tx?: any) => Promise<T>)(undefined))
      } else {
        results.push(await op)
      }
    }
    return results
  }

  // ============== $queryRaw (no-op shim) ==============
  // Some legacy code may call this; PB doesn't support raw SQL via the SDK.
  async $queryRaw(_sql: string, ..._params: any[]): Promise<any[]> {
    console.warn('[db] $queryRaw is not supported on Pocketbase; returning empty array')
    return []
  }

  // ============== $executeRaw (no-op shim) ==============
  async $executeRaw(_sql: string, ..._params: any[]): Promise<number> {
    console.warn('[db] $executeRaw is not supported on Pocketbase; returning 0')
    return 0
  }
}

// BigInt.prototype.toJSON shim — required by some legacy code paths
// that include BigInt values (e.g., persona.displayId) in JSON responses.
// @ts-ignore
if (typeof BigInt.prototype.toJSON === 'undefined') {
  // @ts-ignore
  BigInt.prototype.toJSON = function () {
    return this.toString()
  }
}

export const db = new DbAdapter()
export type Db = typeof db
