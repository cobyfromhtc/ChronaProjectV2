'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  MessageCircle, Search, X, Users, Loader2, ChevronLeft, ChevronRight, PanelRightClose, PanelRight
} from 'lucide-react'

// Custom event name for DM refresh
export const DM_REFRESH_EVENT = 'chrona:dm-refresh'

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
  
  const [searchQuery, setSearchQuery] = useState('')
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([])
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchResults, setSearchResults] = useState<FriendUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingFriends, setIsLoadingFriends] = useState(true)
  
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
    fetchConversations()
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
  
  // Search users
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`)
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
          setShowSearchModal(false)
          return
        }
        
        // Conversation created or already exists
        if (data.conversation) {
          onSelectChat(data.conversation.id)
          setShowSearchModal(false)
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

  // Collapsed View
  if (isCollapsed) {
    return (
      <div className="w-14 bg-black border-r border-white/5 flex flex-col flex-shrink-0 relative items-center py-3 gap-2">
        {/* Decorative top glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        {/* Toggle Button */}
        <button 
          onClick={onToggleCollapse}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all relative z-10"
          title="Expand sidebar"
        >
          <PanelRight className="w-4 h-4" />
        </button>
        
        {/* Divider */}
        <div className="w-6 h-px bg-white/10 my-1" />
        
        {/* Online Friends Avatars */}
        {isLoadingFriends ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="w-9 h-9 rounded-full bg-white/5" />
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
                  <Avatar className="w-9 h-9 border-2 border-white/20 group-hover:border-white/40 transition-colors">
                    <AvatarImage src={friend.activePersona?.avatarUrl || friend.avatarUrl || undefined} />
                    <AvatarFallback className="bg-white/10 text-white text-xs font-medium">
                      {(friend.activePersona?.name || friend.username)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Divider */}
        {onlineFriends.length > 0 && <div className="w-6 h-px bg-white/10 my-1" />}
        
        {/* Recent Conversations */}
        {isLoadingConversations ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="w-9 h-9 rounded-full bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-2 items-center">
                {dmConversations.slice(0, 10).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectChat(conv.id)}
                    className={`group relative p-0.5 rounded-full ${activeChatId === conv.id ? 'ring-2 ring-inset ring-white/40 bg-white/10' : ''}`}
                    title={conv.otherPersona.name}
                  >
                    <div className={`persona-status ${conv.otherPersona.isOnline ? 'persona-status-online' : 'persona-status-offline'}`}>
                      <Avatar className="w-9 h-9 border border-white/20 group-hover:border-white/40 transition-colors">
                        <AvatarImage src={conv.otherPersona.avatarUrl || undefined} />
                        <AvatarFallback className="bg-white/10 text-white text-xs font-medium">
                          {conv.otherPersona.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {/* New Message Button */}
        <button 
          onClick={() => setShowSearchModal(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all relative z-10 mt-auto"
          title="New message"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Expanded View
  return (
    <div className="w-60 bg-black border-r border-white/5 flex flex-col flex-shrink-0 relative">
      {/* Decorative top glow */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 h-14 px-4 flex items-center justify-between border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-white/60" />
          <span className="font-semibold text-white/90">Messages</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowSearchModal(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all"
            title="New message"
          >
            <Search className="w-4 h-4" />
          </button>
          <button 
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all"
            title="Collapse sidebar"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="relative z-10 p-3 flex-shrink-0">
        <button 
          onClick={() => setShowSearchModal(true)}
          className="persona-search w-full text-left"
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Search...</span>
        </button>
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
                <Skeleton key={i} className="w-9 h-9 rounded-full bg-white/5" />
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
                    <Avatar className="w-9 h-9 border-2 border-white/20 group-hover:border-white/40 transition-colors">
                      <AvatarImage src={friend.activePersona?.avatarUrl || friend.avatarUrl || undefined} />
                      <AvatarFallback className="bg-white/10 text-white text-xs font-medium">
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
        <div className="px-4 py-2 flex-shrink-0">
          <span className="persona-section-header">Recent</span>
        </div>
        <div className="flex-1 min-h-0 px-3">
          <ScrollArea className="h-full">
            {isLoadingConversations ? (
              <div className="space-y-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-9 h-9 rounded-full bg-white/5" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 bg-white/5 mb-1" />
                      <Skeleton className="h-3 w-32 bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dmConversations.length > 0 ? (
              <div className="space-y-0.5 py-1">
                {dmConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectChat(conv.id)}
                    className={`persona-dm-item w-full ${activeChatId === conv.id ? 'persona-dm-item-active' : ''}`}
                  >
                    <div className={`persona-status flex-shrink-0 ${conv.otherPersona.isOnline ? 'persona-status-online' : 'persona-status-offline'}`}>
                      <Avatar className="w-9 h-9 border border-white/20">
                        <AvatarImage src={conv.otherPersona.avatarUrl || undefined} />
                        <AvatarFallback className="bg-white/10 text-white text-xs font-medium">
                          {conv.otherPersona.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden text-left">
                      <p className="text-sm font-medium text-white/90 truncate block">{conv.otherPersona.name}</p>
                      {conv.lastMessage && (
                        <p className="text-xs text-white/40 truncate block max-w-full">{conv.lastMessage.content}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                  <MessageCircle className="w-6 h-6 text-white/60" />
                </div>
                <p className="text-sm font-medium text-white/70">No conversations yet</p>
                <p className="text-xs text-white/40 mt-1">Start chatting with friends!</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
      
      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSearchModal(false)}>
          <div className="persona-modal w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="persona-modal-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-white/60" />
                Find Users
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSearchModal(false)} className="text-white/50 hover:text-white hover:bg-white/5">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="persona-modal-content">
              <input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="persona-input w-full mb-4"
                autoFocus
              />
              
              {isSearching ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white/50 mx-auto" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => result.activePersona && startConversation(result.activePersona.id)}
                      className="w-full p-3 rounded-xl flex items-center gap-3 text-white/80 hover:bg-white/5 transition-all"
                    >
                      <div className={`persona-status ${result.activePersona?.isOnline ? 'persona-status-online' : 'persona-status-offline'}`}>
                        <Avatar className="w-10 h-10 border-2 border-white/20">
                          <AvatarImage src={result.activePersona?.avatarUrl || result.avatarUrl || undefined} />
                          <AvatarFallback className="bg-white/10 text-white text-sm">
                            {(result.activePersona?.name || result.username)?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white/90">{result.username}</p>
                        {result.activePersona && (
                          <p className="text-xs text-white/40">as {result.activePersona.name}</p>
                        )}
                      </div>
                      <MessageCircle className="w-5 h-5 text-white/50" />
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="persona-empty-state py-8">
                  <div className="persona-empty-state-icon">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-white/50">No users found</p>
                </div>
              ) : (
                <div className="persona-empty-state py-8">
                  <div className="persona-empty-state-icon">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-white/50">Type at least 2 characters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
