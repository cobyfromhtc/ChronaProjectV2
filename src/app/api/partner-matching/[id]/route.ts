import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// PATCH /api/partner-matching/[id] - Update match status (like, pass, match)
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
    const { status, matcherId } = body

    if (!['liked', 'passed', 'matched'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Verify the match belongs to user's persona
    const match = await db.partnerMatch.findFirst({
      where: { id, matcherId }
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const updatedMatch = await db.partnerMatch.update({
      where: { id },
      data: { status }
    })

    // If both liked each other, it's a match!
    if (status === 'liked') {
      const reverseMatch = await db.partnerMatch.findUnique({
        where: {
          matcherId_matchedId: {
            matcherId: match.matchedId,
            matchedId: match.matcherId
          }
        }
      })

      if (reverseMatch && reverseMatch.status === 'liked') {
        // Update both to matched
        await db.partnerMatch.update({
          where: { id: match.id },
          data: { status: 'matched' }
        })
        await db.partnerMatch.update({
          where: { id: reverseMatch.id },
          data: { status: 'matched' }
        })
        
        return NextResponse.json({ match: updatedMatch, isMutualMatch: true })
      }
    }

    return NextResponse.json({ match: updatedMatch })
  } catch (error) {
    console.error('Error updating match:', error)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }
}
