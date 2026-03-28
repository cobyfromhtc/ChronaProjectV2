import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// Function to emit to chat service
async function emitToChatService(event: string, payload: any, channelId?: string) {
  try {
    const chatServiceUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3003'
    await fetch(`${chatServiceUrl}/internal/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload, channelId })
    })
  } catch (error) {
    console.error('Failed to emit to chat service:', error)
  }
}

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
    
    // Get messages with sender info
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
        reactions: {
          select: {
            emoji: true,
            personaId: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    })
    
    return NextResponse.json({
      success: true,
      messages: messages.map(m => {
        // Group reactions by emoji
        const groupedReactions = m.reactions.reduce((acc, r) => {
          const existing = acc.find(g => g.emoji === r.emoji)
          if (existing) {
            existing.count++
            existing.users.push(r.personaId)
          } else {
            acc.push({ emoji: r.emoji, count: 1, users: [r.personaId] })
          }
          return acc
        }, [] as { emoji: string; count: number; users: string[] }[])
        
        return {
          id: m.id,
          content: m.content,
          imageUrl: m.imageUrl,
          createdAt: m.createdAt,
          replyTo: m.replyTo ? {
            id: m.replyTo.id,
            content: m.replyTo.content,
            senderName: m.replyTo.sender.name
          } : null,
          reactions: groupedReactions,
          sender: {
            id: m.sender.id,
            name: m.sender.name,
            avatarUrl: m.sender.avatarUrl,
            username: m.sender.user.username
          }
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
    const { content, imageUrl, senderPersonaId, replyToId } = body
    
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
    
    // If replying, verify the reply message exists and is in the same channel
    if (replyToId) {
      const replyMessage = await db.storylineMessage.findUnique({
        where: { id: replyToId }
      })
      if (!replyMessage || replyMessage.channelId !== channelId) {
        return NextResponse.json({ error: 'Invalid reply target' }, { status: 400 })
      }
    }
    
    // Create the message
    const message = await db.storylineMessage.create({
      data: {
        channelId,
        senderId: senderPersonaId,
        content: content?.trim() || '',
        imageUrl: imageUrl || null,
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
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { name: true }
            }
          }
        }
      }
    })
    
    const messageResponse = {
      id: message.id,
      channelId: channelId,
      content: message.content,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        senderName: message.replyTo.sender.name
      } : null,
      reactions: [],
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatarUrl: message.sender.avatarUrl,
        username: message.sender.user.username
      }
    }
    
    // Emit to chat service for real-time updates
    await emitToChatService('new-channel-message', messageResponse, channelId)
    
    return NextResponse.json({
      success: true,
      message: messageResponse
    })
    
  } catch (error) {
    console.error('Send channel message error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
