'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { apiFetch } from '@/lib/api-client'
import { usePersonas } from '@/hooks/use-personas'
import {
  Search, X, Users, Hash, Crown, MessageCircle, Loader2,
  ChevronRight, AtSign, Globe, UserCircle, Server, Sparkles
} from 'lucide-react'

// =============================================================
// Chrona Unified Search Modal
// =============================================================
// Replaces the old "Find Users" modal. Supports prefix-based search:
//   (no prefix) → friends + storyline servers + channels (auto)
//   @keyword    → users in mutual storyline servers
//   @@keyword   → all users globally
//   #keyword    → channels in storylines I've joined
//   plain text  → also matches storyline servers by name
//
// Results are grouped by type and each result is actionable:
//   - users/friends → start a DM conversation
//   - servers       → open the storyline
//   - channels      → open the channel in its storyline
// =============================================================

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

interface SearchServer {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  bannerUrl: string | null
  category: string
  memberCount: number
}

interface SearchChannel {
  id: string
  name: string
  topic: string | null
  storylineId: string
  storylineName: string
  storylineIcon: string | null
}

interface SearchMessageResult {
  messageId: string
  conversationId: string
  content: string
  imageUrl: string | null
  createdAt: string
  sender: {
    id: string
    name: string
    avatarUrl: string | null
    isMine: boolean
  }
  otherPersona: {
    id: string
    name: string
    avatarUrl: string | null
    username: string
  }
}

interface SearchResults {
  friends: SearchUser[]
  users: SearchUser[]
  servers: SearchServer[]
  channels: SearchChannel[]
  messages: SearchMessageResult[]
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
  onNavigate?: (item: string, extra?: any) => void
  onStartChat?: (targetPersonaId: string) => Promise<void>
  onOpenStoryline?: (storylineId: string, channelId?: string) => void
  onOpenConversation?: (conversationId: string) => void
}

// Detect search mode from the query prefix
// Highlight matching text in a string — wraps matches in <mark> tags
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !query.trim()) return text
  const q = query.trim()
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  const lowerQ = q.toLowerCase()
  return parts.map((part, i) =>
    part.toLowerCase() === lowerQ
      ? <mark key={i} className="bg-teal-500/25 text-teal-100 rounded px-0.5">{part}</mark>
      : <span key={i}>{part}</span>
  )
}

function detectMode(query: string): { mode: string; cleanQuery: string; label: string } {
  if (query.startsWith('@@')) {
    return { mode: 'all', cleanQuery: query.slice(2), label: 'All Users' }
  }
  if (query.startsWith('@')) {
    return { mode: 'mutual', cleanQuery: query.slice(1), label: 'Mutual Server Users' }
  }
  if (query.startsWith('#')) {
    return { mode: 'channels', cleanQuery: query.slice(1), label: 'Channels' }
  }
  if (query.startsWith('m:')) {
    return { mode: 'messages', cleanQuery: query.slice(2), label: 'Messages' }
  }
  return { mode: 'auto', cleanQuery: query, label: 'All' }
}

