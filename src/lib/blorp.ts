import { db } from '@/lib/db'
import crypto from 'crypto'

// Blorp constants
// Note: BLORP_USER_ID is now a logical handle (not a PB record id).
// We look up Blorp by `username` since Pocketbase auto-generates record ids
// on auth collection creation (you cannot pass `id` to db.user.create).
export const BLORP_USER_ID = 'blorp-official'
export const BLORP_USERNAME = 'Blorp'
export const BLORP_AVATAR = 'https://api.dicebear.com/7.x/bots/svg?seed=blorp-chrona&backgroundColor=8b5cf6'

// Blorp persona ID for DMs (cached in-memory after first lookup)
let blorpPersonaId: string | null = null
let blorpUserRecordId: string | null = null

/**
 * Returns Blorp's actual Pocketbase record id (looked up by username).
 * Used internally so we can pass the real id to relation fields.
 */
async function getBlorpUserRecordId(): Promise<string | null> {
  if (blorpUserRecordId) return blorpUserRecordId
  try {
    const blorp = await db.user.findUnique({ where: { username: BLORP_USERNAME } })
    if (blorp) {
      blorpUserRecordId = blorp.id
      return blorpUserRecordId
    }
  } catch (error) {
    console.error('[Blorp] Error looking up Blorp user:', error)
  }
  return null
}

/**
 * Ensures the Blorp official bot account exists
 * Should be called on app startup
 */
export async function ensureBlorpExists(): Promise<void> {
  try {
    // Look up by username (Pocketbase auto-generates the id on create)
    const existingBlorp = await db.user.findUnique({
      where: { username: BLORP_USERNAME }
    })

    if (existingBlorp) {
      blorpUserRecordId = existingBlorp.id
      // Ensure Blorp has a persona for DMs
      const blorpPersona = await db.persona.findFirst({
        where: { userId: existingBlorp.id }
      })

      if (!blorpPersona) {
        const newPersona = await db.persona.create({
          data: {
            userId: existingBlorp.id,
            name: 'Blorp',
            avatarUrl: BLORP_AVATAR,
            description: 'Official Chrona Bot - Your friendly notification assistant!',
            isActive: true,
            isOnline: true,
          }
        })
        blorpPersonaId = newPersona.id
      } else {
        blorpPersonaId = blorpPersona.id
      }
      return
    }

    // Create Blorp user (let PB auto-generate the id — passing `id` is ignored)
    const newBlorp = await db.user.create({
      data: {
        username: BLORP_USERNAME,
        password: crypto.randomBytes(32).toString('hex') + 'Aa1!', // Unusable password (meets min length 8 + complexity)
        securityKey: crypto.randomBytes(32).toString('hex'),
        avatarUrl: BLORP_AVATAR,
        role: 'owner',
        isOfficial: true,
        chronos: 999999999, // Unlimited Chronos
      }
    })
    blorpUserRecordId = newBlorp.id

    // Create Blorp persona for DMs
    const blorpPersona = await db.persona.create({
      data: {
        userId: newBlorp.id,
        name: 'Blorp',
        avatarUrl: BLORP_AVATAR,
        description: 'Official Chrona Bot - Your friendly notification assistant!',
        isActive: true,
        isOnline: true,
      }
    })

    blorpPersonaId = blorpPersona.id
    console.log('[Blorp] Official bot account created')
  } catch (error) {
    console.error('[Blorp] Error ensuring Blorp exists:', error)
  }
}

/**
 * Gets Blorp's persona ID (creates persona if needed)
 */
export async function getBlorpPersonaId(): Promise<string | null> {
  if (blorpPersonaId) return blorpPersonaId

  try {
    const blorpUserId = await getBlorpUserRecordId()
    if (!blorpUserId) {
      // Try to ensure Blorp exists first (in case ensureBlorpExists hasn't run)
      await ensureBlorpExists()
      const retryId = await getBlorpUserRecordId()
      if (!retryId) return null
      return getBlorpPersonaId()
    }

    const blorpPersona = await db.persona.findFirst({
      where: { userId: blorpUserId }
    })

    if (blorpPersona) {
      blorpPersonaId = blorpPersona.id
      return blorpPersonaId
    }

    // Create persona if missing
    const newPersona = await db.persona.create({
      data: {
        userId: blorpUserId,
        name: 'Blorp',
        avatarUrl: BLORP_AVATAR,
        description: 'Official Chrona Bot - Your friendly notification assistant!',
        isActive: true,
        isOnline: true,
      }
    })

    blorpPersonaId = newPersona.id
    return blorpPersonaId
  } catch (error) {
    console.error('[Blorp] Error getting Blorp persona:', error)
    return null
  }
}

