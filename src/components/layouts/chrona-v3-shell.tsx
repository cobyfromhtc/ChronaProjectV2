'use client'

import { useState, useEffect, useCallback, useMemo, startTransition } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { apiFetch } from '@/lib/api-client'
import { canAccessAdminPanel } from '@/lib/roles'
import { useIsMobile } from '@/hooks/use-mobile'
import { AnimatePresence, motion } from 'framer-motion'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProfileDropdown } from '@/components/profile-dropdown'

import {
  Compass,
  Users,
  Crown,
  MessageCircle,
  ShoppingBag,
  Wallet,
  Trophy,
  Shield,
  Search,
  Sparkles,
  X,
  Circle,
  Plus,
  Loader2,
  PanelRightClose,
  Feather,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChronaV3ShellProps {
  activeTab: 'home' | 'friends' | 'storylines' | 'chat' | 'wallet' | 'admin' | 'marketplace'
  activeStorylineId: string | null
  activeChat: any | null
  onSelectTab: (tab: any) => void
  onSelectStoryline: (storylineId: string) => void
  onSelectChat: (conversationId: string) => void
  onStartChat: (conv: any) => void
  onNavigate: (item: string) => void
  onOpenEditProfile: () => void
  onOpenMyPersonas: () => void
  onCreatePersona: () => void
  children: React.ReactNode
}

interface OnlinePersona {
  id: string
  name: string
  avatarUrl: string | null
  isOnline: boolean
  user?: {
    username: string
  }
}

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
  unreadCount?: number
}

// ─── Nav Item Definition ─────────────────────────────────────────────────────

interface NavPillItem {
  id: string
  icon: React.ElementType
  label: string
  tab?: ChronaV3ShellProps['activeTab']
  action?: () => void
  staffOnly?: boolean
}

// ─── Motion presets ──────────────────────────────────────────────────────────

const springSoft = { type: 'spring', stiffness: 320, damping: 30 } as const

// ─── Component ───────────────────────────────────────────────────────────────

