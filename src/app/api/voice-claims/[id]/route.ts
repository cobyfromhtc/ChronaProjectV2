import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/voice-claims/[id] - Get a specific voice claim
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const voiceClaim = await db.voiceClaim.findUnique({
      where: { id }
    })

    if (!voiceClaim) {
      return NextResponse.json({ error: 'Voice claim not found' }, { status: 404 })
    }

    return NextResponse.json({ voiceClaim })
  } catch (error) {
    console.error('Error fetching voice claim:', error)
    return NextResponse.json({ error: 'Failed to fetch voice claim' }, { status: 500 })
  }
}
