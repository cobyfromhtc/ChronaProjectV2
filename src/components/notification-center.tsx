'use client'

import { useState, useEffect, useRef, startTransition } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useVariantAccent } from '@/lib/ui-variant-styles'
import { apiFetch } from '@/lib/api-client'
import {
  Bell, X, Coins, AlertTriangle, Check, CheckCheck,
  Heart, Users, UserPlus, MessageCircle, Sparkles, Shield, Gift,
  Loader2, ExternalLink, Trash2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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
    case 'like':
      return { icon: <Heart className="w-4 h-4" />, color: 'text-rose-400', bg: 'bg-rose-500/15' }
    case 'follow':
      return { icon: <Users className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/15' }
    case 'friend_request':
      return { icon: <UserPlus className="w-4 h-4" />, color: 'text-teal-400', bg: 'bg-teal-500/15' }
    case 'friend_accept':
      return { icon: <Check className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/15' }
    case 'message':
      return { icon: <MessageCircle className="w-4 h-4" />, color: 'text-cyan-400', bg: 'bg-cyan-500/15' }
    case 'scenario_like':
      return { icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-400', bg: 'bg-purple-500/15' }
    case 'gift':
      return { icon: <Gift className="w-4 h-4" />, color: 'text-pink-400', bg: 'bg-pink-500/15' }
    case 'report':
      return { icon: <Shield className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/15' }
    default:
      return { icon: <Bell className="w-4 h-4" />, color: 'text-slate-400', bg: 'bg-slate-500/15' }
  }
}

// ========================
// Component
// ========================

export function NotificationCenter() {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const accent = useVariantAccent()

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

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
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  // Poll for new notifications every 30s
  useEffect(() => {
    if (!isAuthenticated || !user) return
    // Use startTransition to avoid cascading render warning
    startTransition(() => { loadNotifications() })
    const interval = setInterval(() => startTransition(() => { loadNotifications() }), 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, user?.id])

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
      console.error('Error dismissing all notifications:', error)
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

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-white/[0.08] bg-[#0d0f14] shadow-2xl shadow-black/50 z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-teal-400 bg-teal-500/15 px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
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
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={`w-6 h-6 animate-spin ${accent.text}`} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className={`w-14 h-14 rounded-full ${accent.bgSubtle} flex items-center justify-center mb-3`}>
                  <Bell className={`w-7 h-7 ${accent.text}`} />
                </div>
                <p className="text-sm font-medium text-slate-300">You're all caught up!</p>
                <p className="text-xs text-slate-500 mt-1">No new notifications right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {notifications.map((notification) => {
                  const { icon, color, bg } = getNotificationIcon(notification.type)
                  const isUnread = !notification.isRead

                  return (
                    <div
                      key={notification.id}
                      className={`group relative px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${
                        isUnread ? 'bg-white/[0.02]' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <span className={color}>{icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-slate-100' : 'font-medium text-slate-300'}`}>
                              {notification.title}
                            </p>
                            {isUnread && (
                              <div className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0 mt-1.5" />
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
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.06] text-center">
              <button
                onClick={() => {
                  setIsOpen(false)
                  // Navigate to notifications page or show all
                  window.dispatchEvent(new CustomEvent('chrona:navigate', { detail: { tab: 'notifications' } }))
                }}
                className="text-xs text-teal-400 hover:text-teal-300 transition-colors font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
