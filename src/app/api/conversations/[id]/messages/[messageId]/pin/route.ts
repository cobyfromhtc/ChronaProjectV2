import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// =============================================================
// Message Pinning API
// =============================================================
// POST   /api/conversations/[id]/messages/[messageId]/pin
//   Body: { personaId }
//   Toggles a pin: adds it if not present, removes it if it exists.
//   Returns { pinned: boolean, pinnedMessages: [...] }
//
// GET    /api/conversations/[id]/messages/[messageId]/pin
//   Returns whether this specific message is pinned.
//
// GET    /api/conversations/[id]/pins  (separate route — not here)
//   Returns all pinned messages for a conversation.
// =============================================================

// POST - Toggle pin on a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: conversationId, messageId } = await params
    const body = await request.json()
    const { personaId } = body

    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    const userIds = [conversation.personaA.userId, conversation.personaB.userId]
    if (!userIds.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify persona belongs to user
    const persona = await db.persona.findFirst({
      where: { id: personaId, userId: user.id }
    })
    if (!persona) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }

    // Verify the message exists and belongs to this conversation
    const message = await db.message.findUnique({ where: { id: messageId } })
    if (!message || message.conversationId !== conversationId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Check if already pinned (toggle)
    const existing = await db.pinnedMessage.findUnique({
      where: {
        messageId_conversationId: {
          messageId,
          conversationId,
        }
      }
    })

    let pinned: boolean
    if (existing) {
      await db.pinnedMessage.delete({ where: { id: existing.id } })
      pinned = false
    } else {
      await db.pinnedMessage.create({
        data: { messageId, conversationId, pinnedBy: personaId }
      })
      pinned = true
    }

    // Fetch all pinned messages for this conversation (with message + sender info)
    const allPinned = await db.pinnedMessage.findMany({
      where: { conversationId },
      include: {
        message: {
          include: {
            sender: {
              select: { id: true, name: true, avatarUrl: true, user: { select: { isOfficial: true } } }
            }
          }
        },
        persona: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedPins = allPinned.map((p: any) => ({
      id: p.id,
      messageId: p.messageId,
      conversationId: p.conversationId,
      pinnedBy: p.pinnedBy,
      pinnedByName: p.persona?.name || 'Unknown',
      createdAt: p.createdAt,
      message: {
        id: p.message.id,
        content: p.message.content,
        imageUrl: p.message.imageUrl,
        createdAt: p.message.createdAt,
        sender: {
          id: p.message.sender.id,
          name: p.message.sender.name,
          avatarUrl: p.message.sender.avatarUrl,
          isOfficial: p.message.sender.user?.isOfficial || false,
        }
      }
    }))

    return NextResponse.json({
      success: true,
      pinned,
      pinnedMessages: formattedPins
    })
  } catch (error) {
    console.error('Toggle pin error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// GET - Check if a specific message is pinned
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: conversationId, messageId } = await params

    // Verify access
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        personaA: { select: { userId: true } },
        personaB: { select: { userId: true } },
      }
    })
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    const userIds = [conversation.personaA.userId, conversation.personaB.userId]
    if (!userIds.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const pin = await db.pinnedMessage.findUnique({
      where: {
        messageId_conversationId: { messageId, conversationId }
      }
    })

    return NextResponse.json({ success: true, pinned: !!pin })
  } catch (error) {
    console.error('Check pin error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
