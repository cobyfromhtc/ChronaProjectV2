import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  attachmentsForResponse,
  sanitizeAttachmentsInput,
} from '@/lib/attachments'
import { pushDmActivity, isConversationMuted } from '@/lib/socket-emit'

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
    
    // Get the user's active persona id (for "reactedByMe" flag)
    const myPersona = await db.persona.findFirst({
      where: { userId: user.id, isActive: true },
      select: { id: true }
    })

    // Get messages with sender info including isOfficial, plus reply-to data and reactions
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
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
            sender: { select: { name: true } },
          }
        },
        reactions: {
          include: {
            persona: { select: { id: true, name: true } }
          }
        }
      }
    })

    // Transform messages to include isOfficial flag, reply data, and grouped reactions
    const transformedMessages = messages.map(msg => {
      // Group reactions by emoji
      const reactionMap = new Map<string, { emoji: string; count: number; personas: { id: string; name: string }[]; reactedByMe: boolean }>()
      for (const r of (msg.reactions || [])) {
        const emoji = r.emoji
        if (!reactionMap.has(emoji)) {
          reactionMap.set(emoji, { emoji, count: 0, personas: [], reactedByMe: false })
        }
        const group = reactionMap.get(emoji)!
        group.count++
        if (r.persona?.name) {
          group.personas.push({ id: r.personaId, name: r.persona.name })
        }
        if (myPersona && r.personaId === myPersona.id) {
          group.reactedByMe = true
        }
      }
      const groupedReactions = Array.from(reactionMap.values()).sort((a, b) => b.count - a.count)

      // Parse edit history from JSON string
      let editHistory: Array<{ content: string; editedAt: string }> = []
      try {
        if ((msg as any).editHistory) {
          const parsed = JSON.parse((msg as any).editHistory)
          if (Array.isArray(parsed)) editHistory = parsed
        }
      } catch { /* ignore */ }

      return {
        ...msg,
        editHistory,
        // Uniform attachments array: stored attachments when present, else a
        // synthesized single-entry array from the legacy imageUrl (response
        // shape only — the DB record is not modified)
        attachments: attachmentsForResponse(msg.attachments, msg.imageUrl),
        sender: {
          id: msg.sender.id,
          name: msg.sender.name,
          avatarUrl: msg.sender.avatarUrl,
          isOfficial: msg.sender.user?.isOfficial || false
        },
        replyTo: msg.replyTo ? {
          id: msg.replyTo.id,
          content: msg.replyTo.content,
          imageUrl: msg.replyTo.imageUrl,
          senderName: msg.replyTo.sender?.name || 'Unknown',
        } : null,
        reactions: groupedReactions,
      }
    })

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
    const { content, senderPersonaId, imageUrl, replyToId, attachments } = body

    // Validate the optional attachments array (max 5, image types only,
    // ≤ 8 MB each, url must be a relative path or https URL). Extra props
    // are stripped by the sanitizer.
    const attachmentResult = sanitizeAttachmentsInput(attachments)
    if (!attachmentResult.ok) {
      return NextResponse.json(
        { error: attachmentResult.error },
        { status: 400 }
      )
    }
    const cleanAttachments = attachmentResult.value

    // Require either content, a legacy imageUrl, or at least one attachment
    if ((!content || !content.trim()) && !imageUrl && cleanAttachments.length === 0) {
      return NextResponse.json(
        { error: 'Message content or image is required' },
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
        // Attachments are stored as a JSON string array
        // [{ url, fileName, fileType, fileSize }]
        attachments: cleanAttachments.length > 0 ? JSON.stringify(cleanAttachments) : null,
        replyToId: replyToId || null,
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

    // Transform message to include isOfficial flag and a parsed attachments
    // array (same uniform shape as the GET response)
    const transformedMessage = {
      ...message,
      attachments: attachmentsForResponse(message.attachments, message.imageUrl),
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatarUrl: message.sender.avatarUrl,
        isOfficial: message.sender.user?.isOfficial || false
      }
    }

    // Update conversation's lastMessageAt
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })

    // Realtime ping to the OTHER participant's personal room — refreshes
    // their sidebar / My Chats unread badges instantly. The message itself
    // renders through the conversation-room event the sender's client
    // broadcasts (this push only carries a preview).
    // A conversation the recipient MUTED gets no ping (no toast / title
    // badge / sidebar flash) — the message is still stored and delivered.
    const recipientUserId =
      conversation.personaA.userId === user.id
        ? conversation.personaB.userId
        : conversation.personaA.userId
    if (recipientUserId && recipientUserId !== user.id) {
      const recipientMuted = await isConversationMuted(recipientUserId, conversationId)
      if (!recipientMuted) {
        const previewText =
          transformedMessage.content?.slice(0, 90) ||
          (transformedMessage.attachments && transformedMessage.attachments.length > 0
            ? `${transformedMessage.attachments.length} attachment${transformedMessage.attachments.length === 1 ? '' : 's'}`
            : '')
        void pushDmActivity(recipientUserId, {
          conversationId,
          preview: previewText,
          fromPersonaName: senderPersona.name,
        })
      }
    }

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

