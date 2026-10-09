/**
 * Chrona Pocketbase setup script (fallback)
 * =========================================
 * Mirrors pb_migrations/01_init_chrona_schema.js but uses the admin REST API
 * via fetch, so it can be run with `bun run scripts/setup-pocketbase.ts` when
 * the migration binary cannot be used for any reason.
 *
 * Usage:
 *   bun run scripts/setup-pocketbase.ts
 *
 * Environment (defaults shown):
 *   PB_URL=http://127.0.0.1:8090
 *   PB_ADMIN_EMAIL=admin@chrona.local
 *   PB_ADMIN_PASSWORD=chrona-admin-pw-2026
 */

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const PB_URL = process.env.PB_URL || "http://127.0.0.1:8090";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@chrona.local";
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || "chrona-admin-pw-2026";

const USERS_ID = "_pb_users_auth_"; // PB built-in users auth collection id

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type FieldType =
  | "text" | "number" | "bool" | "date" | "json" | "email" | "relation" | "file" | "url";

interface FieldDef {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  presentable?: boolean;
  options?: Record<string, unknown>;
}

interface CollectionDef {
  name: string;
  type: "base" | "auth" | "view";
  schema?: FieldDef[];
  listRule?: string | null;
  viewRule?: string | null;
  createRule?: string | null;
  updateRule?: string | null;
  deleteRule?: string | null;
  options?: Record<string, unknown>;
  // PB 0.23+ auth-collection specific top-level fields (no longer nested under `options`):
  passwordAuth?: { enabled?: boolean; identityFields?: string[] } | null;
  oauth2?: { enabled?: boolean; providers?: unknown[]; mappedFields?: Record<string, string> } | null;
  mfa?: unknown | null;
  otp?: unknown | null;
  indexes?: string[];
}

// -----------------------------------------------------------------------------
// Field helpers — Pocketbase 0.23+ uses a FLAT field schema (no `options` sub-object).
// All field-specific properties are top-level on the field object itself.
// -----------------------------------------------------------------------------

function text(name: string, opts: { required?: boolean; unique?: boolean; pattern?: string; min?: number | null; max?: number | null } = {}): FieldDef {
  return {
    name, type: "text",
    required: !!opts.required,
    unique: !!opts.unique,
    presentable: false,
    min: opts.min != null ? opts.min : null,
    max: opts.max != null ? opts.max : null,
    pattern: opts.pattern || "",
  } as any;
}

function number(name: string, opts: { required?: boolean; unique?: boolean; noDecimal?: boolean; min?: number | null; max?: number | null } = {}): FieldDef {
  return {
    name, type: "number",
    required: !!opts.required,
    unique: !!opts.unique,
    presentable: false,
    min: opts.min != null ? opts.min : null,
    max: opts.max != null ? opts.max : null,
    noDecimal: !!opts.noDecimal,
  } as any;
}

function bool(name: string, opts: { required?: boolean } = {}): FieldDef {
  return { name, type: "bool", required: !!opts.required, unique: false, presentable: false } as any;
}

function date(name: string, opts: { required?: boolean; min?: string; max?: string } = {}): FieldDef {
  return { name, type: "date", required: !!opts.required, unique: false, presentable: false, min: opts.min || "", max: opts.max || "" } as any;
}

function json(name: string, opts: { required?: boolean; maxSize?: number } = {}): FieldDef {
  return { name, type: "json", required: !!opts.required, unique: false, presentable: false, maxSize: opts.maxSize || 5242880 } as any;
}

function relation(
  name: string,
  targetId: string,
  opts: { required?: boolean; unique?: boolean; cascadeDelete?: boolean; minSelect?: number | null; maxSelect?: number } = {}
): FieldDef {
  return {
    name, type: "relation",
    required: !!opts.required,
    unique: !!opts.unique,
    presentable: false,
    collectionId: targetId,
    cascadeDelete: !!opts.cascadeDelete,
    minSelect: opts.minSelect != null ? opts.minSelect : null,
    maxSelect: opts.maxSelect != null ? opts.maxSelect : 1,
    displayFields: null,
  } as any;
}

// -----------------------------------------------------------------------------
// Admin API helpers
// -----------------------------------------------------------------------------

let adminToken = "";

