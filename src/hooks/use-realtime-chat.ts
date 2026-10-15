'use client'

// =============================================================
// useRealtimeChat — PocketBase SSE-based realtime DM sync
// =============================================================
//
// This hook is a SUPPLEMENTARY realtime layer on top of the
// existing socket.io-based `useChat` hook. PocketBase fires
// SSE events whenever a record in the `messages` collection is
// created / updated / deleted. We subscribe to the matching
// conversationId so that messages sent by User A appear live
// for User B without polling.
//
// Why both socket.io AND PocketBase SSE?
//   - socket.io: low-latency typing indicators + already
//     wired up for "I just sent this" echoes to other sockets.
//   - PocketBase SSE: a single source of truth — guaranteed
//     delivery for messages, even across devices/sessions
//     and when the socket.io chat-service is unavailable.
//
// Dedup: The `onNewMessage` / `onUpdateMessage` callbacks are
// expected to dedup by `message.id` (the existing `useChat`
// integration in `page.tsx` already does this). This avoids
// duplicate renders when both socket.io AND SSE deliver the
// same message.
//
// Permissions note: The `messages` PocketBase collection rules
// determine whether an unauthenticated client can subscribe.
// If the collection's list/view rules are public, this works
// out-of-the-box. If they require auth, the subscription will
// fail — we catch that, log a warning, and return
// `isSubscribed = false`. The socket.io layer still works in
// that case, so the user experience degrades gracefully.
// =============================================================

import { useEffect, useRef, useState } from 'react'
import PocketBase from 'pocketbase'
import type { ChatMessage } from './use-chat'
import { attachmentsForResponse } from '@/lib/attachments'

export interface UseRealtimeChatOptions {
  conversationId: string | null
  onNewMessage?: (message: ChatMessage) => void
  onUpdateMessage?: (message: ChatMessage) => void
  onDeleteMessage?: (messageId: string) => void
  onReactionChange?: (messageId: string) => void
}

export interface UseRealtimeChatResult {
  isSubscribed: boolean
}

function getPbUrl(): string {
  // Allow override via NEXT_PUBLIC_POCKETBASE_URL; default to the
  // local dev instance. (Server-side uses POCKETBASE_URL.)
  if (process.env.NEXT_PUBLIC_POCKETBASE_URL) {
    return process.env.NEXT_PUBLIC_POCKETBASE_URL
  }
  return 'http://127.0.0.1:8090'
}

/**
 * Format a raw PocketBase `messages` record into a ChatMessage.
 *
 * NOTE: The raw record only has `senderId` — not the full `sender`
 * object (id/name/avatarUrl/isOfficial) that the ChatMessage
 * interface requires. Callers that need the full sender object
 * should refetch via `GET /api/conversations/[id]/messages` (the
 * route expands sender + user.isOfficial). We expose this helper
 * for completeness, but the page.tsx integration uses the refetch
 * strategy for correctness.
 */
export function formatPbMessage(record: {
  id: string
  conversationId: string
  senderId: string
  content: string
  imageUrl: string | null
  attachments?: unknown
  created: string
  replyToId?: string | null
}): ChatMessage {
  return {
    id: record.id,
    conversationId: record.conversationId,
    senderId: record.senderId,
    // Minimal sender shell — real fields come from the API refetch
    // in the page-level integration. This avoids crashes if the
    // consumer uses the formatted record without refetching.
    sender: {
      id: record.senderId,
      name: '',
      avatarUrl: null,
      isOfficial: false,
    },
    content: record.content || '',
    imageUrl: record.imageUrl ?? null,
    // Uniform attachments array (stored attachments, or a synthesized
    // entry for legacy imageUrl-only messages)
    attachments: attachmentsForResponse(record.attachments, record.imageUrl),
    replyToId: record.replyToId ?? null,
    replyTo: null,
    createdAt: record.created,
  }
}

