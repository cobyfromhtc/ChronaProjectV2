'use client'

import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useContextMenu, type ContextMenuItem } from '@/components/context-menu-system'
import { apiFetch } from '@/lib/api-client'
import { 
  MessageCircle, ChevronLeft, ChevronRight, PanelRightClose, PanelRight,
  Pin, BellOff, CheckCheck, X, UserX, Flag, Star, Search
} from 'lucide-react'
import { useVariantAccent } from '@/lib/ui-variant-styles'

// Custom event name for DM refresh
export const DM_REFRESH_EVENT = 'chrona:dm-refresh'

// Resizable width for the expanded DM sidebar (persisted per browser).
// The minimum is the previous fixed width (w-60 = 240px) so the sidebar can
// only grow from what it was — fixing truncated previews like Blorp's
// "Quick tip…" message.
const DM_WIDTH_KEY = 'chrona:dm-sidebar-width'
const DM_WIDTH_DEFAULT = 240
const DM_WIDTH_MIN = 240
const DM_WIDTH_MAX = 440

// Types
interface DMConversation {
  id: string
  otherPersona: {
    id: string
    name: string
    avatarUrl: string | null
    isOnline: boolean
  }
  lastMessage?: {
    content: string
    createdAt: string
  } | null
  lastMessageAt: string
}

interface FriendUser {
  id: string
  friendId: string
  username: string
  avatarUrl: string | null
  isFavourite: boolean
  activePersona: {
    id: string
    name: string
    avatarUrl: string | null
    isOnline: boolean
  } | null
}

interface DMSidebarProps {
  activeChatId: string | null
  onSelectChat: (conversationId: string) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function DMSidebar({
  activeChatId,
  onSelectChat,
  isCollapsed = false,
  onToggleCollapse
}: DMSidebarProps) {
  const { user } = useAuth()
  const { activePersona } = usePersonas()
  const accent = useVariantAccent()
  const { showContextMenu } = useContextMenu()

  const handleConversationContextMenu = useCallback((e: React.MouseEvent, conv: DMConversation) => {
    const items: ContextMenuItem[] = [
      {
        label: 'Open Conversation',
        icon: <MessageCircle className="w-4 h-4" />,
        accent: 'teal',
        onClick: () => onSelectChat(conv.id),
      },
      {
        label: 'Mark as Read',
        icon: <CheckCheck className="w-4 h-4" />,
        onClick: () => {},
      },
      {
        label: 'Pin Conversation',
        icon: <Pin className="w-4 h-4" />,
        accent: 'amber',
        onClick: () => {},
      },
      {
        label: 'Mute Notifications',
        icon: <BellOff className="w-4 h-4" />,
        onClick: () => {},
      },
      { type: 'separator' },
      {
        label: 'View Profile',
        icon: <Star className="w-4 h-4" />,
        onClick: () => window.dispatchEvent(new CustomEvent('chrona:open-user-profile', { detail: { userId: conv.otherPersona.id } })),
      },
      {
        label: 'Report User',
        icon: <Flag className="w-4 h-4" />,
        type: 'danger',
        onClick: () => window.dispatchEvent(new CustomEvent('chrona:open-user-profile', { detail: { userId: conv.otherPersona.id } })),
      },
      { type: 'separator' },
      {
        label: 'Close DM',
        icon: <X className="w-4 h-4" />,
        type: 'danger',
        onClick: async () => {
          try {
            await apiFetch(`/api/conversations/${conv.id}`, { method: 'DELETE' })
            window.dispatchEvent(new CustomEvent(DM_REFRESH_EVENT))
          } catch {}
        },
      },
    ]
    showContextMenu(e, items, conv.otherPersona.name)
  }, [onSelectChat, showContextMenu])
  
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([])
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingFriends, setIsLoadingFriends] = useState(true)
  const [convSearch, setConvSearch] = useState('')
  // Typing presence: map of conversationId -> persona name (who is typing)
  const [typingConvs, setTypingConvs] = useState<Record<string, string>>({})

  // ---- Resizable width (expanded view) ----
  const clampWidth = useCallback((w: number) => {
    const maxByViewport = typeof window !== 'undefined' ? window.innerWidth * 0.45 : DM_WIDTH_MAX
    return Math.round(Math.max(DM_WIDTH_MIN, Math.min(DM_WIDTH_MAX, w, maxByViewport)))
  }, [])

