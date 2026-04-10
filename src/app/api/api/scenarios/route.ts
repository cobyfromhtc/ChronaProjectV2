import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/scenarios - Get public scenarios or user's scenarios
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const personaId = searchParams.get('personaId')
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = { isActive: true }
    
    if (userId) {
      where.userId = userId
    } else {
      where.isPublic = true
    }
    
    if (personaId) {
      where.personaId = personaId
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const scenarios = await db.scenario.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            user: {
              select: {
                id: true,
                username: true
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
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    })

    const total = await db.scenario.count({ where })

    return NextResponse.json({ scenarios, total })
  } catch (error) {
    console.error('Error fetching scenarios:', error)
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 })
  }
}

// POST /api/scenarios - Create a new scenario
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      personaId,
      title,
      description,
      scenarioContext,
      personalityNotes,
      illustrationUrl,
      alternateImageUrl,
      discordLink,
      suggestionLink,
      initialMessages,
      initialMessagesEnabled,
      pinnedNote,
      isPublic
    } = body

    if (!personaId || !title) {
      return NextResponse.json({ error: 'Persona ID and title are required' }, { status: 400 })
    }

    // Verify persona belongs to user
    const persona = await db.persona.findFirst({
      where: { id: personaId, userId: user.id }
    })

    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    const scenario = await db.scenario.create({
      data: {
        personaId,
        userId: user.id,
        title,
        description,
        scenarioContext,
        personalityNotes,
        illustrationUrl,
        alternateImageUrl,
        discordLink,
        suggestionLink,
        initialMessages: initialMessages ? JSON.stringify(initialMessages) : null,
        initialMessagesEnabled: initialMessagesEnabled ?? true,
        pinnedNote,
        isPublic: isPublic ?? true,
        publishedAt: isPublic ? new Date() : null
      },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json({ scenario })
  } catch (error) {
    console.error('Error creating scenario:', error)
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 })
  }
}
