'use client'

import { useState, useEffect, useRef, startTransition, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useVariantAccent } from '@/lib/ui-variant-styles'
import { apiFetch } from '@/lib/api-client'
import {
  useRealtimeNotifications,
  useConnectionStatus,
  type RealtimeNotification,
  type RealtimeDmActivity,
} from '@/hooks/use-chat'
import {
  Bell, X, Coins, AlertTriangle, Check, CheckCheck,
  Heart, Users, UserPlus, MessageCircle, Sparkles, Shield, Gift,
  Loader2, ExternalLink, Trash2, Zap, ShoppingBag, Trophy, Bot,
  MapPin, ThumbsDown
} from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// ========================
// Types
// ========================

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

// ========================
// Scenario request payload (Discover > Personas chat flow)
// ========================

interface ScenarioRequestData {
  requestId: string
  status: 'pending' | 'accepted' | 'declined'
  fromPersona: { id: string; name: string; avatarUrl: string | null }
  fromUsername: string
  toPersona: { id: string; name: string; avatarUrl: string | null }
  scenario: {
    id: string
    title: string
    description: string | null
    category: string
    mood: string | null
    location: string | null
    tags: string[]
    imageUrl: string | null
    bannerUrl: string | null
    openingMessage: string | null
  }
  message: string | null
}

function parseScenarioRequestData(raw: string | null): ScenarioRequestData | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && parsed.requestId && parsed.scenario && parsed.fromPersona) {
      return parsed as ScenarioRequestData
    }
    return null
  } catch {
    return null
  }
}

function scenarioCategoryGradient(category: string): string {
  const gradients: Record<string, string> = {
    romance: 'from-pink-500/40 to-rose-600/30',
    adventure: 'from-emerald-500/40 to-teal-600/30',
    drama: 'from-violet-500/40 to-purple-600/30',
    fantasy: 'from-fuchsia-500/40 to-violet-600/30',
    'sci-fi': 'from-cyan-500/40 to-blue-600/30',
    horror: 'from-red-500/40 to-rose-800/30',
    mystery: 'from-amber-500/40 to-orange-700/30',
    comedy: 'from-yellow-500/40 to-amber-600/30',
    'slice-of-life': 'from-rose-500/40 to-pink-600/30',
    thriller: 'from-slate-500/40 to-zinc-700/30',
    supernatural: 'from-indigo-500/40 to-violet-800/30',
    historical: 'from-stone-500/40 to-amber-800/30',
    other: 'from-slate-500/40 to-slate-700/30',
  }
  return gradients[category] || gradients.other
}

