import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdult } from '@/lib/age-utils'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

// =============================================
// Scenarios API — List & Create
// =============================================

const SCENARIO_CATEGORIES = [
  'romance', 'adventure', 'mystery', 'horror', 'comedy',
  'drama', 'fantasy', 'sci-fi', 'slice-of-life', 'thriller',
  'historical', 'supernatural', 'other',
] as const

const CONTENT_RATINGS = ['safe', 'moderate', 'mature', 'explicit'] as const

// Schema for creating a scenario
const createScenarioSchema = z.object({
  personaId: z.string().min(1, 'Persona is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
  description: z.string().max(5000, 'Description must be at most 5000 characters').optional().nullable(),
  imageUrl: z.string().url('Invalid image URL').optional().nullable(),
  bannerUrl: z.string().url('Invalid banner URL').optional().nullable(),
  location: z.string().max(200, 'Location must be at most 200 characters').optional().nullable(),
  attire: z.string().max(500, 'Attire must be at most 500 characters').optional().nullable(),
  initialMessages: z.array(z.string().max(2000)).max(10, 'Maximum 10 initial messages').optional().nullable(),
  mood: z.string().max(100, 'Mood must be at most 100 characters').optional().nullable(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags').optional().nullable(),
  category: z.enum(SCENARIO_CATEGORIES).default('romance'),
  contentRating: z.enum(CONTENT_RATINGS).default('safe'),
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

// GET — List public scenarios with filtering, search, and sorting
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category')
    const sort = searchParams.get('sort') || 'new'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
    const personaId = searchParams.get('personaId')

    // Build where clause — only public scenarios
    const where: Prisma.ScenarioWhereInput = { isPublic: true }

    // Age-gating: Minors can only see safe & moderate scenarios
    const userIsAdult = user ? isAdult(user.dateOfBirth ? new Date(user.dateOfBirth) : null) : false
    if (!userIsAdult) {
      where.contentRating = { in: ['safe', 'moderate'] }
    }

    if (category && SCENARIO_CATEGORIES.includes(category as typeof SCENARIO_CATEGORIES[number])) {
      where.category = category
    }

    if (personaId) {
      where.personaId = personaId
    }

    // Search filter
    if (search.length >= 2) {
      const searchLower = search.toLowerCase()
      where.OR = [
        { title: { contains: searchLower } },
        { description: { contains: searchLower } },
        { location: { contains: searchLower } },
        { mood: { contains: searchLower } },
      ]
    }

    // Determine ordering
    let orderBy: Record<string, string>
    switch (sort) {
      case 'popular':
        orderBy = { likeCount: 'desc' }
        break
      case 'recent':
        orderBy = { updatedAt: 'desc' }
        break
      case 'new':
      default:
        orderBy = { createdAt: 'desc' }
        break
    }

    // Fetch scenarios
    const scenarios = await db.scenario.findMany({
      where,
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
      orderBy,
      take: limit,
      skip: offset,
    })

    // Check which scenarios the current user has liked
    let likedSet = new Set<string>()
    if (user) {
      const scenarioIds = scenarios.map(s => s.id)
      if (scenarioIds.length > 0) {
        const likes = await db.scenarioLike.findMany({
          where: {
            userId: user.id,
            scenarioId: { in: scenarioIds },
          },
          select: { scenarioId: true },
        })
        likedSet = new Set(likes.map(l => l.scenarioId))
      }
    }

    // Search within tags (not supported by Prisma contains on String field)
    let filtered = scenarios
    if (search.length >= 2) {
      const searchLower = search.toLowerCase()
      filtered = scenarios.filter(s => {
        // Already matched by OR clause above
        if (
          s.title.toLowerCase().includes(searchLower) ||
          (s.description && s.description.toLowerCase().includes(searchLower)) ||
          (s.location && s.location.toLowerCase().includes(searchLower)) ||
          (s.mood && s.mood.toLowerCase().includes(searchLower))
        ) {
          return true
        }
        // Also search within tags JSON
        if (s.tags) {
          try {
            const tags: string[] = JSON.parse(s.tags)
            if (tags.some(t => t.toLowerCase().includes(searchLower))) return true
          } catch {
            // ignore
          }
        }
        return false
      })
    }

    const total = await db.scenario.count({ where })

    const result = filtered.map(s =>
      formatScenarioRow(s as unknown as Record<string, unknown>, likedSet.has(s.id))
    )

    return NextResponse.json({
      success: true,
      scenarios: result,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('List scenarios error:', error)
    const message = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST — Create a new scenario
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    const result = createScenarioSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const data = result.data

    // Validate that the user owns the persona
    const persona = await db.persona.findUnique({
      where: { id: data.personaId },
      select: { userId: true },
    })

    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    if (persona.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only create scenarios for your own personas' },
        { status: 403 }
      )
    }

    // Age-gating: Minors cannot create mature/explicit scenarios
    const userIsAdult = isAdult(user.dateOfBirth ? new Date(user.dateOfBirth) : null)
    if (!userIsAdult && (data.contentRating === 'mature' || data.contentRating === 'explicit')) {
      return NextResponse.json(
        { error: 'You must be 18 or older to create mature or explicit content' },
        { status: 403 }
      )
    }

    // Create the scenario
    const scenario = await db.scenario.create({
      data: {
        personaId: data.personaId,
        creatorId: user.id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl || null,
        bannerUrl: data.bannerUrl || null,
        location: data.location?.trim() || null,
        attire: data.attire?.trim() || null,
        initialMessages: data.initialMessages ? JSON.stringify(data.initialMessages) : null,
        mood: data.mood?.trim() || null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        category: data.category,
        contentRating: data.contentRating,
      },
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

    return NextResponse.json(
      {
        success: true,
        scenario: formatScenarioRow(scenario as unknown as Record<string, unknown>),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create scenario error:', error)
    const message = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