export function useRealtimeChat({
  conversationId,
  onNewMessage,
  onUpdateMessage,
  onDeleteMessage,
  onReactionChange,
}: UseRealtimeChatOptions): UseRealtimeChatResult {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const pbRef = useRef<PocketBase | null>(null)

  // Keep the latest callbacks in refs so the SSE listener always
  // sees fresh closures without re-subscribing on every render.
  const onNewRef = useRef(onNewMessage)
  const onUpdateRef = useRef(onUpdateMessage)
  const onDeleteRef = useRef(onDeleteMessage)
  const onReactionRef = useRef(onReactionChange)
  useEffect(() => {
    onNewRef.current = onNewMessage
    onUpdateRef.current = onUpdateMessage
    onDeleteRef.current = onDeleteMessage
    onReactionRef.current = onReactionChange
  }, [onNewMessage, onUpdateMessage, onDeleteMessage, onReactionChange])

  useEffect(() => {
    // No subscription when there's no conversation. We deliberately
    // don't call setIsSubscribed(false) here synchronously — the
    // lint rule disallows setState directly in an effect body. The
    // state naturally stays false on first render (initial state)
    // and is reset to false by the previous effect's cleanup when
    // conversationId changes from a real value to null.
    if (!conversationId) {
      // Defensive: ensure any stale client from a previous mount is
      // torn down. Cleanup runs in a separate pass so setState is
      // allowed there.
      return
    }

    let cancelled = false
    const pb = new PocketBase(getPbUrl())
    // CRITICAL: disable auto-cancellation so parallel SDK calls
    // (e.g. concurrent subscribes / fetches) don't abort each other.
    pb.autoCancellation(false)
    pbRef.current = pb

    // PocketBase SSE subscription filter: only events for messages
    // in this conversation. The filter is applied server-side.
    const filter = `conversationId = "${conversationId}"`

    let unsubscribeFn: (() => void) | null = null

    // Subscribe first; on success mark subscribed. If subscribe
    // throws (e.g. permission denied), we fall back gracefully.
    // NOTE: the leading `;` is required — without it JS parses the
    // previous `= null` together with this IIFE as a call: `null(...)`
    // which throws "null is not a function" on every conversation open.
    ;(async () => {
      try {
        const unsubscribe = await pb
          .collection('messages')
          .subscribe(filter, (e) => {
            if (cancelled) return
            const record = e.record as {
              id: string
              conversationId: string
              senderId: string
              content: string
              imageUrl: string | null
              attachments?: unknown
              created: string
              replyToId?: string | null
            }
            // Safety: only handle events for THIS conversation
            // (the server-side filter already enforces this, but
            // be defensive in case a future rule change leaks).
            if (record?.conversationId !== conversationId) return

            const formatted = formatPbMessage(record)

            if (e.action === 'create') {
              onNewRef.current?.(formatted)
            } else if (e.action === 'update') {
              onUpdateRef.current?.(formatted)
            } else if (e.action === 'delete') {
              onDeleteRef.current?.(record.id)
            }
          })

        if (cancelled) {
          // Component unmounted while we were subscribing — clean up.
          try {
            unsubscribe()
          } catch {
            /* ignore */
          }
          return
        }

        unsubscribeFn = unsubscribe
        // Setstate inside an async callback (not in the synchronous
        // effect body) — this is allowed by the lint rule.
        setIsSubscribed(true)
      } catch (err) {
        if (cancelled) return
        // Most likely cause: the `messages` collection's list/view
        // rules require auth (null = admin-only in PocketBase) and
        // we have no client-side user token to authenticate with.
        // The socket.io layer in `useChat` still handles live
        // delivery, so this is a graceful degradation, not a crash.
        console.warn(
          '[useRealtimeChat] Subscribe failed ( PocketBase SSE will not deliver events for conversation',
          conversationId,
          '). Reason:',
          err instanceof Error ? err.message : err
        )
        setIsSubscribed(false)
      }
    })()

    // Subscribe to messageReactions collection for live reaction updates.
    // When a reaction is created/deleted, notify the parent so it can
    // refetch that message's reactions.
    let reactionUnsubscribeFn: (() => void) | null = null
    ;(async () => {
      try {
        const reactionUnsubscribe = await pb
          .collection('messageReactions')
          .subscribe('*', (e) => {
            if (cancelled) return
            const record = e.record as { messageId?: string }
            if (record?.messageId) {
              onReactionRef.current?.(record.messageId)
            }
          })
        if (cancelled) {
          try { reactionUnsubscribe() } catch { /* ignore */ }
          return
        }
        reactionUnsubscribeFn = reactionUnsubscribe
      } catch (err) {
        // Reactions subscription is best-effort; the main messages
        // subscription above is the critical path.
        if (!cancelled) {
          console.warn('[useRealtimeChat] Reactions subscribe failed:', err instanceof Error ? err.message : err)
        }
      }
    })()

    return () => {
      cancelled = true
      if (unsubscribeFn) {
        try {
          unsubscribeFn()
        } catch {
          /* ignore */
        }
        unsubscribeFn = null
      }
      if (reactionUnsubscribeFn) {
        try {
          reactionUnsubscribeFn()
        } catch {
          /* ignore */
        }
        reactionUnsubscribeFn = null
      }
      // Best-effort full unsubscribe (covers SDK edge cases where the
      // returned unsubscribe is a no-op after disconnect).
      try {
        pb.collection('messages').unsubscribe()
        pb.collection('messageReactions').unsubscribe()
      } catch {
        /* ignore */
      }
      pbRef.current = null
      // setState inside cleanup is allowed.
      setIsSubscribed(false)
    }
  }, [conversationId])

  return { isSubscribed }
}
