'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  MessageCircle, Search, X, Loader2, Users, Settings,
  User, History, Palette, Shield,
  Eye, EyeOff, Copy, Check, Compass, ChevronRight,
  PanelLeft, LayoutList, Crown, Trophy, ShoppingBag, Wallet,
  Lock, LayoutGrid
} from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { isAdult } from '@/lib/age-utils'
import { useUIVariant, UI_VARIANT_INFO, type UIVariant } from '@/stores/ui-variant-store'

interface NavigationTopbarProps {
  activeItem?: string
  onNavigate?: (item: string) => void
  onOpenEditProfile?: () => void
  onOpenMyPersonas?: () => void
  variant?: 'default' | 'inside-banner'
}

interface SearchUser {
  id: string
  username: string
  avatarUrl: string | null
  activePersona: {
    id: string
    name: string
    avatarUrl: string | null
    isOnline: boolean
  } | null
}

interface ChatHistoryEntry {
  id: string
  otherPersona: {
    id: string
    name: string
    avatarUrl: string | null
    username: string
    isOnline: boolean
  }
  myPersona: {
    id: string
    name: string
  }
  lastMessage: {
    content: string
    createdAt: string
  } | null
  lastMessageAt: string
}

export function NavigationTopbar({ activeItem = 'discover', onNavigate, onOpenEditProfile, onOpenMyPersonas, variant = 'default' }: NavigationTopbarProps) {
  const { user, setUser } = useAuth()
  const userIsAdult = user?.dateOfBirth ? isAdult(new Date(user.dateOfBirth)) : false
  const { activePersona } = usePersonas()
  const [showFindUsers, setShowFindUsers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Profile Dropdown State
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const avatarBtnRef = useRef<HTMLButtonElement>(null)

  // Portal positioning state
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  // Chat History state
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([])
  const [isLoadingChatHistory, setIsLoadingChatHistory] = useState(false)
  const [showChatHistoryModal, setShowChatHistoryModal] = useState(false)

  // Update dropdown position based on avatar button location
  const updateDropdownPosition = useCallback(() => {
    if (avatarBtnRef.current) {
      const rect = avatarBtnRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      })
    }
  }, [])

  useEffect(() => {
    if (showProfileDropdown) {
      updateDropdownPosition()
      const handleResize = () => updateDropdownPosition()
      const handleScroll = () => updateDropdownPosition()
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true)
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [showProfileDropdown, updateDropdownPosition])

  // Preferences state
  const [contentMaturity, setContentMaturity] = useState(user?.contentMaturity || 'safe')
  const [theme, setTheme] = useState(user?.theme || 'dark')
  const [isUpdatingMaturity, setIsUpdatingMaturity] = useState(false)
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false)
  const [isUpdatingNavigation, setIsUpdatingNavigation] = useState(false)

  // UI variant state
  const { variant: uiVariant, setVariant: setUIVariant } = useUIVariant()

  // Variant-specific accent colors for dynamic styling
  const variantAccentMap: Record<UIVariant, { border: string; ring: string; bg: string; borderSubtle: string; bgSubtle: string }> = {
    chrona: { border: 'border-teal-400', ring: 'ring-teal-400/40', bg: 'bg-teal-500', borderSubtle: 'border-teal-500/20', bgSubtle: 'bg-teal-500/10' },
    minimal: { border: 'border-slate-400', ring: 'ring-slate-400/40', bg: 'bg-slate-500', borderSubtle: 'border-slate-500/20', bgSubtle: 'bg-slate-500/10' },
    bold: { border: 'border-violet-400', ring: 'ring-violet-400/40', bg: 'bg-violet-500', borderSubtle: 'border-violet-500/20', bgSubtle: 'bg-violet-500/10' },
    elegant: { border: 'border-rose-400', ring: 'ring-rose-400/40', bg: 'bg-rose-500', borderSubtle: 'border-rose-500/20', bgSubtle: 'bg-rose-500/10' },
  }
  const currentAccent = variantAccentMap[uiVariant]

  // Navigation mode state
  const [navigationMode, setNavigationMode] = useState(user?.navigationMode || 'static')

  // Security key state
  const [showSecurityKey, setShowSecurityKey] = useState(false)
  const [securityKeyValue, setSecurityKeyValue] = useState<string | null>(null)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [hasCopiedKey, setHasCopiedKey] = useState(false)

  // Friends/Watchlist state
  const [friendsCount, setFriendsCount] = useState(0)

  const navItems = [
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'storylines', label: 'Storylines', icon: Crown },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'chronos', label: 'Chronos', icon: Wallet },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
  ]

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowProfileDropdown(false)
        setShowChatHistoryModal(false)
      }
    }
    if (showProfileDropdown || showChatHistoryModal) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showProfileDropdown, showChatHistoryModal])

  // Sync preferences from user and localStorage
  useEffect(() => {
    if (user) {
      setContentMaturity(user.contentMaturity || 'safe')
      setTheme(user.theme || 'dark')
      setNavigationMode(user.navigationMode || 'static')
    } else {
      // Not logged in — try localStorage for theme and nav mode
      try {
        const stored = localStorage.getItem('chrona-theme')
        if (stored) setTheme(stored)
        const storedNav = localStorage.getItem('chrona-navigation-mode')
        if (storedNav) setNavigationMode(storedNav)
      } catch {}
    }
  }, [user])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    // Remove old theme classes
    root.classList.remove('theme-dark', 'theme-midnight', 'theme-forest', 'theme-light')
    // Add new theme class
    root.classList.add(`theme-${theme}`)
    // Add .dark class for dark themes (needed for Tailwind dark: variants & shadcn/ui)
    // Light theme does NOT get .dark class
    if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
    }
  }, [theme])

  // Listen for UI variant changes from external sources
  useEffect(() => {
    const handleUIVariantChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ variant: UIVariant }>
      if (customEvent.detail?.variant && customEvent.detail.variant !== uiVariant) {
        setUIVariant(customEvent.detail.variant)
      }
    }
    window.addEventListener('chrona:ui-variant-changed', handleUIVariantChanged)
    return () => window.removeEventListener('chrona:ui-variant-changed', handleUIVariantChanged)
  }, [uiVariant, setUIVariant])

  // Fetch data when dropdown opens
  useEffect(() => {
    if (showProfileDropdown) {
      fetchChatHistory()
      fetchFriendsCount()
    }
  }, [showProfileDropdown])

  const fetchChatHistory = async () => {
    setIsLoadingChatHistory(true)
    try {
      const response = await apiFetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setChatHistory(data.conversations || [])
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error)
    } finally {
      setIsLoadingChatHistory(false)
    }
  }

  const fetchFriendsCount = async () => {
    try {
      const response = await apiFetch('/api/friends')
      if (response.ok) {
        const data = await response.json()
        setFriendsCount(data.friends?.length || 0)
      }
    } catch (error) {
      // Non-critical
    }
  }

  const handleUpdateContentMaturity = async (maturity: string) => {
    setIsUpdatingMaturity(true)
    try {
      const response = await apiFetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentMaturity: maturity }),
      })
      if (response.ok) {
        setContentMaturity(maturity)
        if (user) {
          setUser({ ...user, contentMaturity: maturity })
        }
      }
    } catch (error) {
      console.error('Failed to update content maturity:', error)
    } finally {
      setIsUpdatingMaturity(false)
    }
  }

  const handleUpdateTheme = async (newTheme: string) => {
    setIsUpdatingTheme(true)
    try {
      // Save to localStorage immediately for instant restoration on page load
      localStorage.setItem('chrona-theme', newTheme)
      
      const response = await apiFetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      })
      if (response.ok) {
        setTheme(newTheme)
        if (user) {
          setUser({ ...user, theme: newTheme })
        }
      }
    } catch (error) {
      console.error('Failed to update theme:', error)
    } finally {
      setIsUpdatingTheme(false)
    }
  }

  const handleUpdateNavigationMode = async (mode: string) => {
    setIsUpdatingNavigation(true)
    try {
      // Save to localStorage immediately for instant restoration
      localStorage.setItem('chrona-navigation-mode', mode)
      
      const response = await apiFetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ navigationMode: mode }),
      })
      if (response.ok) {
        setNavigationMode(mode)
        if (user) {
          setUser({ ...user, navigationMode: mode })
        }
        // Dispatch custom event so page.tsx can react
        window.dispatchEvent(new CustomEvent('chrona:navigation-mode-changed', { detail: { mode } }))
      }
    } catch (error) {
      console.error('Failed to update navigation mode:', error)
    } finally {
      setIsUpdatingNavigation(false)
    }
  }

  const handleRevealSecurityKey = async () => {
    setIsGeneratingKey(true)
    try {
      const response = await apiFetch('/api/auth/security-key', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        setSecurityKeyValue(data.securityKey)
        setShowSecurityKey(true)
      }
    } catch (error) {
      console.error('Failed to get security key:', error)
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const copySecurityKey = () => {
    if (securityKeyValue) {
      navigator.clipboard.writeText(securityKeyValue)
      setHasCopiedKey(true)
      setTimeout(() => setHasCopiedKey(false), 2000)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const response = await apiFetch(`/api/friends/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleStartChat = async (targetPersonaId: string) => {
    if (!activePersona) {
      alert('Please activate a persona first!')
      return
    }
    try {
      const response = await apiFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPersonaId, myPersonaId: activePersona.id }),
      })
      const data = await response.json()
      if (response.ok && data.conversation) {
        setShowFindUsers(false)
        setSearchQuery('')
        setSearchResults([])
        onNavigate?.('chat')
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }

  // Logo component used in both variants
  const Logo = () => (
    <div className="flex items-center gap-2.5">
      <img src="/logo.png" alt="Chrona" className="w-7 h-7 rounded-lg object-cover" />
      <span className="text-sm font-semibold text-slate-100 tracking-tight">Chrona</span>
    </div>
  )

  // Find Users Modal
  const FindUsersModal = () => (
    <Dialog open={showFindUsers} onOpenChange={setShowFindUsers}>
      <DialogContent className="persona-modal text-slate-100 max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between border-b border-white/[0.06]">
          <DialogTitle className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Search className="w-5 h-5 text-teal-400" />
            Find Users
          </DialogTitle>
        </DialogHeader>
        <div className="p-5">
          <input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-10 px-4 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/30 transition-colors mb-4"
            autoFocus
          />
          {isSearching ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => result.activePersona && handleStartChat(result.activePersona.id)}
                  className="w-full p-3 rounded-lg flex items-center gap-3 text-slate-100 hover:bg-white/[0.05] transition-all"
                >
                  <div className="relative">
                    <Avatar className={`w-10 h-10 border-2 ${currentAccent.borderSubtle}`}>
                      <AvatarImage src={result.activePersona?.avatarUrl || result.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-teal-500/40 to-cyan-500/50 text-white text-sm">
                        {(result.activePersona?.name || result.username)?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {result.activePersona?.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f1117]" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-100">{result.username}</p>
                    {result.activePersona && (
                      <p className="text-xs text-slate-400">as {result.activePersona.name}</p>
                    )}
                  </div>
                  <MessageCircle className="w-5 h-5 text-slate-400" />
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="py-8 text-center">
              <Users className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No users found</p>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Search className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )

  // Chat History Modal — full modal showing all recent conversations
  const ChatHistoryModal = () => (
    <Dialog open={showChatHistoryModal} onOpenChange={setShowChatHistoryModal}>
      <DialogContent className="persona-modal text-slate-100 max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between border-b border-white/[0.06]">
          <DialogTitle className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Chat History
          </DialogTitle>
        </DialogHeader>
        <div className="p-3">
          {isLoadingChatHistory ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" />
            </div>
          ) : chatHistory.length > 0 ? (
            <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
              {chatHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => { setShowChatHistoryModal(false); onNavigate?.('chat') }}
                  className="w-full p-3 rounded-lg flex items-center gap-3 text-slate-100 hover:bg-white/[0.05] transition-all"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className={`w-10 h-10 border-2 ${currentAccent.borderSubtle}`}>
                      <AvatarImage src={chat.otherPersona.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-teal-500/40 to-cyan-500/50 text-white text-sm">
                        {chat.otherPersona.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {chat.otherPersona.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f1117]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-slate-100">{chat.otherPersona.name}</p>
                    {chat.lastMessage && (
                      <p className="text-xs text-slate-500 truncate">{chat.lastMessage.content}</p>
                    )}
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {chat.myPersona.name && `as ${chat.myPersona.name}`}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <MessageCircle className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No recent conversations</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )

  // Profile Dropdown Component — rendered via Portal to escape overflow containers
  const ProfileDropdown = () => {
    if (typeof document === 'undefined') return null
    const dropdownContent = (
      <>
        {/* Backdrop to catch outside clicks */}
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setShowProfileDropdown(false)}
        />
        <div
          className="w-[340px] sm:w-[380px] rounded-xl persona-modal shadow-2xl shadow-black/40 overflow-hidden"
          style={{
            ...dropdownStyle,
            animation: 'fadeInScale 0.15s ease-out',
          }}
        >
          {/* User Info Header */}
          <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className={`w-11 h-11 border-2 ${currentAccent.borderSubtle}`}>
                  <AvatarImage src={user?.avatarUrl || activePersona?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-400 text-white text-sm font-semibold">
                    {(user?.username || activePersona?.name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0f1117]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{user?.username || 'User'}</p>
                <p className="text-xs text-slate-500 capitalize">{activePersona ? `as ${activePersona.name}` : 'No active persona'}</p>
              </div>
            </div>
          </div>

          {/* Main Grid: 2-column layout */}
          <div className="grid grid-cols-2 gap-1 p-2">
            {/* Friends */}
            <button
              onClick={() => { setShowProfileDropdown(false); onNavigate?.('friends') }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Friends</p>
                <p className="text-[10px] text-slate-500 truncate">{friendsCount} friends</p>
              </div>
            </button>

            {/* My Personas */}
            <button
              onClick={() => { setShowProfileDropdown(false); onOpenMyPersonas?.() }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/20 transition-colors">
                <User className="w-4 h-4 text-teal-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">My Personas</p>
                <p className="text-[10px] text-slate-500">Manage characters</p>
              </div>
            </button>

            {/* Storylines */}
            <button
              onClick={() => { setShowProfileDropdown(false); onNavigate?.('storylines') }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                <Compass className="w-4 h-4 text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Storylines</p>
                <p className="text-[10px] text-slate-500">Active storylines</p>
              </div>
            </button>

            {/* Chat History — opens Chat History Modal */}
            <button
              onClick={() => { setShowProfileDropdown(false); setShowChatHistoryModal(true) }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/20 transition-colors">
                <History className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Chat History</p>
                <p className="text-[10px] text-slate-500">{chatHistory.length} recent</p>
              </div>
            </button>

            {/* Settings */}
            <button
              onClick={() => { setShowProfileDropdown(false); onOpenEditProfile?.() }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-500/20 transition-colors">
                <Settings className="w-4 h-4 text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Settings</p>
                <p className="text-[10px] text-slate-500">Edit profile</p>
              </div>
            </button>

            {/* Messages — opens Find User Modal */}
            <button
              onClick={() => { setShowProfileDropdown(false); setShowFindUsers(true) }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Messages</p>
                <p className="text-[10px] text-slate-500">Find & chat</p>
              </div>
            </button>
          </div>

          {/* Preferences Section */}
          <div className="border-t border-white/[0.06] px-3 py-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium px-1 mb-2.5 flex items-center gap-1.5">
              <Palette className="w-3 h-3" />
              Preferences
            </p>
            <div className="space-y-2.5">
              {/* Theme Selector */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-300">Theme</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'dark', label: 'Dark', color: 'bg-slate-800', ring: 'ring-slate-400' },
                    { id: 'midnight', label: 'Midnight', color: 'bg-indigo-900', ring: 'ring-indigo-400' },
                    { id: 'forest', label: 'Forest', color: 'bg-emerald-900', ring: 'ring-emerald-400' },
                    { id: 'light', label: 'Light', color: 'bg-slate-200', ring: 'ring-slate-500' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleUpdateTheme(t.id)}
                      disabled={isUpdatingTheme}
                      className={`w-6 h-6 rounded-full ${t.color} border-2 transition-all ${
                        theme === t.id
                          ? `${currentAccent.border} ring-2 ${currentAccent.ring} scale-110`
                          : 'border-transparent hover:border-white/20'
                      }`}
                      title={t.label}
                    />
                  ))}
                </div>
              </div>

              {/* UI Style Selector */}
              <div className="px-2">
                <div className="flex items-center gap-2 mb-2">
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-300">UI Style</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { id: 'chrona' as UIVariant, color: 'bg-teal-500', ring: 'ring-teal-400' },
                    { id: 'minimal' as UIVariant, color: 'bg-slate-400', ring: 'ring-slate-400' },
                    { id: 'bold' as UIVariant, color: 'bg-violet-500', ring: 'ring-violet-400' },
                    { id: 'elegant' as UIVariant, color: 'bg-rose-500', ring: 'ring-rose-400' },
                  ]).map((item) => {
                    const info = UI_VARIANT_INFO[item.id]
                    const isActive = uiVariant === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setUIVariant(item.id)}
                        className={`relative px-2.5 py-2 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-2 ${
                          isActive
                            ? `text-white ${currentAccent.bgSubtle} ${currentAccent.borderSubtle} shadow-sm`
                            : 'text-slate-500 bg-white/[0.02] border-white/[0.06] hover:border-white/10 hover:text-slate-300 hover:bg-white/[0.04]'
                        }`}
                        title={info.description}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color} ${
                          isActive ? `${currentAccent.border} ring-2 ${currentAccent.ring} shadow-sm` : 'opacity-60'
                        }`} />
                        <div className="text-left min-w-0">
                          <div className={isActive ? 'text-slate-100' : ''}>{info.name}</div>
                          <div className="text-[9px] text-slate-500 truncate">{info.accent}</div>
                        </div>
                        {isActive && (
                          <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${item.color}`} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Navigation Mode */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <PanelLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-300">Navigation</span>
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'static', label: 'Static', icon: PanelLeft, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
                    { id: 'linear', label: 'Linear', icon: LayoutList, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
                  ].map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleUpdateNavigationMode(n.id)}
                      disabled={isUpdatingNavigation}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all flex items-center gap-1 ${
                        navigationMode === n.id
                          ? n.color
                          : 'text-slate-500 bg-transparent border-white/[0.06] hover:border-white/10'
                      }`}
                    >
                      <n.icon className="w-3 h-3" />
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Maturity */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  {contentMaturity === 'safe' ? (
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  ) : contentMaturity === 'mature' ? (
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className="text-xs text-slate-300">Content Maturity</span>
                  {!userIsAdult && (
                    <span className="relative group">
                      <Lock className="w-3 h-3 text-slate-500 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[9px] text-slate-300 bg-slate-800 border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Content maturity is restricted for users under 18
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'safe', label: 'Safe', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                    { id: 'mature', label: 'Mature', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                    { id: 'unrestricted', label: 'All', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                  ].map((m) => {
                    const isLocked = !userIsAdult && m.id !== 'safe'
                    return (
                      <button
                        key={m.id}
                        onClick={() => !isLocked && handleUpdateContentMaturity(m.id)}
                        disabled={isUpdatingMaturity || isLocked}
                        title={isLocked ? 'Content maturity is restricted for users under 18' : undefined}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all flex items-center gap-0.5 ${
                          isLocked
                            ? 'text-slate-600 bg-transparent border-white/[0.04] cursor-not-allowed opacity-50'
                            : contentMaturity === m.id
                              ? m.color
                              : 'text-slate-500 bg-transparent border-white/[0.06] hover:border-white/10'
                        }`}
                      >
                        {isLocked && <Lock className="w-2.5 h-2.5" />}
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Account Security Key */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-slate-300">Account Security Key</span>
                </div>
                {showSecurityKey && securityKeyValue ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 max-w-[80px] truncate">{securityKeyValue}</span>
                    <button
                      onClick={copySecurityKey}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.06] transition-colors"
                      title="Copy key"
                    >
                      {hasCopiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleRevealSecurityKey}
                    disabled={isGeneratingKey}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all disabled:opacity-50"
                  >
                    {isGeneratingKey ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-3 h-3" />
                        Reveal
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    )
    return createPortal(dropdownContent, document.body)
  }

  // Inside-banner variant: floating glassmorphism bar centered with margin
  if (variant === 'inside-banner') {
    return (
      <>
        <div className="mx-auto max-w-5xl w-[calc(100%-3rem)] flex items-center justify-between px-5 py-2.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/20">
          {/* Left: Logo */}
          <Logo />

          {/* Center: Navigation */}
          <div className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    activeItem === item.id
                      ? 'text-teal-400 bg-teal-500/10'
                      : 'text-slate-300/80 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              )
            })}
            {/* Admin - Only visible to staff */}
            {user && ['mod', 'admin', 'owner'].includes(user.role) && (
              <button
                onClick={() => onNavigate?.('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeItem === 'admin'
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-slate-300/80 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
            )}
          </div>

          {/* Right: Chat bubble + Avatar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFindUsers(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-teal-400 hover:bg-white/[0.06] transition-all"
              title="Find Users"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              ref={avatarBtnRef}
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className={`relative w-8 h-8 rounded-full overflow-hidden transition-all ${
                showProfileDropdown
                  ? 'ring-2 ring-teal-400/60'
                  : 'ring-2 ring-white/10 hover:ring-teal-500/40'
              }`}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatarUrl || activePersona?.avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-xs font-semibold">
                  {(user?.username || activePersona?.name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
        {showProfileDropdown && <ProfileDropdown />}
        <FindUsersModal />
        <ChatHistoryModal />
      </>
    )
  }

  // Default variant: full width top bar (for non-banner contexts)
  return (
    <>
      <div className="h-12 flex items-center justify-between px-4 bg-[#0b0d11]/75 backdrop-blur-xl border-b border-white/[0.06] flex-shrink-0">
        {/* Left: Logo */}
        <Logo />

        {/* Center: Navigation */}
        <div className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeItem === item.id
                    ? 'text-teal-400 bg-teal-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            )
          })}
          {/* Admin - Only visible to staff */}
          {user && ['mod', 'admin', 'owner'].includes(user.role) && (
            <button
              onClick={() => onNavigate?.('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                activeItem === 'admin'
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
        </div>

        {/* Right: Chat + Avatar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFindUsers(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-teal-400 hover:bg-white/[0.06] transition-all"
            title="Find Users"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            ref={avatarBtnRef}
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className={`relative w-8 h-8 rounded-full overflow-hidden transition-all ${
              showProfileDropdown
                ? 'ring-2 ring-teal-400/60'
                : 'ring-2 ring-white/10 hover:ring-teal-500/40'
            }`}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.avatarUrl || activePersona?.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-xs font-semibold">
                {(user?.username || activePersona?.name || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          {showProfileDropdown && <ProfileDropdown />}
        </div>
      </div>
      <FindUsersModal />
      <ChatHistoryModal />
    </>
  )
}