/**
 * Gets a user's active persona ID
 */
async function getUserPersonaId(userId: string): Promise<string | null> {
  const persona = await db.persona.findFirst({
    where: {
      userId,
      isActive: true
    }
  })

  if (persona) return persona.id

  // Get any persona if no active one
  const anyPersona = await db.persona.findFirst({
    where: { userId }
  })

  return anyPersona?.id || null
}

/**
 * Gets or creates a conversation between Blorp and a user's persona
 */
async function getOrCreateBlorpConversation(userPersonaId: string): Promise<string | null> {
  const borpId = await getBlorpPersonaId()
  if (!borpId) return null

  // Check for existing conversation (Blorp is always personaA for consistency)
  const existing = await db.conversation.findFirst({
    where: {
      OR: [
        { personaAId: borpId, personaBId: userPersonaId },
        { personaAId: userPersonaId, personaBId: borpId }
      ]
    }
  })

  if (existing) return existing.id

  // Create new conversation
  const conversation = await db.conversation.create({
    data: {
      personaAId: borpId,
      personaBId: userPersonaId,
    }
  })

  return conversation.id
}

/**
 * Message types for Blorp notifications
 */
export type BlorpMessageType =
  | 'welcome'
  | 'gift_sent'
  | 'gift_received'
  | 'chronos_deducted'
  | 'chronos_granted'
  | 'marketplace_sale'
  | 'marketplace_purchase'

interface BlorpMessageData {
  type: BlorpMessageType
  amount?: number
  recipientUsername?: string
  senderUsername?: string
  reason?: string
  adminName?: string
  personaName?: string
  price?: number
  earnings?: number
}

/**
 * Generates Blorp message content based on type
 */
function generateBlorpMessage(data: BlorpMessageData): { title: string; content: string } {
  switch (data.type) {
    case 'welcome':
      return {
        title: 'Welcome to Chrona!',
        content: `Hello, and welcome to Chrona! 🎉

I'm Blorp, your official Chrona assistant! I'm here to keep you updated on important account activity.

Here's what you can do on Chrona:
• Create unique character personas and roleplay with others
• Join storylines and build stories together
• Earn and spend Chronos on cool customization options
• Buy and sell personas on the marketplace

If you have any questions, feel free to explore or ask the community!

Happy roleplaying! ✨`
      }

    case 'gift_sent':
      return {
        title: 'Gift Sent! 🎁',
        content: `You sent a gift of **${data.amount?.toLocaleString()} Chronos** to @${data.recipientUsername}!

${data.reason ? `Your message: "${data.reason}"` : 'No message was included with this gift.'}

The recipient has been notified and received the Chronos directly.`
      }

    case 'gift_received':
      return {
        title: 'You Received a Gift! 🎁',
        content: `Great news! @${data.senderUsername} sent you a gift of **${data.amount?.toLocaleString()} Chronos**!

${data.reason ? `They said: "${data.reason}"` : ''}

Your new balance has been updated. Enjoy!`
      }

    case 'chronos_deducted':
      return {
        title: 'Chronos Deducted',
        content: `**${data.amount?.toLocaleString()} Chronos** have been deducted from your account.

${data.reason ? `Reason: ${data.reason}` : ''}

If you believe this was an error, please contact support.`
      }

    case 'chronos_granted':
      return {
        title: 'Chronos Granted! 💰',
        content: `You've been granted **${data.amount?.toLocaleString()} Chronos**!

${data.adminName ? `Granted by: ${data.adminName}` : ''}

${data.reason ? `Reason: ${data.reason}` : ''}

Your balance has been updated. Enjoy!`
      }

    case 'marketplace_sale':
      // Handle both paid and free downloads
      if (data.earnings && data.earnings > 0) {
        return {
          title: 'Your Persona Sold! 💎',
          content: `Congratulations! Your persona **"${data.personaName}"** has been purchased from the marketplace!

**Sale Details:**
• Price: ${data.price?.toLocaleString()} Chronos
• Your Earnings: ${data.earnings?.toLocaleString()} Chronos (after fees)

The Chronos have been added to your balance. Keep creating amazing characters! ✨`
        }
      } else {
        return {
          title: 'Your Persona Was Downloaded! 🎉',
          content: `Great news! Your persona **"${data.personaName}"** has been downloaded from the marketplace!

Someone appreciated your character enough to add it to their collection. Keep creating amazing characters! ✨`
        }
      }

    case 'marketplace_purchase':
      return {
        title: 'Purchase Confirmed! 🛒',
        content: `Your marketplace purchase is complete!

**Details:**
• Persona: ${data.personaName}
• Price: ${data.price?.toLocaleString()} Chronos

You can now find this persona in your collection. Enjoy your new character!`
      }

    default:
      return {
        title: 'Notification',
        content: 'You have a new notification from Chrona.'
      }
  }
}

