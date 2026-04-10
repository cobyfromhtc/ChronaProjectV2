import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/folders - Get user's folders
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const folders = await db.personaFolder.findMany({
      where: { userId: user.id },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { personas: true }
        }
      }
    })

    return NextResponse.json({ folders })
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
  }
}

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color, icon } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    // Check if folder with same name exists
    const existing = await db.personaFolder.findFirst({
      where: { userId: user.id, name: name.trim() }
    })

    if (existing) {
      return NextResponse.json({ error: 'Folder with this name already exists' }, { status: 400 })
    }

    // Get max position
    const maxPosition = await db.personaFolder.aggregate({
      where: { userId: user.id },
      _max: { position: true }
    })

    const folder = await db.personaFolder.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description,
        color: color || '#8b5cf6',
        icon,
        position: (maxPosition._max.position || 0) + 1
      }
    })

    return NextResponse.json({ folder })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}
