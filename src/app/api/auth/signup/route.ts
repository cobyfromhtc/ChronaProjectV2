import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, generateSecurityKey, hashSecurityKey, createSession, addAccountToStore } from '@/lib/auth'
import { authRateLimiter } from '@/lib/rate-limit'
import { sendBlorpMessage, ensureBlorpExists } from '@/lib/blorp'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const STARTING_CHRONOS = 100

const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
  confirmPassword: z.string(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for auth endpoints
    const rateLimitResponse = authRateLimiter(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    const body = await request.json()
    
    // Validate input
    const result = signupSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    
    const { username, password, email } = result.data
    
    // Check if username already exists using findFirst
    const existingUser = await db.user.findFirst({
      where: { username }
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'This username is already taken' },
        { status: 400 }
      )
    }
    
    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await db.user.findFirst({
        where: { email }
      })
      if (existingEmail) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        )
      }
    }
    
    // Hash password and generate security key
    const hashedPassword = await hashPassword(password)
    const securityKey = generateSecurityKey()
    const hashedSecurityKey = hashSecurityKey(securityKey)
    
    // Create user
    const user = await db.user.create({
      data: {
        email: email || null,
        username,
        password: hashedPassword,
        securityKey: hashedSecurityKey,
        chronos: STARTING_CHRONOS,
      }
    })
    
    // Record the starting bonus as a transaction
    await db.chronosTransaction.create({
      data: {
        userId: user.id,
        amount: STARTING_CHRONOS,
        balance: STARTING_CHRONOS,
        type: 'bonus',
        category: 'welcome',
        description: 'Welcome bonus for new users',
      }
    })
    
    // Create session token
    const sessionUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: user.role,
      securityVerified: false,
    }
    
    const token = await createSession(sessionUser)
    
    // Add to accounts store
    await addAccountToStore(sessionUser, token)

    // Send welcome message from Blorp (async)
    ensureBlorpExists().then(() => {
      sendBlorpMessage(user.id, { type: 'welcome' }).catch(err => {
        console.error('Failed to send Blorp welcome message:', err)
      })
    })

    // Return user with security key
    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      securityKey,
      requiresSecurityKeyDisplay: true,
    })
    
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
