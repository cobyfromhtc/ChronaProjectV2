'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Users, Search, X, Loader2, MessageCircle, UserCheck, ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePersonas } from '@/hooks/use-personas'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api-client'
import { DM_REFRESH_EVENT } from '@/components/dm-sidebar'

// Custom event name for opening the Find Users modal from anywhere in the app
export const OPEN_FIND_USERS_EVENT = 'chrona:open-find-users'

// Shape of the conversation object expected by the main app (matches `Conversation` in page.tsx)
interface AppConversation {
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
  createdAt: string
}

interface SearchUserResult {
  id: string
  username: string
  avatarUrl: string | null
  activePersona?: {
    id: string
    name: string
    avatarUrl: string | null
    isOnline: boolean
  } | null
}

interface FindUsersModalProps {
  /** Called with the created/selected conversation so the app can open the chat view */
  onStartChat?: (conversation: AppConversation) => void
}

/**
 * Standalone "Find Users" modal.
 *
 * Listens for the global `chrona:open-find-users` window event, so any button
 * in the app (navbar chat bubble, profile dropdown, etc.) can open it with:
 *   window.dispatchEvent(new CustomEvent('chrona:open-find-users'))
 *
 * This decouples the modal from the ProfileDropdown so it is available on
 * every tab / navigation mode / UI variant, regardless of which components
 * happen to be mounted.
 */
export function FindUsersModal({ onStartChat }: FindUsersModalProps) {
  const { activePersona } = usePersonas()
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [startingChatUserId, setStartingChatUserId] = useState<string | null>(null)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Listen for external open-find-users event
  useEffect(() => {
    const handleOpenFindUsers = () => setIsOpen(true)
    window.addEventListener(OPEN_FIND_USERS_EVENT, handleOpenFindUsers)
    return () => window.removeEventListener(OPEN_FIND_USERS_EVENT, handleOpenFindUsers)
  }, [])

  // Focus the search input whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (query.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
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
    }, 250)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setStartingChatUserId(null)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  // Start a conversation with the selected user
  const handleStartChat = async (result: SearchUserResult) => {
    const targetPersonaId = result.activePersona?.id || result.id
    if (!activePersona) {
      toast({
        title: 'No active character',
        description: 'Create and activate a character first to start chatting.',
        variant: 'destructive',
      })
      return
    }

    setStartingChatUserId(result.id)
    try {
      const response = await apiFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPersonaId, myPersonaId: activePersona.id }),
      })
      const data = await response.json()

      if (response.ok && data.conversation) {
        close()
        // Refresh the DM sidebar so the new conversation appears immediately
        window.dispatchEvent(new CustomEvent(DM_REFRESH_EVENT))

        // Transform the raw conversation into the shape the chat view expects
        const raw = data.conversation
        const isPersonaA = raw.personaAId === activePersona.id
        const other = isPersonaA ? raw.personaB : raw.personaA
        if (other) {
          onStartChat?.({
            id: raw.id,
            otherPersona: {
              id: other.id,
              name: other.name,
              avatarUrl: other.avatarUrl ?? null,
              username: other.user?.username || result.username || '',
              isOnline: other.isOnline ?? false,
            },
            myPersona: { id: activePersona.id, name: activePersona.name },
            lastMessage: null,
            lastMessageAt: raw.lastMessageAt || new Date().toISOString(),
            createdAt: raw.createdAt || new Date().toISOString(),
          })
        }
      } else if (response.ok && data.needsDmRequest) {
        close()
        toast({
          title: 'Message request needed',
          description: 'You need to send a message request before chatting with this user.',
        })
      } else if (response.status === 400 && data.code === 'DM_REQUEST_PENDING') {
        close()
        toast({
          title: 'Request already pending',
          description: 'Your message request is waiting to be accepted.',
        })
      } else {
        toast({
          title: 'Could not start chat',
          description: data.error || 'Something went wrong. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
      toast({
        title: 'Could not start chat',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setStartingChatUserId(null)
    }
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Find Users">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#0f1117] border border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden"
        style={{ animation: 'fadeInScale 0.15s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-emerald-500/[0.06] to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Find Users</h3>
              <p className="text-[11px] text-slate-500">Search by username to start a chat</p>
            </div>
          </div>
          <button
            onClick={close}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Close Find Users"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            {searchQuery.length >= 2 && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-600/60 hover:bg-slate-500/80 flex items-center justify-center text-slate-300 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 min-h-[220px] overflow-y-auto chrona-scroll">
          {searchQuery.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-sm text-slate-400">Search for someone to chat with</p>
              <p className="text-xs text-slate-600 mt-1">Type at least 2 characters</p>
            </div>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              <p className="text-xs text-slate-500">Searching users...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-2 space-y-1">
              {searchResults.map((result) => {
                const isStarting = startingChatUserId === result.id
                return (
                  <button
                    key={result.id}
                    onClick={() => handleStartChat(result)}
                    disabled={startingChatUserId !== null}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] disabled:opacity-60 transition-colors text-left group"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-10 h-10 border border-white/10">
                        <AvatarImage src={result.activePersona?.avatarUrl || result.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500/40 to-teal-500/50 text-white text-sm font-medium">
                          {(result.activePersona?.name || result.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {result.activePersona?.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f1117]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{result.username}</p>
                      {result.activePersona && (
                        <p className="text-xs text-slate-500 truncate">as {result.activePersona.name}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-slate-500 group-hover:text-emerald-400 transition-colors">
                      {isStarting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : result.activePersona?.isOnline ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
                <UserCheck className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-sm text-slate-400">No users found</p>
              <p className="text-xs text-slate-600 mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ArrowRight className="w-3 h-3" />
            Click a result to open a conversation
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}