import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  attachmentsForResponse,
  sanitizeAttachmentsInput,
} from '@/lib/attachments'
import { emitSocketEvent } from '@/lib/socket-emit'

// GET - Get messages for a channel (with search support)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { channelId } = await params
    const searchParams = request.nextUrl.searchParams
    const searchQuery = searchParams.get('search') || ''
    
    // Get the channel (don't use nested back-relation includes — fetch separately)
    const channel = await db.storylineChannel.findUnique({
      where: { id: channelId },
    })
    
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    
    // Verify user is a member of the storyline (separate query)
    const membership = await db.storylineMember.findFirst({
      where: { storylineId: channel.storylineId, userId: user.id }
    })
    
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this storyline' }, { status: 403 })
    }
    
    // Build where clause
    const whereClause: any = { channelId }
    if (searchQuery) {
      whereClause.content = { contains: searchQuery }
    }
    
    // Get messages with sender info and reactions
    const messages = await db.storylineMessage.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            user: {
              select: { username: true }
            }
          }
        },
        reactions: true,
        pinnedBy: {
          select: { id: true }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: searchQuery ? 50 : 100
    })
    
    return NextResponse.json({
      success: true,
      channelTopic: channel.topic,
      channelSlowMode: channel.slowMode,
      channelType: channel.type,
      messages: messages.map(m => {
        // Group reactions by emoji
        const reactionGroups = (m.reactions || []).reduce((acc, reaction) => {
          if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = { emoji: reaction.emoji, count: 0, userIds: [] }
          }
          acc[reaction.emoji].count++
          acc[reaction.emoji].userIds.push(reaction.userId)
          return acc
        }, {} as Record<string, { emoji: string; count: number; userIds: string[] }>)
        
        return {
          id: m.id,
          content: m.content,
          imageUrl: m.imageUrl,
          // Uniform attachments array: stored attachments when present, else
          // a synthesized single-entry array for legacy imageUrl messages
          attachments: attachmentsForResponse(m.attachments, m.imageUrl),
          createdAt: m.createdAt,
          editedAt: m.editedAt,
          replyToId: m.replyToId,
          replyTo: m.replyTo ? {
            id: m.replyTo.id,
            content: m.replyTo.content,
            senderName: m.replyTo.sender.name
          } : null,
          isPinned: (m.pinnedBy || []).length > 0,
          sender: {
            id: m.sender.id,
            name: m.sender.name,
            avatarUrl: m.sender.avatarUrl,
            username: m.sender.user.username
          },
          reactions: Object.values(reactionGroups),
          hasReacted: (m.reactions || []).filter(r => r.userId === user.id).map(r => r.emoji)
        }
      })
    })
    
  } catch (error) {
    console.error('Get channel messages error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Send a message to a channel (with reply support)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { channelId } = await params
    const body = await request.json()
    const { content, imageUrl, senderPersonaId, replyToId, attachments } = body
    
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
    
    // Get the channel (don't use nested back-relation includes — fetch separately)
    const channel = await db.storylineChannel.findUnique({
      where: { id: channelId },
    })
    
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    
    // Verify user is a member of the storyline (separate query)
    const membership = await db.storylineMember.findFirst({
      where: { storylineId: channel.storylineId, userId: user.id }
    })
    
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this storyline' }, { status: 403 })
    }
    
    // Check channel permissions — locked channels prevent sending for non-managers
    if (channel.locked) {
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
      where: { id: senderPersonaId, userId: user.id }
    })
    
    if (!persona) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }
    
    // Validate replyToId if provided
    if (replyToId) {
      const replyMessage = await db.storylineMessage.findFirst({
        where: { id: replyToId, channelId }
      })
      if (!replyMessage) {
        return NextResponse.json({ error: 'Reply target message not found' }, { status: 400 })
      }
    }
    
    // Create the message
    const message = await db.storylineMessage.create({
      data: {
        channelId,
        senderId: senderPersonaId,
        content: content?.trim() || '',
        imageUrl: imageUrl || null,
        // Attachments are stored as a JSON string array
        // [{ url, fileName, fileType, fileSize }]
        attachments: cleanAttachments.length > 0 ? JSON.stringify(cleanAttachments) : null,
        replyToId: replyToId || null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            user: {
              select: { username: true }
            }
          }
        },
        reactions: true,
        pinnedBy: { select: { id: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })
    
    // Build the response message once — returned to the caller AND emitted
    // to the channel room server-side so API-sent messages (Blorp posts,
    // scripts) reach every viewer in realtime. Clients dedupe by message id,
    // so UI-sent messages never double-render.
    const responseMessage = {
      id: message.id,
      channelId,
      content: message.content,
      imageUrl: message.imageUrl,
      // Uniform parsed attachments array (same shape as GET)
      attachments: attachmentsForResponse(message.attachments, message.imageUrl),
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      replyToId: message.replyToId,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        senderName: message.replyTo.sender.name
      } : null,
      isPinned: (message.pinnedBy || []).length > 0,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatarUrl: message.sender.avatarUrl,
        username: message.sender.user.username
      },
      reactions: [],
      hasReacted: []
    }

    void emitSocketEvent(`channel:${channelId}`, 'new-channel-message', responseMessage).catch(() => {})
    
    return NextResponse.json({
      success: true,
      message: responseMessage
    })
    
  } catch (error) {
    console.error('Send channel message error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH - Edit a message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { channelId } = await params
    const body = await request.json()
    const { messageId, content } = body
    
    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: 'Message ID and content required' }, { status: 400 })
    }
    
    // Find the message and verify ownership
    const message = await db.storylineMessage.findFirst({
      where: { id: messageId, channelId },
      include: {
        sender: {
          select: { userId: true }
        }
      }
    })
    
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    
    if (message.sender.userId !== user.id) {
      return NextResponse.json({ error: 'Can only edit your own messages' }, { status: 403 })
    }
    
    // Update the message
    const updated = await db.storylineMessage.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        editedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            user: { select: { username: true } }
          }
        },
        reactions: true,
        pinnedBy: { select: { id: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, name: true } }
          }
        }
      }
    })
    
    // Group reactions
    const reactionGroups = (updated.reactions || []).reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = { emoji: reaction.emoji, count: 0, userIds: [] }
      }
      acc[reaction.emoji].count++
      acc[reaction.emoji].userIds.push(reaction.userId)
      return acc
    }, {} as Record<string, { emoji: string; count: number; userIds: string[] }>)
    
    return NextResponse.json({
      success: true,
      message: {
        id: updated.id,
        content: updated.content,
        imageUrl: updated.imageUrl,
        attachments: attachmentsForResponse(updated.attachments, updated.imageUrl),
        createdAt: updated.createdAt,
        editedAt: updated.editedAt,
        replyToId: updated.replyToId,
        replyTo: updated.replyTo ? {
          id: updated.replyTo.id,
          content: updated.replyTo.content,
          senderName: updated.replyTo.sender.name
        } : null,
        isPinned: (updated.pinnedBy || []).length > 0,
        sender: {
          id: updated.sender.id,
          name: updated.sender.name,
          avatarUrl: updated.sender.avatarUrl,
          username: updated.sender.user.username
        },
        reactions: Object.values(reactionGroups),
        hasReacted: (updated.reactions || []).filter(r => r.userId === user.id).map(r => r.emoji)
      }
    })
    
  } catch (error) {
    console.error('Edit message error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
