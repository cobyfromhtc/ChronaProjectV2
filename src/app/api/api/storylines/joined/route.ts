import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Get user's joined storylines
export async function GET() {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const memberships = await db.storylineMember.findMany({
      where: { userId: user.id },
      include: {
        storyline: {
          include: {
            owner: {
              select: { id: true, username: true, avatarUrl: true }
            },
            _count: {
              select: { members: true }
            },
            channels: {
              orderBy: { position: 'asc' },
              select: { id: true, name: true, type: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    })
    
    const storylines = memberships.map(m => ({
      ...m.storyline,
      role: m.role,
      joinedAt: m.joinedAt,
      memberCount: m.storyline._count.members
    }))
    
    return NextResponse.json({ success: true, storylines })
    
  } catch (error) {
    console.error('Get joined storylines error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
