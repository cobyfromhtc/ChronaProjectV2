import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Search for users by username
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, users: [] })
    }
    
    // SQLite doesn't support mode: 'insensitive', so we fetch users and filter in JS
    const allUsers = await db.user.findMany({
      where: {
        id: { not: user.id } // Exclude yourself
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        personas: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            isOnline: true
          }
        }
      }
    })
    
    // Filter by username (case-insensitive)
    const queryLower = query.toLowerCase()
    const filteredUsers = allUsers.filter(u => 
      u.username.toLowerCase().includes(queryLower)
    ).slice(0, 10) // Limit to 10 results

    const formattedUsers = filteredUsers.map(u => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      activePersona: u.personas[0] || null
    }))

    return NextResponse.json({ success: true, users: formattedUsers })
    
  } catch (error) {
    console.error('Search users error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}