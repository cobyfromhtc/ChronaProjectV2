'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { useChannelChat } from '@/hooks/use-chat'
import type { ChannelMessage as SocketChannelMessage } from '@/hooks/use-chat'
import { extractMentions, parseMessageContent } from '@/lib/mentions'
import { parseMessageWithMarkdown, wrapSelection } from '@/lib/markdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Hash, Users, Settings, Plus, ChevronLeft, Send, Loader2, 
  Image as ImageIcon, X, Crown, Sparkles, MessageCircle, Zap, Rocket,
  ChevronDown, ChevronRight, Volume2, Lock, Bell, BellOff, Pin,
  MoreHorizontal, Reply, Smile, Clock, Mic, Headphones, User,
  Edit2, Trash2, Check, AlertCircle, Star, Gift, TrendingUp
} from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StorylineSettings } from '@/components/storyline-settings'
import { BOOST_AMOUNTS, getTierInfo, type BoostAmount } from '@/lib/boost-tiers'
import { CharacterProfileModal } from '@/components/character-profile-modal'
import { cn } from '@/lib/utils'

// ==================== TYPES ====================
interface Channel {
  id: string
  name: string
  type: string
  position: number
  topic?: string | null
  slowMode?: number | null
  locked?: boolean
}

interface Category {
  id: string
  name: string
  position: number
  collapsed?: boolean
  channels: Channel[]
}

interface StorylineMember {
  id: string
  role: string
  user: {
    id: string
    username: string
    avatarUrl: string | null
  }
  customRole?: {
    id: string
    name: string
    color: string
  } | null
}

interface StorylineData {
  id: string
  name: string
  description: string | null
  lore?: string | null
  iconUrl: string | null
  bannerUrl: string | null
  category: string
  isPublic: boolean
  accentColor?: string
  boostChronos: number
  boostTier: number
  owner: {
    id: string
    username: string
    avatarUrl: string | null
  }
  channels: Channel[]
  categories: Category[]
  members: StorylineMember[]
  memberCount: number
  role: string | null
  tags?: string[]
  welcomeMessage?: string | null
}

interface ChannelMessage {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  sender: {
    id: string
    name: string
    avatarUrl: string | null
    username: string
  }
  reactions?: { emoji: string; count: number; users: string[] }[]
  replyTo?: {
    id: string
    content: string
    senderName: string
  } | null
}

interface StorylineInteriorProps {
  storylineId: string
  onBack: () => void
}

// ==================== EMOJI PICKER COMPONENT ====================
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👀', '💯', '✨', '🤔', '👏', '💀', '🙏', '😤']
  
  return (
    <div className="absolute bottom-full mb-2 left-0 bg-[#111111] border border-white/20 rounded-xl p-2 shadow-xl z-50">
      <div className="grid grid-cols-8 gap-1">
        {emojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose() }}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-lg"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

// ==================== REACTION BADGE COMPONENT ====================
function ReactionBadge({ 
  emoji, 
  count, 
  hasReacted, 
  onClick 
}: { 
  emoji: string
  count: number
  hasReacted: boolean
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all",
        hasReacted 
          ? "bg-white/15 text-gray-200 border border-white/30" 
          : "bg-white/5 text-gray-300/70 border border-white/15 hover:bg-white/10"
      )}
    >
      <span>{emoji}</span>
      <span>{count}</span>
    </button>
  )
}

