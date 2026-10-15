import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await db.notification.findMany({
      where: {
        userId: user.id,
        isDismissed: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    // Count unread
    const unreadCount = await db.notification.count({
      where: {
        userId: user.id,
        isDismissed: false,
        isRead: false,
      },
    })

    return NextResponse.json({
      notifications,
      count: notifications.length,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
