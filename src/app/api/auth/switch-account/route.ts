import { NextRequest, NextResponse } from 'next/server'
import { switchToAccount, switchToAccountWithToken, getSessionFromRequest } from '@/lib/auth'
import { z } from 'zod'

const switchSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  token: z.string().optional(), // Client-side token from localStorage (fallback when accounts cookie is unavailable)
})

export async function POST(request: NextRequest) {
  try {
    // Check if currently authenticated (check both Authorization header and cookies)
    const currentUser = await getSessionFromRequest(request)
    
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
    
    const { userId, token } = result.data
    
    // Try switching via the server-side accounts cookie first
    let switchResult = await switchToAccount(userId)
    
    // If the account wasn't found in the server-side cookie but the client
    // provided a token (from localStorage), verify and use it as a fallback.
    // This handles proxied/sandbox environments where cookies are not reliably
    // forwarded by the gateway.
    if (!switchResult && token) {
      switchResult = await switchToAccountWithToken(userId, token)
    }
    
    if (!switchResult) {
      // Account not found in store or token expired — return a more specific error
      // so the client can clean up the stale account
      return NextResponse.json(
        { error: 'Account not found or session expired. Please log in again.', code: 'ACCOUNT_NOT_FOUND' },
        { status: 404 }
      )
    }
    
    const { user, token: newToken } = switchResult
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
        chronos: user.chronos,
      },
      token: newToken,
    })
    
  } catch (error) {
    console.error('[API] Switch account error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
