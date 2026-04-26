'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { extractMentions } from '@/lib/mentions'
import { parseMessageWithMarkdown } from '@/lib/markdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Hash, Users, Settings, Plus, ChevronLeft, Send, Loader2, 
  Image as ImageIcon, X, Crown, Sparkles, MessageCircle, Zap, Rocket,
  UserPlus, Pin, Copy, Check, Smile, MoreHorizontal, Trash2, BookOpen
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StorylineSettings } from '@/components/storyline-settings'
import { WikiTab } from '@/components/wiki-tab'
import { BOOST_AMOUNTS, getTierInfo, type BoostAmount } from '@/lib/boost-tiers'
import { CharacterProfileModal } from '@/components/character-profile-modal'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useVariantAccent, useVariantCombo } from '@/lib/ui-variant-styles'

interface Channel {
  id: string
  name: string
  type: string
  position: number
  topic?: string | null
}

interface Category {
  id: string
  name: string
  position: number
  channels: Channel[]
}

interface CustomRole {
  id: string
  name: string
  color: string
}

interface StorylineMember {
  id: string
  role: string
  customRole?: CustomRole | null
  user: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

interface StorylineRole {
  id: string
  name: string
  color: string
  position: number
  isAdmin: boolean
}

interface StorylineData {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  bannerUrl: string | null
  category: string
  isPublic: boolean
  boostChronos: number
  boostTier: number
  welcomeMessage: string | null
  owner: {
    id: string
    username: string
    avatarUrl: string | null
  }
  channels: Channel[]
  categories: Category[]
  members: StorylineMember[]
  roles: StorylineRole[]
  memberCount: number
  role: string | null
}

interface ReactionGroup {
  emoji: string
  count: number
  userIds: string[]
}

interface ChannelMessage {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  isPinned?: boolean
  sender: {
    id: string
    name: string
    avatarUrl: string | null
    username: string
  }
  reactions?: ReactionGroup[]
  hasReacted?: string[]
}

interface PinnedMessage {
  id: string
  pinnedAt: string
  message: {
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
  }
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '✨', '🎉']

interface StorylineInteriorProps {
  storylineId: string
  onBack: () => void
}

export function StorylineInterior({ storylineId, onBack }: StorylineInteriorProps) {
  const { user } = useAuth()
  const { activePersona } = usePersonas()
  const accent = useVariantAccent()
  const combo = useVariantCombo()
  
  const [storyline, setStoryline] = useState<StorylineData | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [channelTopic, setChannelTopic] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [showMembers, setShowMembers] = useState(false)
  const [showWiki, setShowWiki] = useState(false)
  const [showAllMessages, setShowAllMessages] = useState(false) // Virtual scrolling toggle
  
  // Virtual scrolling: limit DOM nodes for long message lists
  const MAX_VISIBLE_MESSAGES = 150
  const visibleMessages = useMemo(() => {
    if (showAllMessages || messages.length <= MAX_VISIBLE_MESSAGES) return messages
    return messages.slice(-MAX_VISIBLE_MESSAGES)
  }, [messages, showAllMessages])
  
  const hasMoreMessages = messages.length > MAX_VISIBLE_MESSAGES && !showAllMessages
  const hiddenMessageCount = messages.length - MAX_VISIBLE_MESSAGES
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showBoostModal, setShowBoostModal] = useState(false)
  const [selectedBoostAmount, setSelectedBoostAmount] = useState<BoostAmount>(200)
  const [isBoosting, setIsBoosting] = useState(false)
  const [boostError, setBoostError] = useState<string | null>(null)
  const [userChronos, setUserChronos] = useState<number>(0)
  const [newChannelName, setNewChannelName] = useState('')
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)
  
  // New Discord-like feature states
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteMaxUses, setInviteMaxUses] = useState('')
  const [inviteExpiresIn, setInviteExpiresIn] = useState('never')
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [isLoadingPinned, setIsLoadingPinned] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)
  
  // Member profile modal state
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<{
    id: string; name: string; avatarUrl: string | null; bio: string | null
    username: string; userId: string; isOnline: boolean; archetype: string | null
    gender: string | null; age: number | null; tags: string[]
    personalityDescription: string | null
    personalitySpectrums: { introvertExtrovert: number; intuitiveObservant: number; thinkingFeeling: number; judgingProspecting: number; assertiveTurbulent: number } | null
    bigFive: { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number } | null
    hexaco: { honestyHumility: number; emotionality: number; extraversion: number; agreeableness: number; conscientiousness: number; opennessToExperience: number } | null
    strengths: string[]; flaws: string[]; values: string[]; fears: string[]
    species: string | null; likes: string[]; dislikes: string[]; hobbies: string[]; skills: string[]; languages: string[]; habits: string[]; speechPatterns: string[]
    backstory: string | null; appearance: string | null; mbtiType: string | null
    connections: { id: string; characterName: string; relationshipType: string; specificRole: string | null; characterAge: number | null; description: string | null }[]
  } | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Handle member click
  const handleMemberClick = async (userId: string) => {
    setIsLoadingProfile(true)
    try {
      const response = await fetch(`/api/users/${userId}/active-persona`)
      if (response.ok) {
        const data = await response.json()
        if (data.persona) setSelectedMemberProfile(data.persona)
      }
    } catch (error) {
      console.error('Failed to fetch member profile:', error)
    } finally {
      setIsLoadingProfile(false)
    }
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
          // Show welcome message for new members
          if (data.storyline.welcomeMessage && !hasShownWelcome) {
            setShowWelcome(true)
            setHasShownWelcome(true)
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
  
  // Fetch messages when channel changes
  useEffect(() => {
    async function fetchMessages() {
      if (!selectedChannel) return
      setIsLoadingMessages(true)
      try {
        const response = await fetch(`/api/storyline-channels/${selectedChannel.id}/messages`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages)
          setChannelTopic(data.channelTopic || null)
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
        body: JSON.stringify({ content: newMessage.trim(), imageUrl: imagePreview, senderPersonaId: activePersona.id, mentions })
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        setImagePreview(null)
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
        setStoryline(prev => prev ? { ...prev, channels: [...prev.channels, data.channel] } : null)
        setNewChannelName('')
        setShowCreateChannel(false)
      }
    } catch (error) {
      console.error('Failed to create channel:', error)
    } finally {
      setIsCreatingChannel(false)
    }
  }
  
  // Create invite
  const handleCreateInvite = async () => {
    if (!storyline || isCreatingInvite) return
    setIsCreatingInvite(true)
    try {
      const response = await fetch(`/api/storylines/${storylineId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxUses: inviteMaxUses ? parseInt(inviteMaxUses) : null,
          expiresIn: inviteExpiresIn === 'never' ? null : parseInt(inviteExpiresIn)
        })
      })
      if (response.ok) {
        const data = await response.json()
        setInviteCode(data.invite.code)
      }
    } catch (error) {
      console.error('Failed to create invite:', error)
    } finally {
      setIsCreatingInvite(false)
    }
  }
  
  // Copy invite link
  const copyInviteLink = () => {
    if (!inviteCode) return
    const url = `${window.location.origin}/join/${inviteCode}`
    navigator.clipboard.writeText(url)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }
  
  // Toggle reaction
  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/storyline-messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, reactions: data.reactions, hasReacted: data.hasReacted }
            : m
        ))
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
    setShowReactionPicker(null)
  }
  
  // Pin/unpin message
  const togglePin = async (messageId: string, isPinned: boolean) => {
    try {
      if (isPinned) {
        await fetch(`/api/storylines/${storylineId}/pinned-messages`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId })
        })
      } else {
        await fetch(`/api/storylines/${storylineId}/pinned-messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId })
        })
      }
      // Update local state
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isPinned: !isPinned } : m
      ))
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }
  
  // Fetch pinned messages
  const fetchPinnedMessages = async () => {
    setIsLoadingPinned(true)
    try {
      const response = await fetch(`/api/storylines/${storylineId}/pinned-messages`)
      if (response.ok) {
        const data = await response.json()
        setPinnedMessages(data.pinnedMessages)
      }
    } catch (error) {
      console.error('Failed to fetch pinned messages:', error)
    } finally {
      setIsLoadingPinned(false)
    }
  }
  
  // Open boost modal
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
      if (!response.ok) throw new Error(data.error || 'Failed to boost storyline')
      setStoryline(prev => prev ? { ...prev, boostChronos: data.storyline.boostChronos, boostTier: data.storyline.boostTier } : null)
      setUserChronos(data.user.chronos)
      setShowBoostModal(false)
    } catch (error) {
      console.error('Boost error:', error)
      setBoostError(error instanceof Error ? error.message : 'Failed to boost storyline')
    } finally {
      setIsBoosting(false)
    }
  }
  
  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      'Romance': '💕', 'Action': '⚔️', 'Horror': '👻', 'Fantasy': '🧙',
      'Sci-Fi': '🚀', 'Slice of Life': '🌸', 'Mystery': '🔍', 'Comedy': '😂',
      'Drama': '🎭', 'Adventure': '🗺️', 'Thriller': '😱', 'Historical': '📜',
      'Supernatural': '✨', 'Other': '📖'
    }
    return emojis[category] || '📖'
  }
  
  // Get member's role info for display
  const getMemberRoleDisplay = (member: StorylineMember) => {
    if (member.role === 'owner') return { label: 'Owner', color: '#f59e0b', icon: <Crown className="w-3.5 h-3.5 text-amber-400" /> }
    if (member.role === 'admin') return { label: 'Admin', color: '#14b8a6', icon: <Sparkles className={`w-3 h-3 ${accent.text}`} /> }
    if (member.customRole) return { label: member.customRole.name, color: member.customRole.color, icon: null }
    return { label: 'Member', color: '#64748b', icon: null }
  }
  
  // Group members by role
  const getMemberGroups = () => {
    if (!storyline) return []
    const groups: { title: string; color: string; members: StorylineMember[] }[] = []
    
    // Owners
    const owners = storyline.members.filter(m => m.role === 'owner')
    if (owners.length > 0) groups.push({ title: 'Owner', color: '#f59e0b', members: owners })
    
    // Admins
    const admins = storyline.members.filter(m => m.role === 'admin')
    if (admins.length > 0) groups.push({ title: 'Admin', color: '#14b8a6', members: admins })
    
    // Custom roles
    const customRoleMembers = storyline.members.filter(m => m.role !== 'owner' && m.role !== 'admin' && m.customRole)
    const roleGroups = customRoleMembers.reduce((acc, member) => {
      const roleName = member.customRole!.name
      const roleColor = member.customRole!.color
      if (!acc[roleName]) acc[roleName] = { title: roleName, color: roleColor, members: [] }
      acc[roleName].members.push(member)
      return acc
    }, {} as Record<string, { title: string; color: string; members: StorylineMember[] }>)
    Object.values(roleGroups).forEach(g => groups.push(g))
    
    // Regular members
    const regularMembers = storyline.members.filter(m => m.role !== 'owner' && m.role !== 'admin' && !m.customRole)
    if (regularMembers.length > 0) groups.push({ title: 'Members', color: '#64748b', members: regularMembers })
    
    return groups
  }
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center persona-bg">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    )
  }
  
  if (!storyline) {
    return (
      <div className="flex-1 flex items-center justify-center persona-bg">
        <div className="text-center">
          <p className="text-slate-300">Storyline not found</p>
          <Button onClick={onBack} variant="ghost" className="mt-4">Go Back</Button>
        </div>
      </div>
    )
  }
  
  const canManageChannels = storyline.role === 'owner' || storyline.role === 'admin'
  const canPinMessages = canManageChannels
  
  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      {/* Channel Sidebar */}
      <div className="w-60 bg-[#0e1015] border-r border-white/[0.08] flex flex-col flex-shrink-0">
        {/* Storyline Header */}
        <div className="h-12 px-3 flex items-center gap-2 border-b border-white/[0.08] bg-[#0f1117]/50 flex-shrink-0 shadow-sm">
          <button onClick={onBack} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-100 truncate text-sm leading-tight">{storyline.name}</h2>
          </div>
          {storyline.boostTier > 0 && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-400 gap-0.5 flex-shrink-0">
              <Zap className="w-2.5 h-2.5" />T{storyline.boostTier}
            </Badge>
          )}
          <button onClick={() => { setInviteCode(null); setInviteCopied(false); setShowInviteModal(true) }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all flex-shrink-0" title="Invite People">
            <UserPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={openBoostModal} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all flex-shrink-0" title="Boost">
            <Rocket className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowSettings(true)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all flex-shrink-0" title="Settings">
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Channels List */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TooltipProvider>
            <ScrollArea className="flex-1 px-2 min-h-0">
              <div className="py-2 pr-1 space-y-4">
                {storyline.categories && storyline.categories.length > 0 ? (
                  storyline.categories.map((category) => (
                    <div key={category.id}>
                      <div className="flex items-center justify-between px-1 py-1">
                        <span className="text-[11px] font-semibold text-slate-400/80 uppercase tracking-wider select-none">{category.name}</span>
                        {canManageChannels && (
                          <button onClick={() => setShowCreateChannel(true)} className="w-4 h-4 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] transition-all">
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {category.channels && category.channels.length > 0 ? (
                          category.channels.map((channel) => (
                            <Tooltip key={channel.id}>
                              <TooltipTrigger asChild>
                                <button onClick={() => setSelectedChannel(channel)} className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-all ${selectedChannel?.id === channel.id ? `${accent.bgTint} text-slate-100` : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.04]'}`}>
                                  <Hash className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                  <span className="truncate text-left text-[13px]">{channel.name}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" sideOffset={8} className={`${accent.bgSurface} border ${accent.borderSubtle} text-slate-100 z-50`}>
                                <p>#{channel.name}</p>
                                {channel.topic && <p className="text-xs text-slate-400 mt-1">{channel.topic}</p>}
                              </TooltipContent>
                            </Tooltip>
                          ))
                        ) : (
                          <p className="text-[11px] text-slate-400/40 text-center py-1.5 px-2">No channels</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between px-1 py-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">Channels</span>
                      {canManageChannels && (
                        <button onClick={() => setShowCreateChannel(true)} className="w-4 h-4 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] transition-all">
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5 mt-0.5">
                      {storyline.channels.map((channel) => (
                        <Tooltip key={channel.id}>
                          <TooltipTrigger asChild>
                            <button onClick={() => setSelectedChannel(channel)} className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-all ${selectedChannel?.id === channel.id ? `${accent.bgTint} text-slate-100` : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.04]'}`}>
                              <Hash className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              <span className="truncate text-left text-[13px]">{channel.name}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8} className={`${accent.bgSurface} border ${accent.borderSubtle} text-slate-100 z-50`}>
                            <p>#{channel.name}</p>
                            {channel.topic && <p className="text-xs text-slate-400 mt-1">{channel.topic}</p>}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {storyline.channels.length === 0 && (
                        <p className="text-[11px] text-slate-400/40 text-center py-3">No channels yet</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </TooltipProvider>
        </div>
        
        {/* Member List & Wiki Toggle */}
        <div className="p-3 border-t border-white/[0.08] flex-shrink-0 space-y-1">
          <button onClick={() => { setShowWiki(!showWiki); if (!showWiki) setShowMembers(false) }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${showWiki ? `${accent.bgTint} text-slate-100` : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'}`}>
            <BookOpen className="w-4 h-4" />
            <span>Wiki</span>
          </button>
          <button onClick={() => { setShowMembers(!showMembers); if (!showMembers) setShowWiki(false) }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${showMembers ? `${accent.bgTint} text-slate-100` : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'}`}>
            <Users className="w-4 h-4" />
            <span>Members</span>
            <span className="ml-auto text-xs text-slate-500">{storyline.memberCount}</span>
          </button>
        </div>
      </div>
      
      {/* Main Chat Area - hidden when wiki is shown */}
      {!showWiki && (
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="px-4 flex items-center border-b border-white/[0.08] bg-[#0f1117]/50 backdrop-blur-sm" style={{ minHeight: channelTopic ? '3.5rem' : '3.5rem' }}>
          <Hash className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <div className="ml-2 flex-1 min-w-0">
            <h3 className="font-medium text-slate-100">{selectedChannel?.name || 'Select a channel'}</h3>
            {channelTopic && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-slate-500 truncate cursor-default">{channelTopic}</p>
                  </TooltipTrigger>
                  <TooltipContent className={`${accent.bgSurface} border ${accent.borderSubtle} max-w-xs`}>
                    <p className="text-sm text-slate-200">{channelTopic}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            {/* Pinned Messages Button */}
            {selectedChannel && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => { fetchPinnedMessages(); setShowPinnedMessages(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all">
                      <Pin className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className={`${accent.bgSurface} border ${accent.borderSubtle}`}>Pinned Messages</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {storyline.memberCount}
            </span>
            <span className="text-lg">{getCategoryEmoji(storyline.category)}</span>
          </div>
        </div>
        
        {/* Welcome Message Banner */}
        {showWelcome && storyline.welcomeMessage && (
          <div className={`mx-4 mt-3 p-3 rounded-xl bg-gradient-to-r ${accent.fromSubtle} ${accent.toSubtle} border ${accent.borderSubtle} flex items-start gap-3`}>
            <Sparkles className={`w-5 h-5 ${accent.text} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 font-medium">Welcome to {storyline.name}!</p>
              <p className="text-sm text-slate-300/80 mt-1">{storyline.welcomeMessage}</p>
            </div>
            <button onClick={() => setShowWelcome(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Welcome system message in chat flow */}
        {showWelcome && storyline.welcomeMessage && selectedChannel && (
          <div className="px-4 pt-2">
            <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${accent.bgSubtle} border ${accent.borderSubtle}`}>
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${accent.fromSubtle} ${accent.toSubtle} flex items-center justify-center flex-shrink-0`}>
                <Sparkles className={`w-5 h-5 ${accent.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${accent.text}`}>Welcome to {storyline.name}!</p>
                <p className="text-xs text-slate-400 mt-0.5">{storyline.welcomeMessage}</p>
              </div>
              <button onClick={() => setShowWelcome(false)} className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        
        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-2">
          {!selectedChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Hash className="w-12 h-12 mb-3" />
              <p className="text-lg font-medium text-slate-200">Select a channel</p>
              <p className="text-sm">Choose a channel from the sidebar to start chatting</p>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <MessageCircle className="w-12 h-12 mb-3" />
              <p className="text-lg font-medium text-slate-200">No messages yet</p>
              <p className="text-sm">Be the first to start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {/* Load earlier messages button (virtual scrolling) */}
              {hasMoreMessages && (
                <div className="flex justify-center my-4">
                  <button
                    onClick={() => setShowAllMessages(true)}
                    className={`px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] hover:${accent.borderMedium} transition-all flex items-center gap-2`}
                  >
                    Load {hiddenMessageCount} earlier message{hiddenMessageCount !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
              {visibleMessages.map((message) => {
                const isMine = message.sender.id === activePersona?.id
                // Find member's custom role for role tag
                const memberInfo = storyline.members.find(m => m.user.id === message.sender.id)
                const memberRole = memberInfo ? getMemberRoleDisplay(memberInfo) : null
                
                return (
                  <ContextMenu key={message.id}>
                    <ContextMenuTrigger asChild>
                      <div className={`flex gap-3 py-0.5 group persona-message hover:bg-white/[0.02] rounded-md transition-colors ${isMine ? accent.bgSubtle : ''}`}>
                        {/* Avatar - always on the left, aligned to top */}
                        <div className="flex-shrink-0 pt-0.5">
                          <Avatar className={`w-10 h-10 border ${accent.avatarBorder} cursor-pointer hover:opacity-80 transition-opacity`} onClick={() => handleMemberClick(message.sender.id)}>
                            <AvatarImage src={message.sender.avatarUrl || undefined} />
                            <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-sm font-semibold`}>
                              {message.sender.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        
                        {/* Message content area - left-aligned */}
                        <div className="flex-1 min-w-0">
                          {/* Header row: Name + Role + Timestamp - all left-aligned */}
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm font-semibold hover:underline cursor-pointer" style={memberRole && memberRole.color ? { color: memberRole.color } : { color: '#5eead4' }} onClick={() => handleMemberClick(message.sender.id)}>
                              {message.sender.name}
                            </span>
                            {memberRole && memberRole.label !== 'Member' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0" style={{ borderColor: memberRole.color + '40', color: memberRole.color, backgroundColor: memberRole.color + '15' }}>
                                {memberRole.icon}{memberRole.label}
                              </span>
                            )}
                            {/* Pin indicator */}
                            {message.isPinned && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-400/80 flex-shrink-0">
                                <Pin className="w-2.5 h-2.5" />Pinned
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 flex-shrink-0 ml-0.5">
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          
                          {/* Image content */}
                          {message.imageUrl && (
                            <div className="mb-1.5">
                              <img src={message.imageUrl} alt="Shared image" className="max-w-sm rounded-xl cursor-pointer hover:opacity-90 transition-opacity border border-white/[0.08]" style={{ maxHeight: '300px', width: 'auto' }} onClick={() => message.imageUrl && setViewingImage(message.imageUrl)} loading="lazy" decoding="async" />
                            </div>
                          )}
                          
                          {/* Text content */}
                          {message.content && (
                            <div className="text-[14px] text-slate-200/90 whitespace-pre-wrap leading-relaxed break-words">
                              {parseMessageWithMarkdown(message.content, storyline?.members.map((member) => member.user.username) ?? [])}
                            </div>
                          )}
                          
                          {/* Reactions row */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {message.reactions.map((reaction) => {
                                const hasReacted = message.hasReacted?.includes(reaction.emoji)
                                return (
                                  <button key={reaction.emoji} onClick={() => toggleReaction(message.id, reaction.emoji)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${hasReacted ? `${accent.borderMedium} ${accent.bgTint} ${accent.text}` : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'}`}>
                                    <span>{reaction.emoji}</span>
                                    <span className="font-medium">{reaction.count}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          
                          {/* Hover action bar */}
                          <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
                              <Smile className="w-3 h-3" />
                            </button>
                            {canPinMessages && (
                              <button onClick={() => togglePin(message.id, !!message.isPinned)} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all ${message.isPinned ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]'}`}>
                                <Pin className="w-3 h-3" />
                              </button>
                            )}
                            <button onClick={() => { navigator.clipboard.writeText(message.content) }} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {/* Reaction Picker */}
                          {showReactionPicker === message.id && (
                            <div className={`flex flex-wrap gap-1 mt-1.5 p-2 rounded-xl ${accent.bgSurface} border border-white/[0.08] shadow-xl`}>
                              {REACTION_EMOJIS.map(emoji => (
                                <button key={emoji} onClick={() => toggleReaction(message.id, emoji)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.1] transition-all text-lg">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className={`${accent.bgSurface} border ${accent.borderSubtle}`}>
                      <ContextMenuItem onClick={() => toggleReaction(message.id, '👍')} className={`text-slate-200 focus:${accent.bgTint} focus:text-slate-100`}>
                        <Smile className="w-4 h-4 mr-2" /> React
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => togglePin(message.id, !!message.isPinned)} className={`text-slate-200 focus:${accent.bgTint} focus:text-slate-100`}>
                        <Pin className="w-4 h-4 mr-2" /> {message.isPinned ? 'Unpin Message' : 'Pin Message'}
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => { navigator.clipboard.writeText(message.content) }} className={`text-slate-200 focus:${accent.bgTint} focus:text-slate-100`}>
                        <Copy className="w-4 h-4 mr-2" /> Copy Text
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        {/* Message Input */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0f1117]/50 backdrop-blur-sm">
          {!activePersona ? (
            <div className="text-center py-2 persona-card rounded-xl">
              <p className="text-slate-500 text-sm">Create and activate a character to send messages</p>
            </div>
          ) : !selectedChannel ? (
            <div className="text-center py-2 text-slate-400/40 text-sm">Select a channel to start messaging</div>
          ) : (
            <div className="">
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img src={imagePreview} alt="Preview" className={`max-h-32 rounded-lg border ${accent.borderSubtle}`} />
                  <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-400 transition-colors shadow-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-3 items-center">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage || isSending} className="text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] rounded-xl h-11 w-11 flex-shrink-0 border border-white/[0.08]">
                  {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </Button>
                <div className="flex-1 relative">
                  <Textarea placeholder={`Message #${selectedChannel.name}...`} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} className="w-full persona-input resize-none h-11 min-h-[44px] max-h-[120px] rounded-xl py-2.5 px-4" disabled={isSending} />
                </div>
                <Button onClick={sendMessage} disabled={(!newMessage.trim() && !imagePreview) || isSending} className="btn-persona h-11 w-11 rounded-xl flex-shrink-0 px-0">
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
      
      {/* Wiki View - takes full main content area */}
      {showWiki && (
        <WikiTab
          storylineId={storylineId}
          userId={user?.id || ''}
          userRole={storyline.role || 'member'}
          onClose={() => setShowWiki(false)}
        />
      )}
      
      {/* Members Sidebar - Enhanced with role grouping */}
      {showMembers && (
        <div className="w-60 bg-[#0e1015] border-l border-white/[0.08] flex flex-col flex-shrink-0 z-30">
          <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.08] flex-shrink-0">
            <span className="font-medium text-slate-100">Members</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{storyline.memberCount}</span>
              <button onClick={() => setShowMembers(false)} className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <ScrollArea className="flex-1 py-3">
            <div className="px-3 space-y-4">
              {getMemberGroups().map((group) => (
                <div key={group.title}>
                  {/* Role group header - Discord style "OWNER — 1" */}
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: group.color }}>{group.title}</span>
                    <span className="text-[11px] font-semibold" style={{ color: group.color + '80' }}>— {group.members.length}</span>
                  </div>
                  {/* Members in this role */}
                  <div className="space-y-0.5">
                    {group.members.map((member) => (
                      <button key={member.id} onClick={() => handleMemberClick(member.user.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors text-left">
                        <Avatar className="w-7 h-7 border" style={{ borderColor: group.color + '40' }}>
                          <AvatarImage src={member.user.avatarUrl || undefined} />
                          <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-xs`}>
                            {member.user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate" style={{ color: group.color + 'cc' }}>{member.user.username}</span>
                        {member.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-400 ml-auto flex-shrink-0" />}
                        {member.role === 'admin' && <Sparkles className={`w-3 h-3 ${accent.text} ml-auto flex-shrink-0`} />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      
      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className={`persona-modal max-w-md ${accent.borderSubtle}`}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold persona-gradient-text flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-slate-400" />
              Invite Friends
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Share this link to invite people to {storyline.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {inviteCode ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${accent.bgSurface} border ${accent.borderSubtle} flex items-center gap-2`}>
                  <code className={`flex-1 text-sm ${accent.text} font-mono truncate`}>
                    {window.location.origin}/join/{inviteCode}
                  </code>
                  <Button onClick={copyInviteLink} variant="ghost" size="sm" className={inviteCopied ? 'text-green-400' : 'text-slate-400 hover:text-slate-200'}>
                    {inviteCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  {inviteCopied ? 'Link copied to clipboard!' : 'Click the copy button to share the invite link'}
                </p>
                <Button onClick={() => { setInviteCode(null); setInviteCopied(false) }} variant="ghost" className="w-full text-sm">
                  Create Another Link
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 block mb-1">Max Uses</label>
                    <Input type="number" value={inviteMaxUses} onChange={(e) => setInviteMaxUses(e.target.value)} placeholder="Unlimited" className={`bg-[#0e1015] ${accent.borderSubtle} text-slate-100`} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 block mb-1">Expires</label>
                    <select value={inviteExpiresIn} onChange={(e) => setInviteExpiresIn(e.target.value)} className={`w-full px-3 py-2 rounded-lg bg-[#0e1015] border ${accent.borderSubtle} text-slate-100`}>
                      <option value="never">Never</option>
                      <option value="3600">1 hour</option>
                      <option value="86400">1 day</option>
                      <option value="604800">1 week</option>
                    </select>
                  </div>
                </div>
                <Button onClick={handleCreateInvite} disabled={isCreatingInvite} className="btn-persona w-full">
                  {isCreatingInvite ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Generate Invite Link
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Pinned Messages Modal */}
      <Dialog open={showPinnedMessages} onOpenChange={setShowPinnedMessages}>
        <DialogContent className={`persona-modal max-w-lg ${accent.borderSubtle}`}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold persona-gradient-text flex items-center gap-2">
              <Pin className="w-5 h-5 text-amber-400" />
              Pinned Messages
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Important messages pinned in {storyline.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 max-h-96 overflow-y-auto">
            {isLoadingPinned ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
            ) : pinnedMessages.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Pin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No pinned messages yet</p>
                <p className="text-xs mt-1">Right-click a message to pin it</p>
              </div>
            ) : (
              pinnedMessages.map((pm) => (
                <div key={pm.id} className={`p-3 rounded-lg ${accent.bgSurface} border border-white/[0.08]`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className={`w-6 h-6 border ${accent.avatarBorder}`}>
                      <AvatarImage src={pm.message.sender.avatarUrl || undefined} />
                      <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-xs`}>
                        {pm.message.sender.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-slate-200 font-medium">{pm.message.sender.name}</span>
                    <span className="text-xs text-slate-500 ml-auto">{formatDistanceToNow(new Date(pm.pinnedAt), { addSuffix: true })}</span>
                  </div>
                  {pm.message.content && <p className="text-sm text-slate-300">{pm.message.content}</p>}
                  {pm.message.imageUrl && <img src={pm.message.imageUrl} alt="Pinned" className="mt-2 max-h-40 rounded-lg border border-white/[0.08]" loading="lazy" decoding="async" />}
                  {canPinMessages && (
                    <button onClick={async () => { await togglePin(pm.message.id, true); fetchPinnedMessages() }} className="mt-2 text-xs text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1">
                      <X className="w-3 h-3" /> Unpin
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Create Channel Modal */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent className={`persona-modal max-w-sm ${accent.borderSubtle}`}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold persona-gradient-text flex items-center gap-2">
              <Hash className="w-5 h-5 text-slate-400" />
              Create Channel
            </DialogTitle>
            <DialogDescription className="text-slate-400">Add a new channel to {storyline.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-slate-200/80 mb-1 block">Channel Name</label>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-500" />
                <Input placeholder="channel-name" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="persona-input flex-1" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowCreateChannel(false)} variant="ghost" className="flex-1">Cancel</Button>
              <Button onClick={handleCreateChannel} disabled={!newChannelName.trim() || isCreatingChannel} className="btn-persona flex-1">
                {isCreatingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Settings Modal */}
      {showSettings && (
        <StorylineSettings storylineId={storylineId} onClose={() => setShowSettings(false)} onUpdate={() => {
          async function refetch() {
            const response = await fetch(`/api/storylines/${storylineId}`)
            if (response.ok) { const data = await response.json(); setStoryline(data.storyline) }
          }
          refetch()
        }} />
      )}

      {/* Boost Storyline Modal */}
      <Dialog open={showBoostModal} onOpenChange={setShowBoostModal}>
        <DialogContent className={`persona-modal max-w-md ${accent.borderSubtle}`}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold persona-gradient-text flex items-center gap-2">
              <Rocket className="w-5 h-5 text-amber-400" />
              Boost {storyline?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">Spend Chronos to boost this server and unlock perks!</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="persona-card p-4 rounded-xl border border-white/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-300">Current Tier</span>
                <Badge variant="outline" className="px-3 py-1 text-sm border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <Zap className="w-3.5 h-3.5 mr-1" />Tier {storyline?.boostTier || 0}
                </Badge>
              </div>
              {(() => {
                const tierInfo = getTierInfo(storyline?.boostChronos || 0)
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{tierInfo.currentThreshold} Chronos</span>
                      {tierInfo.nextThreshold ? <span>{tierInfo.nextThreshold} Chronos</span> : <span className="text-amber-400">Max Tier!</span>}
                    </div>
                    <Progress value={tierInfo.progress * 100} className="h-2 bg-slate-900/25" />
                    <p className="text-xs text-center text-slate-500">
                      {storyline?.boostChronos || 0} / {tierInfo.nextThreshold || '∞'} Chronos
                      {tierInfo.chronosToNext && ` (${tierInfo.chronosToNext} to Tier ${tierInfo.tier + 1})`}
                    </p>
                  </div>
                )
              })()}
            </div>
            <div className="space-y-3">
              <label className="text-sm text-slate-200/80">Select Boost Amount</label>
              <div className="grid grid-cols-3 gap-3">
                {BOOST_AMOUNTS.map((amount) => (
                  <button key={amount} onClick={() => setSelectedBoostAmount(amount)} disabled={userChronos < amount} className={`p-3 rounded-xl border transition-all ${selectedBoostAmount === amount ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : userChronos >= amount ? 'border-white/[0.08] bg-white/[0.03] text-slate-200 hover:${accent.borderMedium} hover:bg-white/[0.05]' : 'border-white/[0.06] bg-white/[0.03] text-slate-400/40 cursor-not-allowed'}`}>
                    <div className="text-lg font-bold">{amount}</div>
                    <div className="text-xs opacity-60">Chronos</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 text-center">Your balance: {userChronos} Chronos</p>
            </div>
            {boostError && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{boostError}</div>}
            <div className="text-xs text-slate-500 text-center">Boosts last for 30 days and contribute to the server&apos;s tier progression</div>
            <Button onClick={handleBoost} disabled={isBoosting} className="btn-persona w-full">
              {isBoosting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Boosting...</> : <><Rocket className="w-4 h-4 mr-2" />Boost Now</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image View Modal */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-4xl bg-black/90 border-white/[0.08] p-0 overflow-hidden">
          {viewingImage && <img src={viewingImage} alt="Full size" className="w-full h-auto" />}
        </DialogContent>
      </Dialog>

      {/* Character Profile Modal */}
      <CharacterProfileModal
        isOpen={!!selectedMemberProfile}
        persona={selectedMemberProfile!}
        onClose={() => setSelectedMemberProfile(null)}
        onStartChat={() => setSelectedMemberProfile(null)}
      />
    </div>
  )
}