import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Get messages for a channel
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
    
    // Get the channel and verify user is a member of the storyline
    const channel = await db.storylineChannel.findUnique({
      where: { id: channelId },
      include: {
        storyline: {
          include: {
            members: {
              where: { userId: user.id }
            }
          }
        }
      }
    })
    
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    
    if (channel.storyline.members.length === 0) {
      return NextResponse.json({ error: 'Not a member of this storyline' }, { status: 403 })
    }
    
    // Get messages with sender info and reactions
    const messages = await db.storylineMessage.findMany({
      where: { channelId },
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
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    })
    
    return NextResponse.json({
      success: true,
      channelTopic: channel.topic,
      messages: messages.map(m => {
        // Group reactions by emoji
        const reactionGroups = m.reactions.reduce((acc, reaction) => {
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
          createdAt: m.createdAt,
          isPinned: m.pinnedBy.length > 0,
          sender: {
            id: m.sender.id,
            name: m.sender.name,
            avatarUrl: m.sender.avatarUrl,
            username: m.sender.user.username
          },
          reactions: Object.values(reactionGroups),
          hasReacted: m.reactions.filter(r => r.userId === user.id).map(r => r.emoji)
        }
      })
    })
    
  } catch (error) {
    console.error('Get channel messages error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Send a message to a channel
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
    const { content, imageUrl, senderPersonaId } = body
    
    if (!content?.trim() && !imageUrl) {
      return NextResponse.json({ error: 'Message content or image required' }, { status: 400 })
    }
    
    // Get the channel and verify user is a member
    const channel = await db.storylineChannel.findUnique({
      where: { id: channelId },
      include: {
        storyline: {
          include: {
            members: {
              where: { userId: user.id }
            }
          }
        }
      }
    })
    
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    
    if (channel.storyline.members.length === 0) {
      return NextResponse.json({ error: 'Not a member of this storyline' }, { status: 403 })
    }
    
    // Verify the persona belongs to the user
    const persona = await db.persona.findFirst({
      where: { id: senderPersonaId, userId: user.id }
    })
    
    if (!persona) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }
    
    // Create the message
    const message = await db.storylineMessage.create({
      data: {
        channelId,
        senderId: senderPersonaId,
        content: content?.trim() || '',
        imageUrl: imageUrl || null
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
        pinnedBy: { select: { id: true } }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        imageUrl: message.imageUrl,
        createdAt: message.createdAt,
        isPinned: message.pinnedBy.length > 0,
        sender: {
          id: message.sender.id,
          name: message.sender.name,
          avatarUrl: message.sender.avatarUrl,
          username: message.sender.user.username
        },
        reactions: [],
        hasReacted: []
      }
    })
    
  } catch (error) {
    console.error('Send channel message error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
