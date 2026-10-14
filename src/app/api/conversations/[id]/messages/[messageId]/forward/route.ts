import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// =============================================================
// Message Forwarding API
// =============================================================
// POST /api/conversations/[id]/messages/[messageId]/forward
//   Body: { targetConversationId, personaId }
//   Forwards a message (content + imageUrl) to another conversation.
//   The forwarded message is attributed to the forwarder's persona
//   and includes a `forwardedFrom` marker (optional, stored in a
//   separate field if available — otherwise just copies content).
//
// Only the conversation's other participant's messages can be marked
// read — you can't mark your own messages as "read by me".
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

    const { id: sourceConversationId, messageId } = await params
    const body = await request.json()
    const { targetConversationId, personaId } = body

    if (!targetConversationId) {
      return NextResponse.json({ error: 'Target conversation ID is required' }, { status: 400 })
    }
    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
    }

    // Verify the source message exists and the user has access to it
    const sourceMessage = await db.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            personaA: { select: { userId: true, id: true } },
            personaB: { select: { userId: true, id: true } },
          }
        }
      }
    })
    if (!sourceMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    if (sourceMessage.conversationId !== sourceConversationId) {
      return NextResponse.json({ error: 'Message does not belong to this conversation' }, { status: 400 })
    }
    // Verify user has access to the source conversation
    const sourceUserIds = [sourceMessage.conversation.personaA.userId, sourceMessage.conversation.personaB.userId]
    if (!sourceUserIds.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied to source conversation' }, { status: 403 })
    }

    // Verify the target conversation exists and the user is part of it
    const targetConversation = await db.conversation.findUnique({
      where: { id: targetConversationId },
      include: {
        personaA: { select: { userId: true, id: true } },
        personaB: { select: { userId: true, id: true } },
      }
    })
    if (!targetConversation) {
      return NextResponse.json({ error: 'Target conversation not found' }, { status: 404 })
    }
    const targetUserIds = [targetConversation.personaA.userId, targetConversation.personaB.userId]
    if (!targetUserIds.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied to target conversation' }, { status: 403 })
    }

    // Verify the persona belongs to the user and is in the target conversation
    const persona = await db.persona.findFirst({
      where: { id: personaId, userId: user.id }
    })
    if (!persona) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }
    const targetPersonaIds = [targetConversation.personaA.id, targetConversation.personaB.id]
    if (!targetPersonaIds.includes(personaId)) {
      return NextResponse.json({ error: 'Persona is not part of the target conversation' }, { status: 400 })
    }

    // Create the forwarded message (copy content + imageUrl, new sender = forwarder's persona)
    // Include forwardedFrom attribution so the UI can show "Forwarded from X"
    const forwardedMessage = await db.message.create({
      data: {
        conversationId: targetConversationId,
        senderId: personaId,
        content: sourceMessage.content,
        imageUrl: sourceMessage.imageUrl,
        forwardedFromName: sourceMessage.sender?.user?.username || null,
        forwardedFromPersonaName: sourceMessage.sender?.name || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            user: { select: { isOfficial: true } }
          }
        }
      }
    })

    // Update the target conversation's lastMessageAt
    await db.conversation.update({
      where: { id: targetConversationId },
      data: { lastMessageAt: new Date() }
    })

    const transformedMessage = {
      ...forwardedMessage,
      sender: {
        id: forwardedMessage.sender.id,
        name: forwardedMessage.sender.name,
        avatarUrl: forwardedMessage.sender.avatarUrl,
        isOfficial: forwardedMessage.sender.user?.isOfficial || false
      }
    }

    return NextResponse.json({
      success: true,
      message: transformedMessage,
      targetConversationId
    })
  } catch (error) {
    console.error('Forward message error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