async function adminAuth(): Promise<void> {
  // Pocketbase 0.23+ replaced /api/admins with /api/collections/_superusers
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`admin auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json() as { token: string };
  adminToken = data.token;
}

async function listCollections(): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${PB_URL}/api/collections?perPage=500`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) throw new Error(`list collections failed: ${res.status}`);
  const data = await res.json() as { items: Array<{ id: string; name: string }> };
  return data.items || [];
}

async function getCollection(name: string): Promise<any | null> {
  const res = await fetch(`${PB_URL}/api/collections/records/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  // Above path is wrong — use the proper endpoint:
  return null;
}

async function findCollection(name: string): Promise<any | null> {
  const res = await fetch(`${PB_URL}/api/collections/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`find ${name} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createCollection(def: CollectionDef): Promise<any> {
  // PB 0.23+ renamed `schema` to `fields` in the REST API.
  // Top-level auth fields (passwordAuth, oauth2, mfa, otp, indexes) are sent as-is.
  const body: Record<string, unknown> = { ...def, fields: def.schema };
  delete body.schema;
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create ${def.name} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateCollection(id: string, def: CollectionDef): Promise<any> {
  // PB 0.23+ renamed `schema` to `fields` in the REST API.
  const body: Record<string, unknown> = { ...def, fields: def.schema };
  delete body.schema;
  const res = await fetch(`${PB_URL}/api/collections/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`update ${def.name} (${id}) failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function upsert(def: CollectionDef): Promise<string> {
  const existing = await findCollection(def.name);
  // PB 0.23 default `created`/`updated` auto fields are NOT auto-added to
  // collections. We need to explicitly include them so we can sort on
  // `created` (which our db.ts adapter maps from Prisma's `createdAt`).
  const createdField = {
    name: "created", type: "autodate", required: false, presentable: false,
    system: true, hidden: false, onCreate: true, onUpdate: false,
  } as any;
  const updatedField = {
    name: "updated", type: "autodate", required: false, presentable: false,
    system: true, hidden: false, onCreate: true, onUpdate: true,
  } as any;
  // For auth collections, also ensure tokenKey, email, etc. are present
  // (they're auto-added by PB on creation but may need to be preserved on PATCH).
  if (existing) {
    // Merge options to preserve auth-collection defaults.
    const mergedOptions: Record<string, unknown> = { ...(existing.options || {}), ...(def.options || {}) };

    // PB 0.23 fields have stable IDs (like "f1a2b3c4") AND system fields like
    // `id`, `created`, `updated` are auto-generated with `system: true`. When
    // PATCHing a collection, PB replaces the entire fields array — so we
    // must preserve existing system fields (especially their `id`, `type`,
    // and full options) AND merge user-defined field IDs by name to keep
    // relation fields valid.
    const existingFields: any[] = existing.fields || existing.schema || [];
    const existingByName: Record<string, any> = {};
    const systemFields: any[] = [];
    for (const f of existingFields) {
      existingByName[f.name] = f;
      if (f.system) systemFields.push(f);
    }

    // Ensure created/updated system fields exist in systemFields (add if missing)
    const hasCreated = systemFields.some((f) => f.name === "created");
    const hasUpdated = systemFields.some((f) => f.name === "updated");
    if (!hasCreated) systemFields.push({ ...createdField, id: "autodate_created" });
    if (!hasUpdated) systemFields.push({ ...updatedField, id: "autodate_updated" });

    // Build the merged schema: system fields first (as PB expects), then
    // user-defined fields with their existing IDs preserved when matched by name.
    // Also: resolve "__SELF__" placeholder on relation fields to the collection's own ID.
    // ALSO: if a user-defined field's name matches an existing system field (e.g. `email`),
    // merge user-supplied properties onto the system field (so callers can flip
    // `required: false` on the built-in email field, for example).
    const userFields: FieldDef[] = (def.schema || []).map((f: any) => {
      const matched = existingByName[f.name];
      if (matched && matched.system) {
        // Override system field's user-specified properties (preserve id/system/type)
        return { ...matched, ...f, id: matched.id, system: true, type: matched.type };
      }
      const out: any = matched && matched.id ? { ...f, id: matched.id } : { ...f };
      // Resolve __SELF__ placeholder to the collection's own ID (PB 0.23 has no
      // self-relation concept — we just point the relation at our own collection)
      if (out.type === "relation" && out.collectionId === "__SELF__") {
        out.collectionId = existing.id;
      }
      return out;
    });
    // Filter out user fields that were merged into system fields (so we don't duplicate)
    const systemFieldNames = new Set(systemFields.map((f) => f.name));
    const standaloneUserFields = userFields.filter((f: any) => !systemFieldNames.has(f.name));
    const mergedSystemFields = systemFields.map((sf) => {
      const overridden = userFields.find((uf: any) => uf.name === sf.name);
      return overridden || sf;
    });
    const mergedSchema: any[] = [...mergedSystemFields, ...standaloneUserFields];

    const patched: CollectionDef = {
      ...def,
      schema: mergedSchema,
      options: mergedOptions,
    };
    const updated = await updateCollection(existing.id, patched);
    return (updated && updated.id) || existing.id;
  }
  // For NEW collection creation, include the created/updated system fields
  // in the schema (PB will treat them as system fields if type=autodate).
  // Also: drop __SELF__ placeholder fields (caller is expected to PATCH later).
  const createDef: CollectionDef = { ...def };
  if (def.schema) {
    createDef.schema = [
      createdField,
      updatedField,
      ...def.schema.filter((f: any) => !(f.type === "relation" && f.collectionId === "__SELF__")),
    ] as any;
  }
  const created = await createCollection(createDef);
  return created.id;
}

// -----------------------------------------------------------------------------
// Collection definitions (must mirror the JS migration)
// -----------------------------------------------------------------------------

const ids: Record<string, string> = { users: USERS_ID };

async function buildUsers(): Promise<void> {
  const def: CollectionDef = {
    name: "users",
    type: "auth",
    schema: [
      // Override the built-in `email` system field to be NOT required (Prisma's User.email is String?).
      // PB 0.23 auto-creates email as required=true on auth collections; we flip it.
      { name: "email", type: "email", required: false } as any,
      // In PB 0.23+ `username` is NOT auto-created for auth collections. We
      // declare it explicitly so that we can filter on it (e.g. login lookup)
      // and so that the SDK can return it on the record.
      text("username", { required: false, unique: true }),
      text("securityKey", { required: true }),
      text("avatarUrl"),
      text("role"),
      bool("isOfficial"),
      bool("isBanned"),
      bool("isSuspended"),
      bool("isFrozen"),
      bool("isMuted"),
      date("suspendedUntil"),
      date("mutedUntil"),
      number("warningCount"),
      text("banReason"),
      text("suspendReason"),
      number("chronos"),
      number("purchasedSlots"),
      text("nameColor"),
      number("dailyImagesUsed"),
      date("dailyImagesResetAt"),
      bool("hasFirstPurchaseBonus"),
      date("lastDailyClaimAt"),
      text("bio"),
      text("bannerUrl"),
      text("status"),
      text("pronouns"),
      text("location"),
      json("socialLinks"),
      date("dateOfBirth"),
      text("contentMaturity"),
      text("theme"),
      text("febBoxToken"),
      text("navigationMode"),
    ],
    listRule: "id = @request.auth.id",
    viewRule: "id = @request.auth.id",
    createRule: "",
    updateRule: "id = @request.auth.id",
    deleteRule: "id = @request.auth.id",
    // PB 0.23 moved auth options to top-level fields (not nested under `options`).
    // passwordAuth.identityFields must include 'username' so users can log in
    // with their username (Chrona doesn't require email). The username field
    // MUST have a UNIQUE index for PB to allow it as an identityField.
    passwordAuth: {
      enabled: true,
      identityFields: ["email", "username"],
    },
    oauth2: {
      enabled: false,
      providers: [],
      mappedFields: { id: "", name: "", username: "", avatarURL: "" },
    },
    options: {
      exceptEmailDomains: null,
      manageRule: null,
      minPasswordLength: 8,
      onlyEmailDomains: null,
      onlyVerified: false,
      requireEmail: false,
    },
    indexes: [
      // PB built-in indexes (preserve them):
      "CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''",
      // Required for passwordAuth.identityFields to include 'username':
      "CREATE UNIQUE INDEX `idx_username__pb_users_auth_` ON `users` (`username`) WHERE `username` != ''",
      // Required for the securityKey lookup on login:
      "CREATE UNIQUE INDEX `idx_securityKey__pb_users_auth_` ON `users` (`securityKey`)",
    ],
  };
  ids.users = await upsert(def);
}

async function buildProfileThemes(): Promise<void> {
  ids.profileThemes = await upsert({
    name: "profileThemes",
    type: "base",
    schema: [
      text("name", { required: true }),
      text("description"),
      text("previewUrl"),
      text("background"),
      text("borderColor"),
      text("textColor"),
      text("accentColor"),
      text("backgroundImage"),
      number("price"),
      bool("isSystem"),
      bool("isActive"),
      relation("ownerId", ids.users, { required: false, cascadeDelete: true }),
    ],
  });
}

async function buildPersonas(): Promise<void> {
  ids.personas = await upsert({
    name: "personas",
    type: "base",
    schema: [
      number("displayId", { unique: true }),
      relation("userId", ids.users, { required: true, cascadeDelete: true }),
      relation("originalCreatorId", ids.users, { required: false, cascadeDelete: false }),
      text("name", { required: true }),
      text("avatarUrl"),
      text("bannerUrl"),
      bool("isActive"),
      bool("isOnline"),
      text("description"),
      text("archetype"),
      text("gender"),
      text("pronouns"),
      number("age"),
      json("tags"),
      text("personalityDescription"),
      json("personalitySpectrums"),
      text("strengths"),
      text("flaws"),
      text("values"),
      text("fears"),
      text("species"),
      json("likes"),
      json("dislikes"),
      json("hobbies"),
      json("skills"),
      json("languages"),
      json("habits"),
      json("speechPatterns"),
      text("backstory"),
      text("appearance"),
      text("mbtiType"),
      json("bigFive"),
      json("hexaco"),
      text("discType"),
      json("disc"),
      text("enneagramType"),
      json("strengthsFinder"),
      bool("nsfwEnabled"),
      text("nsfwBodyType"),
      json("nsfwKinks"),
      json("nsfwContentWarnings"),
      text("nsfwOrientation"),
      text("nsfwRolePreference"),
      relation("themeId", ids.profileThemes, { required: false, cascadeDelete: false }),
      bool("themeEnabled"),
      text("rpStyle"),
      json("rpPreferredGenders"),
      json("rpGenres"),
      json("rpLimits"),
      json("rpThemes"),
      text("rpExperienceLevel"),
      text("rpResponseTime"),
    ],
  });
}

async function buildConversations(): Promise<void> {
  ids.conversations = await upsert({
    name: "conversations",
    type: "base",
    schema: [
      relation("personaAId", ids.personas, { required: true, cascadeDelete: true }),
      relation("personaBId", ids.personas, { required: true, cascadeDelete: true }),
      date("lastMessageAt"),
    ],
  });
}

async function buildMessages(): Promise<void> {
  ids.messages = await upsert({
    name: "messages",
    type: "base",
    schema: [
      relation("conversationId", ids.conversations, { required: true, cascadeDelete: true }),
      relation("senderId", ids.personas, { required: true, cascadeDelete: true }),
      text("content"),
      text("imageUrl"),
    ],
  });
}

async function buildFriendRequests(): Promise<void> {
  await upsert({
    name: "friendRequests",
    type: "base",
    schema: [
      relation("senderId", ids.users, { required: true, cascadeDelete: true }),
      relation("receiverId", ids.users, { required: true, cascadeDelete: true }),
      text("status"),
    ],
  });
}

async function buildFriendships(): Promise<void> {
  await upsert({
    name: "friendships",
    type: "base",
    schema: [
      relation("userId", ids.users, { required: true, cascadeDelete: true }),
      relation("friendId", ids.users, { required: true, cascadeDelete: true }),
      bool("isFavourite"),
    ],
  });
}

async function buildDmRequests(): Promise<void> {
  await upsert({
    name: "dmRequests",
    type: "base",
    schema: [
      relation("senderId", ids.personas, { required: true, cascadeDelete: true }),
      relation("receiverId", ids.personas, { required: true, cascadeDelete: true }),
      text("firstMessage", { required: true }),
      text("imageUrl"),
      text("status"),
    ],
  });
}

async function buildBlocks(): Promise<void> {
  await upsert({
    name: "blocks",
    type: "base",
    schema: [
      relation("blockerId", ids.users, { required: true, cascadeDelete: true }),
      relation("blockedId", ids.users, { required: true, cascadeDelete: true }),
    ],
  });
}

async function buildFollows(): Promise<void> {
  await upsert({
    name: "follows",
    type: "base",
    schema: [
      relation("followerId", ids.users, { required: true, cascadeDelete: true }),
      relation("followingId", ids.users, { required: true, cascadeDelete: true }),
    ],
  });
}

async function buildStorylines(): Promise<void> {
  ids.storylines = await upsert({
    name: "storylines",
    type: "base",
    schema: [
      relation("ownerId", ids.users, { required: true, cascadeDelete: true }),
      text("name", { required: true }),
      text("description"),
      text("lore"),
      text("iconUrl"),
      text("bannerUrl"),
      text("category", { required: true }),
      json("tags"),
      text("accentColor"),
      text("welcomeMessage"),
      number("memberCap"),
      bool("requireApproval"),
      number("boostChronos"),
      number("boostTier"),
      bool("isPublic"),
      bool("isAdult"),
      bool("isOfficial"),
    ],
  });
}

async function buildStorylineCategories(): Promise<void> {
  ids.storylineCategories = await upsert({
    name: "storylineCategories",
    type: "base",
    schema: [
      relation("storylineId", ids.storylines, { required: true, cascadeDelete: true }),
      text("name", { required: true }),
      number("position"),
      bool("collapsed"),
    ],
  });
}

async function buildStorylineRoles(): Promise<void> {
  ids.storylineRoles = await upsert({
    name: "storylineRoles",
    type: "base",
    schema: [
      relation("storylineId", ids.storylines, { required: true, cascadeDelete: true }),
      text("name", { required: true }),
      text("color"),
      number("position"),
      bool("canManageChannels"),
      bool("canManageRoles"),
      bool("canKickMembers"),
      bool("canBanMembers"),
      bool("canManageMessages"),
      bool("canInvite"),
      bool("canChangeSettings"),
      bool("isAdmin"),
    ],
  });
}

async function buildStorylineChannels(): Promise<void> {
  ids.storylineChannels = await upsert({
    name: "storylineChannels",
    type: "base",
    schema: [
      relation("storylineId", ids.storylines, { required: true, cascadeDelete: true }),
      relation("categoryId", ids.storylineCategories, { required: false, cascadeDelete: false }),
      text("name", { required: true }),
      text("type"),
      number("position"),
      number("slowMode"),
      text("topic"),
      bool("locked"),
    ],
  });
}

async function buildStorylineChannelPermissions(): Promise<void> {
  await upsert({
    name: "storylineChannelPermissions",
    type: "base",
    schema: [
      relation("channelId", ids.storylineChannels, { required: true, cascadeDelete: true }),
      relation("roleId", ids.storylineRoles, { required: true, cascadeDelete: true }),
      bool("canView"),
      bool("canSend"),
    ],
  });
}

async function buildStorylineMembers(): Promise<void> {
  await upsert({
    name: "storylineMembers",
    type: "base",
    schema: [
      relation("storylineId", ids.storylines, { required: true, cascadeDelete: true }),
      relation("userId", ids.users, { required: true, cascadeDelete: true }),
      relation("roleId", ids.storylineRoles, { required: false, cascadeDelete: false }),
      text("role"),
    ],
  });
}

async function buildStorylineInvites(): Promise<void> {
  await upsert({
    name: "storylineInvites",
    type: "base",
    schema: [
      relation("storylineId", ids.storylines, { required: true, cascadeDelete: true }),
      text("code", { required: true, unique: true }),
      text("createdById", { required: true }),
      number("maxUses"),
      number("uses"),
      date("expiresAt"),
    ],
  });
}

async function buildStorylineBans(): Promise<void> {
  await upsert({
    name: "storylineBans",
    type: "base",
    schema: [
      relation("storylineId", ids.storylines, { required: true, cascadeDelete: true }),
      text("userId", { required: true }),
      text("bannedById", { required: true }),
      text("reason"),
    ],
  });
}

async function buildStorylineMessages(): Promise<void> {
  // Self-relation: replyToId points to storylineMessages itself.
  // We create the collection first with a placeholder, then patch replyToId.
  ids.storylineMessages = await upsert({
    name: "storylineMessages",
    type: "base",
    schema: [
      relation("channelId", ids.storylineChannels, { required: true, cascadeDelete: true }),
      relation("senderId", ids.personas, { required: true, cascadeDelete: true }),
      text("content"),
      text("imageUrl"),
      date("editedAt"),
      // placeholder targetId — patched below
      relation("replyToId", "__SELF__", { required: false, cascadeDelete: false }),
    ],
  });
  // Patch replyToId collectionId now that we know the ID.
  // NOTE: Pocketbase 0.23 renamed the response field `schema` to `fields`.
  const existing = await findCollection("storylineMessages");
  if (existing) {
    const schemaArray: any[] = existing.fields || existing.schema || [];
    const newSchema = schemaArray.map((f: any) => {
      if (f.name === "replyToId") {
        return { ...f, options: { ...f.options, collectionId: ids.storylineMessages } };
      }
      return f;
    });
    await updateCollection(existing.id, {
      name: "storylineMessages",
      type: "base",
      schema: newSchema,
      fields: newSchema,
    } as any);
  }
}

async function buildStorylineMessageReactions(): Promise<void> {
  await upsert({
    name: "storylineMessageReactions",
    type: "base",
    schema: [
      relation("messageId", ids.storylineMessages, { required: true, cascadeDelete: true }),
      text("userId", { required: true }),
      text("emoji", { required: true }),
    ],
  });
}

async function buildStorylinePinnedMessages(): Promise<void> {
  await upsert({
    name: "storylinePinnedMessages",
    type: "base",
    schema: [
      relation("storylineId", ids.storylines, { required: true, cascadeDelete: true }),
      relation("messageId", ids.storylineMessages, { required: true, cascadeDelete: true }),
      text("pinnedById", { required: true }),
    ],
  });
}

async function buildStorylineBoosts(): Promise<void> {
  await upsert({
    name: "storylineBoosts",
    type: "base",
    schema: [
      relation("storylineId", ids.storylines, { required: true, cascadeDelete: true }),
      relation("personaId", ids.personas, { required: true, cascadeDelete: true }),
      number("amount", { required: true }),
      date("expiresAt", { required: true }),
    ],
  });
}

async function buildStorylineReviews(): Promise<void> {
  await upsert({
    name: "storylineReviews",
    type: "base",
    schema: [
      relation("storylineId", ids.storylines, { required: true, cascadeDelete: true }),
      relation("userId", ids.users, { required: true, cascadeDelete: true }),
      number("rating", { required: true }),
      text("content", { required: true }),
    ],
  });
}

async function buildPersonaConnections(): Promise<void> {
  await upsert({
    name: "personaConnections",
    type: "base",
    schema: [
      relation("personaId", ids.personas, { required: true, cascadeDelete: true }),
      text("characterName", { required: true }),
      text("relationshipType", { required: true }),
      text("specificRole"),
      number("characterAge"),
      text("description"),
    ],
  });
}

async function buildChronosTransactions(): Promise<void> {
  await upsert({
    name: "chronosTransactions",
    type: "base",
    schema: [
      relation("userId", ids.users, { required: true, cascadeDelete: true }),
      number("amount", { required: true }),
      number("balance", { required: true }),
      text("type", { required: true }),
      text("category", { required: true }),
      text("description", { required: true }),
      text("referenceId"),
    ],
  });
}

async function buildReports(): Promise<void> {
  await upsert({
    name: "reports",
    type: "base",
    schema: [
      text("reporterId", { required: true }),
      text("reportedId"),
      text("type", { required: true }),
      text("reason", { required: true }),
      text("details"),
      text("status"),
      text("referenceId"),
      text("reviewedById"),
      date("reviewedAt"),
      text("reviewNote"),
    ],
  });
}

async function buildAdminLogs(): Promise<void> {
  await upsert({
    name: "adminLogs",
    type: "base",
    schema: [
      text("adminId", { required: true }),
      text("action", { required: true }),
      text("targetType", { required: true }),
      text("targetId"),
      text("details"),
    ],
  });
}

async function buildNotifications(): Promise<void> {
  await upsert({
    name: "notifications",
    type: "base",
    schema: [
      relation("userId", ids.users, { required: true, cascadeDelete: true }),
      text("type", { required: true }),
      text("title", { required: true }),
      text("message", { required: true }),
      json("data"),
      bool("isRead"),
      bool("isDismissed"),
    ],
  });
}

async function buildMarketplacePersonas(): Promise<void> {
  ids.marketplacePersonas = await upsert({
    name: "marketplacePersonas",
    type: "base",
    schema: [
      relation("personaId", ids.personas, { required: true, unique: true, cascadeDelete: true }),
      relation("creatorId", ids.users, { required: true, cascadeDelete: true }),
      text("name", { required: true }),
      text("avatarUrl"),
      text("description"),
      json("tags"),
      number("price"),
      number("downloads"),
      number("revenue"),
      bool("isActive"),
      bool("isFeatured"),
      bool("notifyOnPurchase"),
    ],
  });
}

async function buildMarketplacePurchases(): Promise<void> {
  await upsert({
    name: "marketplacePurchases",
    type: "base",
    schema: [
      relation("marketplacePersonaId", ids.marketplacePersonas, { required: true, cascadeDelete: true }),
      relation("buyerId", ids.users, { required: true, cascadeDelete: true }),
      number("pricePaid", { required: true }),
      number("creatorEarnings", { required: true }),
      text("copiedPersonaId"),
    ],
  });
}

async function buildModerationActions(): Promise<void> {
  await upsert({
    name: "moderationActions",
    type: "base",
    schema: [
      relation("adminId", ids.users, { required: true, cascadeDelete: true }),
      relation("targetId", ids.users, { required: true, cascadeDelete: true }),
      text("action", { required: true }),
      text("targetType"),
      text("reason"),
      number("duration"),
      text("notes"),
      date("expiresAt"),
    ],
  });
}

async function buildAchievements(): Promise<void> {
  ids.achievements = await upsert({
    name: "achievements",
    type: "base",
    schema: [
      text("key", { required: true, unique: true }),
      text("name", { required: true }),
      text("description", { required: true }),
      text("icon", { required: true }),
      text("category"),
      number("tier"),
      number("requirement"),
      bool("isHidden"),
      bool("isActive"),
    ],
  });
}

async function buildUserAchievements(): Promise<void> {
  await upsert({
    name: "userAchievements",
    type: "base",
    schema: [
      text("userId", { required: true }),
      relation("achievementId", ids.achievements, { required: true, cascadeDelete: true }),
      number("progress"),
      bool("completed"),
      date("completedAt"),
    ],
  });
}

async function buildStorylineThreads(): Promise<void> {
  ids.storylineThreads = await upsert({
    name: "storylineThreads",
    type: "base",
    schema: [
      relation("channelId", ids.storylineChannels, { required: true, cascadeDelete: true }),
      relation("messageId", ids.storylineMessages, { required: true, cascadeDelete: true }),
      text("name", { required: true }),
      text("createdById", { required: true }),
      bool("isArchived"),
    ],
  });
}

async function buildStorylineThreadMessages(): Promise<void> {
  await upsert({
    name: "storylineThreadMessages",
    type: "base",
    schema: [
      relation("threadId", ids.storylineThreads, { required: true, cascadeDelete: true }),
      text("senderId", { required: true }),
      text("content"),
      text("imageUrl"),
    ],
  });
}

async function buildStorylineChannelMutes(): Promise<void> {
  await upsert({
    name: "storylineChannelMutes",
    type: "base",
    schema: [
      relation("channelId", ids.storylineChannels, { required: true, cascadeDelete: true }),
      text("userId", { required: true }),
    ],
  });
}

async function buildStorylineChannelUnreads(): Promise<void> {
  await upsert({
    name: "storylineChannelUnreads",
    type: "base",
    schema: [
      relation("channelId", ids.storylineChannels, { required: true, cascadeDelete: true }),
      text("userId", { required: true }),
      date("lastReadAt"),
      bool("hasUnread"),
    ],
  });
}

async function buildWikiArticles(): Promise<void> {
  await upsert({
    name: "wikiArticles",
    type: "base",
    schema: [
      relation("storylineId", ids.storylines, { required: true, cascadeDelete: true }),
      text("title", { required: true }),
      text("slug", { required: true }),
      text("content"),
      text("category"),
      relation("createdById", ids.users, { required: true, cascadeDelete: true }),
      relation("lastEditedBy", ids.users, { required: false, cascadeDelete: false }),
      bool("isPinned"),
      number("position"),
    ],
  });
}

async function buildScenarios(): Promise<void> {
  ids.scenarios = await upsert({
    name: "scenarios",
    type: "base",
    schema: [
      relation("personaId", ids.personas, { required: true, cascadeDelete: true }),
      relation("creatorId", ids.users, { required: true, cascadeDelete: true }),
      text("title", { required: true }),
      text("description"),
      text("imageUrl"),
      text("bannerUrl"),
      text("location"),
      text("attire"),
      json("initialMessages"),
      text("mood"),
      json("tags"),
      text("category"),
      bool("isPublic"),
      bool("isFeatured"),
      number("viewCount"),
      number("chatCount"),
      number("likeCount"),
      text("contentRating"),
    ],
  });
}

async function buildScenarioLikes(): Promise<void> {
  await upsert({
    name: "scenarioLikes",
    type: "base",
    schema: [
      relation("scenarioId", ids.scenarios, { required: true, cascadeDelete: true }),
      text("userId", { required: true }),
    ],
  });
}

async function buildImageRecords(): Promise<void> {
  await upsert({
    name: "imageRecords",
    type: "base",
    schema: [
      text("code", { required: true, unique: true }),
      text("url", { required: true }),
      text("discordUrl", { required: true }),
      text("fileName", { required: true }),
      text("fileType", { required: true }),
      number("fileSize", { required: true }),
      text("uploadedBy", { required: true }),
      text("uploadType"),
    ],
  });
}

// -----------------------------------------------------------------------------
// Orchestration (dependency order MUST match the JS migration)
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`[setup-pocketbase] target=${PB_URL} email=${PB_ADMIN_EMAIL}`);
  await adminAuth();
  console.log("[setup-pocketbase] admin auth ok");

  await buildUsers();                     console.log("  ✓ users");
  await buildProfileThemes();             console.log("  ✓ profileThemes");
  await buildPersonas();                  console.log("  ✓ personas");
  await buildConversations();             console.log("  ✓ conversations");
  await buildMessages();                  console.log("  ✓ messages");
  await buildFriendRequests();            console.log("  ✓ friendRequests");
  await buildFriendships();               console.log("  ✓ friendships");
  await buildDmRequests();                console.log("  ✓ dmRequests");
  await buildBlocks();                    console.log("  ✓ blocks");
  await buildFollows();                   console.log("  ✓ follows");
  await buildStorylines();                console.log("  ✓ storylines");
  await buildStorylineCategories();       console.log("  ✓ storylineCategories");
  await buildStorylineRoles();            console.log("  ✓ storylineRoles");
  await buildStorylineChannels();         console.log("  ✓ storylineChannels");
  await buildStorylineChannelPermissions();console.log("  ✓ storylineChannelPermissions");
  await buildStorylineMembers();          console.log("  ✓ storylineMembers");
  await buildStorylineInvites();          console.log("  ✓ storylineInvites");
  await buildStorylineBans();             console.log("  ✓ storylineBans");
  await buildStorylineMessages();         console.log("  ✓ storylineMessages (self-relation patched)");
  await buildStorylineMessageReactions(); console.log("  ✓ storylineMessageReactions");
  await buildStorylinePinnedMessages();   console.log("  ✓ storylinePinnedMessages");
  await buildStorylineBoosts();           console.log("  ✓ storylineBoosts");
  await buildStorylineReviews();          console.log("  ✓ storylineReviews");
  await buildPersonaConnections();        console.log("  ✓ personaConnections");
  await buildChronosTransactions();       console.log("  ✓ chronosTransactions");
  await buildReports();                   console.log("  ✓ reports");
  await buildAdminLogs();                 console.log("  ✓ adminLogs");
  await buildNotifications();             console.log("  ✓ notifications");
  await buildMarketplacePersonas();       console.log("  ✓ marketplacePersonas");
  await buildMarketplacePurchases();      console.log("  ✓ marketplacePurchases");
  await buildModerationActions();         console.log("  ✓ moderationActions");
  await buildAchievements();              console.log("  ✓ achievements");
  await buildUserAchievements();         console.log("  ✓ userAchievements");
  await buildStorylineThreads();          console.log("  ✓ storylineThreads");
  await buildStorylineThreadMessages();   console.log("  ✓ storylineThreadMessages");
  await buildStorylineChannelMutes();     console.log("  ✓ storylineChannelMutes");
  await buildStorylineChannelUnreads();   console.log("  ✓ storylineChannelUnreads");
  await buildWikiArticles();              console.log("  ✓ wikiArticles");
  await buildScenarios();                 console.log("  ✓ scenarios");
  await buildScenarioLikes();             console.log("  ✓ scenarioLikes");
  await buildImageRecords();              console.log("  ✓ imageRecords");

  const all = await listCollections();
  console.log(`[setup-pocketbase] done. total collections: ${all.length}`);
  console.log(all.map((c) => c.name).join(", "));
}

main().catch((err) => {
  console.error("[setup-pocketbase] FATAL:", err);
  process.exit(1);
});