// ==================== MAIN COMPONENT ====================
export function StorylineInterior({ storylineId, onBack }: StorylineInteriorProps) {
  const { user } = useAuth()
  const { activePersona } = usePersonas()
  
  // Core state
  const [storyline, setStoryline] = useState<StorylineData | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  // UI state
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [showMembers, setShowMembers] = useState(true)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showBoostModal, setShowBoostModal] = useState(false)
  const [selectedBoostAmount, setSelectedBoostAmount] = useState<BoostAmount>(200)
  const [isBoosting, setIsBoosting] = useState(false)
  const [boostError, setBoostError] = useState<string | null>(null)
  const [userChronos, setUserChronos] = useState<number>(0)
  const [newChannelName, setNewChannelName] = useState('')
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<ChannelMessage | null>(null)
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [mutedChannels, setMutedChannels] = useState<Set<string>>(new Set())
  
  // Socket chat hook for real-time messaging
  const handleNewSocketMessage = useCallback((socketMessage: SocketChannelMessage) => {
    console.log('[StorylineInterior] Received socket message:', socketMessage)
    // Convert socket message format to local ChannelMessage format
    const newMsg: ChannelMessage = {
      id: socketMessage.id,
      content: socketMessage.content,
      imageUrl: socketMessage.imageUrl,
      createdAt: socketMessage.createdAt,
      sender: {
        id: socketMessage.sender.id,
        name: socketMessage.sender.name,
        avatarUrl: socketMessage.sender.avatarUrl,
        username: socketMessage.sender.name // Use name as username fallback
      },
      reactions: [],
      replyTo: null
    }
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === newMsg.id)) return prev
      return [...prev, newMsg]
    })
  }, [])
  
  const handleSocketTyping = useCallback((data: { channelId: string; isTyping: boolean; personaName: string }) => {
    if (data.channelId === selectedChannel?.id) {
      setTypingUsers(prev => {
        if (data.isTyping) {
          if (!prev.includes(data.personaName)) {
            return [...prev, data.personaName]
          }
          return prev
        } else {
          return prev.filter(name => name !== data.personaName)
        }
      })
    }
  }, [selectedChannel?.id])
  
  const { isConnected: isSocketConnected } = useChannelChat({
    channelId: selectedChannel?.id || null,
    onNewMessage: handleNewSocketMessage,
    onTyping: handleSocketTyping
  })
  
  // Member profile modal state
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<{
    id: string
    name: string
    title: string[]
    avatarUrl: string | null
    bannerUrl: string | null
    bio: string | null
    username: string
    userId: string
    isOnline: boolean
    archetype: string | null
    gender: string | null
    age: number | null
    tags: string[]
    personalityDescription: string | null
    personalitySpectrums: {
      introvertExtrovert: number
      intuitiveObservant: number
      thinkingFeeling: number
      judgingProspecting: number
      assertiveTurbulent: number
    } | null
    bigFive: {
      openness: number
      conscientiousness: number
      extraversion: number
      agreeableness: number
      neuroticism: number
    } | null
    hexaco: {
      honestyHumility: number
      emotionality: number
      extraversion: number
      agreeableness: number
      conscientiousness: number
      opennessToExperience: number
    } | null
    strengths: string[]
    flaws: string[]
    values: string[]
    fears: string[]
    species: string | null
    likes: string[]
    dislikes: string[]
    hobbies: string[]
    skills: string[]
    languages: string[]
    habits: string[]
    speechPatterns: string[]
    backstory: string | null
    appearance: string | null
    mbtiType: string | null
    connections: {
      id: string
      characterName: string
      relationshipType: string
      specificRole: string | null
      characterAge: number | null
      description: string | null
    }[]
  } | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  
  // Handle member click
  const handleMemberClick = async (userId: string) => {
    setIsLoadingProfile(true)
    try {
      const response = await fetch(`/api/users/${userId}/active-persona`)
      if (response.ok) {
        const data = await response.json()
        if (data.persona) {
          setSelectedMemberProfile(data.persona)
        }
      }
    } catch (error) {
      console.error('Failed to fetch member profile:', error)
    } finally {
      setIsLoadingProfile(false)
    }
  }
  
  // Toggle category collapse
  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }
  
  // Fetch storyline data
  useEffect(() => {
    async function fetchStoryline() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/storylines/${storylineId}`)
        if (response.ok) {
          const data = await response.json()
          setStoryline(data.storyline)
          const firstChannel = data.storyline.categories?.length > 0 && data.storyline.categories[0]?.channels?.length > 0
            ? data.storyline.categories[0].channels[0]
            : data.storyline.channels?.[0] || null
          if (firstChannel) {
            setSelectedChannel(firstChannel)
          }
        }
      } catch (error) {
        console.error('Failed to fetch storyline:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStoryline()
  }, [storylineId])
  
  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      if (!selectedChannel) return
      
      setIsLoadingMessages(true)
      try {
        const response = await fetch(`/api/storyline-channels/${selectedChannel.id}/messages`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages)
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setIsLoadingMessages(false)
      }
    }
    fetchMessages()
  }, [selectedChannel])
  
  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Handle image upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB'); return }
    
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (response.ok) {
        const data = await response.json()
        setImagePreview(data.url)
      } else { alert('Failed to upload image') }
    } catch (error) {
      console.error('Image upload error:', error)
      alert('Failed to upload image')
    } finally {
      setIsUploadingImage(false)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  
  // Send message
  const sendMessage = async () => {
    if ((!newMessage.trim() && !imagePreview) || !activePersona || !selectedChannel || isSending) return

    const storylineUsernames = storyline?.members.map((member) => member.user.username) ?? []
    const mentions = extractMentions(newMessage.trim()).filter((username) => storylineUsernames.includes(username))

    setIsSending(true)
    try {
      const response = await fetch(`/api/storyline-channels/${selectedChannel.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage.trim(),
          imageUrl: imagePreview,
          senderPersonaId: activePersona.id,
          mentions,
          replyToId: replyingTo?.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        setImagePreview(null)
        setReplyingTo(null)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }
  
  // Create channel
  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !storyline || isCreatingChannel) return
    
    setIsCreatingChannel(true)
    try {
      const response = await fetch(`/api/storylines/${storylineId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName.trim() })
      })
      
      if (response.ok) {
        const data = await response.json()
        setStoryline(prev => prev ? {
          ...prev,
          channels: [...prev.channels, data.channel]
        } : null)
        setNewChannelName('')
        setShowCreateChannel(false)
      }
    } catch (error) {
      console.error('Failed to create channel:', error)
    } finally {
      setIsCreatingChannel(false)
    }
  }
  
  // Add reaction to message
  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/storyline-channels/${selectedChannel?.id}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, reactions: data.reactions } : m
        ))
      }
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }
  
  // Fetch user's Chronos balance
  const openBoostModal = async () => {
    setBoostError(null)
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUserChronos(data.user?.chronos || 0)
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
    setShowBoostModal(true)
  }
  
  // Handle boosting
  const handleBoost = async () => {
    if (!storyline || !activePersona || isBoosting) return
    
    setIsBoosting(true)
    setBoostError(null)
    
    try {
      const response = await fetch(`/api/storylines/${storylineId}/boost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedBoostAmount })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to boost storyline')
      }
      
      setStoryline(prev => prev ? {
        ...prev,
        boostChronos: data.storyline.boostChronos,
        boostTier: data.storyline.boostTier
      } : null)
      
      setUserChronos(data.user.chronos)
      setShowBoostModal(false)
      
    } catch (error) {
      console.error('Boost error:', error)
      setBoostError(error instanceof Error ? error.message : 'Failed to boost storyline')
    } finally {
      setIsBoosting(false)
    }
  }
  
  // Format message time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`
    }
    return format(date, 'MMM d, yyyy h:mm a')
  }
  
  // Get accent color
  const accentColor = storyline?.accentColor || '#ffffff'
  
  // Check permissions
  const canManageChannels = storyline?.role === 'owner' || storyline?.role === 'admin'
  
  // Get category emoji
  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      'Romance': '💕', 'Action': '⚔️', 'Horror': '👻', 'Fantasy': '🧙',
      'Sci-Fi': '🚀', 'Slice of Life': '🌸', 'Mystery': '🔍', 'Comedy': '😂',
      'Drama': '🎭', 'Adventure': '🗺️', 'Thriller': '😱', 'Historical': '📜',
      'Supernatural': '✨', 'Other': '📖'
    }
    return emojis[category] || '📖'
  }
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }
  
  if (!storyline) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-gray-300">Storyline not found</p>
          <Button onClick={onBack} variant="ghost" className="mt-4">Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden relative bg-black">
      {/* ========== CHANNEL SIDEBAR ========== */}
      <div className="w-60 bg-[#0a0a0a] border-r border-white/10 flex flex-col flex-shrink-0">
        {/* Server Header */}
        <div 
          className="h-14 px-4 flex items-center gap-3 border-b border-white/10 bg-[#0c0c0c]/50 flex-shrink-0 cursor-pointer hover:bg-[#111111]/50 transition-colors"
          onClick={() => setShowSettings(true)}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white to-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
            {storyline.iconUrl ? (
              <img src={storyline.iconUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-sm">{storyline.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-white truncate text-sm">{storyline.name}</h2>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400/60">{storyline.memberCount} members</span>
              {storyline.boostTier > 0 && (
                <>
                  <span className="text-gray-500/30">•</span>
                  <span className="text-xs text-amber-400/80 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    T{storyline.boostTier}
                  </span>
                </>
              )}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400/60" />
        </div>
        
        {/* Channels List */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TooltipProvider>
            <ScrollArea className="flex-1 px-2 py-2 min-h-0">
              <div className="space-y-0.5 pr-1">
                {/* Display channels grouped by categories */}
                {storyline.categories && storyline.categories.length > 0 ? (
                  storyline.categories.map((category) => {
                    const isCollapsed = collapsedCategories.has(category.id)
                    return (
                      <div key={category.id} className="space-y-0.5">
                        {/* Category Header */}
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="w-full flex items-center gap-1.5 px-1 py-1.5 rounded-md text-xs font-semibold text-gray-400/80 uppercase tracking-wider hover:text-gray-300 hover:bg-white/5 transition-all"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          <span className="flex-1 text-left">{category.name}</span>
                          {canManageChannels && (
                            <Plus 
                              className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-gray-200"
                              onClick={(e) => { e.stopPropagation(); setShowCreateChannel(true) }}
                            />
                          )}
                        </button>
                        
                        {/* Category Channels */}
                        {!isCollapsed && category.channels && category.channels.length > 0 && category.channels.map((channel) => {
                          const isMuted = mutedChannels.has(channel.id)
                          const isSelected = selectedChannel?.id === channel.id
                          
                          return (
                            <Tooltip key={channel.id}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setSelectedChannel(channel)}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all group relative",
                                    isSelected
                                      ? "bg-white/10 text-white"
                                      : "text-gray-300/70 hover:text-white hover:bg-white/5"
                                  )}
                                >
                                  {channel.type === 'voice' ? (
                                    <Volume2 className="w-4 h-4 text-gray-400/60 flex-shrink-0" />
                                  ) : channel.locked ? (
                                    <Lock className="w-4 h-4 text-gray-400/60 flex-shrink-0" />
                                  ) : (
                                    <Hash className="w-4 h-4 text-gray-400/60 flex-shrink-0" />
                                  )}
                                  <span className="truncate text-left flex-1">{channel.name}</span>
                                  
                                  {/* Channel actions on hover */}
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isMuted ? (
                                      <BellOff className="w-3.5 h-3.5 text-gray-400/60" />
                                    ) : (
                                      <Bell className="w-3.5 h-3.5 text-gray-400/60" />
                                    )}
                                  </div>
                                </button>
                              </TooltipTrigger>
                              {channel.topic && (
                                <TooltipContent side="right" sideOffset={8} className="bg-[#111111] border border-white/20 text-white z-50 max-w-xs">
                                  <p className="text-xs">{channel.topic}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )
                        })}
                      </div>
                    )
                  })
                ) : (
                  /* Fallback: Flat channels list */
                  <>
                    <div className="flex items-center gap-1.5 px-1 py-1.5">
                      <ChevronDown className="w-3 h-3 text-gray-400/60" />
                      <span className="text-xs font-semibold text-gray-400/60 uppercase tracking-wider">Channels</span>
                      {canManageChannels && (
                        <Plus 
                          className="w-3.5 h-3.5 text-gray-400/60 hover:text-gray-300 ml-auto cursor-pointer"
                          onClick={() => setShowCreateChannel(true)}
                        />
                      )}
                    </div>
                    {storyline.channels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all",
                          selectedChannel?.id === channel.id
                            ? "bg-white/10 text-white"
                            : "text-gray-300/70 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <Hash className="w-4 h-4 text-gray-400/60 flex-shrink-0" />
                        <span className="truncate text-left">{channel.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </TooltipProvider>
        </div>
        
        {/* User Panel */}
        <div className="p-2 border-t border-white/10 bg-[#0a0a0a] flex-shrink-0">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/5 transition-colors cursor-pointer">
            <div className="relative">
              <Avatar className="w-8 h-8 border border-white/20">
                <AvatarImage src={activePersona?.avatarUrl || user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-white/50 to-gray-400/50 text-white text-xs">
                  {(activePersona?.name || user?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {activePersona?.name || user?.username}
              </p>
              <p className="text-xs text-gray-400/60 truncate">
                {activePersona ? 'Active' : 'No character'}
              </p>
            </div>
            <Settings 
              className="w-4 h-4 text-gray-400/60 hover:text-gray-200 cursor-pointer"
              onClick={() => setShowSettings(true)}
            />
          </div>
        </div>
      </div>
      
      {/* ========== MAIN CHAT AREA ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="h-12 px-4 flex items-center gap-3 border-b border-white/10 bg-[#0c0c0c]/50 backdrop-blur-sm flex-shrink-0">
          <Hash className="w-5 h-5 text-gray-400/60" />
          <h3 className="font-medium text-white">{selectedChannel?.name || 'Select a channel'}</h3>
          {selectedChannel?.topic && (
            <>
              <div className="w-px h-6 bg-white/10" />
              <p className="text-sm text-gray-400/60 truncate flex-1">{selectedChannel.topic}</p>
            </>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                showMembers ? "text-gray-200 bg-white/10" : "text-gray-400/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={openBoostModal}
              className="p-1.5 rounded-lg text-gray-400/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Rocket className="w-4 h-4" />
            </button>
            <span className="text-lg">{getCategoryEmoji(storyline.category)}</span>
          </div>
        </div>
        
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {!selectedChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400/60">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Hash className="w-10 h-10" />
              </div>
              <p className="text-xl font-medium text-gray-200 mb-1">Welcome to {storyline.name}!</p>
              <p className="text-sm">Select a channel to start chatting</p>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400/60">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium text-gray-200 mb-1">No messages yet</p>
              <p className="text-sm">Be the first to start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-0.5 max-w-4xl mx-auto py-2">
              {messages.map((message, index) => {
                const showAvatar = index === 0 || messages[index - 1]?.sender.id !== message.sender.id
                const prevMessage = messages[index - 1]
                const isSameUserConsecutive = prevMessage && prevMessage.sender.id === message.sender.id
                
                return (
                  <div 
                    key={message.id} 
                    className={cn(
                      "group flex gap-3 hover:bg-white/5 -mx-2 px-2 py-0.5 rounded-lg transition-colors relative",
                      showAvatar && "mt-4 pt-1"
                    )}
                  >
                    {/* Avatar */}
                    {showAvatar ? (
                      <button
                        onClick={async () => {
                          const senderMember = storyline?.members.find(m => m.user.id === message.sender.username)
                          if (senderMember) {
                            await handleMemberClick(senderMember.user.id)
                          }
                        }}
                        className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="w-10 h-10 border-2 border-white/30 hover:border-white/50 transition-colors">
                          <AvatarImage src={message.sender.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-white/50 to-gray-400/50 text-white text-sm font-medium">
                            {message.sender.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    ) : (
                      <div className="w-10 flex-shrink-0" />
                    )}
                    
                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <button
                            onClick={async () => {
                              const senderMember = storyline?.members.find(m => m.user.id === message.sender.username)
                              if (senderMember) {
                                await handleMemberClick(senderMember.user.id)
                              }
                            }}
                            className="font-semibold text-white hover:text-gray-200 hover:underline cursor-pointer transition-colors"
                          >
                            {message.sender.name}
                          </button>
                          <span className="text-xs text-gray-500 font-normal">
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                      )}
                      
                      {/* Reply indicator */}
                      {message.replyTo && (
                        <div className="flex items-center gap-2 mb-1 pl-2 border-l-2 border-white/20">
                          <span className="text-xs text-gray-400/60">@{message.replyTo.senderName}</span>
                          <span className="text-xs text-gray-400/40 truncate">{message.replyTo.content.slice(0, 50)}...</span>
                        </div>
                      )}
                      
                      {/* Main content */}
                      <div className="text-sm">
                        {message.imageUrl && (
                          <div className="mb-2">
                            <img 
                              src={message.imageUrl} 
                              alt="Shared image" 
                              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-white/15 max-h-80" 
                              onClick={() => setViewingImage(message.imageUrl!)} 
                            />
                          </div>
                        )}
                        {message.content && (
                          <div className="text-gray-100 whitespace-pre-wrap leading-relaxed">
                            {parseMessageWithMarkdown(message.content, storyline?.members.map((member) => member.user.username) ?? [])}
                          </div>
                        )}
                      </div>
                      
                      {/* Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {message.reactions.map((reaction, i) => (
                            <ReactionBadge
                              key={i}
                              emoji={reaction.emoji}
                              count={reaction.count}
                              hasReacted={reaction.users.includes(activePersona?.id || '')}
                              onClick={() => handleAddReaction(message.id, reaction.emoji)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Message Actions (on hover) */}
                    <div className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-[#111111] border border-white/20 rounded-lg p-0.5 shadow-lg z-10">
                      <button
                        onClick={() => setReplyingTo(message)}
                        className="p-1.5 rounded-md text-gray-400/60 hover:text-white hover:bg-white/5 transition-colors"
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setActiveEmojiPicker(activeEmojiPicker === message.id ? null : message.id)}
                          className="p-1.5 rounded-md text-gray-400/60 hover:text-white hover:bg-white/5 transition-colors"
                          title="Add Reaction"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                        {activeEmojiPicker === message.id && (
                          <EmojiPicker
                            onSelect={(emoji) => handleAddReaction(message.id, emoji)}
                            onClose={() => setActiveEmojiPicker(null)}
                          />
                        )}
                      </div>
                      <button
                        className="p-1.5 rounded-md text-gray-400/60 hover:text-white hover:bg-white/5 transition-colors"
                        title="More"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1 text-xs text-gray-400/60 flex items-center gap-1.5">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}
        
        {/* Message Input */}
        <div className="p-4 border-t border-white/10 bg-[#0c0c0c]/50 backdrop-blur-sm">
          {!activePersona ? (
            <div className="text-center py-2 bg-white/5 rounded-xl border border-white/15">
              <p className="text-gray-400/60 text-sm">Create and activate a character to send messages</p>
            </div>
          ) : !selectedChannel ? (
            <div className="text-center py-2 text-gray-400/40 text-sm">
              Select a channel to start messaging
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* Reply indicator */}
              {replyingTo && (
                <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/15">
                  <Reply className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400/60">Replying to</span>
                  <span className="text-xs text-gray-200 font-medium">{replyingTo.sender.name}</span>
                  <span className="text-xs text-gray-400/40 truncate flex-1">{replyingTo.content.slice(0, 50)}...</span>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-400/60 hover:text-gray-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              
              {/* Image preview */}
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg border border-white/20" />
                  <button 
                    onClick={() => setImagePreview(null)} 
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-400 transition-colors shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Input area */}
              <div className="flex gap-3 items-center">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploadingImage || isSending} 
                  className="text-gray-400 hover:text-white hover:bg-white/5 rounded-xl h-11 w-11 flex-shrink-0 border border-white/15"
                >
                  {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </Button>
                <div className="flex-1 relative">
                  <Textarea 
                    ref={messageInputRef}
                    placeholder={`Message #${selectedChannel.name}...`} 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' && !e.shiftKey) { 
                        e.preventDefault()
                        sendMessage() 
                      } 
                    }} 
                    className="w-full bg-[#111111] border-white/15 text-white placeholder-gray-500/40 resize-none h-11 min-h-[44px] max-h-[120px] rounded-xl py-2.5 px-4 focus:border-white/30" 
                    disabled={isSending} 
                  />
                </div>
                <Button 
                  onClick={sendMessage} 
                  disabled={(!newMessage.trim() && !imagePreview) || isSending} 
                  className="bg-gradient-to-r from-gray-700 to-gray-500 hover:from-gray-600 hover:to-gray-400 text-white h-11 w-11 rounded-xl flex-shrink-0 px-0"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* ========== MEMBERS SIDEBAR ========== */}
      {showMembers && (
        <div className="w-60 bg-[#0a0a0a] border-l border-white/10 flex flex-col flex-shrink-0 z-30">
          <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
            <span className="font-medium text-white text-sm">Members</span>
            <span className="text-xs text-gray-400/60 bg-white/5 px-2 py-0.5 rounded-full">{storyline.memberCount}</span>
          </div>
          <ScrollArea className="flex-1 py-2">
            {/* Online Section */}
            <div className="px-3">
              <div className="flex items-center gap-2 px-1 py-1.5">
                <span className="text-xs font-semibold text-gray-400/60 uppercase tracking-wider">Online</span>
                <span className="text-xs text-gray-400/40">
                  {storyline.members.filter(m => m.role === 'owner' || m.role === 'admin').length}
                </span>
              </div>
              
              {/* Owners */}
              {storyline.members.filter(m => m.role === 'owner').map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberClick(member.user.id)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8 border-2 border-amber-500/50">
                      <AvatarImage src={member.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-amber-500/50 to-orange-500/50 text-white text-xs">
                        {member.user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-amber-200 truncate flex items-center gap-1.5">
                      {member.user.username}
                      <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    </p>
                    <p className="text-xs text-amber-400/60">Owner</p>
                  </div>
                </button>
              ))}
              
              {/* Admins */}
              {storyline.members.filter(m => m.role === 'admin').map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberClick(member.user.id)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8 border border-white/30">
                      <AvatarImage src={member.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-white/50 to-gray-400/50 text-white text-xs">
                        {member.user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate flex items-center gap-1.5">
                      {member.user.username}
                      <Sparkles className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    </p>
                    <p className="text-xs text-gray-400/60">Admin</p>
                  </div>
                </button>
              ))}
              
              {/* Online members with custom roles */}
              {storyline.members.filter(m => m.role !== 'owner' && m.role !== 'admin' && m.customRole).map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberClick(member.user.id)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8 border border-white/20" style={{ borderColor: member.customRole?.color }}>
                      <AvatarImage src={member.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-white/50 to-gray-400/50 text-white text-xs">
                        {member.user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: member.customRole?.color || '#c4b5fd' }}>
                      {member.user.username}
                    </p>
                    <p className="text-xs text-gray-400/60">{member.customRole?.name}</p>
                  </div>
                </button>
              ))}
              
              {/* Regular online members */}
              {storyline.members.filter(m => m.role === 'member' && !m.customRole).map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberClick(member.user.id)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8 border border-white/20">
                      <AvatarImage src={member.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-white/50 to-gray-400/50 text-white text-xs">
                        {member.user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200/80 truncate">{member.user.username}</p>
                    <p className="text-xs text-gray-400/50">Member</p>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Offline Section */}
            <div className="px-3 mt-4">
              <div className="flex items-center gap-2 px-1 py-1.5">
                <span className="text-xs font-semibold text-gray-400/40 uppercase tracking-wider">Offline</span>
                <span className="text-xs text-gray-400/30">0</span>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
      
      {/* ========== CREATE CHANNEL MODAL ========== */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent className="bg-[#111111] border-white/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Hash className="w-5 h-5 text-gray-400" />
              Create Channel
            </DialogTitle>
            <DialogDescription className="text-gray-400/70">
              Add a new channel to {storyline.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-gray-200/80 mb-1.5 block">Channel Name</label>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400/60" />
                <Input
                  placeholder="channel-name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="bg-[#0a0a0a] border-white/20 text-white flex-1"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={() => setShowCreateChannel(false)} variant="ghost" className="flex-1 text-gray-300/70 hover:text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateChannel} 
                disabled={!newChannelName.trim() || isCreatingChannel}
                className="flex-1 bg-gradient-to-r from-gray-700 to-gray-500 hover:from-gray-600 hover:to-gray-400 text-white"
              >
                {isCreatingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Channel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ========== SETTINGS MODAL ========== */}
      {showSettings && (
        <StorylineSettings
          storylineId={storylineId}
          onClose={() => setShowSettings(false)}
          onUpdate={() => {
            async function refetch() {
              const response = await fetch(`/api/storylines/${storylineId}`)
              if (response.ok) {
                const data = await response.json()
                setStoryline(data.storyline)
              }
            }
            refetch()
          }}
        />
      )}

      {/* ========== BOOST MODAL ========== */}
      <Dialog open={showBoostModal} onOpenChange={setShowBoostModal}>
        <DialogContent className="bg-[#111111] border-white/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-amber-400" />
              Boost {storyline?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400/70">
              Spend Chronos to boost this server and unlock perks!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 pt-2">
            {/* Current Tier Display */}
            <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/15">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-300">Current Tier</span>
                <Badge 
                  variant="outline" 
                  className="px-3 py-1 text-sm border-amber-500/30 bg-amber-500/10 text-amber-400"
                >
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  Tier {storyline?.boostTier || 0}
                </Badge>
              </div>
              
              {/* Progress Bar */}
              {(() => {
                const tierInfo = getTierInfo(storyline?.boostChronos || 0)
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400/60">
                      <span>{tierInfo.currentThreshold} Chronos</span>
                      {tierInfo.nextThreshold ? (
                        <span>{tierInfo.nextThreshold} Chronos</span>
                      ) : (
                        <span className="text-amber-400">Max Tier!</span>
                      )}
                    </div>
                    <Progress 
                      value={tierInfo.progress * 100} 
                      className="h-2 bg-gray-900/30"
                    />
                    <p className="text-xs text-center text-gray-400/60">
                      {storyline?.boostChronos || 0} / {tierInfo.nextThreshold || '∞'} Chronos
                      {tierInfo.chronosToNext && ` (${tierInfo.chronosToNext} to Tier ${tierInfo.tier + 1})`}
                    </p>
                  </div>
                )
              })()}
            </div>
            
            {/* Boost Amount Selection */}
            <div className="space-y-3">
              <label className="text-sm text-gray-200/80">Select Boost Amount</label>
              <div className="grid grid-cols-3 gap-3">
                {BOOST_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedBoostAmount(amount)}
                    disabled={userChronos < amount}
                    className={cn(
                      "p-3 rounded-xl border transition-all",
                      selectedBoostAmount === amount
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                        : userChronos >= amount
                          ? "border-white/15 bg-white/5 text-gray-200 hover:border-white/30 hover:bg-white/5"
                          : "border-white/10 bg-white/5 text-gray-400/40 cursor-not-allowed"
                    )}
                  >
                    <div className="text-lg font-bold">{amount}</div>
                    <div className="text-xs opacity-60">Chronos</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400/50 text-center">
                Your balance: {userChronos} Chronos
              </p>
            </div>
            
            {boostError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {boostError}
              </div>
            )}
            
            <div className="flex gap-3">
              <Button onClick={() => setShowBoostModal(false)} variant="ghost" className="flex-1 text-gray-300/70 hover:text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button 
                onClick={handleBoost} 
                disabled={isBoosting || userChronos < selectedBoostAmount}
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white"
              >
                {isBoosting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
                Boost Server
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ========== IMAGE VIEWER ========== */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" 
          onClick={() => setViewingImage(null)}
        >
          <img src={viewingImage} alt="Full size" className="max-w-full max-h-full object-contain" />
          <button 
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-gray-200 hover:bg-white/15 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
      
      {/* ========== MEMBER PROFILE MODAL ========== */}
      {selectedMemberProfile && (
        <CharacterProfileModal
          persona={selectedMemberProfile}
          isOpen={!!selectedMemberProfile}
          onClose={() => setSelectedMemberProfile(null)}
          onStartChat={(personaId) => {
            setSelectedMemberProfile(null)
            // Handle starting chat
          }}
        />
      )}
    </div>
  )
}