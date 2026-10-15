import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Get threads for a channel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { channelId } = await params

    const channel = await db.storylineChannel.findUnique({
      where: { id: channelId },
      include: { storyline: { include: { members: { where: { userId: user.id } } } } }
    })

    if (!channel || !channel.storyline || ((channel.storyline as any)?.members?.length || 0) === 0) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    // NOTE: the adapter's generic `messages` relation mapping resolves to
    // Conversation.messages, so `_count: { select: { messages: true } }` is
    // NOT reliable here. Count thread messages explicitly instead.
    const threads = await db.storylineThread.findMany({
      where: { channelId, isArchived: false },
      include: {
        message: {
          select: { id: true, content: true, sender: { select: { id: true, name: true, avatarUrl: true } } }
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Count replies per thread in one query
    const threadIds = threads.map(t => t.id)
    const replyCounts = new Map<string, number>()
    if (threadIds.length > 0) {
      const replies = await db.storylineThreadMessage.findMany({
        where: { threadId: { in: threadIds } },
        select: { threadId: true },
      })
      for (const r of replies) {
        replyCounts.set(r.threadId, (replyCounts.get(r.threadId) || 0) + 1)
      }
    }

    return NextResponse.json({
      success: true,
      threads: threads.map(t => ({
        id: t.id,
        name: t.name,
        messageId: t.messageId,
        message: t.message,
        messageCount: replyCounts.get(t.id) || 0,
        isArchived: t.isArchived,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }))
    })
  } catch (error) {
    console.error('Get threads error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Create a thread from a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { channelId } = await params
    const body = await request.json()
    const { messageId, name } = body

    if (!messageId || !name?.trim()) {
      return NextResponse.json({ error: 'Message ID and thread name required' }, { status: 400 })
    }

    const channel = await db.storylineChannel.findUnique({
      where: { id: channelId },
      include: { storyline: { include: { members: { where: { userId: user.id } } } } }
    })

    if (!channel || !channel.storyline || ((channel.storyline as any)?.members?.length || 0) === 0) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    // Check if thread already exists for this message
    const existingThread = await db.storylineThread.findFirst({
      where: { messageId }
    })

    if (existingThread) {
      return NextResponse.json({ error: 'Thread already exists for this message', thread: existingThread }, { status: 409 })
    }

    const thread = await db.storylineThread.create({
      data: {
        channelId,
        messageId,
        name: name.trim(),
        createdById: user.id
      }
    })

    return NextResponse.json({ success: true, thread })
  } catch (error) {
    console.error('Create thread error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
