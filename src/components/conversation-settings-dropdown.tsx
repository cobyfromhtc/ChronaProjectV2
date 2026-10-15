'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import {
  MoreVertical, BellOff, Archive, Trash2, Ban, X, Loader2,
  Volume2, AlertTriangle, UserX
} from 'lucide-react'
import type { Conversation } from '@/app/page'

// =============================================================
// Conversation Settings Dropdown
// =============================================================
// A "..." button in the chat header that opens a dropdown with
// conversation management options:
//   - Mute / Unmute notifications
//   - Archive / Unarchive
//   - Clear history
//   - Block user
// =============================================================

interface ConversationSettingsDropdownProps {
  conversation: Conversation
  onCleared?: () => void
}

export function ConversationSettingsDropdown({ conversation, onCleared }: ConversationSettingsDropdownProps) {
  const { user } = useAuth()
  const { activePersona } = usePersonas()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isArchived, setIsArchived] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  // Load muted/archived state from the server (server-side prefs)
  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/conversations/${conversation.id}/preferences`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.preferences) {
            setIsMuted(data.preferences.isMuted || false)
            setIsArchived(data.preferences.isArchived || false)
          }
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [conversation.id])

  const savePrefs = useCallback(async (muted: boolean, archived: boolean) => {
    try {
      await apiFetch(`/api/conversations/${conversation.id}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMuted: muted, isArchived: archived }),
      })
    } catch (e) {
      console.error('Failed to save preferences:', e)
    }
  }, [conversation.id])

  // Compute panel position
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const PANEL_WIDTH = 240
    let left = rect.right - PANEL_WIDTH
    if (left < 8) left = 8
    let top = rect.bottom + 8
    if (top + 320 > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - 320 - 8)
    }
    setPanelStyle({ position: 'fixed', left, top, width: PANEL_WIDTH, zIndex: 9999 })
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowConfirm(null)
      }
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setShowConfirm(null) } }
    window.addEventListener('click', handleClick, true)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('click', handleClick, true)
      window.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    await savePrefs(newMuted, isArchived)
    toast({ title: newMuted ? 'Conversation muted' : 'Conversation unmuted', variant: 'default' })
    setOpen(false)
  }, [isMuted, isArchived, savePrefs, toast])

  const toggleArchive = useCallback(async () => {
    const newArchived = !isArchived
    setIsArchived(newArchived)
    await savePrefs(isMuted, newArchived)
    toast({ title: newArchived ? 'Conversation archived' : 'Conversation unarchived', variant: 'default' })
    setOpen(false)
  }, [isMuted, isArchived, savePrefs, toast])

  const clearHistory = useCallback(async () => {
    setIsProcessing('clear')
    try {
      // Call the bulk clear-history endpoint (clearAll=true)
      const resp = await apiFetch(`/api/conversations/${conversation.id}/messages?clearAll=true`, {
        method: 'DELETE',
      })
      if (resp.ok) {
        const data = await resp.json()
        toast({ title: 'History cleared', description: `${data.deletedCount || 0} message${(data.deletedCount || 0) !== 1 ? 's' : ''} deleted`, variant: 'default' })
        onCleared?.()
      } else {
        const data = await resp.json().catch(() => ({}))
        toast({ title: 'Failed to clear history', description: data.error || 'Unknown error', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Network error', variant: 'destructive' })
    } finally {
      setIsProcessing(null)
      setShowConfirm(null)
      setOpen(false)
    }
  }, [conversation.id, toast, onCleared])

  const blockUser = useCallback(async () => {
    setIsProcessing('block')
    try {
      const resp = await apiFetch('/api/friends/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: conversation.otherPersona.id }),
      })
      if (resp.ok) {
        toast({ title: 'User blocked', description: `${conversation.otherPersona.name} has been blocked`, variant: 'default' })
        onCleared?.()
      } else {
        const data = await resp.json().catch(() => ({}))
        toast({ title: 'Failed to block user', description: data.error || 'Unknown error', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Network error', variant: 'destructive' })
    } finally {
      setIsProcessing(null)
      setShowConfirm(null)
      setOpen(false)
    }
  }, [conversation.otherPersona.id, conversation.otherPersona.name, toast, onCleared])

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${open ? 'bg-primary/15 text-primary' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'}`}
        title={isMuted ? 'Conversation settings (muted)' : 'Conversation settings'}
        aria-label={isMuted ? 'Conversation settings — notifications muted' : 'Conversation settings'}
      >
        <MoreVertical className="w-4 h-4" />
        {isMuted && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500/90 border-2 border-background flex items-center justify-center"
            title="Muted"
          >
            <BellOff className="w-2 h-2 text-white" />
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className="rounded-xl bg-popover border border-border shadow-2xl shadow-black/50 overflow-hidden"
          style={{ ...panelStyle, animation: 'fadeInScale 0.15s ease-out' }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conversation</p>
          </div>

          {/* Options */}
          <div className="py-1">
            <button
              onClick={toggleMute}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors text-left text-sm text-foreground"
            >
              {isMuted ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
              <span className="flex-1">{isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
              {isMuted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>

            <button
              onClick={toggleArchive}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors text-left text-sm text-foreground"
            >
              <Archive className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1">{isArchived ? 'Unarchive' : 'Archive conversation'}</span>
              {isArchived && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>

            <div className="my-1 h-px bg-border" />

            {/* Destructive actions */}
            <button
              onClick={() => setShowConfirm('clear')}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-amber-500/10 transition-colors text-left text-sm text-amber-400"
            >
              <Trash2 className="w-4 h-4" />
              <span className="flex-1">Clear history</span>
            </button>

            <button
              onClick={() => setShowConfirm('block')}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-rose-500/10 transition-colors text-left text-sm text-rose-400"
            >
              <Ban className="w-4 h-4" />
              <span className="flex-1">Block {conversation.otherPersona.name}</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation dialog */}
      {showConfirm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowConfirm(null)} />
          <div
            className="relative w-full max-w-sm rounded-2xl bg-popover border border-border shadow-2xl shadow-black/50 overflow-hidden"
            style={{ animation: 'fadeInScale 0.18s ease-out' }}
          >
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  showConfirm === 'block' ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  {showConfirm === 'block' ? <UserX className="w-5 h-5 text-rose-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {showConfirm === 'block' ? `Block ${conversation.otherPersona.name}?` : 'Clear conversation history?'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {showConfirm === 'block'
                      ? 'They won\'t be able to message you or see your online status. You can unblock them later from the Friends page.'
                      : 'This will remove all messages from this conversation. This action cannot be undone.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowConfirm(null)}
                  disabled={isProcessing !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={showConfirm === 'block' ? blockUser : clearHistory}
                  disabled={isProcessing !== null}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 ${
                    showConfirm === 'block' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {isProcessing !== null && <Loader2 className="w-3 h-3 animate-spin" />}
                  {showConfirm === 'block' ? 'Block user' : 'Clear history'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