  // Lazy init restores the persisted width without an extra effect (this
  // sidebar only mounts client-side, inside the authenticated shell)
  const [dmWidth, setDmWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DM_WIDTH_DEFAULT
    try {
      const stored = Number.parseFloat(window.localStorage.getItem(DM_WIDTH_KEY) || '')
      if (Number.isFinite(stored) && stored >= DM_WIDTH_MIN) return clampWidth(stored)
    } catch {
      /* localStorage unavailable — session-only width */
    }
    return DM_WIDTH_DEFAULT
  })
  const [isResizing, setIsResizing] = useState(false)
  const resizeSessionRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const persistWidth = useCallback((w: number) => {
    try {
      window.localStorage.setItem(DM_WIDTH_KEY, String(w))
    } catch {
      /* localStorage unavailable — session-only width */
    }
  }, [])

  // Lock the cursor + disable text selection while dragging
  useEffect(() => {
    if (!isResizing) return
    const prevCursor = document.body.style.cursor
    const prevSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = prevCursor
      document.body.style.userSelect = prevSelect
    }
  }, [isResizing])

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    resizeSessionRef.current = { startX: e.clientX, startWidth: dmWidth }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer capture unsupported — drag still works while over the handle */
    }
    setIsResizing(true)
  }, [dmWidth])

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const session = resizeSessionRef.current
    if (!session) return
    const delta = e.clientX - session.startX
    setDmWidth(clampWidth(session.startWidth + delta))
  }, [clampWidth])

  const handleResizePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeSessionRef.current) return
    resizeSessionRef.current = null
    setIsResizing(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    setDmWidth((w) => {
      persistWidth(w)
      return w
    })
  }, [persistWidth])

  const handleResizeDoubleClick = useCallback(() => {
    setDmWidth(DM_WIDTH_DEFAULT)
    persistWidth(DM_WIDTH_DEFAULT)
  }, [persistWidth])

  const handleResizeKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 48 : 16
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = clampWidth(dmWidth + (e.key === 'ArrowRight' ? step : -step))
      setDmWidth(next)
      persistWidth(next)
    } else if (e.key === 'Home') {
      e.preventDefault()
      const next = clampWidth(DM_WIDTH_MIN)
      setDmWidth(next)
      persistWidth(next)
    } else if (e.key === 'End') {
      e.preventDefault()
      const next = clampWidth(DM_WIDTH_MAX)
      setDmWidth(next)
      persistWidth(next)
    }
  }, [clampWidth, dmWidth, persistWidth])

  // Listen for typing status events from ChatView
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ conversationId: string; isTyping: boolean; personaName?: string }>).detail
      if (!detail?.conversationId) return
      setTypingConvs(prev => {
        const next = { ...prev }
        if (detail.isTyping && detail.personaName) {
          next[detail.conversationId] = detail.personaName
        } else {
          delete next[detail.conversationId]
        }
        return next
      })
    }
    window.addEventListener('chrona:typing-status', handler)
    return () => window.removeEventListener('chrona:typing-status', handler)
  }, [])
  
  // Fetch DM conversations
  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setDmConversations(data.conversations)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])
  
  // Initial fetch on mount
  useEffect(() => {
    startTransition(() => { fetchConversations() })
  }, [fetchConversations])
  
  // Listen for DM refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchConversations()
    }
    
    window.addEventListener(DM_REFRESH_EVENT, handleRefresh)
    return () => window.removeEventListener(DM_REFRESH_EVENT, handleRefresh)
  }, [fetchConversations])
  
  // Fetch friends
  useEffect(() => {
    async function fetchFriends() {
      try {
        const response = await fetch('/api/friends')
        if (response.ok) {
          const data = await response.json()
          setFriends(data.friends)
        }
      } catch (error) {
        console.error('Failed to fetch friends:', error)
      } finally {
        setIsLoadingFriends(false)
      }
    }
    fetchFriends()
  }, [])
  

  
  // Start conversation
  const startConversation = async (targetPersonaId: string) => {
    if (!activePersona) {
      alert('Please activate a persona first!')
      return
    }
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPersonaId, myPersonaId: activePersona.id })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Check if we need DM request (first message to this user)
        if (data.needsDmRequest) {
          alert('Send a message request to start chatting!')
          return
        }
        
        // Conversation created or already exists
        if (data.conversation) {
          onSelectChat(data.conversation.id)
        }
        
        // Refresh conversations list
        fetchConversations()
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }
  
  // Separate favourites and regular friends
  const favouriteFriends = friends.filter(f => f.isFavourite)
  const regularFriends = friends.filter(f => !f.isFavourite)
  
  // Get online friends for the top section
  const onlineFriends = [...favouriteFriends, ...regularFriends].filter(f => f.activePersona?.isOnline)

  // Filtered conversations based on search query (only when search is active)
  const convSearchQuery = (convSearch === 'searching' ? '' : convSearch).toLowerCase().trim()
  const filteredDmConversations = convSearchQuery
    ? dmConversations.filter(c => c.otherPersona.name.toLowerCase().includes(convSearchQuery))
    : dmConversations

  // Collapsed View
  if (isCollapsed) {
    return (
      <div className="w-14 bg-[#0e1015] border-r border-white/[0.08] flex flex-col flex-shrink-0 relative items-center py-3 gap-2 h-full">
        {/* Decorative top glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        
        {/* Toggle Button */}
        <button 
          onClick={onToggleCollapse}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all relative z-10"
          title="Expand sidebar"
        >
          <PanelRight className="w-4 h-4" />
        </button>
        
        {/* Divider */}
        <div className={`w-6 h-px ${accent.bgTint} my-1`} />
        
        {/* Online Friends Avatars */}
        {isLoadingFriends ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className={`w-9 h-9 rounded-full ${accent.bgTint}`} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {onlineFriends.slice(0, 5).map((friend) => (
              <button
                key={friend.id}
                onClick={() => friend.activePersona && startConversation(friend.activePersona.id)}
                className="group relative p-0.5"
                title={friend.activePersona?.name || friend.username}
              >
                <div className="persona-status persona-status-online">
                  <Avatar className={`w-9 h-9 border-2 ${accent.avatarBorder} group-hover:${accent.borderStrong} transition-colors`}>
                    <AvatarImage src={friend.activePersona?.avatarUrl || friend.avatarUrl || undefined} />
                    <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-xs font-medium`}>
                      {(friend.activePersona?.name || friend.username)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Divider */}
        {onlineFriends.length > 0 && <div className={`w-6 h-px ${accent.bgTint} my-1`} />}
        
        {/* Recent Conversations */}
        {isLoadingConversations ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className={`w-9 h-9 rounded-full ${accent.bgTint}`} />
            ))}
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2 items-center">
              {dmConversations.slice(0, 10).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectChat(conv.id)}
                  onContextMenu={(e) => handleConversationContextMenu(e, conv)}
                  className={`group relative p-0.5 rounded-full ${activeChatId === conv.id ? `ring-2 ring-inset ${accent.ringColor} ${accent.bgTint}` : ''}`}
                  title={conv.otherPersona.name}
                >
                  <div className={`persona-status ${conv.otherPersona.isOnline ? 'persona-status-online' : 'persona-status-offline'}`}>
                    <Avatar className={`w-9 h-9 border ${accent.avatarBorder} group-hover:${accent.borderStrong} transition-colors`}>
                      <AvatarImage src={conv.otherPersona.avatarUrl || undefined} />
                      <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-xs font-medium`}>
                        {conv.otherPersona.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

      </div>
    )
  }

  // Expanded View — width is user-resizable (drag the right edge)
  return (
    <div
      className={`bg-[#0e1015] border-r border-white/[0.08] flex flex-col flex-shrink-0 relative h-full ${isResizing ? 'select-none' : ''}`}
      style={{ width: dmWidth }}
    >
      {/* Decorative top glow */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 h-14 px-4 flex items-center justify-between border-b border-white/[0.08] flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-slate-400" />
          <span className="font-semibold text-slate-100">Messages</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
            title="Collapse sidebar"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Online Friends Section */}
      {(onlineFriends.length > 0 || isLoadingFriends) && (
        <div className="relative z-10 px-3 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-1 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="persona-section-header">Online — {onlineFriends.length}</span>
          </div>
          {isLoadingFriends ? (
            <div className="flex flex-wrap gap-3">
              {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className={`w-9 h-9 rounded-full ${accent.bgTint}`} />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {onlineFriends.slice(0, 8).map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => friend.activePersona && startConversation(friend.activePersona.id)}
                  className="group relative p-0.5"
                  title={friend.activePersona?.name || friend.username}
                >
                  <div className="persona-status persona-status-online">
                    <Avatar className={`w-9 h-9 border-2 ${accent.avatarBorder} group-hover:${accent.borderStrong} transition-colors`}>
                      <AvatarImage src={friend.activePersona?.avatarUrl || friend.avatarUrl || undefined} />
                      <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-xs font-medium`}>
                        {(friend.activePersona?.name || friend.username)?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* DM List */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <div className="px-4 py-2 flex-shrink-0 flex items-center justify-between">
          <span className="persona-section-header">Recent</span>
          {dmConversations.length > 3 && (
            <button
              onClick={() => setConvSearch(convSearch ? '' : 'searching')}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
              title="Search conversations"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {convSearch && (
          <div className="px-4 pb-2 flex-shrink-0" style={{ animation: 'fadeIn 0.15s ease-out' }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter conversations…"
                value={convSearch === 'searching' ? '' : convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                autoFocus
                className="w-full h-8 pl-8 pr-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>
        )}
        <ScrollArea className="flex-1 px-3">
          {isLoadingConversations ? (
            <div className="space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className={`w-9 h-9 rounded-full ${accent.bgTint}`} />
                  <div className="flex-1">
                    <Skeleton className={`h-4 w-24 ${accent.bgTint} mb-1`} />
                    <Skeleton className="h-3 w-32 bg-white/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDmConversations.length > 0 ? (
            <div className="space-y-0.5 py-1">
              {filteredDmConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectChat(conv.id)}
                  onContextMenu={(e) => handleConversationContextMenu(e, conv)}
                  title={conv.lastMessage ? `${conv.otherPersona.name} — ${conv.lastMessage.content}` : conv.otherPersona.name}
                  className={`persona-dm-item w-full ${activeChatId === conv.id ? 'persona-dm-item-active' : ''}`}
                >
                  <div className={`persona-status ${conv.otherPersona.isOnline ? 'persona-status-online' : 'persona-status-offline'}`}>
                    <Avatar className={`w-9 h-9 border ${accent.avatarBorder}`}>
                      <AvatarImage src={conv.otherPersona.avatarUrl || undefined} />
                      <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-xs font-medium`}>
                        {conv.otherPersona.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-slate-100 truncate">{conv.otherPersona.name}</p>
                    {typingConvs[conv.id] ? (
                      <p className="text-xs text-primary truncate flex items-center gap-1" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0ms' }} />
                          <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0.2s' }} />
                          <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0.4s' }} />
                        </span>
                        typing…
                      </p>
                    ) : conv.lastMessage ? (
                      <p className="text-xs text-slate-500 truncate">{conv.lastMessage.content}</p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          ) : convSearchQuery ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Search className="w-6 h-6 text-slate-500 mb-2" />
              <p className="text-xs text-slate-400">No conversations match "{convSearch}"</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center mb-4 border border-white/[0.08]">
                <MessageCircle className="w-6 h-6 text-slate-400/80" />
              </div>
              <p className="text-sm font-medium text-slate-200/80">No conversations yet</p>
              <p className="text-xs text-slate-500 mt-1">Start chatting with friends!</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Resize handle — drag to widen (min = original width). Keyboard:
          ←/→ shrink/grow (Shift = faster), Home/End = min/max, double-click = reset */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize messages sidebar"
        aria-valuenow={dmWidth}
        aria-valuemin={DM_WIDTH_MIN}
        aria-valuemax={DM_WIDTH_MAX}
        tabIndex={0}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onDoubleClick={handleResizeDoubleClick}
        onKeyDown={handleResizeKeyDown}
        title="Drag to resize · double-click to reset"
        className={`absolute top-0 right-0 h-full w-1.5 z-30 flex items-center justify-center cursor-col-resize touch-none transition-colors ${
          isResizing ? 'bg-primary/30' : 'hover:bg-primary/20 focus-visible:bg-primary/25'
        }`}
      >
        <span
          className={`pointer-events-none w-[3px] rounded-full transition-all duration-150 ${
            isResizing ? 'h-14 bg-primary' : 'h-10 bg-white/10 group-hover:bg-primary/70'
          }`}
        />
      </div>
    </div>
  )
}
