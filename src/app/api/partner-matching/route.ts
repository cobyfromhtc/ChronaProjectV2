import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// Calculate compatibility score between two personas
function calculateCompatibility(persona1: any, persona2: any): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // RP Style compatibility (25 points)
  const rpStyles = ['one_liner', 'semi_lit', 'literate', 'novella']
  const style1 = persona1.rpStyle ? rpStyles.indexOf(persona1.rpStyle) : -1
  const style2 = persona2.rpStyle ? rpStyles.indexOf(persona2.rpStyle) : -1
  if (style1 !== -1 && style2 !== -1) {
    const styleDiff = Math.abs(style1 - style2)
    if (styleDiff === 0) {
      score += 25
      reasons.push('Same RP style preference')
    } else if (styleDiff === 1) {
      score += 15
      reasons.push('Similar RP style preference')
    }
  }

  // Genre overlap (25 points)
  try {
    const genres1 = persona1.rpGenres ? JSON.parse(persona1.rpGenres) : []
    const genres2 = persona2.rpGenres ? JSON.parse(persona2.rpGenres) : []
    const genreOverlap = genres1.filter((g: string) => genres2.includes(g))
    if (genreOverlap.length > 0) {
      score += Math.min(25, genreOverlap.length * 5)
      if (genreOverlap.length >= 3) {
        reasons.push(`${genreOverlap.length} shared genres`)
      }
    }
  } catch {}

  // Theme overlap (20 points)
  try {
    const themes1 = persona1.rpThemes ? JSON.parse(persona1.rpThemes) : []
    const themes2 = persona2.rpThemes ? JSON.parse(persona2.rpThemes) : []
    const themeOverlap = themes1.filter((t: string) => themes2.includes(t))
    if (themeOverlap.length > 0) {
      score += Math.min(20, themeOverlap.length * 4)
      if (themeOverlap.length >= 2) {
        reasons.push(`${themeOverlap.length} shared themes`)
      }
    }
  } catch {}

  // Response time compatibility (15 points)
  const responseTimes = ['instant', 'same_day', 'few_days', 'weekly']
  const rt1 = persona1.rpResponseTime ? responseTimes.indexOf(persona1.rpResponseTime) : -1
  const rt2 = persona2.rpResponseTime ? responseTimes.indexOf(persona2.rpResponseTime) : -1
  if (rt1 !== -1 && rt2 !== -1) {
    const rtDiff = Math.abs(rt1 - rt2)
    if (rtDiff === 0) {
      score += 15
      reasons.push('Same response time preference')
    } else if (rtDiff === 1) {
      score += 10
    }
  }

  // Experience level compatibility (15 points)
  const expLevels = ['beginner', 'intermediate', 'advanced', 'veteran']
  const exp1 = persona1.rpExperienceLevel ? expLevels.indexOf(persona1.rpExperienceLevel) : -1
  const exp2 = persona2.rpExperienceLevel ? expLevels.indexOf(persona2.rpExperienceLevel) : -1
  if (exp1 !== -1 && exp2 !== -1) {
    const expDiff = Math.abs(exp1 - exp2)
    if (expDiff === 0) {
      score += 15
      reasons.push('Same experience level')
    } else if (expDiff === 1) {
      score += 8
    }
  }

  return { score: Math.min(100, score), reasons }
}

// GET /api/partner-matching - Get partner matches for a persona
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get('personaId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
    }

    // Get the persona looking for partners
    const persona = await db.persona.findFirst({
      where: { id: personaId, userId: user.id }
    })

    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    // Get existing matches
    const existingMatches = await db.partnerMatch.findMany({
      where: { matcherId: personaId },
      select: { matchedId: true, status: true }
    })

    const excludedIds = [personaId, ...existingMatches.map(m => m.matchedId)]

    // Find potential matches (personas looking for partners)
    const potentials = await db.persona.findMany({
      where: {
        lookingForPartner: true,
        id: { notIn: excludedIds },
        userId: { not: user.id } // Exclude own personas
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      },
      take: 50
    })

    // Calculate compatibility for each potential match
    const matchesWithScore = potentials.map(potential => {
      const { score, reasons } = calculateCompatibility(persona, potential)
      return { ...potential, compatibilityScore: score, matchReasons: reasons }
    })

    // Sort by compatibility score
    matchesWithScore.sort((a, b) => b.compatibilityScore - a.compatibilityScore)

    // Store top matches in database
    const topMatches = matchesWithScore.slice(0, limit)
    for (const match of topMatches) {
      await db.partnerMatch.upsert({
        where: {
          matcherId_matchedId: {
            matcherId: personaId,
            matchedId: match.id
          }
        },
        create: {
          matcherId: personaId,
          matchedId: match.id,
          compatibilityScore: match.compatibilityScore,
          matchReasons: JSON.stringify(match.matchReasons)
        },
        update: {
          compatibilityScore: match.compatibilityScore,
          matchReasons: JSON.stringify(match.matchReasons)
        }
      })
    }

    return NextResponse.json({ 
      matches: topMatches,
      existingMatches: existingMatches.filter(m => m.status !== 'passed')
    })
  } catch (error) {
    console.error('Error finding partner matches:', error)
    return NextResponse.json({ error: 'Failed to find partner matches' }, { status: 500 })
  }
}
