'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import {
  X, Send, Search, MessageCircle, Loader2, Forward, Check
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ChatMessage } from '@/hooks/use-chat'

// =============================================================
// Forward Message Dialog
// =============================================================
// Opens when the user selects "Forward" from a message's context
// menu. Shows the user's conversations and lets them pick one to
// forward the message to.
// =============================================================

interface Conversation {
  id: string
  otherPersona: {
    id: string
    name: string
    avatarUrl: string | null
    username: string
    isOnline: boolean
  }
  lastMessage: { content: string; createdAt: string } | null
  lastMessageAt: string
}

interface ForwardMessageDialogProps {
  open: boolean
  onClose: () => void
  message: ChatMessage | null
  sourceConversationId: string
  onForwarded?: (targetConversationId: string) => void
}

export function ForwardMessageDialog({ open, onClose, message, sourceConversationId, onForwarded }: ForwardMessageDialogProps) {
  const { activePersona } = usePersonas()
  const { toast } = useToast()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [forwardingTo, setForwardingTo] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    setIsLoading(true)
    try {
      const resp = await apiFetch('/api/conversations')
      if (resp.ok) {
        const data = await resp.json()
        setConversations(data.conversations || [])
      }
    } catch (e) {
      console.error('Failed to fetch conversations:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchConversations()
      setSearch('')
      setForwardingTo(null)
    }
  }, [open, fetchConversations])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const handleForward = useCallback(async (targetConv: Conversation) => {
    if (!activePersona || !message) return
    setForwardingTo(targetConv.id)
    try {
      const resp = await apiFetch(`/api/conversations/${sourceConversationId}/messages/${message.id}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetConversationId: targetConv.id, personaId: activePersona.id }),
      })
      const data = await resp.json()
      if (resp.ok) {
        toast({ title: 'Message forwarded', description: `to ${targetConv.otherPersona.name}`, variant: 'default' })
        onForwarded?.(targetConv.id)
        onClose()
      } else {
        toast({ title: 'Failed to forward', description: data.error || 'Unknown error', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Network error', variant: 'destructive' })
    } finally {
      setForwardingTo(null)
    }
  }, [activePersona, message, sourceConversationId, onForwarded, onClose, toast])

  if (!open || typeof document === 'undefined') return null

  const searchQ = search.toLowerCase().trim()
  const filtered = searchQ
    ? conversations.filter(c => c.otherPersona.name.toLowerCase().includes(searchQ) || c.otherPersona.username.toLowerCase().includes(searchQ))
    : conversations

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative w-full max-w-md max-h-[70vh] rounded-2xl bg-popover border border-border shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
        style={{ animation: 'fadeInScale 0.18s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Forward className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Forward Message</h2>
              <p className="text-[11px] text-muted-foreground">Send to another conversation</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message preview */}
        {message && (
          <div className="px-4 py-2.5 border-b border-border bg-card/30">
            <div className="flex items-start gap-2">
              <div className="w-1 h-full rounded-full bg-primary/40 flex-shrink-0 self-stretch" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Original from {message.sender.name}</p>
                <p className="text-xs text-foreground line-clamp-2">
                  {message.imageUrl && !message.content ? '📷 Image attachment' : message.content || '📷 Image'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <MessageCircle className="w-7 h-7 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">No conversations found</p>
              <p className="text-xs text-muted-foreground mt-1">Start a conversation first to forward messages</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleForward(conv)}
                disabled={forwardingTo !== null}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-primary/10 transition-colors text-left mb-0.5 disabled:opacity-50 ${
                  forwardingTo === conv.id ? 'bg-primary/15 ring-1 ring-primary/30' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-9 h-9 border border-border">
                    <AvatarImage src={conv.otherPersona.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
                      {conv.otherPersona.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {conv.otherPersona.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-popover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{conv.otherPersona.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    @{conv.otherPersona.username} {conv.lastMessage && `· ${conv.lastMessage.content.slice(0, 30)}`}
                  </p>
                </div>
                {forwardingTo === conv.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-card/30">
          <p className="text-[10px] text-muted-foreground text-center">
            Forwarded messages are sent as you — the original sender is shown above
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
