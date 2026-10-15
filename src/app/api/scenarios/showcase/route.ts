import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdult } from '@/lib/age-utils'

// =============================================
// Persona of the Week Showcase API
// =============================================
// GET /api/scenarios/showcase
//
// Picks ONE persona to feature for the current week, chosen only from
// personas that have at least one opted-in (allowTrending=true) public
// scenario. Candidates are ranked by total engagement (sum of likeCount
// across their opted-in scenarios). The pick is deterministic per ISO
// week: index = ISOweek % min(candidates, 3) — a top-3 rotation across
// weeks so the showcase doesn't churn hourly.
//
// Response: { persona: { ...persona info + creator }, scenarios: [up to 6
// of their opted-in scenarios ranked by engagement] }

interface ShowcaseCandidate {
  persona: Record<string, unknown>
  scenarios: Record<string, unknown>[]
  score: number
}

// ISO-8601 week number (1..53)
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function formatShowcaseScenario(scenario: Record<string, unknown>, isLikedByUser = false) {
  let parsedTags: string[] = []
  if (scenario.tags && typeof scenario.tags === 'string') {
    try {
      parsedTags = JSON.parse(scenario.tags)
    } catch {
      parsedTags = []
    }
  }

  const persona = scenario.persona as Record<string, unknown> | null

  return {
    id: scenario.id,
    personaId: scenario.personaId,
    creatorId: scenario.creatorId,
    title: scenario.title,
    description: scenario.description,
    imageUrl: scenario.imageUrl,
    bannerUrl: scenario.bannerUrl,
    location: scenario.location,
    mood: scenario.mood,
    tags: parsedTags,
    category: scenario.category,
    viewCount: scenario.viewCount,
    chatCount: scenario.chatCount,
    likeCount: scenario.likeCount,
    contentRating: scenario.contentRating,
    createdAt: scenario.createdAt,
    isLiked: isLikedByUser,
    persona: persona
      ? {
          id: persona.id,
          name: persona.name,
          avatarUrl: persona.avatarUrl,
          mbtiType: persona.mbtiType,
          archetype: persona.archetype,
        }
      : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()

    // Only opted-in public scenarios (age-gated: minors see safe/moderate only)
    const userIsAdult = user ? isAdult(user.dateOfBirth ? new Date(user.dateOfBirth) : null) : false

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
            description: true,
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

    if (scenarios.length === 0) {
      return NextResponse.json({
        success: true,
        persona: null,
        scenarios: [],
      })
    }

    // Group by persona — every persona with ≥1 opted-in scenario is a candidate
    const byPersona = new Map<string, ShowcaseCandidate>()
    for (const scenario of scenarios) {
      const persona = scenario.persona as Record<string, unknown> | null
      if (!persona || !persona.id) continue
      const key = String(persona.id)
      if (!byPersona.has(key)) {
        byPersona.set(key, { persona, scenarios: [], score: 0 })
      }
      const entry = byPersona.get(key)!
      entry.scenarios.push(scenario as unknown as Record<string, unknown>)
      entry.score += (scenario.likeCount || 0) * 1000 + (scenario.viewCount || 0) + (scenario.chatCount || 0)
    }

    // Rank candidates by total engagement of their opted-in scenarios
    const candidates = [...byPersona.values()].sort((a, b) => b.score - a.score)

    // Deterministic weekly pick — rotates through the top 3 across weeks
    const isoWeek = getISOWeekNumber(new Date())
    const rotationSize = Math.min(candidates.length, 3)
    const picked = candidates[isoWeek % rotationSize]

    // The picked persona's opted-in scenarios, ranked (max 6)
    const rankedScenarios = picked.scenarios
      .sort((a, b) => {
        const likeDiff = (b.likeCount as number || 0) - (a.likeCount as number || 0)
        if (likeDiff !== 0) return likeDiff
        const scoreDiff =
          (((b.likeCount as number) || 0) * 1000 + ((b.viewCount as number) || 0) + ((b.chatCount as number) || 0)) -
          (((a.likeCount as number) || 0) * 1000 + ((a.viewCount as number) || 0) + ((a.chatCount as number) || 0))
        if (scoreDiff !== 0) return scoreDiff
        return new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
      })
      .slice(0, 6)

    // Which of the shown scenarios the current user has liked
    let likedSet = new Set<string>()
    if (user && rankedScenarios.length > 0) {
      const likes = await db.scenarioLike.findMany({
        where: {
          userId: user.id,
          scenarioId: { in: rankedScenarios.map((s) => String(s.id)) },
        },
        select: { scenarioId: true },
      })
      likedSet = new Set(likes.map((l) => l.scenarioId))
    }

    // Persona info + creator credit
    const firstScenario = picked.scenarios[0]
    const creator = firstScenario?.creator as Record<string, unknown> | null

    const personaInfo = {
      id: picked.persona.id,
      name: picked.persona.name,
      avatarUrl: picked.persona.avatarUrl || null,
      mbtiType: picked.persona.mbtiType || null,
      archetype: picked.persona.archetype || null,
      gender: picked.persona.gender || null,
      species: picked.persona.species || null,
      age: picked.persona.age ?? null,
      description: picked.persona.description || null,
      creator: creator
        ? {
            id: creator.id,
            username: creator.username,
            avatarUrl: creator.avatarUrl,
          }
        : null,
    }

    return NextResponse.json({
      success: true,
      persona: personaInfo,
      scenarios: rankedScenarios.map((s) => formatShowcaseScenario(s, likedSet.has(String(s.id)))),
    })
  } catch (error) {
    console.error('Showcase error:', error)
    const message = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
