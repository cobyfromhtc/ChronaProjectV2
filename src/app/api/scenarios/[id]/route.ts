import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/scenarios/[id] - Get a specific scenario
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const scenario = await db.scenario.findUnique({
      where: { id },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            description: true,
            gender: true,
            pronouns: true,
            age: true,
            species: true,
            archetype: true,
            mbtiType: true,
            bigFive: true,
            hexaco: true,
            personalityDescription: true,
            personalitySpectrums: true,
            strengths: true,
            flaws: true,
            values: true,
            fears: true,
            likes: true,
            dislikes: true,
            hobbies: true,
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        likes: {
          select: {
            userId: true,
            isFavorite: true
          }
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 50,
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
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    // Increment view count
    await db.scenario.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    })

    return NextResponse.json({ scenario })
  } catch (error) {
    console.error('Error fetching scenario:', error)
    return NextResponse.json({ error: 'Failed to fetch scenario' }, { status: 500 })
  }
}

// PATCH /api/scenarios/[id] - Update a scenario
export async function PATCH(
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

    const scenario = await db.scenario.findFirst({
      where: { id, userId: user.id }
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    const updateData: any = { ...body }
    
    if (body.initialMessages) {
      updateData.initialMessages = JSON.stringify(body.initialMessages)
    }
    
    if (body.isPublic && !scenario.publishedAt) {
      updateData.publishedAt = new Date()
    }

    const updatedScenario = await db.scenario.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ scenario: updatedScenario })
  } catch (error) {
    console.error('Error updating scenario:', error)
    return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 })
  }
}

// DELETE /api/scenarios/[id] - Delete a scenario
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

    const scenario = await db.scenario.findFirst({
      where: { id, userId: user.id }
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    await db.scenario.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scenario:', error)
    return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 })
  }
}