function scenarioCategoryLabel(category: string): string {
  return category
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ========================
// Notification Icon Helper
// ========================

function getNotificationIcon(type: string): { icon: React.ReactNode; color: string; bg: string } {
  switch (type) {
    case 'chronos_reset':
      return { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-500/15' }
    case 'chronos_grant':
      return { icon: <Coins className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/15' }
    case 'chronos_deduct':
      return { icon: <Coins className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/15' }
    case 'gift_received':
      return { icon: <Gift className="w-4 h-4" />, color: 'text-pink-400', bg: 'bg-pink-500/15' }
    case 'like':
      return { icon: <Heart className="w-4 h-4" />, color: 'text-rose-400', bg: 'bg-rose-500/15' }
    case 'follow':
      return { icon: <Users className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/15' }
    case 'friend_request':
      return { icon: <UserPlus className="w-4 h-4" />, color: 'text-teal-400', bg: 'bg-teal-500/15' }
    case 'friend_accept':
      return { icon: <Check className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/15' }
    case 'message':
    case 'dm_request':
      return { icon: <MessageCircle className="w-4 h-4" />, color: 'text-cyan-400', bg: 'bg-cyan-500/15' }
    case 'scenario_like':
      return { icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-400', bg: 'bg-purple-500/15' }
    case 'marketplace_purchase':
      return { icon: <ShoppingBag className="w-4 h-4" />, color: 'text-teal-400', bg: 'bg-teal-500/15' }
    case 'marketplace_sale':
      return { icon: <ShoppingBag className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/15' }
    case 'achievement':
      return { icon: <Trophy className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/15' }
    case 'gift':
      return { icon: <Gift className="w-4 h-4" />, color: 'text-pink-400', bg: 'bg-pink-500/15' }
    case 'scenario_request':
      return { icon: <Bot className="w-4 h-4" />, color: 'text-violet-400', bg: 'bg-violet-500/15' }
    case 'scenario_request_accepted':
      return { icon: <Check className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/15' }
    case 'scenario_request_declined':
      return { icon: <ThumbsDown className="w-4 h-4" />, color: 'text-rose-400', bg: 'bg-rose-500/15' }
    case 'report':
      return { icon: <Shield className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/15' }
    case 'warning':
      return { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-500/15' }
    case 'broadcast':
      return { icon: <Zap className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/15' }
    default:
      return { icon: <Bell className="w-4 h-4" />, color: 'text-slate-400', bg: 'bg-slate-500/15' }
  }
}

// ========================
// Day-grouping helper
// ========================

interface NotificationGroup {
  label: string
  items: NotificationItem[]
}

function groupNotificationsByDay(items: NotificationItem[]): NotificationGroup[] {
  const today: NotificationItem[] = []
  const yesterday: NotificationItem[] = []
  const earlier: NotificationItem[] = []

  for (const item of items) {
    const date = new Date(item.createdAt)
    if (isToday(date)) today.push(item)
    else if (isYesterday(date)) yesterday.push(item)
    else earlier.push(item)
  }

  const groups: NotificationGroup[] = []
  if (today.length) groups.push({ label: 'Today', items: today })
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday })
  if (earlier.length) {
    groups.push({
      label: `Earlier · ${format(new Date(earlier[0].createdAt), 'MMMM')}`,
      items: earlier,
    })
  }
  return groups
}

// ========================
// Component
// ========================

const BASE_TITLE = 'Chrona - Roleplay Universe'

export function NotificationCenter() {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const accent = useVariantAccent()
  const connectionStatus = useConnectionStatus()

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentArrival, setRecentArrival] = useState(false)
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null)
  const [respondedLocal, setRespondedLocal] = useState<Record<string, 'accepted' | 'declined'>>({})
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const knownIdsRef = useRef<Set<string>>(new Set())

  const unread = notifications.filter(n => !n.isRead).length
  const liveUnread = Math.max(unread, unreadCount)

  // Fetch notifications (no useCallback — avoids compiler memoization conflict)
  const loadNotifications = async () => {
    if (!isAuthenticated || !user) return

    try {
      const response = await apiFetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        const items = (data.notifications || []) as NotificationItem[]
        setNotifications(items)
        setUnreadCount(items.filter(n => !n.isRead).length)
        // Remember ids so realtime pushes can detect genuinely-new items
        for (const item of items) knownIdsRef.current.add(item.id)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  // ── Realtime: notification push ────────────────────────────────────────────
  // Backend-created notifications (friend requests, gifts, DM requests,
  // admin actions, broadcasts) arrive instantly over the socket — the poll
  // below is only a safety fallback.
  const handleRealtimeNotification = useCallback((payload: RealtimeNotification) => {
    // Bulk pushes (broadcasts) carry no id — just refetch.
    if (!payload.id || payload.bulk) {
      startTransition(() => { loadNotifications() })
      if (payload.title && payload.message) {
        toast({ title: payload.title, description: payload.message })
      }
      return
    }

    // Skip if we already know this notification (e.g. our own action echoed)
    if (knownIdsRef.current.has(payload.id)) return
    knownIdsRef.current.add(payload.id)

    const item: NotificationItem = {
      id: payload.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data ?? null,
      isRead: false,
      createdAt: payload.createdAt || new Date().toISOString(),
    }

    setNotifications(prev => [item, ...prev].slice(0, 50))
    setUnreadCount(prev => prev + 1)

    // Surface app-wide: toast + a brief pulse on the bell
    toast({ title: item.title, description: item.message })
    setRecentArrival(true)
    setTimeout(() => setRecentArrival(false), 2600)

    // Let other notification UIs (topbar bell) know
    window.dispatchEvent(new CustomEvent('chrona:notification-new', { detail: item }))
  }, [])

  // ── Realtime: DM activity ──────────────────────────────────────────────────
  // A new DM message in one of the user's conversations refreshes sidebars
  // and the My Chats row so unread badges update live. No toast — the
  // conversation list badge is the feedback.
  const handleRealtimeDmActivity = useCallback((_activity: RealtimeDmActivity) => {
    window.dispatchEvent(new CustomEvent('chrona:dm-refresh'))
  }, [])

  useRealtimeNotifications({
    enabled: isAuthenticated,
    onNotification: handleRealtimeNotification,
    onDmActivity: handleRealtimeDmActivity,
  })

  // ── Poll fallback (realtime push is primary) ───────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return
    // Use startTransition to avoid cascading render warning
    startTransition(() => { loadNotifications() })
    const interval = setInterval(() => startTransition(() => { loadNotifications() }), 90000)
    return () => clearInterval(interval)
  }, [isAuthenticated, user?.id])

  // ── Live browser-tab unread badge ──────────────────────────────────────────
  useEffect(() => {
    if (liveUnread > 0) {
      document.title = `(${liveUnread > 99 ? '99+' : liveUnread}) ${BASE_TITLE}`
    } else {
      document.title = BASE_TITLE
    }
  }, [liveUnread])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await apiFetch('/api/notifications/dismiss', {
        method: 'POST',
        body: JSON.stringify({ notificationId, markRead: true }),
      })
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await apiFetch('/api/notifications/dismiss', {
        method: 'POST',
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast({ title: 'All caught up!', description: 'All notifications marked as read.' })
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Dismiss a single notification
  const dismissNotification = async (notificationId: string) => {
    try {
      await apiFetch('/api/notifications/dismiss', {
        method: 'POST',
        body: JSON.stringify({ notificationId }),
      })
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      const dismissed = notifications.find(n => n.id === notificationId)
      if (dismissed && !dismissed.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error dismissing notification:', error)
    }
  }

  // Dismiss all notifications
  const dismissAll = async () => {
    try {
      await apiFetch('/api/notifications/dismiss', {
        method: 'POST',
        body: JSON.stringify({ dismissAll: true }),
      })
      setNotifications([])
      setUnreadCount(0)
      toast({ title: 'Cleared!', description: 'All notifications dismissed.' })
    } catch (error) {
      console.error('Error dismissing all:', error)
    }
  }

  // Respond to a scenario request (Accept / Decline) from the notification
  const respondToScenarioRequest = async (
    notification: NotificationItem,
    scenarioData: ScenarioRequestData,
    action: 'accept' | 'decline'
  ) => {
    if (respondingRequestId) return
    setRespondingRequestId(scenarioData.requestId)
    try {
      const response = await apiFetch(`/api/scenario-requests/${scenarioData.requestId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to respond')
      }
      setRespondedLocal(prev => ({ ...prev, [notification.id]: action === 'accept' ? 'accepted' : 'declined' }))
      if (action === 'accept') {
        toast({
          title: 'Scenario accepted!',
          description: `A conversation with ${scenarioData.fromPersona.name} has been created — check your chats.`,
        })
        // Refresh the DM sidebar so the new conversation shows up
        window.dispatchEvent(new CustomEvent('chrona:dm-refresh'))
      } else {
        toast({
          title: 'Scenario declined',
          description: `${scenarioData.fromPersona.name} will be notified that you declined.`,
        })
      }
    } catch (error) {
      toast({
        title: 'Failed to respond',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRespondingRequestId(null)
    }
  }

  // Toggle dropdown and mark all visible as read
  const handleToggle = () => {
    setIsOpen(prev => !prev)
    if (!isOpen && unreadCount > 0) {
      // Mark all as read when opening
      markAllAsRead()
    }
  }

  if (!isAuthenticated) return null

  const isLive = connectionStatus === 'connected'
  const groups = groupNotificationsByDay(notifications)

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
        aria-label={`Notifications${liveUnread > 0 ? ` (${liveUnread} unread)` : ''}`}
      >
        <Bell className={`w-4.5 h-4.5 transition-transform duration-300 ${recentArrival ? 'scale-110' : ''}`} />
        {liveUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-in zoom-in duration-200 shadow-lg shadow-red-500/40">
            {liveUnread > 99 ? '99+' : liveUnread}
          </span>
        )}
        {/* Brief ring pulse when a new notification arrives */}
        <AnimatePresence>
          {recentArrival && (
            <motion.span
              className="absolute inset-0 rounded-lg border-2 border-teal-400 pointer-events-none"
              initial={{ opacity: 0.9, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: 1 }}
            />
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-white/[0.08] bg-[#0d0f14] shadow-2xl shadow-black/50 z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Notifications</h3>
              {liveUnread > 0 && (
                <span className="text-[10px] font-bold text-teal-400 bg-teal-500/15 px-1.5 py-0.5 rounded-full border border-teal-500/20">
                  {liveUnread} new
                </span>
              )}
              {/* Live connection indicator — realtime push active */}
              <span
                className={`relative flex h-2 w-2 ml-0.5 ${isLive ? '' : 'opacity-40'}`}
                title={isLive ? 'Realtime updates active' : 'Reconnecting…'}
              >
                {isLive && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              </span>
              <span className="sr-only">{isLive ? 'Realtime updates active' : 'Realtime reconnecting'}</span>
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 rounded-md text-slate-500 hover:text-teal-400 hover:bg-white/[0.05] transition-all"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={dismissAll}
                    className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-white/[0.05] transition-all"
                    title="Clear all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[26rem] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={`w-6 h-6 animate-spin ${accent.text}`} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className={`w-14 h-14 rounded-full ${accent.bgSubtle} flex items-center justify-center mb-3`}>
                  <Bell className={`w-7 h-7 ${accent.text}`} />
                </div>
                <p className="text-sm font-medium text-slate-300">You&apos;re all caught up!</p>
                <p className="text-xs text-slate-500 mt-1">
                  {isLive ? 'New notifications appear here instantly.' : 'No new notifications right now.'}
                </p>
              </div>
            ) : (
              groups.map(group => (
                <div key={group.label}>
                  {/* Sticky day header */}
                  <div className="sticky top-0 z-10 px-4 py-1.5 bg-[#11141b]/95 backdrop-blur border-y border-white/[0.04]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{group.label}</p>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    <AnimatePresence initial={false}>
                      {group.items.map((notification, index) => {
                        const { icon, color, bg } = getNotificationIcon(notification.type)
                        const isUnread = !notification.isRead
                        const scenarioData = notification.type === 'scenario_request'
                          ? parseScenarioRequestData(notification.data)
                          : null
                        const localResponse = respondedLocal[notification.id] as 'accepted' | 'declined' | undefined
                        const requestStatus: 'pending' | 'accepted' | 'declined' = localResponse ?? scenarioData?.status ?? 'pending'

                        // ── Scenario request: rich Blorp card with details + Accept/Decline ──
                        if (scenarioData) {
                          const isResponding = respondingRequestId === scenarioData.requestId
                          return (
                            <motion.div
                              key={notification.id}
                              layout
                              initial={{ opacity: 0, x: 24 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -24, height: 0 }}
                              transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.18) }}
                              className={`group relative px-4 py-3 hover:bg-white/[0.03] transition-colors ${
                                isUnread ? 'bg-violet-500/[0.04]' : ''
                              }`}
                            >
                              <div className="flex gap-3">
                                {/* Blorp bot avatar */}
                                <div className="relative flex-shrink-0 mt-0.5">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-violet-400/30 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-violet-300" />
                                  </div>
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-violet-500 border border-[#0d0f14] flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                  </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="text-sm font-semibold text-slate-100">Blorp</p>
                                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/25">Scenario Request</span>
                                      {isUnread && <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
                                    </div>
                                    <button
                                      onClick={() => dismissNotification(notification.id)}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-white/[0.05] transition-all flex-shrink-0"
                                      title="Dismiss"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                    <span className="font-semibold text-violet-300">{scenarioData.fromPersona.name}</span>
                                    {' '}is asking trying to Start a scenario with{' '}
                                    <span className="font-semibold text-slate-100">{scenarioData.toPersona.name}</span>
                                  </p>
                                  <p className="text-[10px] text-slate-600 mt-0.5">
                                    from @{scenarioData.fromUsername} · {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                  </p>

                                  {/* Scenario details card */}
                                  <div className="mt-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                                    {/* Banner strip */}
                                    <div className={`h-14 bg-gradient-to-r ${scenarioCategoryGradient(scenarioData.scenario.category)} relative`}>
                                      {(scenarioData.scenario.bannerUrl || scenarioData.scenario.imageUrl) && (
                                        <img
                                          src={scenarioData.scenario.bannerUrl || scenarioData.scenario.imageUrl || undefined}
                                          alt=""
                                          className="w-full h-full object-cover opacity-50"
                                        />
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-transparent to-transparent" />
                                      <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-white truncate drop-shadow">{scenarioData.scenario.title}</p>
                                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-black/50 text-slate-200 border border-white/10">
                                          {scenarioCategoryLabel(scenarioData.scenario.category)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="p-2.5 space-y-1.5">
                                      {scenarioData.scenario.description && (
                                        <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                                          {scenarioData.scenario.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {scenarioData.scenario.mood && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                                            {scenarioData.scenario.mood}
                                          </span>
                                        )}
                                        {scenarioData.scenario.location && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/[0.08] flex items-center gap-1">
                                            <MapPin className="w-2.5 h-2.5" /> {scenarioData.scenario.location}
                                          </span>
                                        )}
                                        {scenarioData.scenario.tags.slice(0, 3).map((tag, i) => (
                                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300/80 border border-teal-500/20">
                                            #{tag}
                                          </span>
                                        ))}
                                      </div>
                                      {scenarioData.scenario.openingMessage && (
                                        <div className="flex gap-1.5 px-2 py-1.5 rounded-lg bg-black/30 border border-white/[0.05]">
                                          <MessageCircle className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                                          <p className="text-[10px] text-slate-400 italic line-clamp-2 leading-relaxed">
                                            {scenarioData.scenario.openingMessage}
                                          </p>
                                        </div>
                                      )}
                                      {scenarioData.message && (
                                        <p className="text-[10px] text-slate-400 leading-relaxed">
                                          <span className="text-slate-500">Note from requester: </span>
                                          {scenarioData.message}
                                        </p>
                                      )}
                                      {/* Who is asking → who is being asked */}
                                      <div className="flex items-center gap-2 pt-1">
                                        <Avatar className="w-5 h-5 border border-white/10">
                                          <AvatarImage src={scenarioData.fromPersona.avatarUrl || undefined} />
                                          <AvatarFallback className="bg-violet-500/20 text-violet-300 text-[9px] font-bold">
                                            {scenarioData.fromPersona.name.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] text-slate-400 truncate">{scenarioData.fromPersona.name}</span>
                                        <span className="text-slate-600 text-[10px]">→</span>
                                        <Avatar className="w-5 h-5 border border-white/10">
                                          <AvatarImage src={scenarioData.toPersona.avatarUrl || undefined} />
                                          <AvatarFallback className="bg-teal-500/20 text-teal-300 text-[9px] font-bold">
                                            {scenarioData.toPersona.name.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] text-slate-400 truncate">{scenarioData.toPersona.name}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Accept / Decline */}
                                  {requestStatus === 'pending' ? (
                                    <div className="flex items-center gap-2 mt-2.5">
                                      <button
                                        onClick={() => respondToScenarioRequest(notification, scenarioData, 'decline')}
                                        disabled={isResponding}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-white/[0.1] bg-white/[0.03] text-slate-300 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 transition-all disabled:opacity-50"
                                      >
                                        <ThumbsDown className="w-3.5 h-3.5" /> Decline
                                      </button>
                                      <button
                                        onClick={() => respondToScenarioRequest(notification, scenarioData, 'accept')}
                                        disabled={isResponding}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                      >
                                        {isResponding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        Accept & Engage
                                      </button>
                                    </div>
                                  ) : (
                                    <div className={`flex items-center gap-1.5 mt-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                                      requestStatus === 'accepted'
                                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
                                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/25'
                                    }`}>
                                      {requestStatus === 'accepted'
                                        ? <><Check className="w-3.5 h-3.5" /> Accepted — the conversation is live in your chats</>
                                        : <><ThumbsDown className="w-3.5 h-3.5" /> Declined</>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        }

                        return (
                          <motion.div
                            key={notification.id}
                            layout
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24, height: 0 }}
                            transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.18) }}
                            className={`group relative px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${
                              isUnread ? 'bg-white/[0.02]' : ''
                            }`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex gap-3">
                              {/* Icon */}
                              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110`}>
                                <span className={color}>{icon}</span>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-slate-100' : 'font-medium text-slate-300'}`}>
                                    {notification.title}
                                  </p>
                                  {isUnread && (
                                    <div className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0 mt-1.5 animate-pulse" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] text-slate-600 mt-1">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                              </div>

                              {/* Dismiss button (visible on hover) */}
                              <button
                                onClick={(e) => { e.stopPropagation(); dismissNotification(notification.id) }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-white/[0.05] transition-all flex-shrink-0"
                                title="Dismiss"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.06] text-center bg-white/[0.01]">
              <button
                onClick={() => {
                  setIsOpen(false)
                  // Navigate to notifications page or show all
                  window.dispatchEvent(new CustomEvent('chrona:navigate', { detail: { tab: 'notifications' } }))
                }}
                className="text-xs text-teal-400 hover:text-teal-300 transition-colors font-medium inline-flex items-center gap-1"
              >
                View all notifications <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
