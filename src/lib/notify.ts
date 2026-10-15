// =============================================================
// Notification creation helper (DB record + realtime push)
// =============================================================
// Single choke point for creating user notifications. Inserts the
// notification record, then (best-effort) pushes it to the recipient's
// personal socket room so online users see it instantly — bell badge,
// dropdown list and toast — instead of waiting for the 90s fallback poll.

import { db } from '@/lib/db'
import { pushNotification, type NotificationPushPayload } from '@/lib/socket-emit'

export interface CreateNotificationInput {
  /** Recipient user id */
  userId: string
  /** Notification type — drives the icon/color in the bell UI */
  type: string
  title: string
  message: string
  /** Optional structured payload; object → JSON string, null → null */
  data?: Record<string, unknown> | string | null
}

export interface CreatedNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data: string | null
  isRead: boolean
  isDismissed: boolean
  createdAt: string
}

function toPayload(record: CreatedNotification): NotificationPushPayload {
  return {
    id: record.id,
    userId: record.userId,
    type: record.type,
    title: record.title,
    message: record.message,
    data: record.data,
    isRead: record.isRead,
    isDismissed: record.isDismissed,
    createdAt: record.createdAt,
  }
}

/**
 * Create a notification record and push it to the recipient in realtime.
 * The realtime push is fire-and-forget — a failure never fails the caller.
 */
export async function createNotification(input: CreateNotificationInput): Promise<CreatedNotification> {
  const dataStr =
    typeof input.data === 'string' ? input.data : input.data ? JSON.stringify(input.data) : null

  const record = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: dataStr,
    },
  })

  // Best-effort realtime push (never blocks or fails the request)
  void pushNotification(input.userId, toPayload(record as unknown as CreatedNotification)).catch(() => {})

  return record as unknown as CreatedNotification
}

/**
 * Create the same notification for MANY users (e.g. admin broadcasts).
 * Records are created sequentially; one realtime push is made to the
 * global `broadcast:all` room instead of per-user rooms (every
 * identified socket is a member).
 */
export async function createNotificationForUsers(
  userIds: string[],
  input: Omit<CreateNotificationInput, 'userId'>
): Promise<number> {
  let created = 0
  const dataStr =
    typeof input.data === 'string' ? input.data : input.data ? JSON.stringify(input.data) : null

  for (const userId of userIds) {
    try {
      await db.notification.create({
        data: {
          userId,
          type: input.type,
          title: input.title,
          message: input.message,
          data: dataStr,
        },
      })
      created++
    } catch (error) {
      console.error('[notify] bulk create failed for user', userId, error)
    }
  }

  if (created > 0) {
    // Push to the global broadcast room — every identified socket is in it.
    void (async () => {
      const { emitSocketEvent } = await import('@/lib/socket-emit')
      await emitSocketEvent('broadcast:all', 'notification:new', {
        type: input.type,
        title: input.title,
        message: input.message,
        bulk: true,
      }).catch(() => {})
    })()
  }

  return created
}
