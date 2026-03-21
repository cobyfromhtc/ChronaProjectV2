'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
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
  Image as ImageIcon, X, Crown, Sparkles, MessageCircle, Zap, Rocket
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StorylineSettings } from '@/components/storyline-settings'
import { BOOST_AMOUNTS, getTierInfo, type BoostAmount } from '@/lib/boost-tiers'

interface Channel {
  id: string
  name: string
  type: string
  position: number
}

interface StorylineMember {
  id: string
  role: string
  user: {
    id: string
    username: string
    avatarUrl: string | null
  }
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
  owner: {
    id: string
    username: string
    avatarUrl: string | null
  }
  channels: Channel[]
  members: StorylineMember[]
  memberCount: number
  role: string | null
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
}

interface StorylineInteriorProps {
  storylineId: string
  onBack: () => void
}

export function StorylineInterior({ storylineId, onBack }: StorylineInteriorProps) {
  const { user } = useAuth()
  const { activePersona } = usePersonas()
  
  const [storyline, setStoryline] = useState<StorylineData | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [showMembers, setShowMembers] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showBoostModal, setShowBoostModal] = useState(false)
  const [selectedBoostAmount, setSelectedBoostAmount] = useState<BoostAmount>(200)
  const [isBoosting, setIsBoosting] = useState(false)
  const [boostError, setBoostError] = useState<string | null>(null)
  const [userChronos, setUserChronos] = useState<number>(0)
  const [newChannelName, setNewChannelName] = useState('')
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Fetch storyline data
  useEffect(() => {
    async function fetchStoryline() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/storylines/${storylineId}`)
        if (response.ok) {
          const data = await response.json()
          setStoryline(data.storyline)
          // Select the first channel by default
          if (data.storyline.channels.length > 0) {
            setSelectedChannel(data.storyline.channels[0])
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
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setIsLoadingMessages(false)
      }
    }
    fetchMessages()
  }, [selectedChannel])
  
  // Auto-scroll to bottom
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
          mentions
        })
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
  
  // Fetch user's Chronos balance when opening boost modal
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
  
  // Handle boosting the storyline
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
      
      // Update local state
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
      <div className="flex-1 flex items-center justify-center persona-bg">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }
  
  if (!storyline) {
    return (
      <div className="flex-1 flex items-center justify-center persona-bg">
        <div className="text-center">
          <p className="text-purple-300">Storyline not found</p>
          <Button onClick={onBack} variant="ghost" className="mt-4">Go Back</Button>
        </div>
      </div>
    )
  }
  
  const canManageChannels = storyline.role === 'owner' || storyline.role === 'admin'
  
  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      {/* Channel Sidebar */}
      <div className="w-60 bg-[#0d0718] border-r border-purple-500/15 flex flex-col flex-shrink-0">
        {/* Storyline Header */}
        <div className="h-14 px-4 flex items-center gap-3 border-b border-purple-500/15 bg-[#12091f]/50 flex-shrink-0">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-400 hover:text-purple-200 hover:bg-purple-500/10 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-purple-100 truncate">{storyline.name}</h2>
            <p className="text-xs text-purple-400/60">{storyline.category}</p>
          </div>
          {/* Tier Badge */}
          {storyline.boostTier > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="px-2 py-0.5 text-xs border-amber-500/30 bg-amber-500/10 text-amber-400 gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    T{storyline.boostTier}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a0f30] border border-purple-500/30">
                  <p className="text-sm">Tier {storyline.boostTier} • {storyline.boostChronos} Chronos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <button
            onClick={openBoostModal}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-400 hover:text-purple-200 hover:bg-purple-500/10 transition-all"
            title="Boost Storyline"
          >
            <Rocket className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-400 hover:text-purple-200 hover:bg-purple-500/10 transition-all"
            title="Server Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        {/* Channels List */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-3 flex-shrink-0">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-purple-400/60 uppercase tracking-wider">Channels</span>
              {canManageChannels && (
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="w-5 h-5 rounded flex items-center justify-center text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          
          <TooltipProvider>
            <ScrollArea className="flex-1 px-2 min-h-0">
              <div className="space-y-0.5 pr-1">
                {storyline.channels.map((channel) => (
                  <Tooltip key={channel.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSelectedChannel(channel)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          selectedChannel?.id === channel.id
                            ? 'bg-purple-500/20 text-purple-100'
                            : 'text-purple-300/70 hover:text-purple-100 hover:bg-purple-500/10'
                        }`}
                      >
                        <Hash className="w-4 h-4 text-purple-400/60 flex-shrink-0" />
                        <span className="truncate text-left">{channel.name}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8} className="bg-[#1a0f30] border border-purple-500/30 text-purple-100 z-50">
                      <p>#{channel.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                {storyline.channels.length === 0 && (
                  <p className="text-xs text-purple-400/40 text-center py-4">No channels yet</p>
                )}
              </div>
            </ScrollArea>
          </TooltipProvider>
        </div>
        
        {/* Member List Toggle */}
        <div className="p-3 border-t border-purple-500/15 flex-shrink-0">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              showMembers 
                ? 'bg-purple-500/20 text-purple-100' 
                : 'text-purple-300/70 hover:text-purple-100 hover:bg-purple-500/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Members</span>
            <span className="ml-auto text-xs text-purple-400/60">{storyline.memberCount}</span>
          </button>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="h-14 px-4 flex items-center gap-3 border-b border-purple-500/15 bg-[#12091f]/50 backdrop-blur-sm">
          <Hash className="w-5 h-5 text-purple-400/60" />
          <h3 className="font-medium text-purple-100">{selectedChannel?.name || 'Select a channel'}</h3>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-purple-400/60 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {storyline.memberCount} members
            </span>
            <span className="text-lg">{getCategoryEmoji(storyline.category)}</span>
          </div>
        </div>
        
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {!selectedChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-purple-400/60">
              <Hash className="w-12 h-12 mb-3" />
              <p className="text-lg font-medium text-purple-200">Select a channel</p>
              <p className="text-sm">Choose a channel from the sidebar to start chatting</p>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-purple-400/60">
              <MessageCircle className="w-12 h-12 mb-3" />
              <p className="text-lg font-medium text-purple-200">No messages yet</p>
              <p className="text-sm">Be the first to start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-2 max-w-3xl mx-auto">
              {messages.map((message) => {
                const isMine = message.sender.id === activePersona?.id
                
                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'} persona-message`}>
                    <div className={`flex items-end gap-2.5 max-w-[75%] ${isMine ? '' : 'flex-row-reverse'}`}>
                      <Avatar className="w-8 h-8 border border-purple-500/30 flex-shrink-0">
                        <AvatarImage src={message.sender.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500/50 to-fuchsia-500/50 text-white text-sm font-medium">
                          {message.sender.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1">
                        <div 
                          className={`px-4 py-2.5 ${
                            isMine 
                              ? `bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white rounded-2xl rounded-bl-md shadow-lg shadow-purple-500/20` 
                              : `persona-card text-white rounded-2xl rounded-br-md`
                          }`}
                        >
                          {!isMine && (
                            <p className="text-xs text-purple-400 mb-1 font-medium">{message.sender.name}</p>
                          )}
                          {isMine && (
                            <p className="text-xs text-purple-200 mb-1 font-medium">{message.sender.name}</p>
                          )}
                          {message.imageUrl && (
                            <div className="mb-2">
                              <img 
                                src={message.imageUrl} 
                                alt="Shared image" 
                                className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-purple-500/20" 
                                style={{ maxHeight: '300px', width: 'auto' }} 
                                onClick={() => message.imageUrl && setViewingImage(message.imageUrl)} 
                              />
                            </div>
                          )}
                          {message.content && (
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                              {parseMessageWithMarkdown(message.content, storyline?.members.map((member) => member.user.username) ?? [])}
                            </div>
                          )}
                        </div>
                        <p className={`text-xs opacity-50 ${isMine ? '' : 'text-right'}`}>
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        {/* Message Input */}
        <div className="p-4 border-t border-purple-500/15 bg-[#12091f]/50 backdrop-blur-sm">
          {!activePersona ? (
            <div className="text-center py-2 persona-card rounded-xl">
              <p className="text-purple-400/60 text-sm">Create and activate a character to send messages</p>
            </div>
          ) : !selectedChannel ? (
            <div className="text-center py-2 text-purple-400/40 text-sm">
              Select a channel to start messaging
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg border border-purple-500/30" />
                  <button 
                    onClick={() => setImagePreview(null)} 
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-400 transition-colors shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-3 items-center">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploadingImage || isSending} 
                  className="text-purple-400 hover:text-purple-200 hover:bg-purple-500/10 rounded-xl h-11 w-11 flex-shrink-0 border border-purple-500/20"
                >
                  {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </Button>
                <div className="flex-1 relative">
                  <Textarea 
                    placeholder={`Message #${selectedChannel.name}...`} 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' && !e.shiftKey) { 
                        e.preventDefault()
                        sendMessage() 
                      } 
                    }} 
                    className="w-full persona-input resize-none h-11 min-h-[44px] max-h-[120px] rounded-xl py-2.5 px-4" 
                    disabled={isSending} 
                  />
                </div>
                <Button 
                  onClick={sendMessage} 
                  disabled={(!newMessage.trim() && !imagePreview) || isSending} 
                  className="btn-persona h-11 w-11 rounded-xl flex-shrink-0 px-0"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Members Sidebar (toggleable) */}
      {showMembers && (
        <div className="w-60 bg-[#0d0718] border-l border-purple-500/15 flex flex-col flex-shrink-0 z-30">
          <div className="h-14 px-4 flex items-center justify-between border-b border-purple-500/15 flex-shrink-0">
            <span className="font-medium text-purple-100">Members</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-400/60">{storyline.memberCount}</span>
              <button 
                onClick={() => setShowMembers(false)}
                className="w-6 h-6 rounded flex items-center justify-center text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <ScrollArea className="flex-1 py-3">
            <div className="px-3 space-y-1">
              {/* Owner first */}
              {storyline.members.filter(m => m.role === 'owner').map((member) => (
                <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <Avatar className="w-7 h-7 border border-amber-500/30">
                    <AvatarImage src={member.user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-amber-500/50 to-orange-500/50 text-white text-xs">
                      {member.user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-purple-200/80 truncate">{member.user.username}</span>
                  <Crown className="w-3.5 h-3.5 text-amber-400 ml-auto flex-shrink-0" />
                </div>
              ))}
              
              {/* Admins */}
              {storyline.members.filter(m => m.role === 'admin').map((member) => (
                <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-500/5">
                  <Avatar className="w-7 h-7 border border-purple-500/30">
                    <AvatarImage src={member.user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500/50 to-fuchsia-500/50 text-white text-xs">
                      {member.user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-purple-200/80 truncate">{member.user.username}</span>
                  <Sparkles className="w-3 h-3 text-purple-400 ml-auto flex-shrink-0" />
                </div>
              ))}
              
              {/* Regular members */}
              {storyline.members.filter(m => m.role !== 'owner' && m.role !== 'admin').map((member) => (
                <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-500/5">
                  <Avatar className="w-7 h-7 border border-purple-500/30">
                    <AvatarImage src={member.user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500/50 to-fuchsia-500/50 text-white text-xs">
                      {member.user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-purple-200/80 truncate">{member.user.username}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      
      {/* Create Channel Modal */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent className="persona-modal max-w-sm border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold persona-gradient-text flex items-center gap-2">
              <Hash className="w-5 h-5 text-purple-400" />
              Create Channel
            </DialogTitle>
            <DialogDescription className="text-purple-400/70">
              Add a new channel to {storyline.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-purple-200/80 mb-1 block">Channel Name</label>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-purple-400/60" />
                <Input
                  placeholder="channel-name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="persona-input flex-1"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={() => setShowCreateChannel(false)} variant="ghost" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateChannel} 
                disabled={!newChannelName.trim() || isCreatingChannel}
                className="btn-persona flex-1"
              >
                {isCreatingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Settings Modal */}
      {showSettings && (
        <StorylineSettings
          storylineId={storylineId}
          onClose={() => setShowSettings(false)}
          onUpdate={() => {
            // Refetch storyline data
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

      {/* Boost Storyline Modal */}
      <Dialog open={showBoostModal} onOpenChange={setShowBoostModal}>
        <DialogContent className="persona-modal max-w-md border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold persona-gradient-text flex items-center gap-2">
              <Rocket className="w-5 h-5 text-amber-400" />
              Boost {storyline?.name}
            </DialogTitle>
            <DialogDescription className="text-purple-400/70">
              Spend Chronos to boost this server and unlock perks!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 pt-2">
            {/* Current Tier Display */}
            <div className="persona-card p-4 rounded-xl border border-purple-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-purple-300">Current Tier</span>
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
                    <div className="flex justify-between text-xs text-purple-400/60">
                      <span>{tierInfo.currentThreshold} Chronos</span>
                      {tierInfo.nextThreshold ? (
                        <span>{tierInfo.nextThreshold} Chronos</span>
                      ) : (
                        <span className="text-amber-400">Max Tier!</span>
                      )}
                    </div>
                    <Progress 
                      value={tierInfo.progress * 100} 
                      className="h-2 bg-purple-900/30"
                    />
                    <p className="text-xs text-center text-purple-400/60">
                      {storyline?.boostChronos || 0} / {tierInfo.nextThreshold || '∞'} Chronos
                      {tierInfo.chronosToNext && ` (${tierInfo.chronosToNext} to Tier ${tierInfo.tier + 1})`}
                    </p>
                  </div>
                )
              })()}
            </div>
            
            {/* Boost Amount Selection */}
            <div className="space-y-3">
              <label className="text-sm text-purple-200/80">Select Boost Amount</label>
              <div className="grid grid-cols-3 gap-3">
                {BOOST_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedBoostAmount(amount)}
                    disabled={userChronos < amount}
                    className={`p-3 rounded-xl border transition-all ${
                      selectedBoostAmount === amount
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                        : userChronos >= amount
                          ? 'border-purple-500/20 bg-purple-500/5 text-purple-200 hover:border-purple-500/40 hover:bg-purple-500/10'
                          : 'border-purple-500/10 bg-purple-500/5 text-purple-400/40 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-lg font-bold">{amount}</div>
                    <div className="text-xs opacity-60">Chronos</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-purple-400/50 text-center">
                Your balance: {userChronos} Chronos
              </p>
            </div>
            
            {boostError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {boostError}
              </div>
            )}
            
            {/* Boost Duration Info */}
            <div className="text-xs text-purple-400/50 text-center">
              Boosts last for 30 days and contribute to the server's tier progression.
            </div>
            
            <div className="flex gap-3">
              <Button onClick={() => setShowBoostModal(false)} variant="ghost" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleBoost} 
                disabled={!activePersona || userChronos < selectedBoostAmount || isBoosting}
                className="btn-persona flex-1 gap-2"
              >
                {isBoosting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Boosting...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Boost
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setViewingImage(null)}
        >
          <button 
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={viewingImage} 
            alt="Full size image" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
