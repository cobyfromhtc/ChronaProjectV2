import { NextResponse } from 'next/server'
import { getSession, verifySession } from '@/lib/auth'
import { db } from '@/lib/db'

// Auth me endpoint - returns current user with role

export async function GET(request: Request) {
  try {
    let sessionUser = null

    // First try Authorization header (for account switching)
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      sessionUser = await verifySession(token)
    }

    // Fall back to cookie session
    if (!sessionUser) {
      sessionUser = await getSession()
    }

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify user actually exists in database
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
        chronos: true,
        isOfficial: true,
        customTag: true,
        dateOfBirth: true,
        isAdult: true,
      }
    })

    if (!user) {
      // User no longer exists (e.g., after database reset)
      return NextResponse.json(
        { error: 'User not found. Please log in again.' },
        { status: 401 }
      )
    }

    // Parse customTag if present and calculate age
    let age: number | null = null
    if (user.dateOfBirth) {
      const today = new Date()
      const dob = new Date(user.dateOfBirth)
      age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
      }
    }
    
    const userData = {
      ...user,
      customTag: user.customTag ? JSON.parse(user.customTag) : null,
      age,
    }

    return NextResponse.json({
      success: true,
      user: userData
    })

  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
