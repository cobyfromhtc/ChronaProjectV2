import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// =============================================================
// Message Bookmark Toggle API
// =============================================================
// POST /api/conversations/[id]/messages/[messageId]/bookmark
//   Body: { personaId, note? }
//   Toggles a personal bookmark: adds it if not present, removes if exists.
//   Returns { bookmarked: boolean }
// =============================================================

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
    const { personaId, note } = body

    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
    }

    // Verify conversation access
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

    // Verify message exists and belongs to this conversation
    const message = await db.message.findUnique({ where: { id: messageId } })
    if (!message || message.conversationId !== conversationId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Toggle bookmark
    const existing = await db.messageBookmark.findUnique({
      where: {
        messageId_personaId: { messageId, personaId }
      }
    })

    let bookmarked: boolean
    if (existing) {
      await db.messageBookmark.delete({ where: { id: existing.id } })
      bookmarked = false
    } else {
      await db.messageBookmark.create({
        data: { messageId, personaId, note: note || null }
      })
      bookmarked = true
    }

    return NextResponse.json({ success: true, bookmarked })
  } catch (error) {
    console.error('Toggle bookmark error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
