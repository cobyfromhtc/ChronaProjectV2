'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch } from '@/lib/api-client'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Bell,
  Check,
  X,
  ChevronRight,
  Loader2,
  MessageCircle,
  UserPlus,
  AtSign,
  Coins,
  AlertTriangle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string // "chronos_reset", "chronos_grant", "chronos_deduct", "blorp_message", "dm_request", "friend_request", "mention"
  title: string
  message: string
  data: string | null
  isRead: boolean
  createdAt: string
}

// Custom event to notify when notifications change
export const NOTIFICATION_UPDATE_EVENT = 'chrona:notification-update'

export function NotificationBell() {
  const { user, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const isMountedRef = useRef(true)
  const fetchInProgressRef = useRef(false)

  // Fetch notifications
  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (!isAuthenticated || !user) return
    if (fetchInProgressRef.current) return
    
    fetchInProgressRef.current = true
    if (showLoading) setIsLoading(true)
    
    try {
      const response = await apiFetch('/api/notifications')
      if (!isMountedRef.current) return
      
      if (response.ok) {
        const data = await response.json()
        if (!isMountedRef.current) return
        
        if (data.notifications) {
          setNotifications(data.notifications)
        }
      }
    } catch (error) {
      console.warn('Notification fetch temporarily unavailable')
    } finally {
      fetchInProgressRef.current = false
      if (isMountedRef.current && showLoading) {
        setIsLoading(false)
      }
    }
  }, [isAuthenticated, user])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Fetch on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && user) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          fetchNotifications(true)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, user?.id, fetchNotifications])

  // Periodic polling
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const interval = setInterval(() => {
      if (isMountedRef.current && !fetchInProgressRef.current) {
        fetchNotifications(false)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isAuthenticated, user, fetchNotifications])

  // Listen for notification update events
  useEffect(() => {
    const handleUpdate = () => {
      if (isMountedRef.current && !fetchInProgressRef.current) {
        fetchNotifications(false)
      }
    }
    
    window.addEventListener(NOTIFICATION_UPDATE_EVENT, handleUpdate)
    return () => window.removeEventListener(NOTIFICATION_UPDATE_EVENT, handleUpdate)
  }, [fetchNotifications])

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await apiFetch('/api/notifications/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, markRead: true })
      })
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
    } catch (error) {
      console.warn('Could not mark notification as read')
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await apiFetch('/api/notifications/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.warn('Could not mark all as read')
    }
  }

  // Clear all notifications
  const clearNotifications = async () => {
    try {
      await apiFetch('/api/notifications/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissAll: true })
      })
      
      setNotifications([])
    } catch (error) {
      console.warn('Could not clear notifications')
    }
  }

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.isRead).length

  // Get icon based on notification type
  const getIcon = (type: string) => {
    switch (type) {
      case 'chronos_reset':
        return <AlertTriangle className="w-5 h-5 text-red-400" />
      case 'chronos_grant':
        return <Coins className="w-5 h-5 text-emerald-400" />
      case 'chronos_deduct':
        return <Coins className="w-5 h-5 text-amber-400" />
      case 'blorp_message':
        return <MessageCircle className="w-5 h-5 text-blue-400" />
      case 'dm_request':
        return <MessageCircle className="w-5 h-5 text-purple-400" />
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-pink-400" />
      case 'mention':
        return <AtSign className="w-5 h-5 text-cyan-400" />
      default:
        return <Bell className="w-5 h-5 text-gray-400" />
    }
  }

  // Get background color based on notification type
  const getBackground = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-white/[0.02]'
    
    switch (type) {
      case 'chronos_reset':
        return 'bg-red-500/10 border-red-500/20'
      case 'chronos_grant':
        return 'bg-emerald-500/10 border-emerald-500/20'
      case 'chronos_deduct':
        return 'bg-amber-500/10 border-amber-500/20'
      case 'blorp_message':
        return 'bg-blue-500/10 border-blue-500/20'
      case 'dm_request':
        return 'bg-purple-500/10 border-purple-500/20'
      case 'friend_request':
        return 'bg-pink-500/10 border-pink-500/20'
      case 'mention':
        return 'bg-cyan-500/10 border-cyan-500/20'
      default:
        return 'bg-white/[0.05] border-white/10'
    }
  }

  // Don't render if not authenticated
  if (!isAuthenticated) return null

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 transition-all duration-200"
          title="Notifications"
        >
          <Bell className="w-5 h-5 text-white/70" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-black">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md bg-black border-l border-white/10 text-white p-0"
      >
        <SheetHeader className="p-4 border-b border-white/10 space-y-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold text-white">Notifications</SheetTitle>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-8 px-3 text-xs text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearNotifications}
                  className="h-8 px-3 text-xs text-white/60 hover:text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Clear all
                </Button>
              </div>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-xs text-white/50 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-white/30" />
              </div>
              <p className="text-white/50 text-sm">No notifications yet</p>
              <p className="text-white/30 text-xs mt-1">We'll notify you when something arrives</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors ${!notification.isRead ? 'bg-white/[0.02]' : ''}`}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getBackground(notification.type, notification.isRead)} border`}>
                        {getIcon(notification.type)}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium ${notification.isRead ? 'text-white/70' : 'text-white'}`}>
                            {notification.title}
                          </h4>
                          <p className={`text-xs mt-1 leading-relaxed ${notification.isRead ? 'text-white/40' : 'text-white/60'}`}>
                            {notification.message}
                          </p>
                        </div>
                        
                        {/* Mark as read button */}
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {/* Time ago */}
                      <p className="text-[10px] text-white/30 mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt))} ago
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
