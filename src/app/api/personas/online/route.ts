import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// POST - Set online/offline status for all user's personas
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { isOnline } = body
    
    // Update all personas for this user
    await db.persona.updateMany({
      where: { userId: user.id },
      data: { isOnline: !!isOnline }
    })
    
    return NextResponse.json({ 
      success: true,
      message: `Personas set to ${isOnline ? 'online' : 'offline'}`
    })
    
  } catch (error) {
    console.error('Update online status error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
