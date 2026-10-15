'use client'

import { useState, useEffect, useCallback, useRef, useMemo, startTransition } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { apiFetch } from '@/lib/api-client'
import { canAccessAdminPanel } from '@/lib/roles'
import { useIsMobile } from '@/hooks/use-mobile'
import { AnimatePresence, motion } from 'framer-motion'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  Settings,
  PanelLeft,
  PanelRight,
  Search,
  Command,
  AtSign,
  Activity,
  Sparkles,
  X,
  Circle,
  Plus,
  Zap,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChronaV2ShellProps {
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

interface StorylineActivity {
  id: string
  name: string
  iconUrl: string | null
  lastActivity: string
  unreadCount?: number
}

interface MentionItem {
  id: string
  fromPersona: {
    name: string
    avatarUrl: string | null
  }
  storylineName: string
  content: string
  createdAt: string
}

// ─── Nav Item Definition ─────────────────────────────────────────────────────

interface NavItem {
  id: string
  icon: React.ElementType
  label: string
  shortcut: string
  tab?: ChronaV2ShellProps['activeTab']
  action?: () => void
  staffOnly?: boolean
}

// ─── Command Palette Item ────────────────────────────────────────────────────

interface CommandItem {
  id: string
  label: string
  shortcut?: string
  icon: React.ElementType
  action: () => void
  category: 'nav' | 'action'
}

// ─── Motion presets ──────────────────────────────────────────────────────────

const springSoft = { type: 'spring', stiffness: 380, damping: 32 } as const
const springSnappy = { type: 'spring', stiffness: 550, damping: 35 } as const

// ─── Component ───────────────────────────────────────────────────────────────

export function ChronaV2Shell({
  activeTab,
  activeStorylineId,
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
}: ChronaV2ShellProps) {
  const { user } = useAuth()
  const { activePersona, personas, activatePersona } = usePersonas()
  const isMobile = useIsMobile()

  // ─── Panel State ─────────────────────────────────────────────────────────
  const [activityPanelOpen, setActivityPanelOpen] = useState(!isMobile)
  const [dmPanelOpen, setDmPanelOpen] = useState(!isMobile)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)

  // ─── Data State ──────────────────────────────────────────────────────────
  const [onlinePersonas, setOnlinePersonas] = useState<OnlinePersona[]>([])
  const [mentions, setMentions] = useState<MentionItem[]>([])
  const [storylineActivity, setStorylineActivity] = useState<StorylineActivity[]>([])
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([])
  const [isLoadingOnline, setIsLoadingOnline] = useState(true)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingActivity, setIsLoadingActivity] = useState(true)

  const commandInputRef = useRef<HTMLInputElement>(null)
  const selectedCommandRef = useRef<HTMLButtonElement>(null)

  // ─── Scroll selected command into view ──────────────────────────────────
  useEffect(() => {
    if (selectedCommandRef.current) {
      selectedCommandRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedCommandIndex])

  // ─── Responsive panel collapse ──────────────────────────────────────────
  useEffect(() => {
    if (isMobile) {
      startTransition(() => {
        setActivityPanelOpen(false)
        setDmPanelOpen(false)
      })
    }
  }, [isMobile])

  // ─── Staff check ────────────────────────────────────────────────────────
  const isStaff = user?.role ? canAccessAdminPanel(user.role) : false

  // ─── Nav Items ──────────────────────────────────────────────────────────
  const navItems: NavItem[] = useMemo(() => [
    { id: 'discover', icon: Compass, label: 'Discover', shortcut: '⌘1', tab: 'home' },
    { id: 'friends', icon: Users, label: 'Friends', shortcut: '⌘2', tab: 'friends' },
    { id: 'storylines', icon: Crown, label: 'Storylines', shortcut: '⌘3', tab: 'storylines' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', shortcut: '⌘4', tab: 'chat' },
    { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace', shortcut: '⌘5', tab: 'marketplace' },
    { id: 'chronos', icon: Wallet, label: 'Chronos', shortcut: '⌘6', tab: 'wallet' },
    {
      id: 'achievements',
      icon: Trophy,
      label: 'Achievements',
      shortcut: '⌘7',
      action: () => window.dispatchEvent(new CustomEvent('chrona:open-achievements')),
    },
    { id: 'admin', icon: Shield, label: 'Admin', shortcut: '⌘8', tab: 'admin', staffOnly: true },
  ], [])

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !item.staffOnly || isStaff),
    [navItems, isStaff]
  )

  // ─── Command Palette Items ──────────────────────────────────────────────
  const commandItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      ...visibleNavItems.map((item) => ({
        id: item.id,
        label: item.label,
        shortcut: item.shortcut,
        icon: item.icon,
        action: () => {
          if (item.tab) onSelectTab(item.tab)
          else if (item.action) item.action()
          setCommandPaletteOpen(false)
          setCommandQuery('')
        },
        category: 'nav' as const,
      })),
      {
        id: 'edit-profile',
        label: 'Edit Profile',
        shortcut: '⌘P',
        icon: Settings,
        action: () => { onOpenEditProfile(); setCommandPaletteOpen(false); setCommandQuery('') },
        category: 'action',
      },
      {
        id: 'my-personas',
        label: 'My Characters',
        shortcut: '⌘⇧P',
        icon: Users,
        action: () => { onOpenMyPersonas(); setCommandPaletteOpen(false); setCommandQuery('') },
        category: 'action',
      },
      {
        id: 'create-persona',
        label: 'Create Character',
        shortcut: '⌘N',
        icon: Sparkles,
        action: () => { onCreatePersona(); setCommandPaletteOpen(false); setCommandQuery('') },
        category: 'action',
      },
    ]
    return items
  }, [visibleNavItems, onSelectTab, onOpenEditProfile, onOpenMyPersonas, onCreatePersona])

  const filteredCommands = useMemo(() => {
    if (!commandQuery.trim()) return commandItems
    const q = commandQuery.toLowerCase()
    return commandItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    )
  }, [commandItems, commandQuery])

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

  const fetchStorylineActivity = useCallback(async () => {
    setIsLoadingActivity(true)
    try {
      const response = await apiFetch('/api/storylines/joined')
      if (response.ok) {
        const data = await response.json()
        const storylines = (data.storylines || []).map((sl: any) => ({
          id: sl.id,
          name: sl.name,
          iconUrl: sl.iconUrl,
          lastActivity: sl.lastActivity || sl.updatedAt || '',
          unreadCount: sl.unreadCount || 0,
        }))
        setStorylineActivity(storylines)
      }
    } catch (error) {
      console.error('Failed to fetch storyline activity:', error)
    } finally {
      setIsLoadingActivity(false)
    }
  }, [])

  const fetchMentions = useCallback(async () => {
    try {
      const response = await apiFetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        const mentionItems = (data.notifications || [])
          .filter((n: any) => n.type === 'mention')
          .slice(0, 8)
          .map((n: any) => ({
            id: n.id,
            fromPersona: {
              name: n.fromPersona?.name || n.fromUser?.username || 'Unknown',
              avatarUrl: n.fromPersona?.avatarUrl || n.fromUser?.avatarUrl || null,
            },
            storylineName: n.storylineName || n.storyline?.name || '',
            content: n.content || '',
            createdAt: n.createdAt,
          }))
        setMentions(mentionItems)
      }
    } catch (error) {
      setMentions([])
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    startTransition(() => {
      fetchOnlinePersonas()
      fetchConversations()
      fetchStorylineActivity()
      fetchMentions()
    })
  }, [fetchOnlinePersonas, fetchConversations, fetchStorylineActivity, fetchMentions])

  // Listen for refresh events
  useEffect(() => {
    const handleDMRefresh = () => fetchConversations()
    const handleStorylineRefresh = () => fetchStorylineActivity()

    window.addEventListener('chrona:dm-refresh', handleDMRefresh)
    window.addEventListener('chrona:storyline-refresh', handleStorylineRefresh)

    return () => {
      window.removeEventListener('chrona:dm-refresh', handleDMRefresh)
      window.removeEventListener('chrona:storyline-refresh', handleStorylineRefresh)
    }
  }, [fetchConversations, fetchStorylineActivity])

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (commandPaletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedCommandIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          )
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : prev))
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          if (filteredCommands[selectedCommandIndex]) {
            filteredCommands[selectedCommandIndex].action()
          }
          return
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
        setCommandQuery('')
        setSelectedCommandIndex(0)
        setTimeout(() => commandInputRef.current?.focus(), 60)
        return
      }

      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key)
        if (num >= 1 && num <= visibleNavItems.length) {
          e.preventDefault()
          const item = visibleNavItems[num - 1]
          if (item.tab) onSelectTab(item.tab)
          else if (item.action) item.action()
          return
        }
      }

      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false)
        setCommandQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, filteredCommands, selectedCommandIndex, visibleNavItems, onSelectTab])

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleNavClick = useCallback(
    (item: NavItem) => {
      if (item.tab) onSelectTab(item.tab)
      else if (item.action) item.action()
    },
    [onSelectTab]
  )

  const handleActivatePersona = useCallback(async (personaId: string) => {
    try {
      await activatePersona(personaId)
    } catch (error) {
      console.error('Failed to activate persona:', error)
    }
  }, [activatePersona])

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true)
    setCommandQuery('')
    setTimeout(() => commandInputRef.current?.focus(), 60)
  }, [])

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

  const totalUnreadDMs = useMemo(
    () => dmConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [dmConversations]
  )

  const dockItems = visibleNavItems

  // ─── Shared panel chrome classes ─────────────────────────────────────────
  const panelChrome =
    'v2-glass-panel relative flex flex-col overflow-hidden rounded-2xl border border-border/70'

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={250}>
      <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
        {/* ─── Ambient background glows ─────────────────────────────────── */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 v2-ambient-bg" />

        {/* ─── Top Bar ──────────────────────────────────────────────────── */}
        <motion.header
          initial={{ y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springSoft}
          className="relative z-30 flex-shrink-0 h-14 px-3 sm:px-4 flex items-center gap-2 sm:gap-3 v2-topbar border-b border-border/60"
        >
          {/* Logo */}
          <button
            onClick={() => onSelectTab('home')}
            className="group flex items-center gap-2.5 flex-shrink-0 rounded-xl px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
            aria-label="Chrona home"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="hidden sm:block text-base font-bold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
              Chrona
            </span>
          </button>

          {/* Panel toggles */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActivityPanelOpen((prev) => !prev)}
                  aria-label={activityPanelOpen ? 'Hide activity panel' : 'Show activity panel'}
                  aria-pressed={activityPanelOpen}
                  className={`v2-chip-btn ${activityPanelOpen ? 'v2-chip-btn-active' : ''}`}
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {activityPanelOpen ? 'Hide Activity' : 'Show Activity'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setDmPanelOpen((prev) => !prev)}
                  aria-label={dmPanelOpen ? 'Hide messages panel' : 'Show messages panel'}
                  aria-pressed={dmPanelOpen}
                  className={`v2-chip-btn relative ${dmPanelOpen ? 'v2-chip-btn-active' : ''}`}
                >
                  <PanelRight className="w-4 h-4" />
                  {totalUnreadDMs > 0 && !dmPanelOpen && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[8px] font-bold flex items-center justify-center">
                      {totalUnreadDMs > 9 ? '9+' : totalUnreadDMs}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {dmPanelOpen ? 'Hide DMs' : 'Show DMs'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Search / command trigger — center */}
          <div className="flex-1 flex justify-center min-w-0">
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={openCommandPalette}
              className="v2-search-trigger group"
              aria-label="Open search and command palette"
            >
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-colors group-hover:text-violet-400" />
              <span className="text-xs text-muted-foreground truncate">Search or jump to…</span>
              <kbd className="ml-auto hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground/80 bg-muted/60 border border-border/80 px-1.5 py-0.5 rounded-md flex-shrink-0">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </motion.button>
          </div>

          {/* Right: quick create + profile */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={onCreatePersona}
                  aria-label="Create character"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <Plus className="w-4.5 h-4.5" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">New Character</TooltipContent>
            </Tooltip>

            <ProfileDropdown
              onNavigate={onNavigate}
              onOpenEditProfile={onOpenEditProfile}
              onOpenMyPersonas={onOpenMyPersonas}
              position="bottom-right"
              trigger={
                <div className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-border/70 hover:border-violet-500/40 hover:bg-violet-500/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60">
                  <div className="relative">
                    <Avatar className="w-7 h-7 border-2 border-violet-500/40">
                      <AvatarImage src={user?.avatarUrl || activePersona?.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white text-[10px] font-bold">
                        {(user?.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-background" />
                  </div>
                  <span
                    className="hidden sm:block text-xs font-medium truncate max-w-[96px]"
                    style={user?.nameColor ? { color: user.nameColor } : undefined}
                  >
                    {user?.username || 'User'}
                  </span>
                </div>
              }
            />
          </div>
        </motion.header>

        {/* ─── Main Area: Activity | Content | DMs ───────────────────────── */}
        <div className="relative z-10 flex flex-1 min-h-0 gap-3 p-3 pt-3">
          {/* ─── Activity Panel (Left) ────────────────────────────────── */}
          <AnimatePresence initial={false}>
            {activityPanelOpen && (
              <motion.aside
                key="activity-panel"
                initial={{ width: 0, opacity: 0, x: -16 }}
                animate={{ width: isMobile ? '100vw' : 272, opacity: 1, x: 0 }}
                exit={{ width: 0, opacity: 0, x: -16 }}
                transition={springSoft}
                className={`flex-shrink-0 ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'} flex flex-col overflow-hidden`}
                aria-label="Activity panel"
              >
                <div className={`${panelChrome} w-full h-full`}>
                  {/* Header */}
                  <div className="h-11 px-3.5 flex items-center justify-between border-b border-border/50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.12em]">Activity</span>
                    </div>
                    <button
                      onClick={() => setActivityPanelOpen(false)}
                      aria-label="Close activity panel"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-violet-300 hover:bg-violet-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-5">
                      {/* Online Personas */}
                      <section>
                        <div className="flex items-center gap-2 mb-2.5 px-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
                            Online — {onlinePersonas.length}
                          </span>
                        </div>
                        {isLoadingOnline ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="flex items-center gap-2.5 px-1" style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.12}s` }}>
                                <div className="w-7 h-7 rounded-full bg-violet-500/10" />
                                <div className="h-3 w-20 bg-violet-500/10 rounded" />
                              </div>
                            ))}
                          </div>
                        ) : onlinePersonas.length > 0 ? (
                          <div className="space-y-0.5">
                            {onlinePersonas.slice(0, 12).map((persona) => (
                              <Tooltip key={persona.id}>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                      if (activePersona) {
                                        onStartChat({ targetPersonaId: persona.id, myPersonaId: activePersona.id })
                                      }
                                    }}
                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-violet-500/10 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                                  >
                                    <div className="relative flex-shrink-0">
                                      <Avatar className="w-7 h-7 border border-violet-500/25 group-hover:border-violet-400/50 transition-colors">
                                        <AvatarImage src={persona.avatarUrl || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-violet-500/40 to-fuchsia-500/50 text-white text-[10px] font-medium">
                                          {persona.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-card" />
                                    </div>
                                    <span className="text-xs text-muted-foreground group-hover:text-foreground truncate">
                                      {persona.name}
                                    </span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="text-xs">
                                  DM {persona.name}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground px-2 py-2">No one online right now</p>
                        )}
                      </section>

                      {/* Mentions */}
                      <section>
                        <div className="flex items-center gap-2 mb-2.5 px-1">
                          <AtSign className="w-3 h-3 text-violet-400/80" />
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
                            Mentions
                          </span>
                          {mentions.length > 0 && (
                            <Badge className="h-4 px-1.5 text-[9px] bg-violet-500/15 text-violet-300 border-violet-500/30 hover:bg-violet-500/25">
                              {mentions.length}
                            </Badge>
                          )}
                        </div>
                        {mentions.length > 0 ? (
                          <div className="space-y-0.5">
                            {mentions.slice(0, 5).map((mention) => (
                              <button
                                key={mention.id}
                                className="w-full flex items-start gap-2.5 px-2 py-1.5 rounded-xl hover:bg-violet-500/10 transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                              >
                                <Avatar className="w-6 h-6 border border-violet-500/25 flex-shrink-0 mt-0.5">
                                  <AvatarImage src={mention.fromPersona.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-white text-[9px]">
                                    {mention.fromPersona.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] text-foreground/80 truncate">
                                    <span className="text-violet-300">{mention.fromPersona.name}</span>
                                    {mention.storylineName && (
                                      <span className="text-muted-foreground"> in {mention.storylineName}</span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/70 truncate">{mention.content}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground px-2 py-2">No recent mentions</p>
                        )}
                      </section>

                      {/* Storyline Activity */}
                      <section>
                        <div className="flex items-center gap-2 mb-2.5 px-1">
                          <Crown className="w-3 h-3 text-violet-400/80" />
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
                            Storylines
                          </span>
                        </div>
                        {isLoadingActivity ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="flex items-center gap-2.5 px-1" style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.12}s` }}>
                                <div className="w-7 h-7 rounded-lg bg-violet-500/10" />
                                <div className="flex-1">
                                  <div className="h-3 w-24 bg-violet-500/10 rounded mb-1" />
                                  <div className="h-2 w-12 bg-violet-500/10 rounded" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : storylineActivity.length > 0 ? (
                          <div className="space-y-0.5">
                            {storylineActivity.slice(0, 8).map((sl) => (
                              <Tooltip key={sl.id}>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => onSelectStoryline(sl.id)}
                                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
                                      activeStorylineId === sl.id
                                        ? 'bg-violet-500/15 ring-1 ring-violet-500/30'
                                        : 'hover:bg-violet-500/10'
                                    }`}
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden border border-violet-500/25">
                                      {sl.iconUrl ? (
                                        <img src={sl.iconUrl} alt={sl.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-white text-[10px] font-bold">{sl.name.charAt(0).toUpperCase()}</span>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-[11px] truncate ${
                                        activeStorylineId === sl.id ? 'text-violet-200 font-medium' : 'text-foreground/85 group-hover:text-violet-100'
                                      }`}>
                                        {sl.name}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground/70">
                                        {sl.lastActivity ? formatRelativeTime(sl.lastActivity) : 'No activity'}
                                      </p>
                                    </div>
                                    {sl.unreadCount && sl.unreadCount > 0 && (
                                      <Badge className="h-4 px-1.5 text-[9px] bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent flex-shrink-0">
                                        {sl.unreadCount}
                                      </Badge>
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="text-xs max-w-[200px]">
                                  {sl.name}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => onSelectTab('storylines')}
                            className="w-full p-4 rounded-xl border border-dashed border-violet-500/25 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-violet-300 hover:border-violet-500/50 hover:bg-violet-500/[0.06] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                          >
                            <Crown className="w-5 h-5 text-violet-400/60" />
                            <span className="text-[11px] font-medium">Join a storyline</span>
                            <span className="text-[9px] text-muted-foreground/70">Explore collaborative stories</span>
                          </button>
                        )}
                      </section>

                      {/* My Personas Quick Access */}
                      {personas.length > 0 && (
                        <section>
                          <div className="flex items-center gap-2 mb-2.5 px-1">
                            <Zap className="w-3 h-3 text-violet-400/80" />
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
                              Characters
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {personas.slice(0, 6).map((persona) => (
                              <button
                                key={persona.id}
                                onClick={() => handleActivatePersona(persona.id)}
                                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
                                  persona.isActive
                                    ? 'bg-violet-500/15 ring-1 ring-violet-500/30'
                                    : 'hover:bg-violet-500/10'
                                }`}
                              >
                                <Avatar className="w-7 h-7 border border-violet-500/25">
                                  <AvatarImage src={persona.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-violet-500/40 to-fuchsia-500/50 text-white text-[10px] font-medium">
                                    {persona.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className={`text-[11px] truncate ${
                                  persona.isActive ? 'text-violet-200 font-medium' : 'text-muted-foreground group-hover:text-foreground'
                                }`}>
                                  {persona.name}
                                </span>
                                {persona.isActive && (
                                  <Circle className="w-2 h-2 fill-violet-400 text-violet-400 ml-auto flex-shrink-0" />
                                )}
                              </button>
                            ))}
                            {personas.length < 10 && (
                              <button
                                onClick={onCreatePersona}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-violet-500/10 transition-colors text-muted-foreground hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                              >
                                <div className="w-7 h-7 rounded-lg border border-dashed border-violet-500/30 flex items-center justify-center">
                                  <Plus className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[11px]">Create new</span>
                              </button>
                            )}
                          </div>
                        </section>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Mobile backdrop for activity panel */}
          {isMobile && activityPanelOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setActivityPanelOpen(false)}
              aria-hidden
            />
          )}

          {/* ─── Main Content Area ─────────────────────────────────────── */}
          <main className="relative flex-1 min-w-0 flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm">
            <div className="flex-1 overflow-y-auto pb-24">
              {children}
            </div>
          </main>

          {/* ─── DM Panel (Right) ──────────────────────────────────────── */}
          <AnimatePresence initial={false}>
            {dmPanelOpen && (
              <motion.aside
                key="dm-panel"
                initial={{ width: 0, opacity: 0, x: 16 }}
                animate={{ width: isMobile ? '100vw' : 300, opacity: 1, x: 0 }}
                exit={{ width: 0, opacity: 0, x: 16 }}
                transition={springSoft}
                className={`flex-shrink-0 ${isMobile ? 'fixed inset-y-0 right-0 z-50' : 'relative'} flex flex-col overflow-hidden`}
                aria-label="Direct messages panel"
              >
                <div className={`${panelChrome} w-full h-full`}>
                  {/* DM Header */}
                  <div className="h-11 px-3.5 flex items-center justify-between border-b border-border/50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.12em]">Messages</span>
                    </div>
                    <button
                      onClick={() => setDmPanelOpen(false)}
                      aria-label="Close messages panel"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-violet-300 hover:bg-violet-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* DM Search */}
                  <div className="px-3 py-2.5 border-b border-border/40 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                      <Input
                        placeholder="Search messages…"
                        className="h-8 pl-8 text-xs rounded-xl bg-muted/40 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
                      />
                    </div>
                  </div>

                  {/* DM List */}
                  <ScrollArea className="flex-1">
                    {isLoadingConversations ? (
                      <div className="space-y-1.5 p-2.5">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-1 py-2" style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }}>
                            <div className="w-9 h-9 rounded-full bg-violet-500/10" />
                            <div className="flex-1">
                              <div className="h-3 w-20 bg-violet-500/10 rounded mb-1" />
                              <div className="h-2 w-28 bg-violet-500/10 rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : dmConversations.length > 0 ? (
                      <div className="space-y-1 p-2.5">
                        {dmConversations.map((conv) => {
                          const isActive = activeChat?.id === conv.id
                          return (
                            <button
                              key={conv.id}
                              onClick={() => onSelectChat(conv.id)}
                              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
                                isActive
                                  ? 'bg-violet-500/15 ring-1 ring-violet-500/30'
                                  : 'hover:bg-violet-500/10'
                              }`}
                            >
                              <div className="relative flex-shrink-0">
                                <Avatar className={`w-9 h-9 border ${isActive ? 'border-violet-400/60' : 'border-violet-500/25'}`}>
                                  <AvatarImage src={conv.otherPersona.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-violet-500/40 to-fuchsia-500/50 text-white text-[11px] font-medium">
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
                                    isActive ? 'text-violet-200' : 'text-foreground/85 group-hover:text-violet-100'
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
                                  <p className="text-[10px] text-muted-foreground/75 truncate">{conv.lastMessage.content}</p>
                                )}
                              </div>
                              {conv.unreadCount && conv.unreadCount > 0 && (
                                <Badge className="h-4 px-1.5 text-[9px] bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent flex-shrink-0">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
                          <MessageCircle className="w-5 h-5 text-violet-400/70" />
                        </div>
                        <p className="text-xs font-medium text-foreground/80">No messages yet</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Start a conversation from the activity panel</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Mobile backdrop for DM panel */}
          {isMobile && dmPanelOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setDmPanelOpen(false)}
              aria-hidden
            />
          )}
        </div>

        {/* ─── Floating Dock (Bottom Center) ────────────────────────────── */}
        <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40">
          <motion.nav
            initial={{ y: 56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...springSoft, delay: 0.12 }}
            aria-label="Primary navigation"
            className="relative"
          >
            {/* Gradient glow behind the dock */}
            <div
              aria-hidden
              className="absolute -inset-x-6 -bottom-3 top-1/2 rounded-full bg-gradient-to-r from-violet-600/30 via-fuchsia-500/30 to-violet-600/30 blur-2xl pointer-events-none"
            />
            <div className="v2-dock relative flex items-end gap-1 px-2.5 py-2 max-w-[calc(100vw-1.5rem)] overflow-x-auto custom-scrollbar">
              {dockItems.map((item) => {
                const isActive = item.tab === activeTab
                const Icon = item.icon
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <motion.button
                        onClick={() => handleNavClick(item)}
                        whileHover={{ scale: 1.14, y: -6 }}
                        whileTap={{ scale: 0.92 }}
                        transition={springSnappy}
                        aria-label={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        className={`v2-dock-item ${isActive ? 'v2-dock-item-active' : ''}`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="v2-dock-indicator"
                            transition={springSnappy}
                            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 ring-1 ring-violet-400/40"
                          />
                        )}
                        {isActive && (
                          <motion.span
                            layoutId="v2-dock-dot"
                            transition={springSnappy}
                            className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.9)]"
                          />
                        )}
                        <Icon className="relative w-5 h-5" />
                        <span className="sr-only">{item.label}</span>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs flex items-center gap-2">
                      {item.label}
                      <span className="text-muted-foreground text-[10px]">{item.shortcut}</span>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </motion.nav>
        </div>

        {/* ─── Command Palette Overlay ────────────────────────────────────── */}
        <AnimatePresence>
          {commandPaletteOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/55 backdrop-blur-md"
                onClick={() => {
                  setCommandPaletteOpen(false)
                  setCommandQuery('')
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -6 }}
                transition={springSoft}
                role="dialog"
                aria-label="Command palette"
                className="v2-command-palette relative w-full max-w-lg flex flex-col max-h-[68vh] overflow-hidden"
              >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 flex-shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
                    <Search className="w-3.5 h-3.5 text-violet-300" />
                  </div>
                  <input
                    ref={commandInputRef}
                    type="text"
                    value={commandQuery}
                    onChange={(e) => {
                      setCommandQuery(e.target.value)
                      setSelectedCommandIndex(0)
                    }}
                    placeholder="Type a command or search…"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none"
                    autoFocus
                    aria-label="Search commands"
                  />
                  <kbd className="text-[9px] text-muted-foreground bg-muted/60 border border-border/80 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                  {filteredCommands.length > 0 ? (
                    <div className="p-2">
                      {(['nav', 'action'] as const).map((category) => {
                        const categoryItems = filteredCommands.filter((i) => i.category === category)
                        if (categoryItems.length === 0) return null
                        return (
                          <div key={category} className="mb-1.5">
                            <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
                              {category === 'nav' ? 'Navigation' : 'Actions'}
                            </p>
                            {categoryItems.map((item) => {
                              const Icon = item.icon
                              const flatIndex = filteredCommands.indexOf(item)
                              const isSelected = flatIndex === selectedCommandIndex
                              return (
                                <button
                                  key={item.id}
                                  ref={isSelected ? selectedCommandRef : undefined}
                                  onClick={item.action}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors group text-left ${
                                    isSelected
                                      ? 'bg-violet-500/15 text-foreground ring-1 ring-violet-500/30'
                                      : 'hover:bg-violet-500/10 text-foreground/85'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-violet-500/30'
                                      : 'bg-violet-500/10 border border-violet-500/15 group-hover:bg-violet-500/20'
                                  }`}>
                                    <Icon className="w-3.5 h-3.5 text-violet-300" />
                                  </div>
                                  <span className={`text-sm flex-1 ${isSelected ? 'text-foreground' : ''}`}>
                                    {item.label}
                                  </span>
                                  {isSelected && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(232,121,249,0.8)]" />
                                  )}
                                  {item.shortcut && !isSelected && (
                                    <span className="text-[10px] text-muted-foreground/70 bg-muted/50 border border-border/70 px-1.5 py-0.5 rounded-md">
                                      {item.shortcut}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
                        <Command className="w-5 h-5 text-violet-400/60" />
                      </div>
                      <p className="text-sm text-muted-foreground">No results found</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Try “storylines”, “chat”, or “create”</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-border/50 flex items-center gap-4 text-[10px] text-muted-foreground flex-shrink-0 bg-muted/20">
                  <span className="flex items-center gap-1.5">
                    <kbd className="bg-muted/70 border border-border/80 px-1.5 py-0.5 rounded-md">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="bg-muted/70 border border-border/80 px-1.5 py-0.5 rounded-md">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="bg-muted/70 border border-border/80 px-1.5 py-0.5 rounded-md">esc</kbd>
                    Close
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}
