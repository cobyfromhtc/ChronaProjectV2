import { db } from '@/lib/db'
import crypto from 'crypto'

// Blorp constants
export const BLORP_USER_ID = 'blorp-official'
export const BLORP_USERNAME = 'Blorp'
export const BLORP_AVATAR = 'https://api.dicebear.com/7.x/bots/svg?seed=blorp-chrona&backgroundColor=8b5cf6'

// Chat service URL for internal API calls
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:3003'

/**
 * Emits a socket event via the chat service internal API
 */
async function emitSocketEvent(event: string, payload: any, userId?: string, conversationId?: string): Promise<void> {
  try {
    await fetch(`${CHAT_SERVICE_URL}/internal/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload, userId, conversationId })
    })
  } catch (error) {
    console.error('[Blorp] Failed to emit socket event:', error)
  }
}

// Blorp persona ID for DMs
let blorpPersonaId: string | null = null

/**
 * Ensures the Blorp official bot account exists
 * Should be called on app startup
 */
export async function ensureBlorpExists(): Promise<void> {
  try {
    const existingBlorp = await db.user.findUnique({
      where: { id: BLORP_USER_ID }
    })

    if (existingBlorp) {
      // Ensure Blorp has a persona for DMs
      const blorpPersona = await db.persona.findFirst({
        where: { userId: BLORP_USER_ID }
      })

      if (!blorpPersona) {
        const newPersona = await db.persona.create({
          data: {
            id: `blorp-persona-${crypto.randomBytes(8).toString('hex')}`,
            userId: BLORP_USER_ID,
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

    // Create Blorp user
    await db.user.create({
      data: {
        id: BLORP_USER_ID,
        username: BLORP_USERNAME,
        password: crypto.randomBytes(64).toString('hex'), // Unusable password
        securityKey: crypto.randomBytes(32).toString('hex'),
        avatarUrl: BLORP_AVATAR,
        role: 'owner',
        isOfficial: true,
        chronos: 999999999, // Unlimited Chronos
      }
    })

    // Create Blorp persona for DMs
    const blorpPersona = await db.persona.create({
      data: {
        id: `blorp-persona-${crypto.randomBytes(8).toString('hex')}`,
        userId: BLORP_USER_ID,
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
    const blorpPersona = await db.persona.findFirst({
      where: { userId: BLORP_USER_ID }
    })

    if (blorpPersona) {
      blorpPersonaId = blorpPersona.id
      return blorpPersonaId
    }

    // Create persona if missing
    const newPersona = await db.persona.create({
      data: {
        id: `blorp-persona-${crypto.randomBytes(8).toString('hex')}`,
        userId: BLORP_USER_ID,
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
    const { title, content } = generateBlorpMessage(messageData)

    // Send the message
    const message = await db.message.create({
      data: {
        conversationId,
        senderId: borpId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          }
        }
      }
    })

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })

    // Create notification for the user
    await db.notification.create({
      data: {
        userId,
        type: 'blorp_message',
        title: `📨 ${title}`,
        message: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
        data: JSON.stringify({
          conversationId,
          messageType: messageData.type
        }),
      }
    })

    // Emit real-time events to the user
    const messagePayload = {
      ...message,
      conversationId,
      sender: {
        ...message.sender,
        isOfficial: true
      }
    }
    await emitSocketEvent('blorp-message', messagePayload, userId, conversationId)
    await emitSocketEvent('dm-refresh', {}, userId)

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
    const message = await db.message.create({
      data: {
        conversationId,
        senderId: borpId,
        content: customContent,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          }
        }
      }
    })

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })

    // Create notification for the user
    await db.notification.create({
      data: {
        userId,
        type: 'blorp_message',
        title: '📨 Message from Blorp',
        message: customContent.slice(0, 200) + (customContent.length > 200 ? '...' : ''),
        data: JSON.stringify({
          conversationId,
          messageType: 'custom'
        }),
      }
    })

    // Emit real-time events to the user
    const messagePayload = {
      ...message,
      conversationId,
      sender: {
        ...message.sender,
        isOfficial: true
      }
    }
    await emitSocketEvent('blorp-message', messagePayload, userId, conversationId)
    await emitSocketEvent('dm-refresh', {}, userId)

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

// ==================== BLORP STAFF COMMANDS ====================

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<string, number> = {
  'member': 0,
  'notable_member': 1,
  'artist': 1,
  'verified_creator': 1,
  'contributor': 1,
  'intern_mod': 2,
  'mod': 3,
  'senior_mod': 4,
  'head_mod': 5,
  'admin': 6,
  'head_staff': 7,
  'assistant_manager': 8,
  'manager': 9,
  'executive_chairman': 10,
  'owner': 11,
}

function hasMinPermission(role: string, minRole: string): boolean {
  const roleLevel = ROLE_HIERARCHY[role] || 0
  const minLevel = ROLE_HIERARCHY[minRole] || 0
  return roleLevel >= minLevel
}

interface BlorpCommandResult {
  success: boolean
  message: string
}

/**
 * Handle staff commands sent to Blorp via DM
 * Commands use ! prefix
 */
export async function handleBlorpCommand(
  content: string,
  senderId: string,
  senderRole: string,
  senderUsername: string
): Promise<BlorpCommandResult> {
  const trimmed = content.trim()
  
  // Check if it's a command (starts with !)
  if (!trimmed.startsWith('!')) {
    return { success: false, message: 'Not a command. Use !help to see available commands.' }
  }
  
  const parts = trimmed.slice(1).split(/\s+/)
  const command = parts[0]?.toLowerCase()
  const args = parts.slice(1)
  
  // !help - Show available commands
  if (command === 'help') {
    return {
      success: true,
      message: `🤖 **Blorp Staff Commands**
    
**Currency Commands** (Manager+)
• \`!give <user> <amount> [reason]\` - Give Chronos to a user
• \`!take <user> <amount> [reason]\` - Take Chronos from a user

**Messaging Commands** (Manager+)
• \`!dm <user> <message>\` - Send a DM to a user as Blorp
• \`!announce <message>\` - Send a message to ALL users

**Moderation Commands** (Mod+)
• \`!warn <user> [reason]\` - Warn a user
• \`!mute <user> <minutes> [reason]\` - Mute a user
• \`!unmute <user>\` - Unmute a user

**Info Commands** (All Staff)
• \`!lookup <user>\` - Get user info
• \`!balance <user>\` - Check user's Chronos balance

**Examples:**
• \`!give dash 10000 Won the art contest!\`
• \`!dm dash Welcome to Chrona!\`
• \`!warn spamking Please stop spamming\``,
    }
  }
  
  // !give - Give Chronos to a user (Manager+)
  if (command === 'give') {
    if (!hasMinPermission(senderRole, 'manager')) {
      return { success: false, message: '❌ You need Manager+ permission to use this command.' }
    }
    
    const targetUsername = args[0]
    const amount = parseInt(args[1])
    const reason = args.slice(2).join(' ') || 'No reason provided'
    
    if (!targetUsername || isNaN(amount) || amount <= 0) {
      return { success: false, message: '❌ Usage: !give <user> <amount> [reason]' }
    }
    
    if (amount > 1000000) {
      return { success: false, message: '❌ Maximum amount is 1,000,000 Chronos per transaction.' }
    }
    
    const targetUser = await db.user.findFirst({
      where: { username: { equals: targetUsername, mode: 'insensitive' } }
    })
    
    if (!targetUser) {
      return { success: false, message: `❌ User "${targetUsername}" not found.` }
    }
    
    // Update balance
    const newBalance = targetUser.chronos + amount
    await db.user.update({
      where: { id: targetUser.id },
      data: { chronos: newBalance }
    })
    
    // Record transaction
    await db.chronosTransaction.create({
      data: {
        userId: targetUser.id,
        amount: amount,
        balance: newBalance,
        type: 'admin',
        category: 'staff_grant',
        description: `Granted by ${senderUsername}: ${reason}`,
      }
    })
    
    // Notify the recipient
    await sendBlorpMessage(targetUser.id, {
      type: 'chronos_granted',
      amount,
      adminName: senderUsername,
      reason,
    })
    
    return {
      success: true,
      message: `✅ Gave **${amount.toLocaleString()} Chronos** to **${targetUser.username}**.\nReason: ${reason}\nNew balance: ${newBalance.toLocaleString()} Chronos`,
    }
  }
  
  // !take - Take Chronos from a user (Manager+)
  if (command === 'take') {
    if (!hasMinPermission(senderRole, 'manager')) {
      return { success: false, message: '❌ You need Manager+ permission to use this command.' }
    }
    
    const targetUsername = args[0]
    const amount = parseInt(args[1])
    const reason = args.slice(2).join(' ') || 'No reason provided'
    
    if (!targetUsername || isNaN(amount) || amount <= 0) {
      return { success: false, message: '❌ Usage: !take <user> <amount> [reason]' }
    }
    
    const targetUser = await db.user.findFirst({
      where: { username: { equals: targetUsername, mode: 'insensitive' } }
    })
    
    if (!targetUser) {
      return { success: false, message: `❌ User "${targetUsername}" not found.` }
    }
    
    if (targetUser.chronos < amount) {
      return { success: false, message: `❌ User only has ${targetUser.chronos.toLocaleString()} Chronos. Cannot take ${amount.toLocaleString()}.` }
    }
    
    // Update balance
    const newBalance = targetUser.chronos - amount
    await db.user.update({
      where: { id: targetUser.id },
      data: { chronos: newBalance }
    })
    
    // Record transaction
    await db.chronosTransaction.create({
      data: {
        userId: targetUser.id,
        amount: -amount,
        balance: newBalance,
        type: 'admin',
        category: 'staff_deduct',
        description: `Deducted by ${senderUsername}: ${reason}`,
      }
    })
    
    // Notify the user
    await sendBlorpMessage(targetUser.id, {
      type: 'chronos_deducted',
      amount,
      reason: `${reason} (Action by: ${senderUsername})`,
    })
    
    return {
      success: true,
      message: `✅ Took **${amount.toLocaleString()} Chronos** from **${targetUser.username}**.\nReason: ${reason}\nNew balance: ${newBalance.toLocaleString()} Chronos`,
    }
  }
  
  // !dm - Send a DM to a user as Blorp (Manager+)
  if (command === 'dm') {
    if (!hasMinPermission(senderRole, 'manager')) {
      return { success: false, message: '❌ You need Manager+ permission to use this command.' }
    }
    
    const targetUsername = args[0]
    const messageContent = args.slice(1).join(' ')
    
    if (!targetUsername || !messageContent) {
      return { success: false, message: '❌ Usage: !dm <user> <message>' }
    }
    
    const targetUser = await db.user.findFirst({
      where: { username: { equals: targetUsername, mode: 'insensitive' } }
    })
    
    if (!targetUser) {
      return { success: false, message: `❌ User "${targetUsername}" not found.` }
    }
    
    // Send the message
    const result = await sendCustomBlorpMessage(targetUser.id, messageContent)
    
    if (result.success) {
      return {
        success: true,
        message: `✅ DM sent to **${targetUser.username}**!\nMessage: ${messageContent}`,
      }
    } else {
      return { success: false, message: `❌ Failed to send DM: ${result.error}` }
    }
  }
  
  // !announce - Send a message to all users (Manager+)
  if (command === 'announce') {
    if (!hasMinPermission(senderRole, 'manager')) {
      return { success: false, message: '❌ You need Manager+ permission to use this command.' }
    }
    
    const messageContent = args.join(' ')
    
    if (!messageContent) {
      return { success: false, message: '❌ Usage: !announce <message>' }
    }
    
    // Confirmation prefix
    const fullMessage = `📢 **Announcement**\n\n${messageContent}\n\n— ${senderUsername}`
    
    const result = await sendBlorpMessageToAll(fullMessage)
    
    return {
      success: true,
      message: `✅ Announcement sent!\nSent: ${result.sentCount}\nFailed: ${result.failedCount}\n\nMessage:\n${fullMessage.substring(0, 200)}...`,
    }
  }
  
  // !warn - Warn a user (Mod+)
  if (command === 'warn') {
    if (!hasMinPermission(senderRole, 'mod')) {
      return { success: false, message: '❌ You need Mod+ permission to use this command.' }
    }
    
    const targetUsername = args[0]
    const reason = args.slice(1).join(' ') || 'No reason provided'
    
    if (!targetUsername) {
      return { success: false, message: '❌ Usage: !warn <user> [reason]' }
    }
    
    const targetUser = await db.user.findFirst({
      where: { username: { equals: targetUsername, mode: 'insensitive' } }
    })
    
    if (!targetUser) {
      return { success: false, message: `❌ User "${targetUsername}" not found.` }
    }
    
    // Increment warning count
    await db.user.update({
      where: { id: targetUser.id },
      data: { warningCount: { increment: 1 } }
    })
    
    // Create moderation action record
    await db.moderationAction.create({
      data: {
        adminId: senderId,
        targetId: targetUser.id,
        action: 'warn',
        targetType: 'user',
        reason,
      }
    })
    
    // Notify the user
    await sendCustomBlorpMessage(targetUser.id, `⚠️ **Warning**\n\nYou have received a warning.\n\n**Reason:** ${reason}\n\nPlease review our Terms of Service and community guidelines. Repeated violations may result in further action.`)
    
    return {
      success: true,
      message: `✅ Warned **${targetUser.username}**.\nReason: ${reason}\nWarning count: ${(targetUser.warningCount || 0) + 1}`,
    }
  }
  
  // !mute - Mute a user (Mod+)
  if (command === 'mute') {
    if (!hasMinPermission(senderRole, 'mod')) {
      return { success: false, message: '❌ You need Mod+ permission to use this command.' }
    }
    
    const targetUsername = args[0]
    const minutes = parseInt(args[1]) || 60
    const reason = args.slice(2).join(' ') || 'No reason provided'
    
    if (!targetUsername) {
      return { success: false, message: '❌ Usage: !mute <user> <minutes> [reason]' }
    }
    
    const targetUser = await db.user.findFirst({
      where: { username: { equals: targetUsername, mode: 'insensitive' } }
    })
    
    if (!targetUser) {
      return { success: false, message: `❌ User "${targetUsername}" not found.` }
    }
    
    const mutedUntil = new Date(Date.now() + minutes * 60 * 1000)
    
    await db.user.update({
      where: { id: targetUser.id },
      data: { 
        isMuted: true,
        mutedUntil,
      }
    })
    
    // Create moderation action record
    await db.moderationAction.create({
      data: {
        adminId: senderId,
        targetId: targetUser.id,
        action: 'mute',
        targetType: 'user',
        reason,
        duration: minutes,
        expiresAt: mutedUntil,
      }
    })
    
    // Notify the user
    await sendCustomBlorpMessage(targetUser.id, `🔇 **You have been muted**\n\n**Duration:** ${minutes} minutes\n**Reason:** ${reason}\n\nYou will be unable to send messages until the mute expires.`)
    
    return {
      success: true,
      message: `✅ Muted **${targetUser.username}** for ${minutes} minutes.\nReason: ${reason}\nExpires: ${mutedUntil.toLocaleString()}`,
    }
  }
  
  // !unmute - Unmute a user (Mod+)
  if (command === 'unmute') {
    if (!hasMinPermission(senderRole, 'mod')) {
      return { success: false, message: '❌ You need Mod+ permission to use this command.' }
    }
    
    const targetUsername = args[0]
    
    if (!targetUsername) {
      return { success: false, message: '❌ Usage: !unmute <user>' }
    }
    
    const targetUser = await db.user.findFirst({
      where: { username: { equals: targetUsername, mode: 'insensitive' } }
    })
    
    if (!targetUser) {
      return { success: false, message: `❌ User "${targetUsername}" not found.` }
    }
    
    if (!targetUser.isMuted) {
      return { success: false, message: `❌ User "${targetUser.username}" is not muted.` }
    }
    
    await db.user.update({
      where: { id: targetUser.id },
      data: { 
        isMuted: false,
        mutedUntil: null,
      }
    })
    
    // Notify the user
    await sendCustomBlorpMessage(targetUser.id, `🔊 **You have been unmuted**\n\nYou can now send messages again. Please remember to follow our community guidelines.`)
    
    return {
      success: true,
      message: `✅ Unmuted **${targetUser.username}**.`,
    }
  }
  
  // !lookup - Get user info (All Staff)
  if (command === 'lookup') {
    if (!hasMinPermission(senderRole, 'intern_mod')) {
      return { success: false, message: '❌ You need Staff permission to use this command.' }
    }
    
    const targetUsername = args[0]
    
    if (!targetUsername) {
      return { success: false, message: '❌ Usage: !lookup <user>' }
    }
    
    const targetUser = await db.user.findFirst({
      where: { username: { equals: targetUsername, mode: 'insensitive' } },
      include: {
        _count: { select: { personas: true } }
      }
    })
    
    if (!targetUser) {
      return { success: false, message: `❌ User "${targetUsername}" not found.` }
    }
    
    return {
      success: true,
      message: `📋 **User Info: ${targetUser.username}**
    
• **ID:** ${targetUser.id}
• **Role:** ${targetUser.role}
• **Chronos:** ${targetUser.chronos.toLocaleString()}
• **Personas:** ${targetUser._count.personas}
• **Warnings:** ${targetUser.warningCount}
• **Muted:** ${targetUser.isMuted ? 'Yes' : 'No'}
• **Banned:** ${targetUser.isBanned ? 'Yes' : 'No'}
• **Suspended:** ${targetUser.isSuspended ? 'Yes' : 'No'}
• **Created:** ${new Date(targetUser.createdAt).toLocaleDateString()}`,
    }
  }
  
  // !balance - Check user's Chronos balance (All Staff)
  if (command === 'balance') {
    if (!hasMinPermission(senderRole, 'intern_mod')) {
      return { success: false, message: '❌ You need Staff permission to use this command.' }
    }
    
    const targetUsername = args[0]
    
    if (!targetUsername) {
      return { success: false, message: '❌ Usage: !balance <user>' }
    }
    
    const targetUser = await db.user.findFirst({
      where: { username: { equals: targetUsername, mode: 'insensitive' } }
    })
    
    if (!targetUser) {
      return { success: false, message: `❌ User "${targetUsername}" not found.` }
    }
    
    return {
      success: true,
      message: `💰 **${targetUser.username}'s Balance:** ${targetUser.chronos.toLocaleString()} Chronos`,
    }
  }
  
  // Unknown command
  return {
    success: false,
    message: `❌ Unknown command: "${command}". Type !help to see available commands.`,
  }
}