// PATCH - Edit a message (only the sender can edit their own messages)
export async function PATCH(
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
    const { messageId, content } = body

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      )
    }

    // Verify the message exists and the user is the sender
    const message = await db.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: { userId: true, id: true, name: true, avatarUrl: true, user: { select: { isOfficial: true } } }
        }
      }
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.conversationId !== conversationId) {
      return NextResponse.json(
        { error: 'Message does not belong to this conversation' },
        { status: 400 }
      )
    }

    if (message.sender.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own messages' },
        { status: 403 }
      )
    }

    // Build the edit history array — append the previous content + timestamp
    let editHistory: Array<{ content: string; editedAt: string }> = []
    try {
      if (message.editHistory) {
        const parsed = JSON.parse(message.editHistory)
        if (Array.isArray(parsed)) editHistory = parsed
      }
    } catch { /* ignore parse errors */ }
    // Only record history if the content actually changed
    if (message.content !== content.trim()) {
      editHistory.push({ content: message.content, editedAt: new Date().toISOString() })
    }

    // Update the message with editedAt timestamp and edit history
    const updated = await db.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        editedAt: new Date(),
        editHistory: JSON.stringify(editHistory),
      },
    })

    const transformedMessage = {
      ...updated,
      editHistory,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatarUrl: message.sender.avatarUrl,
        isOfficial: message.sender.user?.isOfficial || false
      }
    }

    return NextResponse.json({
      success: true,
      message: transformedMessage
    })

  } catch (error) {
    console.error('Edit message error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a message (only the sender can delete their own messages)
export async function DELETE(
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
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    const clearAll = searchParams.get('clearAll') === 'true'

    // ── Bulk clear history ──
    // When clearAll=true (and no messageId), delete ALL messages in the conversation.
    // Either participant can clear the shared history.
    if (clearAll && !messageId) {
      // Verify the conversation exists and the user is part of it
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

      // Delete all messages in this conversation
      // (pinned messages + reactions cascade-delete via the schema)
      const deleted = await db.message.deleteMany({
        where: { conversationId },
      })

      // Update the conversation's lastMessageAt
      await db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      })

      return NextResponse.json({
        success: true,
        cleared: true,
        deletedCount: deleted.count || 0,
      })
    }

    // ── Single message delete ──
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // Verify the message exists and the user is the sender
    const message = await db.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { userId: true } }
      }
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.conversationId !== conversationId) {
      return NextResponse.json(
        { error: 'Message does not belong to this conversation' },
        { status: 400 }
      )
    }

    if (message.sender.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      )
    }

    // Delete the message
    await db.message.delete({
      where: { id: messageId },
    })

    return NextResponse.json({
      success: true,
      messageId
    })

  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
