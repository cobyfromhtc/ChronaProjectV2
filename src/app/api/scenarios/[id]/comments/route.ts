import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/scenarios/[id]/comments - Get comments for a scenario
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const comments = await db.scenarioComment.findMany({
      where: { scenarioId: id },
      orderBy: [
        { isPinned: 'desc' },
        { isCreatorNote: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        persona: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    })

    const total = await db.scenarioComment.count({
      where: { scenarioId: id }
    })

    return NextResponse.json({ comments, total })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// POST /api/scenarios/[id]/comments - Add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { content, personaId, isCreatorNote } = body

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Check if user is the scenario creator for creator notes
    if (isCreatorNote) {
      const scenario = await db.scenario.findUnique({
        where: { id }
      })
      if (scenario?.userId !== user.id) {
        return NextResponse.json({ error: 'Only scenario creator can add creator notes' }, { status: 403 })
      }
    }

    const comment = await db.scenarioComment.create({
      data: {
        scenarioId: id,
        userId: user.id,
        personaId,
        content: content.trim(),
        isCreatorNote: isCreatorNote || false
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        persona: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json({ comment })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
