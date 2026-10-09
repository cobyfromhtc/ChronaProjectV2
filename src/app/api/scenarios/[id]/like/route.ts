import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// =============================================
// Scenario Like API — Toggle like/unlike
// =============================================

// POST — Toggle like on a scenario
// If the user has not liked the scenario, like it (create ScenarioLike + increment likeCount).
// If the user already liked it, unlike it (delete ScenarioLike + decrement likeCount).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    // Verify scenario exists
    const scenario = await db.scenario.findUnique({
      where: { id },
      select: { id: true, likeCount: true },
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    // Check if the user already liked this scenario
    const existingLike = await db.scenarioLike.findUnique({
      where: {
        scenarioId_userId: { scenarioId: id, userId: user.id },
      },
    })

    if (existingLike) {
      // Unlike: remove the like and decrement the count
      await db.$transaction([
        db.scenarioLike.delete({
          where: { id: existingLike.id },
        }),
        db.scenario.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
        }),
      ])

      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: scenario.likeCount - 1,
      })
    } else {
      // Like: create the like and increment the count
      await db.$transaction([
        db.scenarioLike.create({
          data: {
            scenarioId: id,
            userId: user.id,
          },
        }),
        db.scenario.update({
          where: { id },
          data: { likeCount: { increment: 1 } },
        }),
      ])

      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: scenario.likeCount + 1,
      })
    }
  } catch (error) {
    console.error('Toggle scenario like error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
