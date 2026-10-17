import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdult } from '@/lib/age-utils'
import { z } from 'zod'

// =============================================
// Single Scenario API — Get / Update / Delete
// =============================================

const SCENARIO_CATEGORIES = [
  'romance', 'adventure', 'mystery', 'horror', 'comedy',
  'drama', 'fantasy', 'sci-fi', 'slice-of-life', 'thriller',
  'historical', 'supernatural', 'other',
] as const

const CONTENT_RATINGS = ['safe', 'moderate', 'mature', 'explicit'] as const

// Schema for updating a scenario (all fields optional)
const updateScenarioSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters').optional(),
  description: z.string().max(5000, 'Description must be at most 5000 characters').optional().nullable(),
  imageUrl: z.string().url('Invalid image URL').optional().nullable(),
  bannerUrl: z.string().url('Invalid banner URL').optional().nullable(),
  location: z.string().max(200, 'Location must be at most 200 characters').optional().nullable(),
  attire: z.string().max(500, 'Attire must be at most 500 characters').optional().nullable(),
  initialMessages: z.array(z.string().max(2000)).max(10, 'Maximum 10 initial messages').optional().nullable(),
  mood: z.string().max(100, 'Mood must be at most 100 characters').optional().nullable(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags').optional().nullable(),
  category: z.enum(SCENARIO_CATEGORIES).optional(),
  isPublic: z.boolean().optional(),
  contentRating: z.enum(CONTENT_RATINGS).optional(),
})

// Helper: format scenario row for API response
function formatScenarioRow(
  scenario: Record<string, unknown>,
  isLikedByUser = false,
) {
  let parsedInitialMessages: string[] = []
  if (scenario.initialMessages && typeof scenario.initialMessages === 'string') {
    try {
      parsedInitialMessages = JSON.parse(scenario.initialMessages)
    } catch {
      parsedInitialMessages = []
    }
  }

  let parsedTags: string[] = []
  if (scenario.tags && typeof scenario.tags === 'string') {
    try {
      parsedTags = JSON.parse(scenario.tags)
    } catch {
      parsedTags = []
    }
  }

  const persona = scenario.persona as Record<string, unknown> | null
  const creator = scenario.creator as Record<string, unknown> | null

  return {
    id: scenario.id,
    personaId: scenario.personaId,
    creatorId: scenario.creatorId,
    title: scenario.title,
    description: scenario.description,
    imageUrl: scenario.imageUrl,
    bannerUrl: scenario.bannerUrl,
    location: scenario.location,
    attire: scenario.attire,
    initialMessages: parsedInitialMessages,
    mood: scenario.mood,
    tags: parsedTags,
    category: scenario.category,
    isPublic: scenario.isPublic,
    isFeatured: scenario.isFeatured,
    viewCount: scenario.viewCount,
    chatCount: scenario.chatCount,
    likeCount: scenario.likeCount,
    contentRating: scenario.contentRating,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
    isLiked: isLikedByUser,
    persona: persona
      ? {
          id: persona.id,
          name: persona.name,
          avatarUrl: persona.avatarUrl,
          mbtiType: persona.mbtiType,
          archetype: persona.archetype,
          gender: persona.gender,
          species: persona.species,
          age: persona.age,
        }
      : null,
    creator: creator
      ? {
          id: creator.id,
          username: creator.username,
          avatarUrl: creator.avatarUrl,
        }
      : null,
  }
}

// GET — Get a single scenario with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    const { id } = await params

    const scenario = await db.scenario.findUnique({
      where: { id },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            mbtiType: true,
            archetype: true,
            gender: true,
            species: true,
            age: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    // If scenario is not public, only the creator can view it
    if (!scenario.isPublic && (!user || user.id !== scenario.creatorId)) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    // Age-gating: Minors cannot view mature/explicit scenarios
    const userIsAdult = user ? isAdult(user.dateOfBirth ? new Date(user.dateOfBirth) : null) : false
    if (!userIsAdult && (scenario.contentRating === 'mature' || scenario.contentRating === 'explicit')) {
      // Only the creator can see their own restricted scenario even as a minor
      if (!user || user.id !== scenario.creatorId) {
        return NextResponse.json(
          { error: 'This content is restricted to users 18 and older', restricted: true },
          { status: 403 }
        )
      }
    }

    // Increment view count (fire-and-forget, don't block response)
    db.scenario.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {
      // Non-critical: don't fail the request if view count increment fails
    })

    // Check if current user has liked this scenario
    let isLiked = false
    if (user) {
      const like = await db.scenarioLike.findUnique({
        where: {
          scenarioId_userId: { scenarioId: id, userId: user.id },
        },
        select: { id: true },
      })
      isLiked = !!like
    }

    return NextResponse.json({
      success: true,
      scenario: formatScenarioRow(scenario as unknown as Record<string, unknown>, isLiked),
    })
  } catch (error) {
    console.error('Get scenario error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH — Update a scenario
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    // Verify scenario exists and user is the creator
    const existing = await db.scenario.findUnique({
      where: { id },
      select: { creatorId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    if (existing.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the creator can update this scenario' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Age-gating: Minors cannot set mature/explicit content rating
    if (body.contentRating === 'mature' || body.contentRating === 'explicit') {
      const userIsAdult = isAdult(user.dateOfBirth ? new Date(user.dateOfBirth) : null)
      if (!userIsAdult) {
        return NextResponse.json(
          { error: 'You must be 18 or older to set mature or explicit content ratings' },
          { status: 403 }
        )
      }
    }

    const result = updateScenarioSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const data = result.data

    // Build update object — only include fields that were provided
    const updateData: Record<string, unknown> = {}

    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.description !== undefined) updateData.description = data.description?.trim() || null
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null
    if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl || null
    if (data.location !== undefined) updateData.location = data.location?.trim() || null
    if (data.attire !== undefined) updateData.attire = data.attire?.trim() || null
    if (data.initialMessages !== undefined) {
      updateData.initialMessages = data.initialMessages ? JSON.stringify(data.initialMessages) : null
    }
    if (data.mood !== undefined) updateData.mood = data.mood?.trim() || null
    if (data.tags !== undefined) {
      updateData.tags = data.tags ? JSON.stringify(data.tags) : null
    }
    if (data.category !== undefined) updateData.category = data.category
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic
    if (data.contentRating !== undefined) updateData.contentRating = data.contentRating

    const updated = await db.scenario.update({
      where: { id },
      data: updateData,
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            mbtiType: true,
            archetype: true,
            gender: true,
            species: true,
            age: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      scenario: formatScenarioRow(updated as unknown as Record<string, unknown>),
    })
  } catch (error) {
    console.error('Update scenario error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE — Delete a scenario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    // Verify scenario exists and user is the creator
    const existing = await db.scenario.findUnique({
      where: { id },
      select: { creatorId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    if (existing.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the creator can delete this scenario' },
        { status: 403 }
      )
    }

    await db.scenario.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Scenario deleted' })
  } catch (error) {
    console.error('Delete scenario error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
