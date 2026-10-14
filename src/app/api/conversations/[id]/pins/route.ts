import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// =============================================================
// List Pinned Messages API
// =============================================================
// GET /api/conversations/[id]/pins
//   Returns all pinned messages for a conversation, with message
//   content, sender info, and who pinned it.
// =============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: conversationId } = await params

    // Verify conversation exists and user is part of it
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

    const pinnedMessages = await db.pinnedMessage.findMany({
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

    const formatted = pinnedMessages.map((p: any) => ({
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
      pinnedMessages: formatted
    })
  } catch (error) {
    console.error('List pinned messages error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
