'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import {
  Pin, X, ChevronDown, ChevronUp, MessageCircle, Loader2
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// =============================================================
// Pinned Messages Bar
// =============================================================
// Shows a collapsible bar at the top of the chat (below the header)
// displaying pinned messages for the current conversation.
// =============================================================

interface PinnedMessage {
  id: string
  messageId: string
  conversationId: string
  pinnedBy: string
  pinnedByName: string
  createdAt: string
  message: {
    id: string
    content: string
    imageUrl: string | null
    createdAt: string
    sender: {
      id: string
      name: string
      avatarUrl: string | null
      isOfficial: boolean
    }
  }
}

interface PinnedMessagesBarProps {
  conversationId: string
  refreshKey: number // increment to trigger a refetch
  onUnpin?: (messageId: string) => void
  onJumpToMessage?: (messageId: string) => void
}

export function PinnedMessagesBar({ conversationId, refreshKey, onUnpin, onJumpToMessage }: PinnedMessagesBarProps) {
  const { toast } = useToast()
  const [pinned, setPinned] = useState<PinnedMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [unpinningId, setUnpinningId] = useState<string | null>(null)

  const fetchPinned = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch all messages and filter for pinned ones via the pin endpoint on each
      // Actually, let's fetch via a dedicated approach: get the conversation's messages
      // and check which are pinned. For efficiency, we'll fetch pinned messages by
      // querying the pinnedMessages collection through a lightweight endpoint.
      // Since we don't have a dedicated /pins endpoint, we'll fetch messages and
      // their pin status. For now, use the pin GET on each message would be N requests.
      // Better: add a simple fetch to a list endpoint. Let's use the existing
      // messages endpoint and filter — but that doesn't return pin status.
      //
      // Simplest: fetch from /api/conversations/[id]/pins (we'll create it inline
      // by fetching the pinnedMessages collection directly via the PB SDK isn't
      // available client-side. So we'll create a lightweight endpoint.
      //
      // For now, fetch all messages and check pin status via the pin GET endpoint
      // on each — but that's N requests. Instead, let's just fetch the conversation
      // messages (which now include a `pinned` flag if we add it) — but we haven't
      // added that to the messages endpoint.
      //
      // Pragmatic approach: fetch from a new lightweight endpoint.
      const resp = await apiFetch(`/api/conversations/${conversationId}/pins`)
      if (resp.ok) {
        const data = await resp.json()
        setPinned(data.pinnedMessages || [])
      } else if (resp.status === 404) {
        // No pins endpoint yet — gracefully show empty
        setPinned([])
      }
    } catch (e) {
      console.error('Failed to fetch pinned messages:', e)
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  // Scheduled via setTimeout so state updates inside the fetch run in a
  // callback (compliant with react-hooks/set-state-in-effect).
  useEffect(() => {
    const id = setTimeout(fetchPinned, 0)
    return () => clearTimeout(id)
  }, [fetchPinned, refreshKey])

  const handleUnpin = useCallback(async (messageId: string) => {
    setUnpinningId(messageId)
    try {
      // We need a personaId — use the active persona. For simplicity, we'll
      // fetch it from the /api/personas endpoint or pass it as a prop.
      // For now, we'll POST without personaId and let the API handle it.
      // Actually the API requires personaId. Let's get it from the auth store.
      // Since this component doesn't have direct access, we'll dispatch a
      // custom event and let the parent handle the unpin.
      onUnpin?.(messageId)
    } finally {
      setUnpinningId(null)
    }
  }, [onUnpin])

  if (pinned.length === 0 && !isLoading) return null

  const displayPinned = expanded ? pinned : pinned.slice(0, 1)

  return (
    <div className="border-b border-border bg-card/40 backdrop-blur-sm">
      {/* Pinned bar header */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
          <Pin className="w-3 h-3" />
          <span>{pinned.length} pinned message{pinned.length !== 1 ? 's' : ''}</span>
        </div>
        {pinned.length > 1 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? 'Show less' : `Show all ${pinned.length}`}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Pinned messages */}
      <div className="px-4 pb-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Loading pinned messages…</span>
          </div>
        ) : (
          displayPinned.map((pin) => (
            <div
              key={pin.id}
              onClick={() => onJumpToMessage?.(pin.messageId)}
              className={`group flex items-start gap-2 p-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15 hover:border-amber-500/40 hover:bg-amber-500/[0.1] transition-all ${onJumpToMessage ? 'cursor-pointer hover:-translate-y-px' : ''}`}
            >
              <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Pin className="w-3 h-3 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Avatar className="w-4 h-4 border border-amber-500/20">
                    <AvatarImage src={pin.message.sender.avatarUrl || undefined} />
                    <AvatarFallback className="bg-amber-500/20 text-amber-300 text-[8px] font-medium">
                      {pin.message.sender.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium text-foreground truncate">{pin.message.sender.name}</span>
                  <span className="text-[9px] text-muted-foreground">pinned by {pin.pinnedByName}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {pin.message.imageUrl && !pin.message.content ? '📷 Image attachment' : pin.message.content || '📷 Image'}
                </p>
              </div>
              <button
                onClick={() => handleUnpin(pin.messageId)}
                disabled={unpinningId === pin.messageId}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 flex-shrink-0"
                title="Unpin"
              >
                {unpinningId === pin.messageId ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
