import { NextRequest, NextResponse } from 'next/server'
import { getSessionWithFreshRoleFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { isStaff } from '@/lib/roles'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getSessionWithFreshRoleFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Only staff can access this endpoint
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Get the user with their personas
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        personas: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            isActive: true,
            customTag: true,
          }
        }
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Find the current active persona
    const activePersona = user.personas.find(p => p.isActive)
    
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      activePersona: activePersona || null,
      personas: user.personas,
    })
    
  } catch (error) {
    console.error('Error fetching user for CTag:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
