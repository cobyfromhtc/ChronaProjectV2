import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Get reactions for a message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { messageId } = await params

    const reactions = await db.storylineMessageReaction.findMany({
      where: { messageId },
    })

    // Group reactions by emoji
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = { emoji: reaction.emoji, count: 0, userIds: [] }
      }
      acc[reaction.emoji].count++
      acc[reaction.emoji].userIds.push(reaction.userId)
      return acc
    }, {} as Record<string, { emoji: string; count: number; userIds: string[] }>)

    return NextResponse.json({
      success: true,
      reactions: Object.values(grouped),
      hasReacted: reactions.filter(r => r.userId === user.id).map(r => r.emoji)
    })

  } catch (error) {
    console.error('Get reactions error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Toggle a reaction on a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { messageId } = await params
    const body = await request.json()
    const { emoji } = body

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 })
    }

    // Check if reaction exists
    const existing = await db.storylineMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.id,
          emoji,
        }
      }
    })

    if (existing) {
      // Remove reaction
      await db.storylineMessageReaction.delete({
        where: { id: existing.id }
      })
      return NextResponse.json({ success: true, reacted: false })
    } else {
      // Add reaction
      await db.storylineMessageReaction.create({
        data: {
          messageId,
          userId: user.id,
          emoji,
        }
      })
      return NextResponse.json({ success: true, reacted: true })
    }

  } catch (error) {
    console.error('Toggle reaction error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
