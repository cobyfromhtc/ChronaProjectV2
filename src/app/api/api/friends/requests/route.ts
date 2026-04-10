import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Get pending friend requests (sent and received)
export async function GET() {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get received requests
    const received = await db.friendRequest.findMany({
      where: { receiverId: user.id, status: 'pending' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            personas: {
              where: { isActive: true },
              select: { id: true, name: true, avatarUrl: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Get sent requests
    const sent = await db.friendRequest.findMany({
      where: { senderId: user.id, status: 'pending' },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({
      success: true,
      received: received.map(r => ({
        id: r.id,
        sender: r.sender
      })),
      sent: sent.map(s => ({
        id: s.id,
        receiver: s.receiver
      }))
    })
    
  } catch (error) {
    console.error('Get friend requests error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
