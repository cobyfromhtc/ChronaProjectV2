import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/folders/[id] - Get a specific folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    const folder = await db.personaFolder.findFirst({
      where: { id, userId: user.id },
      include: {
        personas: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    return NextResponse.json({ folder })
  } catch (error) {
    console.error('Error fetching folder:', error)
    return NextResponse.json({ error: 'Failed to fetch folder' }, { status: 500 })
  }
}

// PATCH /api/folders/[id] - Update a folder
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
    const { name, description, color, icon, position } = body

    const folder = await db.personaFolder.findFirst({
      where: { id, userId: user.id }
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const updatedFolder = await db.personaFolder.update({
      where: { id },
      data: {
        name: name?.trim(),
        description,
        color,
        icon,
        position
      }
    })

    return NextResponse.json({ folder: updatedFolder })
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
  }
}

// DELETE /api/folders/[id] - Delete a folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const folder = await db.personaFolder.findFirst({
      where: { id, userId: user.id }
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Move personas in this folder to no folder (null)
    await db.persona.updateMany({
      where: { folderId: id },
      data: { folderId: null }
    })

    await db.personaFolder.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
  }
}