/**
 * Sends a message from Blorp to a user
 */
export async function sendBlorpMessage(
  userId: string,
  messageData: BlorpMessageData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's persona
    const userPersonaId = await getUserPersonaId(userId)
    if (!userPersonaId) {
      return { success: false, error: 'User has no persona' }
    }

    // Get Blorp's persona
    const borpId = await getBlorpPersonaId()
    if (!borpId) {
      return { success: false, error: 'Blorp persona not found' }
    }

    // Get or create conversation
    const conversationId = await getOrCreateBlorpConversation(userPersonaId)
    if (!conversationId) {
      return { success: false, error: 'Could not create conversation' }
    }

    // Generate message content
    const { content } = generateBlorpMessage(messageData)

    // Send the message
    await db.message.create({
      data: {
        conversationId,
        senderId: borpId,
        content,
      }
    })

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })

    // Realtime ping so the recipient's sidebar / unread badges refresh
    // (skipped when the recipient muted this conversation — message still stored)
    const { pushDmActivity, isConversationMuted } = await import('@/lib/socket-emit')
    const muted = await isConversationMuted(userId, conversationId)
    if (!muted) {
      void pushDmActivity(userId, {
        conversationId,
        preview: content.slice(0, 90),
        fromPersonaName: 'Blorp',
      }).catch(() => {})
    }

    return { success: true }
  } catch (error) {
    console.error('[Blorp] Error sending message:', error)
    return { success: false, error: 'Failed to send message' }
  }
}

/**
 * Sends a custom message from Blorp to a user (for admin commands)
 */
export async function sendCustomBlorpMessage(
  userId: string,
  customContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's persona
    const userPersonaId = await getUserPersonaId(userId)
    if (!userPersonaId) {
      return { success: false, error: 'User has no persona' }
    }

    // Get Blorp's persona
    const borpId = await getBlorpPersonaId()
    if (!borpId) {
      return { success: false, error: 'Blorp persona not found' }
    }

    // Get or create conversation
    const conversationId = await getOrCreateBlorpConversation(userPersonaId)
    if (!conversationId) {
      return { success: false, error: 'Could not create conversation' }
    }

    // Send the custom message
    await db.message.create({
      data: {
        conversationId,
        senderId: borpId,
        content: customContent,
      }
    })

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })

    return { success: true }
  } catch (error) {
    console.error('[Blorp] Error sending custom message:', error)
    return { success: false, error: 'Failed to send message' }
  }
}

/**
 * Sends a message from Blorp to all users (for announcements)
 */
export async function sendBlorpMessageToAll(
  content: string
): Promise<{ success: boolean; sentCount: number; failedCount: number; errors: string[] }> {
  const results = {
    success: true,
    sentCount: 0,
    failedCount: 0,
    errors: [] as string[]
  }

  try {
    // Get all users (excluding Blorp itself)
    const users = await db.user.findMany({
      where: {
        id: { not: BLORP_USER_ID },
        isBanned: false,
        isFrozen: false,
      },
      select: { id: true }
    })

    // Send to each user
    for (const user of users) {
      const result = await sendCustomBlorpMessage(user.id, content)
      if (result.success) {
        results.sentCount++
      } else {
        results.failedCount++
        results.errors.push(`User ${user.id}: ${result.error}`)
      }
    }

    return results
  } catch (error) {
    console.error('[Blorp] Error sending message to all:', error)
    results.success = false
    results.errors.push('Failed to fetch users')
    return results
  }
}

/**
 * Helper function to send custom Blorp message (used by modCommands)
 */
export async function sendCustomBlorpMessageWrapper(
  userId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  return sendCustomBlorpMessage(userId, content)
}

