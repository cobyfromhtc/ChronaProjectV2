import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { emitSocketEvent } from '@/lib/socket-emit'
import {
  attachmentsForResponse,
  sanitizeAttachmentsInput,
} from '@/lib/attachments'

// GET - List messages in a thread (with sender persona info)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { threadId } = await params

    // Fetch the thread + verify channel/storyline membership
    const thread = await db.storylineThread.findUnique({
      where: { id: threadId },
      include: {
        channel: { select: { id: true, storylineId: true } },
      },
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const membership = await db.storylineMember.findFirst({
      where: { storylineId: thread.channel.storylineId, userId: user.id },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this storyline' }, { status: 403 })
    }

    const messages = await db.storylineThreadMessage.findMany({
      where: { threadId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            user: { select: { username: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })

    return NextResponse.json({
      success: true,
      thread: { id: thread.id, name: thread.name, messageId: thread.messageId },
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        imageUrl: m.imageUrl,
        // Uniform attachments array (legacy imageUrl synthesized)
        attachments: attachmentsForResponse(m.attachments, m.imageUrl),
        createdAt: m.createdAt,
        sender: {
          id: m.sender.id,
          name: m.sender.name,
          avatarUrl: m.sender.avatarUrl,
          username: m.sender.user.username,
        },
      })),
    })
  } catch (error) {
    console.error('Get thread messages error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Send a reply to a thread (text and/or image attachments)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { threadId } = await params
    const body = await request.json()
    const { content, senderPersonaId, imageUrl, attachments } = body

    // Validate the optional attachments array (max 5, image types only,
    // ≤ 8 MB each, url must be a relative path or https URL). Extra props
    // are stripped by the sanitizer.
    const attachmentResult = sanitizeAttachmentsInput(attachments)
    if (!attachmentResult.ok) {
      return NextResponse.json({ error: attachmentResult.error }, { status: 400 })
    }
    const cleanAttachments = attachmentResult.value

    if (!content?.trim() && !imageUrl && cleanAttachments.length === 0) {
      return NextResponse.json({ error: 'Message content or image required' }, { status: 400 })
    }

    if (!senderPersonaId) {
      return NextResponse.json({ error: 'Sender persona is required' }, { status: 400 })
    }

    // Fetch the thread + verify membership
    const thread = await db.storylineThread.findUnique({
      where: { id: threadId },
      include: {
        channel: { select: { id: true, storylineId: true, locked: true, slowMode: true } },
      },
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const membership = await db.storylineMember.findFirst({
      where: { storylineId: thread.channel.storylineId, userId: user.id },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this storyline' }, { status: 403 })
    }

    // Locked channels prevent sending for non-managers (mirrors channel rules)
    if (thread.channel.locked) {
      let canManage = membership.role === 'owner' || membership.role === 'admin'
      if (!canManage && membership.roleId) {
        const role = await db.storylineRole.findUnique({ where: { id: membership.roleId } })
        canManage = !!role && (role.canManageMessages || role.isAdmin)
      }
      if (!canManage) {
        return NextResponse.json({ error: 'This channel is locked' }, { status: 403 })
      }
    }

    // Verify the persona belongs to the user
    const persona = await db.persona.findFirst({
      where: { id: senderPersonaId, userId: user.id },
    })

    if (!persona) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }

    // Create the thread message
    const message = await db.storylineThreadMessage.create({
      data: {
        threadId,
        senderId: senderPersonaId,
        content: content?.trim() || '',
        imageUrl: imageUrl || null,
        // Attachments stored as a JSON string array
        attachments: cleanAttachments.length > 0 ? JSON.stringify(cleanAttachments) : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            user: { select: { username: true } },
          },
        },
      },
    })

    // Bump the thread's updatedAt so it sorts to the top of the thread list
    await db.storylineThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    })

    const responseMessage = {
      id: message.id,
      threadId,
      content: message.content,
      imageUrl: message.imageUrl,
      attachments: attachmentsForResponse(message.attachments, message.imageUrl),
      createdAt: message.createdAt,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatarUrl: message.sender.avatarUrl,
        username: message.sender.user.username,
      },
    }

    // Server-side realtime emit — API-sent thread replies now reach every
    // viewer with the thread panel open (clients dedupe by message id).
    void emitSocketEvent(`thread:${threadId}`, 'new-thread-message', responseMessage).catch(() => {})

    return NextResponse.json({
      success: true,
      message: responseMessage,
    })
  } catch (error) {
    console.error('Send thread message error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
