import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// =============================================================
// Mark Messages as Read API
// =============================================================
// POST /api/conversations/[id]/messages/read
//   Body: { messageIds?: string[] }  (optional — if omitted, marks ALL
//         unread messages sent BY THE OTHER persona as read)
//   Marks the given messages (or all unread messages from the other
//   participant) with a `readAt` timestamp so the sender sees read
//   receipts (double checkmark).
//
// Only the conversation's other participant's messages can be marked
// read — you can't mark your own messages as "read by me".
// =============================================================

export async function POST(
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

    // Determine which persona is "mine" and which is "the other"
    const isPersonaA = conversation.personaA.userId === user.id
    const myPersonaId = isPersonaA ? conversation.personaA.id : conversation.personaB.id
    const otherPersonaId = isPersonaA ? conversation.personaB.id : conversation.personaA.id

    let body: { messageIds?: string[] } = {}
    try { body = await request.json() } catch { /* empty body is OK */ }

    const now = new Date()

    if (body.messageIds && body.messageIds.length > 0) {
      // Mark the specific messages as read — only those sent by the OTHER persona
      // and not already read
      const messages = await db.message.findMany({
        where: {
          id: { in: body.messageIds },
          conversationId,
          senderId: otherPersonaId,
          readAt: null,
        },
        select: { id: true },
      })
      if (messages.length > 0) {
        await db.message.updateMany({
          where: { id: { in: messages.map((m: any) => m.id) } },
          data: { readAt: now },
        })
      }
      return NextResponse.json({ success: true, markedRead: messages.length, readAt: now.toISOString() })
    }

    // No specific ids — mark ALL unread messages from the other persona as read
    const unread = await db.message.findMany({
      where: {
        conversationId,
        senderId: otherPersonaId,
        readAt: null,
      },
      select: { id: true },
    })
    if (unread.length > 0) {
      await db.message.updateMany({
        where: { id: { in: unread.map((m: any) => m.id) } },
        data: { readAt: now },
      })
    }

    return NextResponse.json({ success: true, markedRead: unread.length, readAt: now.toISOString() })
  } catch (error) {
    console.error('Mark messages read error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
