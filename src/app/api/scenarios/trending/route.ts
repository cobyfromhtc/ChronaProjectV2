import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdult } from '@/lib/age-utils'

// =============================================
// Trending Scenarios API
// =============================================
// GET /api/scenarios/trending
//
// Returns the top scenarios whose creators opted in to trending
// (allowTrending=true) and that are public. Ranked by weekly
// engagement: likeCount is the primary key, then total engagement
// (likeCount + viewCount + chatCount), newest first as a tiebreaker.
// Max 8 results. Applies the same age-gating as the scenario list
// (minors only see safe/moderate).

function formatTrendingScenario(
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
    allowTrending: scenario.allowTrending === true,
    trendingOptInAt: scenario.trendingOptInAt || null,
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

// Weekly engagement score: likes are the primary signal
function engagementScore(s: { likeCount: number; viewCount: number; chatCount: number }): number {
  return (s.likeCount || 0) * 1000 + (s.viewCount || 0) + (s.chatCount || 0)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()

    // Only opted-in public scenarios (age-gated: minors see safe/moderate only)
    const userIsAdult = user ? isAdult(user.dateOfBirth ? new Date(user.dateOfBirth) : null) : false

    // Fetch opted-in scenarios (likeCount desc from the store, re-ranked below)
    const scenarios = await db.scenario.findMany({
      where: userIsAdult
        ? { allowTrending: true, isPublic: true }
        : { allowTrending: true, isPublic: true, contentRating: { in: ['safe', 'moderate'] } },
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
      orderBy: { likeCount: 'desc' },
    })

    // Rank: likeCount primary, engagement score secondary, newest tertiary
    const ranked = [...scenarios]
      .sort((a, b) => {
        const likeDiff = (b.likeCount || 0) - (a.likeCount || 0)
        if (likeDiff !== 0) return likeDiff
        const scoreDiff = engagementScore(b) - engagementScore(a)
        if (scoreDiff !== 0) return scoreDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(0, 8)

    // Check which scenarios the current user has liked
    let likedSet = new Set<string>()
    if (user && ranked.length > 0) {
      const likes = await db.scenarioLike.findMany({
        where: {
          userId: user.id,
          scenarioId: { in: ranked.map((s) => s.id) },
        },
        select: { scenarioId: true },
      })
      likedSet = new Set(likes.map((l) => l.scenarioId))
    }

    return NextResponse.json({
      success: true,
      scenarios: ranked.map((s) =>
        formatTrendingScenario(s as unknown as Record<string, unknown>, likedSet.has(s.id))
      ),
      total: ranked.length,
    })
  } catch (error) {
    console.error('Trending scenarios error:', error)
    const message = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
