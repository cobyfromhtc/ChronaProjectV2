import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/voice-claims - Search voice claims
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const sourceType = searchParams.get('sourceType') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    
    if (search) {
      where.OR = [
        { characterName: { contains: search, mode: 'insensitive' } },
        { actorName: { contains: search, mode: 'insensitive' } },
        { sourceTitle: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (sourceType) {
      where.sourceType = sourceType
    }

    const voiceClaims = await db.voiceClaim.findMany({
      where,
      orderBy: [
        { useCount: 'desc' },
        { characterName: 'asc' }
      ],
      take: limit
    })

    return NextResponse.json({ voiceClaims })
  } catch (error) {
    console.error('Error fetching voice claims:', error)
    return NextResponse.json({ error: 'Failed to fetch voice claims' }, { status: 500 })
  }
}

// POST /api/voice-claims - Create a new voice claim (for seeding)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { characterName, actorName, sourceTitle, sourceType, year, imageUrl, description, tags } = body

    if (!characterName || !actorName || !sourceTitle || !sourceType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const voiceClaim = await db.voiceClaim.create({
      data: {
        characterName,
        actorName,
        sourceTitle,
        sourceType,
        year,
        imageUrl,
        description,
        tags: tags ? JSON.stringify(tags) : null
      }
    })

    return NextResponse.json({ voiceClaim })
  } catch (error) {
    console.error('Error creating voice claim:', error)
    return NextResponse.json({ error: 'Failed to create voice claim' }, { status: 500 })
  }
}
