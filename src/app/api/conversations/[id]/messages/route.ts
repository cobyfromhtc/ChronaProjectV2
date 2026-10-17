import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// Maximum number of image attachments allowed per message
const MAX_ATTACHMENTS = 10

// Normalize the `attachments` field into a string[] (it is stored as a JSON
// string in the DB; older records may have null/undefined or a stale shape).
function normalizeAttachments(value: unknown): string[] {
  if (value == null) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0)
    }
  } catch {
    /* fallthrough */
  }
  return []
}

// GET - Fetch messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { id: conversationId } = await params
    
    // Verify user is part of this conversation
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        personaA: { select: { userId: true } },
        personaB: { select: { userId: true } },
      }
    })
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }
    
    const userIds = [conversation.personaA.userId, conversation.personaB.userId]
    if (!userIds.includes(user.id)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Get messages with sender info including isOfficial
    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            user: {
              select: {
                isOfficial: true
              }
            }
          }
        }
      }
    })

    // Transform messages to include isOfficial flag + normalized attachments array
    const transformedMessages = messages.map(msg => ({
      ...msg,
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        avatarUrl: msg.sender.avatarUrl,
        isOfficial: msg.sender.user?.isOfficial || false
      },
      // `attachments` is stored as a JSON string (array of image URLs).
      // Normalize it to a plain array for the client (handles legacy
      // messages where the field may be missing or already structured).
      attachments: normalizeAttachments((msg as any).attachments)
    }))

    return NextResponse.json({
      success: true,
      messages: transformedMessages
    })
    
  } catch (error) {
    console.error('Fetch messages error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// POST - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { id: conversationId } = await params
    const body = await request.json()
    const { content, senderPersonaId, imageUrl, attachments } = body
    
    // Normalize + validate attachments (array of image URLs)
    const normalizedAttachments = normalizeAttachments(attachments)
    
    // Require either content, imageUrl, or at least one attachment
    if ((!content || !content.trim()) && !imageUrl && normalizedAttachments.length === 0) {
      return NextResponse.json(
        { error: 'Message content or image is required' },
        { status: 400 }
      )
    }
    
    if (normalizedAttachments.length > MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: `A message can have at most ${MAX_ATTACHMENTS} attachments` },
        { status: 400 }
      )
    }
    
    if (!senderPersonaId) {
      return NextResponse.json(
        { error: 'Sender persona is required' },
        { status: 400 }
      )
    }
    
    // Verify conversation exists and user is part of it
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        personaA: { select: { userId: true, id: true } },
        personaB: { select: { userId: true, id: true } },
      }
    })
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }
    
    // Verify sender persona belongs to user and is in this conversation
    const validSenderIds = [conversation.personaA.id, conversation.personaB.id]
    if (!validSenderIds.includes(senderPersonaId)) {
      return NextResponse.json(
        { error: 'Invalid sender persona' },
        { status: 400 }
      )
    }
    
    const senderPersona = await db.persona.findFirst({
      where: { id: senderPersonaId, userId: user.id }
    })
    
    if (!senderPersona) {
      return NextResponse.json(
        { error: 'Sender persona not found' },
        { status: 400 }
      )
    }
    
    // Create message
    const message = await db.message.create({
      data: {
        conversationId,
        senderId: senderPersonaId,
        content: content?.trim() || '',
        imageUrl: imageUrl || null,
        // Store attachments as a JSON string (legacy-compatible; the db
        // adapter re-parses it into PB's native json field).
        attachments: normalizedAttachments.length > 0 ? JSON.stringify(normalizedAttachments) : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            user: {
              select: {
                isOfficial: true
              }
            }
          }
        }
      }
    })

    // Transform message to include isOfficial flag + attachments array
    const transformedMessage = {
      ...message,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatarUrl: message.sender.avatarUrl,
        isOfficial: message.sender.user?.isOfficial || false
      },
      attachments: normalizeAttachments((message as any).attachments)
    }

    // Update conversation's lastMessageAt
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      message: transformedMessage
    })
    
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}