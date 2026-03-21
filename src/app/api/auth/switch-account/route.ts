import { NextRequest, NextResponse } from 'next/server'
import { switchToAccount, getSession } from '@/lib/auth'
import { z } from 'zod'

const switchSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Check if currently authenticated
    const currentUser = await getSession()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
    // Validate input
    const result = switchSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    
    const { userId } = result.data
    
    // Switch to the account
    const user = await switchToAccount(userId)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Account not found or session expired. Please log in again.' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
      }
    })
    
  } catch (error) {
    console.error('[API] Switch account error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