export function SearchModal({ open, onClose, onNavigate, onStartChat, onOpenStoryline, onOpenConversation }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ friends: [], users: [], servers: [], channels: [], messages: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const { activePersona } = usePersonas()

  // Sync transient state with `open` — render-phase adjustment
  // (documented React pattern; avoids synchronous setState inside an effect)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      try {
        const stored = localStorage.getItem('chrona-recent-searches')
        if (stored) setRecentSearches(JSON.parse(stored).slice(0, 6))
      } catch {}
    } else {
      setQuery('')
      setResults({ friends: [], users: [], servers: [], channels: [], messages: [] })
      setActiveIndex(0)
    }
  }

  // Focus the input shortly after the modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Debounced search
  const performSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setResults({ friends: [], users: [], servers: [], channels: [], messages: [] })
      setIsSearching(false)
      return
    }
    const { mode, cleanQuery } = detectMode(q)
    if (cleanQuery.trim().length < 1) {
      setResults({ friends: [], users: [], servers: [], channels: [], messages: [] })
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    try {
      // Message search uses a separate endpoint
      if (mode === 'messages') {
        const response = await apiFetch(`/api/search/messages?q=${encodeURIComponent(cleanQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setResults({ friends: [], users: [], servers: [], channels: [], messages: data.results || [] })
        }
      } else {
        const response = await apiFetch(`/api/search?q=${encodeURIComponent(cleanQuery)}&mode=${mode}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.results || { friends: [], users: [], servers: [], channels: [], messages: [] })
        }
      }
    } catch (e) {
      console.error('search error', e)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setActiveIndex(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(value), 250)
  }

  // Save a search to recent
  const saveRecent = (q: string) => {
    if (!q.trim()) return
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 6)
    setRecentSearches(updated)
    try { localStorage.setItem('chrona-recent-searches', JSON.stringify(updated)) } catch {}
  }

  // ---- Action handlers ----
  const handleUserClick = async (user: SearchUser) => {
    const personaId = user.activePersona?.id
    if (!personaId) return
    saveRecent(query)
    if (onStartChat) {
      await onStartChat(personaId)
    }
    onClose()
  }

  const handleServerClick = (server: SearchServer) => {
    saveRecent(query)
    if (onOpenStoryline) onOpenStoryline(server.id)
    onClose()
  }

  const handleChannelClick = (channel: SearchChannel) => {
    saveRecent(query)
    if (onOpenStoryline) onOpenStoryline(channel.storylineId, channel.id)
    onClose()
  }

  const handleMessageClick = (msg: SearchMessageResult) => {
    saveRecent(query)
    if (onOpenConversation) onOpenConversation(msg.conversationId)
    onClose()
  }

  // Flatten results for keyboard navigation
  // (guard every group — the search API may omit empty groups)
  const flatResults: { type: string; data: any }[] = [
    ...(results.friends || []).map((u) => ({ type: 'friend', data: u })),
    ...(results.users || []).map((u) => ({ type: 'user', data: u })),
    ...(results.servers || []).map((s) => ({ type: 'server', data: s })),
    ...(results.channels || []).map((c) => ({ type: 'channel', data: c })),
    ...(results.messages || []).map((m) => ({ type: 'message', data: m })),
  ]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatResults[activeIndex]
      if (item) {
        if (item.type === 'friend' || item.type === 'user') handleUserClick(item.data)
        else if (item.type === 'server') handleServerClick(item.data)
        else if (item.type === 'channel') handleChannelClick(item.data)
        else if (item.type === 'message') handleMessageClick(item.data)
      }
    }
  }

  const { label } = detectMode(query)
  const hasResults = flatResults.length > 0
  const showEmptyState = query.trim().length >= 1 && !isSearching && !hasResults

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl rounded-2xl bg-[#0f1117] border border-white/[0.1] shadow-2xl shadow-black/50 overflow-hidden"
        style={{ animation: 'fadeInScale 0.18s ease-out' }}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-gradient-to-r from-teal-500/[0.04] to-transparent">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Search className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search…  try  @username   @@everyone   #channel   or a server name"
              className="w-full h-10 pl-3 pr-20 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 transition-colors"
            />
            {/* Mode badge */}
            {query.trim().length > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20">
                {label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prefix help */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.02] border-b border-white/[0.04] overflow-x-auto scrollbar-thin">
          <Sparkles className="w-3 h-3 text-teal-400 flex-shrink-0" />
          {[
            { p: 'text', label: 'Friends & Servers', color: 'text-slate-400' },
            { p: '@', label: 'Mutual Users', color: 'text-cyan-400' },
            { p: '@@', label: 'All Users', color: 'text-violet-400' },
            { p: '#', label: 'Channels', color: 'text-amber-400' },
            { p: 'm:', label: 'Messages', color: 'text-rose-400' },
          ].map((chip) => (
            <button
              key={chip.p}
              onClick={() => { setQuery(chip.p + ' '); inputRef.current?.focus() }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors whitespace-nowrap"
            >
              <span className={chip.color}>{chip.p === 'text' ? 'abc' : chip.p}</span>
              <span className="text-slate-400">{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Results / States */}
        <div className="max-h-[55vh] overflow-y-auto custom-scrollbar">
          {query.trim().length < 1 ? (
            // Idle state — recent searches + tips
            <div className="p-4">
              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1">Recent</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleQueryChange(s)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-teal-400" /> Search Tips
                </p>
                <ul className="space-y-1.5 text-xs text-slate-400">
                  <li className="flex items-center gap-2"><span className="text-slate-500 w-12">abc</span> finds friends & storyline servers matching the keyword</li>
                  <li className="flex items-center gap-2"><span className="text-cyan-400 font-mono w-12">@name</span> finds users you share storyline servers with</li>
                  <li className="flex items-center gap-2"><span className="text-violet-400 font-mono w-12">@@name</span> searches every user on Chrona</li>
                  <li className="flex items-center gap-2"><span className="text-amber-400 font-mono w-12">#name</span> finds channels in storylines you've joined</li>
                  <li className="flex items-center gap-2"><span className="text-rose-400 font-mono w-12">m:text</span> searches message content across all your DMs</li>
                </ul>
              </div>
            </div>
          ) : isSearching ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
              <span className="ml-2 text-sm text-slate-400">Searching…</span>
            </div>
          ) : showEmptyState ? (
            <div className="flex flex-col items-center justify-center py-14 px-4">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
                <Search className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-300">No results found</p>
              <p className="text-xs text-slate-500 mt-1">Try a different keyword or prefix</p>
            </div>
          ) : (
            <div className="p-2">
              {/* Friends group */}
              {results.friends.length > 0 && (
                <ResultGroup
                  title="Friends"
                  icon={<UserCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  count={results.friends.length}
                >
                  {results.friends.map((u, i) => (
                    <ResultRow
                      key={`friend-${u.id}`}
                      active={activeIndex === flatResults.findIndex((r) => r.data === u)}
                      onMouseEnter={() => setActiveIndex(flatResults.findIndex((r) => r.data === u))}
                      onClick={() => handleUserClick(u)}
                      avatar={u.avatarUrl || u.activePersona?.avatarUrl}
                      fallback={(u.activePersona?.name || u.username || 'U').charAt(0).toUpperCase()}
                      title={u.username}
                      subtitle={u.activePersona ? `as ${u.activePersona.name}` : undefined}
                      online={u.activePersona?.isOnline}
                      actionIcon={<MessageCircle className="w-4 h-4 text-slate-500" />}
                      badge="Friend"
                      badgeClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    />
                  ))}
                </ResultGroup>
              )}

              {/* Mutual users group */}
              {results.users.length > 0 && (
                <ResultGroup
                  title={query.startsWith('@@') ? 'All Users' : 'Mutual Server Users'}
                  icon={query.startsWith('@@') ? <Globe className="w-3.5 h-3.5 text-violet-400" /> : <AtSign className="w-3.5 h-3.5 text-cyan-400" />}
                  count={results.users.length}
                >
                  {results.users.map((u) => (
                    <ResultRow
                      key={`user-${u.id}`}
                      active={activeIndex === flatResults.findIndex((r) => r.data === u)}
                      onMouseEnter={() => setActiveIndex(flatResults.findIndex((r) => r.data === u))}
                      onClick={() => handleUserClick(u)}
                      avatar={u.avatarUrl || u.activePersona?.avatarUrl}
                      fallback={(u.activePersona?.name || u.username || 'U').charAt(0).toUpperCase()}
                      title={u.username}
                      subtitle={u.activePersona ? `as ${u.activePersona.name}` : undefined}
                      online={u.activePersona?.isOnline}
                      actionIcon={<MessageCircle className="w-4 h-4 text-slate-500" />}
                    />
                  ))}
                </ResultGroup>
              )}

              {/* Storyline servers group */}
              {results.servers.length > 0 && (
                <ResultGroup
                  title="Storyline Servers"
                  icon={<Server className="w-3.5 h-3.5 text-teal-400" />}
                  count={results.servers.length}
                >
                  {results.servers.map((s) => (
                    <ResultRow
                      key={`server-${s.id}`}
                      active={activeIndex === flatResults.findIndex((r) => r.data === s)}
                      onMouseEnter={() => setActiveIndex(flatResults.findIndex((r) => r.data === s))}
                      onClick={() => handleServerClick(s)}
                      avatar={s.iconUrl}
                      fallback={(s.name || 'S').charAt(0).toUpperCase()}
                      title={s.name}
                      subtitle={s.description ? s.description.slice(0, 60) : undefined}
                      meta={
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Users className="w-3 h-3" />
                          {s.memberCount}
                        </span>
                      }
                      actionIcon={<ChevronRight className="w-4 h-4 text-slate-500" />}
                      badge={s.category}
                      badgeClass="text-teal-400 bg-teal-500/10 border-teal-500/20"
                    />
                  ))}
                </ResultGroup>
              )}

              {/* Channels group */}
              {results.channels.length > 0 && (
                <ResultGroup
                  title="Channels"
                  icon={<Hash className="w-3.5 h-3.5 text-amber-400" />}
                  count={results.channels.length}
                >
                  {results.channels.map((c) => (
                    <ResultRow
                      key={`channel-${c.id}`}
                      active={activeIndex === flatResults.findIndex((r) => r.data === c)}
                      onMouseEnter={() => setActiveIndex(flatResults.findIndex((r) => r.data === c))}
                      onClick={() => handleChannelClick(c)}
                      avatar={c.storylineIcon}
                      fallback={(c.storylineName || 'S').charAt(0).toUpperCase()}
                      title={c.name}
                      subtitle={`in ${c.storylineName}`}
                      actionIcon={<ChevronRight className="w-4 h-4 text-slate-500" />}
                      badge="#"
                      badgeClass="text-amber-400 bg-amber-500/10 border-amber-500/20"
                    />
                  ))}
                </ResultGroup>
              )}

              {/* Messages group */}
              {results.messages.length > 0 && (
                <ResultGroup
                  title="Messages"
                  icon={<MessageCircle className="w-3.5 h-3.5 text-violet-400" />}
                  count={results.messages.length}
                >
                  {results.messages.map((m) => (
                    <button
                      key={`msg-${m.messageId}`}
                      onClick={() => handleMessageClick(m)}
                      onMouseEnter={() => setActiveIndex(flatResults.findIndex((r) => r.data === m))}
                      className={`w-full flex items-start gap-3 px-2.5 py-2 rounded-lg transition-colors text-left ${
                        activeIndex === flatResults.findIndex((r) => r.data === m) ? 'bg-teal-500/[0.08] ring-1 ring-teal-500/20' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-9 h-9 border border-white/10">
                          <AvatarImage src={m.sender.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-violet-500/40 to-purple-500/50 text-white text-xs font-medium">
                            {m.sender.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-slate-100 truncate">{m.sender.name}</p>
                          <span className="text-[10px] text-slate-500">in</span>
                          <span className="text-[11px] text-teal-300 truncate">{m.otherPersona.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {m.imageUrl && !m.content ? '📷 Image' : highlightMatch(m.content, detectMode(query).cleanQuery)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-2" />
                    </button>
                  ))}
                </ResultGroup>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono">↵</kbd> open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono">esc</kbd> close
            </span>
          </div>
          <span className="text-[10px] text-slate-600">{flatResults.length} result{flatResults.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ---------- Sub-components ----------

function ResultGroup({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <span className="text-[10px] text-slate-600">{count}</span>
      </div>
      {children}
    </div>
  )
}

function ResultRow({
  active, onMouseEnter, onClick, avatar, fallback, title, subtitle, online, meta, actionIcon, badge, badgeClass,
}: {
  active: boolean
  onMouseEnter: () => void
  onClick: () => void
  avatar?: string | null
  fallback: string
  title: string
  subtitle?: string
  online?: boolean
  meta?: React.ReactNode
  actionIcon?: React.ReactNode
  badge?: string
  badgeClass?: string
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-left ${
        active ? 'bg-teal-500/[0.08] ring-1 ring-teal-500/20' : 'hover:bg-white/[0.04]'
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="w-9 h-9 border border-white/10">
          <AvatarImage src={avatar || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-teal-500/40 to-cyan-500/50 text-white text-xs font-medium">
            {fallback}
          </AvatarFallback>
        </Avatar>
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0f1117]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-100 truncate">{title}</p>
          {badge && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${badgeClass || 'text-slate-400 bg-white/[0.04] border-white/[0.08]'}`}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
      </div>
      {meta}
      {actionIcon}
    </button>
  )
}
