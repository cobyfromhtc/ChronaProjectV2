'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import {
  Bell, X, Check, CheckCheck, Loader2,
  Heart, Users, UserPlus, MessageCircle, Sparkles, Shield, Gift, Coins, AlertTriangle,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// =============================================================
// Notifications Bell Dropdown
// =============================================================
// A compact bell icon that opens a dropdown panel showing recent
// notifications with mark-as-read and mark-all-as-read actions.
// Builds on the existing /api/notifications and /api/notifications/dismiss
// endpoints.
// =============================================================

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  data: string | null
  isRead: boolean
  createdAt: string
  fromUser?: {
    id: string
    username: string
    avatarUrl: string | null
  } | null
}

function getNotifIcon(type: string) {
  const map: Record<string, typeof Bell> = {
    friend_request: UserPlus,
    friend_accept: Users,
    message: MessageCircle,
    dm_request: MessageCircle,
    mention: Sparkles,
    like: Heart,
    chronos: Coins,
    gift: Gift,
    achievement: Sparkles,
    system: Shield,
    warning: AlertTriangle,
  }
  return map[type] || Bell
}

function getNotifIconColor(type: string) {
  const map: Record<string, string> = {
    friend_request: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    friend_accept: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    message: 'text-primary bg-primary/10 border-primary/20',
    dm_request: 'text-primary bg-primary/10 border-primary/20',
    mention: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    like: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    chronos: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    gift: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    achievement: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    system: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    warning: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  }
  return map[type] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'
}

export function NotificationsBell() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const unreadCount = notifications.filter(n => !n.isRead).length

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const resp = await apiFetch('/api/notifications')
      if (resp.ok) {
        const data = await resp.json()
        setNotifications(data.notifications || [])
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch on mount and when dropdown opens
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Compute panel position
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const PANEL_WIDTH = 380
    const PANEL_MAX_HEIGHT = 480
    let left = rect.right - PANEL_WIDTH
    if (left < 8) left = 8
    let top = rect.bottom + 8
    if (top + PANEL_MAX_HEIGHT > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - PANEL_MAX_HEIGHT - 8)
    }
    setPanelStyle({ position: 'fixed', left, top, width: PANEL_WIDTH, maxHeight: PANEL_MAX_HEIGHT, zIndex: 9999 })
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('click', handleClick, true)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('click', handleClick, true)
      window.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const markAsRead = useCallback(async (id: string) => {
    try {
      const resp = await apiFetch(`/api/notifications/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, markRead: true }),
      })
      if (resp.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      }
    } catch (e) {
      console.error('Failed to mark notification as read:', e)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.isRead)
    if (unread.length === 0) return
    setDismissingId('all')
    try {
      // Use the markAllRead flag to mark all as read without dismissing
      const resp = await apiFetch(`/api/notifications/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (resp.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        toast({ title: 'All notifications marked as read', variant: 'default' })
      }
    } finally {
      setDismissingId(null)
    }
  }, [notifications, toast])

  const dismissNotification = useCallback(async (id: string) => {
    setDismissingId(id)
    try {
      // Dismiss removes the notification entirely (sets isDismissed + isRead)
      const resp = await apiFetch(`/api/notifications/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })
      if (resp.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }
    } finally {
      setDismissingId(null)
    }
  }, [])

  if (!user) return null

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="Notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className="rounded-xl bg-popover border border-border shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
          style={{ ...panelStyle, animation: 'fadeInScale 0.15s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary border border-primary/20">{unreadCount} new</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={dismissingId === 'all'}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  title="Mark all as read"
                >
                  {dismissingId === 'all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-11 h-11 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">No notifications right now</p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.slice(0, 20).map((notif) => {
                  const Icon = getNotifIcon(notif.type)
                  const iconColor = getNotifIconColor(notif.type)
                  return (
                    <div
                      key={notif.id}
                      className={`group relative flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors ${!notif.isRead ? 'bg-primary/[0.04]' : ''}`}
                    >
                      {/* Unread indicator */}
                      {!notif.isRead && (
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary" />
                      )}
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground truncate">{notif.title}</p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.isRead && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Check className="w-2.5 h-2.5" /> Mark read
                            </button>
                          )}
                          <button
                            onClick={() => dismissNotification(notif.id)}
                            disabled={dismissingId === notif.id}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                          >
                            {dismissingId === notif.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <X className="w-2.5 h-2.5" />}
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-card/30">
            <button
              onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('chrona:open-notifications')) }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-1"
            >
              View all notifications <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
