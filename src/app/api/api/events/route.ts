import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/events - Get active events
export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    
    // Get all active events that are currently running
    const events = await db.event.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        badges: true,
        _count: {
          select: { participations: true }
        }
      },
      orderBy: { startDate: 'asc' }
    })
    
    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
