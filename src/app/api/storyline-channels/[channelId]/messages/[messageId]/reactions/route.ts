import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// POST - Add or toggle a reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { channelId, messageId } = await params
    const body = await request.json()
    const { emoji, personaId } = body
    
    if (!emoji || !personaId) {
      return NextResponse.json({ error: 'Emoji and personaId required' }, { status: 400 })
    }
    
    // Verify the persona belongs to the user
    const persona = await db.persona.findFirst({
      where: { id: personaId, userId: user.id }
    })
    
    if (!persona) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }
    
    // Verify the user is a member of the storyline
    const message = await db.storylineMessage.findUnique({
      where: { id: messageId },
      include: {
        channel: {
          include: {
            storyline: {
              include: {
                members: {
                  where: { userId: user.id }
                }
              }
            }
          }
        }
      }
    })
    
    if (!message || message.channelId !== channelId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    
    if (message.channel.storyline.members.length === 0) {
      return NextResponse.json({ error: 'Not a member of this storyline' }, { status: 403 })
    }
    
    // Check if reaction already exists
    const existingReaction = await db.storylineMessageReaction.findUnique({
      where: {
        messageId_personaId_emoji: {
          messageId,
          personaId,
          emoji
        }
      }
    })
    
    if (existingReaction) {
      // Remove reaction (toggle off)
      await db.storylineMessageReaction.delete({
        where: { id: existingReaction.id }
      })
    } else {
      // Add reaction
      await db.storylineMessageReaction.create({
        data: {
          messageId,
          personaId,
          emoji
        }
      })
    }
    
    // Get all reactions for the message
    const reactions = await db.storylineMessageReaction.findMany({
      where: { messageId },
      select: {
        emoji: true,
        personaId: true
      }
    })
    
    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc, r) => {
      const existing = acc.find(g => g.emoji === r.emoji)
      if (existing) {
        existing.count++
        existing.users.push(r.personaId)
      } else {
        acc.push({ emoji: r.emoji, count: 1, users: [r.personaId] })
      }
      return acc
    }, [] as { emoji: string; count: number; users: string[] }[])
    
    return NextResponse.json({
      success: true,
      reactions: groupedReactions
    })
    
  } catch (error) {
    console.error('Reaction error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// GET - Get all reactions for a message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { channelId, messageId } = await params
    
    // Verify the user is a member of the storyline
    const message = await db.storylineMessage.findUnique({
      where: { id: messageId },
      include: {
        channel: {
          include: {
            storyline: {
              include: {
                members: {
                  where: { userId: user.id }
                }
              }
            }
          }
        }
      }
    })
    
    if (!message || message.channelId !== channelId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    
    if (message.channel.storyline.members.length === 0) {
      return NextResponse.json({ error: 'Not a member of this storyline' }, { status: 403 })
    }
    
    // Get all reactions for the message
    const reactions = await db.storylineMessageReaction.findMany({
      where: { messageId },
      select: {
        emoji: true,
        personaId: true
      }
    })
    
    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc, r) => {
      const existing = acc.find(g => g.emoji === r.emoji)
      if (existing) {
        existing.count++
        existing.users.push(r.personaId)
      } else {
        acc.push({ emoji: r.emoji, count: 1, users: [r.personaId] })
      }
      return acc
    }, [] as { emoji: string; count: number; users: string[] }[])
    
    return NextResponse.json({
      success: true,
      reactions: groupedReactions
    })
    
  } catch (error) {
    console.error('Get reactions error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
