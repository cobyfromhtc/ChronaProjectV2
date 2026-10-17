import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// POST - Dismiss or mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, dismissAll, markRead, markAllRead } = body

    // Mark all as read (without dismissing)
    if (markAllRead) {
      await db.notification.updateMany({
        where: {
          userId: user.id,
          isDismissed: false,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      })

      return NextResponse.json({ success: true, markedAllRead: true })
    }

    // Mark a single notification as read (without dismissing)
    if (markRead && notificationId) {
      const notification = await db.notification.findUnique({
        where: { id: notificationId },
      })

      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }

      if (notification.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      await db.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      })

      return NextResponse.json({ success: true, markedRead: true })
    }

    // Dismiss all notifications for this user
    if (dismissAll) {
      await db.notification.updateMany({
        where: {
          userId: user.id,
          isDismissed: false,
        },
        data: {
          isDismissed: true,
          isRead: true,
        },
      })

      return NextResponse.json({ success: true, dismissedAll: true })
    }

    // Dismiss a specific notification
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    if (notification.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.notification.update({
      where: { id: notificationId },
      data: {
        isDismissed: true,
        isRead: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
