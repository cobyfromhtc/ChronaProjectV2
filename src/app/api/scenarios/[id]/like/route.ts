import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// POST /api/scenarios/[id]/like - Like/favorite a scenario
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
    const { isFavorite = false } = body

    // Check if already liked
    const existing = await db.scenarioLike.findUnique({
      where: {
        scenarioId_userId: {
          scenarioId: id,
          userId: user.id
        }
      }
    })

    if (existing) {
      // Update existing like
      const like = await db.scenarioLike.update({
        where: { id: existing.id },
        data: { isFavorite }
      })
      
      // Update counts
      const likeCount = await db.scenarioLike.count({
        where: { scenarioId: id, isFavorite: false }
      })
      const favoriteCount = await db.scenarioLike.count({
        where: { scenarioId: id, isFavorite: true }
      })
      
      await db.scenario.update({
        where: { id },
        data: { likeCount, favoriteCount }
      })
      
      return NextResponse.json({ like })
    }

    // Create new like
    const like = await db.scenarioLike.create({
      data: {
        scenarioId: id,
        userId: user.id,
        isFavorite
      }
    })

    // Update counts
    const likeCount = await db.scenarioLike.count({
      where: { scenarioId: id, isFavorite: false }
    })
    const favoriteCount = await db.scenarioLike.count({
      where: { scenarioId: id, isFavorite: true }
    })

    await db.scenario.update({
      where: { id },
      data: { likeCount, favoriteCount }
    })

    return NextResponse.json({ like })
  } catch (error) {
    console.error('Error liking scenario:', error)
    return NextResponse.json({ error: 'Failed to like scenario' }, { status: 500 })
  }
}

// DELETE /api/scenarios/[id]/like - Unlike a scenario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const like = await db.scenarioLike.findUnique({
      where: {
        scenarioId_userId: {
          scenarioId: id,
          userId: user.id
        }
      }
    })

    if (!like) {
      return NextResponse.json({ error: 'Like not found' }, { status: 404 })
    }

    await db.scenarioLike.delete({
      where: { id: like.id }
    })

    // Update counts
    const likeCount = await db.scenarioLike.count({
      where: { scenarioId: id, isFavorite: false }
    })
    const favoriteCount = await db.scenarioLike.count({
      where: { scenarioId: id, isFavorite: true }
    })

    await db.scenario.update({
      where: { id },
      data: { likeCount, favoriteCount }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unliking scenario:', error)
    return NextResponse.json({ error: 'Failed to unlike scenario' }, { status: 500 })
  }
}