/**
 * Helper function to send Blorp message to all users (used by modCommands)
 */
export async function sendBlorpMessageToAllWrapper(
  content: string
): Promise<{ success: boolean; sentCount: number; failedCount: number; errors: string[] }> {
  return sendBlorpMessageToAll(content)
}

// ===========================================================
// Onboarding welcome (Task 2-a)
// ===========================================================

/**
 * Unique phrase embedded in the onboarding welcome message. Used to detect —
 * and therefore never duplicate — the welcome inside a Blorp conversation.
 * Must stay in sync with ONBOARDING_WELCOME_CONTENT below.
 */
const ONBOARDING_WELCOME_MARKER = 'official Chrona bot on the job'

/**
 * Welcome DM Blorp sends when a user finishes first-login onboarding.
 * Friendly bot tone; explains who Blorp is, what its job is, and gives a few
 * getting-started pointers.
 */
const ONBOARDING_WELCOME_CONTENT = `Hiya — welcome to Chrona! 🫧 I'm **Blorp**, the official Chrona bot, and this DM is your direct line to everything official.

Here's my job: I send you guidance, tips, and important announcements, help you get started, answer support questions, and handle moderation appeals. If anything ever comes up — a question, a problem, or a decision you'd like to talk through — just reply right here and I'll help you sort it.

A few quick pointers to get you rolling: create your first persona (you've got **25 free slots**), hop into the **Chrona Community** storyline to meet people, and invite your friends over with **SI.FY://** invite codes.

See you around the universe! ✨
— Blorp, ${ONBOARDING_WELCOME_MARKER} 🫧`

export interface SendOnboardingWelcomeResult {
  success: boolean
  /** True when the welcome already existed and was intentionally not re-sent */
  alreadySent?: boolean
  error?: string
}

/**
 * Sends (or re-uses) the Blorp onboarding welcome DM for a user.
 *
 * Finds-or-creates the Blorp ↔ user's-active-persona conversation and inserts
 * the welcome message from Blorp. Idempotent: if the conversation already
 * contains the onboarding welcome (detected via a unique marker phrase), it is
 * never sent twice. Safe to call from onboarding completion AND from first
 * persona creation.
 *
 * Fails gracefully (returns success: false) when the user has no persona yet —
 * the caller can retry later (e.g. when the first persona is created).
 */
export async function sendOnboardingWelcome(userId: string): Promise<SendOnboardingWelcomeResult> {
  try {
    // Get user's persona — DM conversations attach to personas, so a user
    // without a persona can't receive the welcome yet.
    const userPersonaId = await getUserPersonaId(userId)
    if (!userPersonaId) {
      return { success: false, error: 'User has no persona yet' }
    }

    // Get Blorp's persona
    const borpId = await getBlorpPersonaId()
    if (!borpId) {
      return { success: false, error: 'Blorp persona not found' }
    }

    // Get or create conversation
    const conversationId = await getOrCreateBlorpConversation(userPersonaId)
    if (!conversationId) {
      return { success: false, error: 'Could not create conversation' }
    }

    // Never double-send: if this conversation already contains the onboarding
    // welcome, we're done.
    const existing = await db.message.findFirst({
      where: {
        conversationId,
        senderId: borpId,
        content: { contains: ONBOARDING_WELCOME_MARKER },
      },
      select: { id: true },
    })
    if (existing) {
      return { success: true, alreadySent: true }
    }

    // Send the welcome message
    await db.message.create({
      data: {
        conversationId,
        senderId: borpId,
        content: ONBOARDING_WELCOME_CONTENT,
      }
    })

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })

    // Realtime ping so the fresh user's conversation list updates live
    // (a brand-new user cannot have muted anything yet, but the check is
    // cheap and keeps the semantics uniform)
    const { pushDmActivity, isConversationMuted } = await import('@/lib/socket-emit')
    const muted = await isConversationMuted(userId, conversationId)
    if (!muted) {
      void pushDmActivity(userId, {
        conversationId,
        preview: ONBOARDING_WELCOME_CONTENT.slice(0, 90),
        fromPersonaName: 'Blorp',
      }).catch(() => {})
    }

    return { success: true, alreadySent: false }
  } catch (error) {
    console.error('[Blorp] Error sending onboarding welcome:', error)
    return { success: false, error: 'Failed to send message' }
  }
}