export function ChronaV3Shell({
  activeTab,
  activeChat,
  onSelectTab,
  onSelectStoryline,
  onSelectChat,
  onStartChat,
  onNavigate,
  onOpenEditProfile,
  onOpenMyPersonas,
  onCreatePersona,
  children,
}: ChronaV3ShellProps) {
  const { user } = useAuth()
  const { activePersona, personas, activatePersona } = usePersonas()
  const isMobile = useIsMobile()

  // ─── Panel State ─────────────────────────────────────────────────────────
  const [dmDrawerOpen, setDmDrawerOpen] = useState(false)
  const [dmSearchQuery, setDmSearchQuery] = useState('')

  // ─── Data State ──────────────────────────────────────────────────────────
  const [onlinePersonas, setOnlinePersonas] = useState<OnlinePersona[]>([])
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([])
  const [isLoadingOnline, setIsLoadingOnline] = useState(true)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)

  // ─── Staff check ────────────────────────────────────────────────────────
  const isStaff = user?.role ? canAccessAdminPanel(user.role) : false

  // ─── Nav Pill Items ──────────────────────────────────────────────────────
  const navPillItems: NavPillItem[] = useMemo(() => [
    { id: 'discover', icon: Compass, label: 'Discover', tab: 'home' },
    { id: 'friends', icon: Users, label: 'Friends', tab: 'friends' },
    { id: 'storylines', icon: Crown, label: 'Storylines', tab: 'storylines' },
    { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace', tab: 'marketplace' },
    { id: 'chronos', icon: Wallet, label: 'Chronos', tab: 'wallet' },
    {
      id: 'achievements',
      icon: Trophy,
      label: 'Achievements',
      action: () => window.dispatchEvent(new CustomEvent('chrona:open-achievements')),
    },
    { id: 'admin', icon: Shield, label: 'Admin', tab: 'admin', staffOnly: true },
  ], [])

  const visibleNavItems = useMemo(
    () => navPillItems.filter((item) => !item.staffOnly || isStaff),
    [navPillItems, isStaff]
  )

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchOnlinePersonas = useCallback(async () => {
    try {
      const response = await apiFetch('/api/personas/online')
      if (response.ok) {
        const data = await response.json()
        setOnlinePersonas(data.personas || [])
      }
    } catch (error) {
      console.error('Failed to fetch online personas:', error)
    } finally {
      setIsLoadingOnline(false)
    }
  }, [])

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    try {
      const response = await apiFetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setDmConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    startTransition(() => {
      fetchOnlinePersonas()
      fetchConversations()
    })

    // Refresh online list every 60s
    const interval = setInterval(fetchOnlinePersonas, 60_000)
    return () => clearInterval(interval)
  }, [fetchOnlinePersonas, fetchConversations])

  // Listen for refresh events
  useEffect(() => {
    const handleDMRefresh = () => fetchConversations()

    window.addEventListener('chrona:dm-refresh', handleDMRefresh)

    return () => {
      window.removeEventListener('chrona:dm-refresh', handleDMRefresh)
    }
  }, [fetchConversations])

  // ─── Persona switching ────────────────────────────────────────────────────
  const handleActivatePersona = useCallback(async (personaId: string) => {
    try {
      await activatePersona(personaId)
    } catch (error) {
      console.error('Failed to activate persona:', error)
    }
  }, [activatePersona])

  // ─── Nav Pill Click Handler ──────────────────────────────────────────────

  const handleNavPillClick = useCallback(
    (item: NavPillItem) => {
      if (item.tab) onSelectTab(item.tab)
      else if (item.action) item.action()
    },
    [onSelectTab]
  )

  // ─── Time Formatting ────────────────────────────────────────────────────

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d`
  }

  // ─── Computed values ──────────────────────────────────────────────────────

  const avatarSrc = user?.avatarUrl || activePersona?.avatarUrl || undefined
  const avatarFallback =
    (user?.username || activePersona?.name || 'U').charAt(0).toUpperCase()

  const totalUnreadDMs = useMemo(
    () => dmConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [dmConversations]
  )

  const filteredDMConversations = useMemo(() => {
    if (!dmSearchQuery.trim()) return dmConversations
    const q = dmSearchQuery.toLowerCase()
    return dmConversations.filter(
      (conv) =>
        conv.otherPersona.name.toLowerCase().includes(q) ||
        (conv.lastMessage?.content && conv.lastMessage.content.toLowerCase().includes(q))
    )
  }, [dmConversations, dmSearchQuery])

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* ====== AMBIENT BACKGROUND ====== */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 v3-ambient-bg">
        {/* Slow drifting aura orbs */}
        <motion.div
          className="absolute -top-32 -left-24 w-[34rem] h-[34rem] rounded-full bg-rose-500/10 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 24, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-24 w-[38rem] h-[38rem] rounded-full bg-fuchsia-500/10 blur-3xl"
          animate={{ x: [0, -36, 0], y: [0, -28, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[26rem] h-[26rem] rounded-full bg-violet-500/[0.07] blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ====== TOP BAR ====== */}
      <motion.header
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springSoft}
        className="relative z-30 flex-shrink-0 h-16 v3-topbar border-b border-border/50"
      >
        <div className="flex items-center h-full px-4 lg:px-8 gap-3 sm:gap-4">
          {/* Left: Logo */}
          <button
            onClick={() => onSelectTab('home')}
            className="group flex items-center gap-2.5 flex-shrink-0 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
            aria-label="Chrona home"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-500 blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 via-rose-400 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
                <Feather className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="hidden sm:block text-base font-semibold tracking-wide bg-gradient-to-r from-rose-300 via-fuchsia-300 to-rose-300 bg-clip-text text-transparent">
              Chrona
            </span>
          </button>

          {/* Center: Navigation Pills */}
          <nav className="flex-1 flex items-center justify-center min-w-0" aria-label="Primary">
            <div className="v3-nav-pill-track flex items-center gap-0.5 max-w-full overflow-x-auto custom-scrollbar">
              {visibleNavItems.map((item) => {
                const isActive = item.tab === activeTab
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavPillClick(item)}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`v3-nav-pill ${isActive ? 'v3-nav-pill-active' : ''}`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="v3-nav-indicator"
                        transition={springSoft}
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-500/20 to-fuchsia-500/20 ring-1 ring-rose-400/30"
                      />
                    )}
                    <Icon className="relative w-4 h-4 flex-shrink-0" />
                    <span className="relative hidden md:inline">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Right: Chat + Create + Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setDmDrawerOpen((prev) => !prev)}
              aria-label="Toggle messages"
              aria-pressed={dmDrawerOpen}
              className={`v3-icon-btn relative ${dmDrawerOpen ? 'v3-icon-btn-active' : ''}`}
            >
              <MessageCircle className="w-[18px] h-[18px]" />
              {totalUnreadDMs > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={springSoft}
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white text-[9px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/40"
                >
                  {totalUnreadDMs > 99 ? '99+' : totalUnreadDMs}
                </motion.span>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={onCreatePersona}
              aria-label="Create character"
              className="v3-icon-btn"
            >
              <Plus className="w-[18px] h-[18px]" />
            </motion.button>

            <ProfileDropdown
              onNavigate={onNavigate}
              onOpenEditProfile={onOpenEditProfile}
              onOpenMyPersonas={onOpenMyPersonas}
              position="bottom-right"
              trigger={
                <button
                  className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-rose-500/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                  aria-label="Account menu"
                >
                  <div className="relative">
                    <Avatar className="w-9 h-9 border-2 border-rose-500/30">
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback className="bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white text-[11px] font-bold">
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-background" />
                  </div>
                </button>
              }
            />
          </div>
        </div>
      </motion.header>

      {/* ====== MAIN CONTENT AREA ====== */}
      <div className="relative z-10 flex-1 flex min-h-0 overflow-hidden">
        {/* Content column — centered, calm, focused */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 pb-24">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSoft, delay: 0.08 }}
            >
              {children}
            </motion.div>
          </div>
        </main>

        {/* ====== DM DRAWER (Slide-in from right) ====== */}
        {/* Backdrop overlay (mobile only) */}
        <AnimatePresence>
          {dmDrawerOpen && isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/55 backdrop-blur-sm z-40"
              onClick={() => setDmDrawerOpen(false)}
              aria-hidden
            />
          )}
        </AnimatePresence>

        {/* Drawer panel */}
        <AnimatePresence initial={false}>
          {dmDrawerOpen ? (
            <motion.aside
              key="v3-dm-drawer"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isMobile ? '100vw' : 336, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={springSoft}
              className={`${isMobile ? 'fixed inset-y-0 right-0 z-50' : 'relative'} flex-shrink-0 flex flex-col overflow-hidden`}
              aria-label="Messages drawer"
            >
              <div className="v3-glass-panel w-full h-full flex flex-col overflow-hidden">
                {/* DM Drawer Header */}
                <div className="h-14 px-4 flex items-center justify-between border-b border-border/50 flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-semibold text-foreground/80 uppercase tracking-[0.18em]">
                      Messages
                    </span>
                  </div>
                  <button
                    onClick={() => setDmDrawerOpen(false)}
                    aria-label="Close messages"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-rose-300 hover:bg-rose-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                  >
                    <PanelRightClose className="w-4 h-4" />
                  </button>
                </div>

                {/* DM Search */}
                <div className="px-4 py-3 border-b border-border/40 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                    <Input
                      value={dmSearchQuery}
                      onChange={(e) => setDmSearchQuery(e.target.value)}
                      placeholder="Search conversations…"
                      className="h-9 pl-9 pr-9 text-xs rounded-full bg-muted/40 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:border-rose-500/50 focus-visible:ring-rose-500/20"
                    />
                    {dmSearchQuery && (
                      <button
                        onClick={() => setDmSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-5">
                    {/* Online Personas Section */}
                    <section>
                      <div className="flex items-center gap-2 mb-2.5 px-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em]">
                          Online — {onlinePersonas.length}
                        </span>
                        {isLoadingOnline && (
                          <Loader2 className="w-3 h-3 animate-spin text-rose-400/50" />
                        )}
                      </div>
                      {isLoadingOnline ? (
                        <div className="space-y-2">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-1" style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.12}s` }}>
                              <div className="w-8 h-8 rounded-full bg-rose-500/10" />
                              <div className="flex-1">
                                <div className="h-3 w-20 bg-rose-500/10 rounded mb-1" />
                                <div className="h-2 w-14 bg-rose-500/10 rounded" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : onlinePersonas.length > 0 ? (
                        <div className="space-y-0.5">
                          {onlinePersonas.slice(0, 8).map((persona) => (
                            <button
                              key={persona.id}
                              onClick={() => {
                                if (activePersona) {
                                  onStartChat({ targetPersonaId: persona.id, myPersonaId: activePersona.id })
                                }
                              }}
                              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-2xl hover:bg-rose-500/[0.08] transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                            >
                              <div className="relative flex-shrink-0">
                                <Avatar className="w-8 h-8 border border-rose-500/25 group-hover:border-rose-400/50 transition-colors">
                                  <AvatarImage src={persona.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-rose-500/40 to-fuchsia-500/50 text-white text-[10px] font-medium">
                                    {persona.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-card" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-foreground/80 group-hover:text-foreground truncate transition-colors">
                                  {persona.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground/70 truncate">
                                  {persona.user?.username}
                                </p>
                              </div>
                            </button>
                          ))}
                          {onlinePersonas.length > 8 && (
                            <p className="text-[10px] text-muted-foreground/60 text-center pt-1 px-2">
                              +{onlinePersonas.length - 8} more online
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-2">
                            <Users className="w-5 h-5 text-rose-400/60" />
                          </div>
                          <p className="text-[11px] text-muted-foreground">Nobody online right now</p>
                        </div>
                      )}
                    </section>

                    <Separator className="bg-border/60" />

                    {/* DM Conversations Section */}
                    <section>
                      <div className="flex items-center gap-2 mb-2.5 px-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em]">
                          Conversations
                        </span>
                        {isLoadingConversations && (
                          <Loader2 className="w-3 h-3 animate-spin text-rose-400/50" />
                        )}
                      </div>
                      {isLoadingConversations ? (
                        <div className="space-y-1.5">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-2 py-2" style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }}>
                              <div className="w-9 h-9 rounded-full bg-rose-500/10" />
                              <div className="flex-1">
                                <div className="h-3 w-20 bg-rose-500/10 rounded mb-1" />
                                <div className="h-2 w-28 bg-rose-500/10 rounded" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredDMConversations.length > 0 ? (
                        <div className="space-y-0.5">
                          {filteredDMConversations.map((conv) => {
                            const isActive = activeChat?.id === conv.id
                            return (
                              <button
                                key={conv.id}
                                onClick={() => onSelectChat(conv.id)}
                                className={`w-full flex items-center gap-2.5 px-2 py-2.5 rounded-2xl transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 ${
                                  isActive
                                    ? 'bg-rose-500/12 ring-1 ring-rose-500/30'
                                    : 'hover:bg-rose-500/[0.08]'
                                }`}
                              >
                                <div className="relative flex-shrink-0">
                                  <Avatar className={`w-9 h-9 border ${isActive ? 'border-rose-400/60' : 'border-rose-500/25'}`}>
                                    <AvatarImage src={conv.otherPersona.avatarUrl || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-rose-500/40 to-fuchsia-500/50 text-white text-[11px] font-medium">
                                      {conv.otherPersona.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  {conv.otherPersona.isOnline && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-card" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className={`text-xs font-medium truncate ${
                                      isActive ? 'text-rose-200' : 'text-foreground/80 group-hover:text-foreground'
                                    }`}>
                                      {conv.otherPersona.name}
                                    </p>
                                    {conv.lastMessage && (
                                      <span className="text-[9px] text-muted-foreground/60 flex-shrink-0">
                                        {formatRelativeTime(conv.lastMessage.createdAt)}
                                      </span>
                                    )}
                                  </div>
                                  {conv.lastMessage && (
                                    <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                                      {conv.lastMessage.content}
                                    </p>
                                  )}
                                </div>
                                {conv.unreadCount && conv.unreadCount > 0 && (
                                  <Badge className="h-4 px-1.5 text-[9px] bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white border-transparent flex-shrink-0">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-2">
                            <MessageCircle className="w-5 h-5 text-rose-400/60" />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {dmSearchQuery ? 'No matching conversations' : 'No conversations yet'}
                          </p>
                        </div>
                      )}
                    </section>

                    {/* My Personas Quick Access */}
                    {personas.length > 0 && (
                      <>
                        <Separator className="bg-border/60" />
                        <section>
                          <div className="flex items-center gap-2 mb-2.5 px-1">
                            <Sparkles className="w-3 h-3 text-rose-400/70" />
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em]">
                              Characters
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {personas.slice(0, 5).map((persona) => (
                              <button
                                key={persona.id}
                                onClick={() => handleActivatePersona(persona.id)}
                                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 ${
                                  persona.isActive
                                    ? 'bg-rose-500/12 ring-1 ring-rose-500/30'
                                    : 'hover:bg-rose-500/[0.08]'
                                }`}
                              >
                                <Avatar className="w-6 h-6 border border-rose-500/25">
                                  <AvatarImage src={persona.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-rose-500/40 to-fuchsia-500/50 text-white text-[9px] font-medium">
                                    {persona.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className={`text-[11px] truncate ${
                                  persona.isActive ? 'text-rose-300 font-medium' : 'text-muted-foreground group-hover:text-foreground'
                                }`}>
                                  {persona.name}
                                </span>
                                {persona.isActive && (
                                  <Circle className="w-2 h-2 fill-rose-400 text-rose-400 ml-auto flex-shrink-0" />
                                )}
                              </button>
                            ))}
                            {personas.length < 10 && (
                              <button
                                onClick={onCreatePersona}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-rose-500/[0.08] transition-colors text-muted-foreground hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                              >
                                <div className="w-6 h-6 rounded-lg border border-dashed border-rose-500/25 flex items-center justify-center">
                                  <Plus className="w-3 h-3" />
                                </div>
                                <span className="text-[11px]">Create new</span>
                              </button>
                            )}
                          </div>
                        </section>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
