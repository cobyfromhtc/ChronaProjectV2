import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// Auth me endpoint - returns current user with role

export async function GET() {
  try {
    const sessionUser = await getSession()

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
      }
    })

    if (!user) {
      // User no longer exists (e.g., after database reset)
      return NextResponse.json(
        { error: 'User not found. Please log in again.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
