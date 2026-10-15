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
  X, Crown, Sparkles, MessageCircle, Zap, Rocket,
  UserPlus, Pin, Copy, Check, Smile, MoreHorizontal, Trash2, BookOpen,
  Volume2, Megaphone, Bell, BellOff, Search, Reply, Clock, Paperclip,
  MessageSquareReply as ThreadIcon, ChevronDown, ChevronUp, ExternalLink, Pencil,
  BellRing, AtSign, Flag
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StorylineSettings } from '@/components/storyline-settings'
import { WikiTab } from '@/components/wiki-tab'
import { MessageAttachments } from '@/components/message-attachments'
import { AttachmentChipsBar, usePendingAttachments } from '@/components/attachment-composer'
import { ALLOWED_ATTACHMENT_MIME_TYPES } from '@/lib/attachments'
import { useChannelChat, useThreadChat, type ChatAttachment, type ChannelUpdate, type ThreadChatMessage, type ChannelMessage as SocketChannelMessage } from '@/hooks/use-chat'
import { BOOST_AMOUNTS, getTierInfo, type BoostAmount } from '@/lib/boost-tiers'
import { CharacterProfileModal } from '@/components/character-profile-modal'
import { useContextMenu, type ContextMenuItem } from '@/components/context-menu-system'
import { useToast } from '@/hooks/use-toast'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useVariantAccent, useVariantCombo } from '@/lib/ui-variant-styles'
import { formatSifyCode, formatSifyExpiry } from '@/lib/invites'

// ─── Types ────────────────────────────────────────────────────────────────

interface Channel {
  id: string
  name: string
  type: string
  position: number
  topic?: string | null
  slowMode?: number | null
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
    isOnline?: boolean
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

interface ReplyInfo {
  id: string
  content: string
  senderName: string
}

interface ChannelMessage {
  id: string
  /** Present on realtime socket payloads (channel room routing) */
  channelId?: string
  content: string
  imageUrl: string | null
  attachments?: ChatAttachment[] | null
  createdAt: string
  editedAt?: string | null
  replyToId?: string | null
  replyTo?: ReplyInfo | null
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
    attachments?: ChatAttachment[] | null
    createdAt: string
    sender: {
      id: string
      name: string
      avatarUrl: string | null
      username: string
    }
  }
}

interface ThreadMessage {
  id: string
  content: string
  imageUrl: string | null
  attachments?: ChatAttachment[] | null
  createdAt: string
  sender: {
    id: string
    name: string
    avatarUrl: string | null
    username: string
  }
}

interface ThreadInfo {
  id: string
  name: string
  messageId: string
  messageCount: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
  message: {
    id: string
    content: string
    sender: {
      id: string
      name: string
      avatarUrl: string | null
    }
  }
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '✨', '🎉']

// ─── Channel message date divider (Discord-style) ────────────────────────

function ChannelDateDivider({ date }: { date: string }) {
  const d = new Date(date)
  const label = isToday(d)
    ? 'Today'
    : isYesterday(d)
      ? 'Yesterday'
      : format(d, 'MMMM d, yyyy')
  return (
    <div
      role="separator"
      aria-label={label}
      className="flex items-center gap-3 my-3 select-none"
    >
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-white/[0.1]" aria-hidden="true" />
      <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase px-1">
        {label}
      </span>
      <span className="flex-1 h-px bg-gradient-to-l from-transparent via-white/[0.1] to-white/[0.1]" aria-hidden="true" />
    </div>
  )
}

// ─── URL Preview Extractor ────────────────────────────────────────────────

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g
  return text.match(urlRegex) || []
}

function LinkPreview({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false)
  let domain = ''
  try { domain = new URL(url).hostname } catch { domain = url }
  
  return (
    <div className="mt-1.5 max-w-md rounded-lg border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <span className="text-xs text-slate-400 truncate flex-1">{domain}</span>
        {expanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
      </button>
      {expanded && (
        <div className="px-3 pb-2 border-t border-white/[0.06]">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 break-all line-clamp-2">
            {url}
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Channel Icon Component ───────────────────────────────────────────────

function ChannelIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'voice') return <Volume2 className={className || 'w-4 h-4 text-slate-500 flex-shrink-0'} />
  if (type === 'announcement') return <Megaphone className={className || 'w-4 h-4 text-amber-500/70 flex-shrink-0'} />
  return <Hash className={className || 'w-4 h-4 text-slate-500 flex-shrink-0'} />
}

function ChannelTypeLabel({ type }: { type: string }) {
  if (type === 'voice') return <span className="text-[9px] uppercase tracking-wider text-slate-600 ml-0.5">voice</span>
  if (type === 'announcement') return <span className="text-[9px] uppercase tracking-wider text-amber-600 ml-0.5">announcement</span>
  return null
}

// ─── Typing Indicator Component ───────────────────────────────────────────

function TypingIndicator({ names, variant = 'channel' }: { names: string[]; variant?: 'channel' | 'thread' }) {
  if (names.length === 0) return null
  
  let text = ''
  if (names.length === 1) text = `${names[0]} is typing`
  else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing`
  else text = `${names[0]} and ${names.length - 1} others are typing`
  
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded-md ${variant === 'thread' ? 'bg-white/[0.03]' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <span className="flex items-end gap-[3px] h-3.5" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400/80 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '900ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-teal-300/80 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '900ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-teal-200/80 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '900ms' }} />
      </span>
      <span className={`text-xs font-medium ${variant === 'thread' ? 'text-slate-400' : 'text-slate-400'}`}>
        {text}
        <span className="text-slate-600">…</span>
      </span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────

interface StorylineInteriorProps {
  storylineId: string
  onBack: () => void
}

export function StorylineInterior({ storylineId, onBack }: StorylineInteriorProps) {
  const { user } = useAuth()
  const { activePersona } = usePersonas()
  const accent = useVariantAccent()
  const combo = useVariantCombo()
  const { showContextMenu } = useContextMenu()
  const { toast } = useToast()
  
  // ── Core State ──
  const [storyline, setStoryline] = useState<StorylineData | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [channelTopic, setChannelTopic] = useState<string | null>(null)
  const [channelSlowMode, setChannelSlowMode] = useState<number | null>(0)
  const [channelType, setChannelType] = useState<string>('text')
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  // Multi-image attachments for channel messages (mirrors the DM composer)
  const pendingAttachments = usePendingAttachments()
  const channelFileInputRef = useRef<HTMLInputElement>(null)
  const [showMembers, setShowMembers] = useState(false)
  const [showWiki, setShowWiki] = useState(false)
  const [showAllMessages, setShowAllMessages] = useState(false)
  
  // ── Virtual Scrolling ──
  const MAX_VISIBLE_MESSAGES = 150
  const visibleMessages = useMemo(() => {
    if (showAllMessages || messages.length <= MAX_VISIBLE_MESSAGES) return messages
    return messages.slice(-MAX_VISIBLE_MESSAGES)
  }, [messages, showAllMessages])
  
  const hasMoreMessages = messages.length > MAX_VISIBLE_MESSAGES && !showAllMessages
  const hiddenMessageCount = messages.length - MAX_VISIBLE_MESSAGES
  
  // ── Channel Management ──
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<string>('text')
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)
  
  // ── Boost ──
  const [showBoostModal, setShowBoostModal] = useState(false)
  const [selectedBoostAmount, setSelectedBoostAmount] = useState<BoostAmount>(200)
  const [isBoosting, setIsBoosting] = useState(false)
  const [boostError, setBoostError] = useState<string | null>(null)
  const [userChronos, setUserChronos] = useState<number>(0)
  
  // ── Invite System ──
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteExpires, setInviteExpires] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteMaxUses, setInviteMaxUses] = useState('')
  const [inviteExpiresIn, setInviteExpiresIn] = useState('168') // hours; 168 = 7 days (default)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  
  // ── Pins & Reactions ──
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [isLoadingPinned, setIsLoadingPinned] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  
  // ── Welcome ──
  const [showWelcome, setShowWelcome] = useState(false)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)
  
  // ── Member Profile Modal ──
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
    discType: string | null
    disc: { dominance: number; influence: number; steadiness: number; conscientiousness: number } | null
    enneagram: { type: number | null; wing: number | null; instinctualVariant: string | null } | null
    strengthsFinder: { top5: string[] } | null
    connections: { id: string; characterName: string; relationshipType: string; specificRole: string | null; characterAge: number | null; description: string | null }[]
  } | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  
  // ── NEW: Typing Indicator ──
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timeout: NodeJS.Timeout }>>(new Map())
  
  // ── NEW: Reply System ──
  const [replyingTo, setReplyingTo] = useState<ChannelMessage | null>(null)
  
  // ── NEW: Edit Message ──
  const [editingMessage, setEditingMessage] = useState<ChannelMessage | null>(null)
  const [editContent, setEditContent] = useState('')
  
  // ── NEW: Search ──
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChannelMessage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // ── NEW: Thread System ──
  const [showThreadModal, setShowThreadModal] = useState(false)
  const [threadParentMessage, setThreadParentMessage] = useState<ChannelMessage | null>(null)
  const [threadName, setThreadName] = useState('')
  const [isCreatingThread, setIsCreatingThread] = useState(false)
  const [threads, setThreads] = useState<ThreadInfo[]>([])
  const [activeThread, setActiveThread] = useState<ThreadInfo | null>(null)
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([])
  const [newThreadMessage, setNewThreadMessage] = useState('')
  const [isLoadingThreadMessages, setIsLoadingThreadMessages] = useState(false)
  const [isSendingThreadMessage, setIsSendingThreadMessage] = useState(false)
  // Multi-image attachments for thread replies (separate picker instance)
  const threadPendingAttachments = usePendingAttachments()
  const threadFileInputRef = useRef<HTMLInputElement>(null)
  const threadMessagesEndRef = useRef<HTMLDivElement>(null)
  
  // ── NEW: Channel Notification Settings ──
  const [mutedChannels, setMutedChannels] = useState<Set<string>>(new Set())
  
  // ── NEW: Unread Indicators ──
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set())
  
  // ── NEW: Topic Expand ──
  const [topicExpanded, setTopicExpanded] = useState(false)
  
  // ── NEW: Slow Mode ──
  const [slowModeCooldown, setSlowModeCooldown] = useState(0)
  const slowModeTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Realtime: message ids that arrived after initial load (entrance
  //    animation markers). Pruned to the newest 40 to keep memory flat. ──
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  const markMessageNew = useCallback((id: string) => {
    setNewMessageIds(prev => {
      const next = new Set(prev)
      next.add(id)
      // Prune oldest entries beyond 40
      while (next.size > 40) {
        const oldest = next.keys().next().value
        if (oldest === undefined) break
        next.delete(oldest)
      }
      return next
    })
  }, [])

  // ── Realtime: typing indicator helper (shared by channel + thread) ──
  const applyTyping = useCallback((setState: React.Dispatch<React.SetStateAction<Map<string, { name: string; timeout: NodeJS.Timeout }>>>, personaName: string, isTyping: boolean) => {
    setState(prev => {
      const next = new Map(prev)
      const existing = next.get(personaName)
      if (existing?.timeout) clearTimeout(existing.timeout)
      if (isTyping) {
        // Safety-net expiry so a stale "typing..." chip can't stick forever
        const timeout = setTimeout(() => {
          setState(p => {
            const n = new Map(p)
            n.delete(personaName)
            return n
          })
        }, 4000)
        next.set(personaName, { name: personaName, timeout })
      } else {
        next.delete(personaName)
      }
      return next
    })
  }, [])

  const handleChannelTyping = useCallback((data: { channelId: string; isTyping: boolean; personaName: string }) => {
    if (!selectedChannel || data.channelId !== selectedChannel.id) return
    applyTyping(setTypingUsers, data.personaName, data.isTyping)
  }, [selectedChannel?.id, applyTyping])

  // ── Realtime: new channel message from another member ──
  const handleRealtimeChannelMessage = useCallback((message: SocketChannelMessage) => {
    if (!selectedChannel || message.channelId !== selectedChannel.id) return
    // Normalize the socket payload into the local ChannelMessage shape
    // (the wire object carries username on sender even though the socket
    // type doesn't declare it — fall back to '' if a future sender omits it)
    const incoming: ChannelMessage = {
      id: message.id,
      channelId: message.channelId,
      content: message.content,
      imageUrl: message.imageUrl,
      attachments: (message as { attachments?: ChatAttachment[] | null }).attachments ?? null,
      createdAt: message.createdAt,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatarUrl: message.sender.avatarUrl,
        username: (message.sender as { username?: string }).username ?? '',
      },
    }
    setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, incoming])
    markMessageNew(message.id)
    // The sender just typed — clear their chip
    setTypingUsers(prev => {
      const existing = prev.get(message.sender.name)
      if (existing?.timeout) clearTimeout(existing.timeout)
      if (!existing) return prev
      const next = new Map(prev)
      next.delete(message.sender.name)
      return next
    })
  }, [selectedChannel?.id, markMessageNew])

  // ── Realtime: reaction / pin / edit patches from other members ──
  const handleChannelUpdate = useCallback((update: ChannelUpdate) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== update.messageId) return m
      switch (update.type) {
        case 'reaction': {
          const reactions = update.reactions ?? m.reactions ?? []
          // hasReacted is per-viewer — recompute from the userIds in the
          // reaction groups against the CURRENT user's id
          const hasReacted = (reactions || []).flatMap(r => (r.userIds || []).includes(user?.id || '') ? [r.emoji] : [])
          return { ...m, reactions, hasReacted }
        }
        case 'pin':
          return { ...m, isPinned: update.isPinned ?? m.isPinned }
        case 'edit':
          return {
            ...m,
            content: update.content ?? m.content,
            editedAt: update.editedAt ?? m.editedAt,
          }
        default:
          return m
      }
    }))
  }, [user?.id])

  // ── Realtime: socket channel connection ──
  const { broadcastMessage: broadcastChannelMessage, broadcastEvent, sendTyping } = useChannelChat({
    channelId: selectedChannel?.id ?? null,
    onNewMessage: handleRealtimeChannelMessage,
    onTyping: handleChannelTyping,
    onUpdate: handleChannelUpdate,
  })

  // ── Realtime: thread typing state ──
  const [threadTypingUsers, setThreadTypingUsers] = useState<Map<string, { name: string; timeout: NodeJS.Timeout }>>(new Map())
  const handleThreadTyping = useCallback((data: { threadId: string; isTyping: boolean; personaName: string }) => {
    if (!activeThread || data.threadId !== activeThread.id) return
    applyTyping(setThreadTypingUsers, data.personaName, data.isTyping)
  }, [activeThread?.id, applyTyping])

  // ── Realtime: new thread reply from another member ──
  const [threadNewMessageIds, setThreadNewMessageIds] = useState<Set<string>>(new Set())
  // fetchThreads is declared further down — reach it through a ref so this
  // callback stays above the declaration without a temporal-dead-zone crash
  const fetchThreadsRef = useRef<(() => void) | null>(null)
  const handleRealtimeThreadMessage = useCallback((message: ThreadChatMessage) => {
    setThreadMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message as ThreadMessage])
    setThreadNewMessageIds(prev => {
      const next = new Set(prev)
      next.add(message.id)
      while (next.size > 40) {
        const oldest = next.keys().next().value
        if (oldest === undefined) break
        next.delete(oldest)
      }
      return next
    })
    // Bump the open thread's reply count + refresh the thread list ordering
    setActiveThread(prev => prev ? { ...prev, messageCount: prev.messageCount + 1 } : prev)
    fetchThreadsRef.current?.()
    // The replier just typed — clear their chip
    setThreadTypingUsers(prev => {
      const existing = prev.get(message.sender.name)
      if (existing?.timeout) clearTimeout(existing.timeout)
      if (!existing) return prev
      const next = new Map(prev)
      next.delete(message.sender.name)
      return next
    })
  }, [])

  // ── Realtime: socket thread connection ──
  const { broadcastThreadMessage, sendThreadTyping } = useThreadChat({
    threadId: activeThread?.id ?? null,
    onNewMessage: handleRealtimeThreadMessage,
    onTyping: handleThreadTyping,
  })

  // ── Channel selection with state reset ──
  const selectChannel = useCallback((channel: Channel) => {
    setSelectedChannel(channel)
    setReplyingTo(null)
    setEditingMessage(null)
    setShowSearch(false)
    setSearchQuery('')
    setActiveThread(null)
    setUnreadChannels(prev => {
      const next = new Set(prev)
      next.delete(channel.id)
      return next
    })
    // Realtime: typing state belongs to the channel we're leaving
    setTypingUsers(prev => {
      prev.forEach(u => { if (u.timeout) clearTimeout(u.timeout) })
      return new Map()
    })
    setThreadTypingUsers(prev => {
      prev.forEach(u => { if (u.timeout) clearTimeout(u.timeout) })
      return new Map()
    })
  }, [])
  
  // ── Handle member click ──
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
  
  // ── Fetch storyline data ──
  useEffect(() => {
    async function fetchStoryline() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/storylines/${storylineId}`)
        if (response.ok) {
          const data = await response.json()
          // Ensure arrays are always present (PB back-relation expand may
          // return undefined for channels/members/categories)
          const sl = data.storyline
          if (sl) {
            sl.channels = Array.isArray(sl.channels) ? sl.channels : []
            sl.members = Array.isArray(sl.members) ? sl.members : []
            sl.categories = Array.isArray(sl.categories) ? sl.categories : []
            sl.roles = Array.isArray(sl.roles) ? sl.roles : []
            sl.invites = Array.isArray(sl.invites) ? sl.invites : []
          }
          setStoryline(sl)
          const firstChannel = sl.categories?.length > 0 && sl.categories[0]?.channels?.length > 0
            ? sl.categories[0].channels[0]
            : sl.channels?.[0] || null
          if (firstChannel) {
            selectChannel(firstChannel)
          }
          if (sl.welcomeMessage && !hasShownWelcome) {
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
  
  // ── Fetch messages when channel changes ──
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
          setChannelSlowMode(data.channelSlowMode || 0)
          setChannelType(data.channelType || 'text')
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setIsLoadingMessages(false)
      }
    }
    fetchMessages()
  }, [selectedChannel])

  // ── Mark channel as read when entering ──
  useEffect(() => {
    if (selectedChannel && user) {
      fetch(`/api/storyline-channels/${selectedChannel.id}/unread`, { method: 'POST' }).catch(() => {})
    }
  }, [selectedChannel, user?.id])
  
  // ── Check muted channels ──
  useEffect(() => {
    if (!storyline || !user) return
    async function checkMutes() {
      const mutedSet = new Set<string>()
      for (const ch of (storyline.channels || [])) {
        try {
          const res = await fetch(`/api/storyline-channels/${ch.id}/mute`)
          if (res.ok) {
            const data = await res.json()
            if (data.isMuted) mutedSet.add(ch.id)
          }
        } catch {}
      }
      // Also check channels within categories
      for (const cat of (storyline.categories || [])) {
        for (const ch of cat.channels) {
          try {
            const res = await fetch(`/api/storyline-channels/${ch.id}/mute`)
            if (res.ok) {
              const data = await res.json()
              if (data.isMuted) mutedSet.add(ch.id)
            }
          } catch {}
        }
      }
      setMutedChannels(mutedSet)
    }
    checkMutes()
  }, [storyline?.id, user?.id])
  
  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // ── Slow mode timer ──
  useEffect(() => {
    if (slowModeCooldown > 0) {
      const timer = setTimeout(() => setSlowModeCooldown(prev => Math.max(0, prev - 1)), 1000)
      return () => clearTimeout(timer)
    }
  }, [slowModeCooldown])
  
  // ── Multi-attachment picker (files are validated + chipified by the
  // usePendingAttachments hook; uploads happen on send with per-file
  // progress on the chips) ──
  
  // ── Send message (with reply + attachments support) ──
  const sendMessage = async () => {
    if ((!newMessage.trim() && pendingAttachments.count === 0) || !activePersona || !selectedChannel || isSending) return
    if (slowModeCooldown > 0) return
    
    const storylineUsernames = storyline?.members.map((member) => member.user.username) ?? []
    const mentions = extractMentions(newMessage.trim()).filter((username) => storylineUsernames.includes(username))
    setIsSending(true)
    try {
      // Upload any pending attachments first (failed uploads are toasted
      // and their chips removed inside uploadAll)
      let uploaded: Awaited<ReturnType<typeof pendingAttachments.uploadAll>> = []
      if (pendingAttachments.count > 0) {
        uploaded = await pendingAttachments.uploadAll()
        if (uploaded.length === 0 && !newMessage.trim()) return
      }
      
      const body: any = {
        content: newMessage.trim(),
        senderPersonaId: activePersona.id,
        attachments: uploaded.length > 0 ? uploaded : null,
        mentions
      }
      if (replyingTo) {
        body.replyToId = replyingTo.id
      }
      const response = await fetch(`/api/storyline-channels/${selectedChannel.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(prev => prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message])
        setNewMessage('')
        pendingAttachments.clearAll()
        setReplyingTo(null)
        markMessageNew(data.message.id)
        // Realtime echo to everyone else viewing this channel (channelId is
        // injected here because the POST response omits it)
        broadcastChannelMessage({ ...data.message, channelId: selectedChannel.id })
        // We just sent — our own typing chip stops
        sendTyping(false)
        
        // Start slow mode cooldown if applicable
        if (channelSlowMode && channelSlowMode > 0) {
          setSlowModeCooldown(channelSlowMode)
        }
      } else {
        const err = await response.json().catch(() => null)
        toast({
          title: 'Failed to send message',
          description: err?.error || 'Please try again.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast({ title: 'Failed to send message', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }
  
  // ── Edit message ──
  const editMessage = async () => {
    if (!editingMessage || !editContent.trim() || !selectedChannel) return
    try {
      const response = await fetch(`/api/storyline-channels/${selectedChannel.id}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: editingMessage.id, content: editContent.trim() })
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, ...data.message } : m))
        setEditingMessage(null)
        setEditContent('')
        // Realtime: relay the edit to everyone else in the channel
        broadcastEvent({
          type: 'edit',
          messageId: editingMessage.id,
          content: data.message.content,
          editedAt: data.message.editedAt,
        })
      }
    } catch (error) {
      console.error('Failed to edit message:', error)
    }
  }
  
  // ── Search messages ──
  const searchMessages = useCallback(async (query: string) => {
    if (!selectedChannel || !query.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const response = await fetch(`/api/storyline-channels/${selectedChannel.id}/messages?search=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.messages)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [selectedChannel])
  
  // ── Debounced search ──
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!searchQuery.trim()) {
      return
    }
    searchTimerRef.current = setTimeout(() => searchMessages(searchQuery), 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [searchQuery, searchMessages])

  // Keep search results in sync - clear when query empties
  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return searchResults
  }, [searchQuery, searchResults])
  
  // ── Create channel (with type support) ──
  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !storyline || isCreatingChannel) return
    setIsCreatingChannel(true)
    try {
      const response = await fetch(`/api/storylines/${storylineId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName.trim(), type: newChannelType })
      })
      if (response.ok) {
        const data = await response.json()
        setStoryline(prev => prev ? { ...prev, channels: [...prev.channels, data.channel] } : null)
        setNewChannelName('')
        setNewChannelType('text')
        setShowCreateChannel(false)
        // Refetch storyline to update categories
        const refetch = await fetch(`/api/storylines/${storylineId}`)
        if (refetch.ok) {
          const d = await refetch.json()
          setStoryline(d.storyline)
        }
      }
    } catch (error) {
      console.error('Failed to create channel:', error)
    } finally {
      setIsCreatingChannel(false)
    }
  }
  
  // ── Create invite ──
  const handleCreateInvite = async () => {
    if (!storyline || isCreatingInvite) return
    setIsCreatingInvite(true)
    try {
      const response = await fetch(`/api/storylines/${storylineId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxUses: inviteMaxUses ? parseInt(inviteMaxUses) : 0,
          // hours until expiry; 0 = never
          expiresIn: inviteExpiresIn === 'never' ? 0 : parseInt(inviteExpiresIn)
        })
      })
      if (response.ok) {
        const data = await response.json()
        setInviteCode(data.invite.displayCode || formatSifyCode(data.invite.code))
        setInviteExpires(data.invite.expiresAt || null)
      }
    } catch (error) {
      console.error('Failed to create invite:', error)
    } finally {
      setIsCreatingInvite(false)
    }
  }
  
  // ── Copy SI.FY:// invite code ──
  const copyInviteLink = () => {
    if (!inviteCode) return
    const code = inviteCode.startsWith('SI.FY') ? inviteCode : formatSifyCode(inviteCode)
    navigator.clipboard.writeText(code)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }
  
  // ── Toggle reaction ──
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
        // Realtime: relay the new reaction state to everyone else in the
        // channel (their hasReacted is recomputed from userIds client-side)
        broadcastEvent({ type: 'reaction', messageId, reactions: data.reactions })
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
    setShowReactionPicker(null)
  }
  
  // ── Pin/unpin message ──
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
      const newPinned = !isPinned
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isPinned: newPinned } : m
      ))
      // Realtime: relay the pin state to everyone else in the channel
      broadcastEvent({ type: 'pin', messageId, isPinned: newPinned })
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }
  
  // ── Fetch pinned messages ──
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
  
  // ── Toggle channel mute ──
  const toggleChannelMute = async (channelId: string) => {
    try {
      const response = await fetch(`/api/storyline-channels/${channelId}/mute`, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setMutedChannels(prev => {
          const next = new Set(prev)
          if (data.isMuted) next.add(channelId)
          else next.delete(channelId)
          return next
        })
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error)
    }
  }
  
  // ── Create thread ──
  const handleCreateThread = async () => {
    if (!threadParentMessage || !threadName.trim() || !selectedChannel || isCreatingThread) return
    setIsCreatingThread(true)
    try {
      const response = await fetch(`/api/storyline-channels/${selectedChannel.id}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: threadParentMessage.id, name: threadName.trim() })
      })
      if (response.ok) {
        const data = await response.json()
        setActiveThread(data.thread)
        setThreadParentMessage(null)
        setThreadName('')
        setShowThreadModal(false)
        // Refresh threads
        fetchThreads()
      } else if (response.status === 409) {
        const data = await response.json()
        if (data.thread) {
          setActiveThread(data.thread)
        }
        setShowThreadModal(false)
      }
    } catch (error) {
      console.error('Failed to create thread:', error)
    } finally {
      setIsCreatingThread(false)
    }
  }
  
  // ── Fetch threads for current channel ──
  const fetchThreads = useCallback(async () => {
    if (!selectedChannel) return
    try {
      const response = await fetch(`/api/storyline-channels/${selectedChannel.id}/threads`)
      if (response.ok) {
        const data = await response.json()
        setThreads(data.threads || [])
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error)
    }
  }, [selectedChannel])
  
  useEffect(() => {
    fetchThreads()
    // Keep the realtime thread-reply handler's ref in sync so incoming
    // replies can refresh the thread list ordering
    fetchThreadsRef.current = () => { fetchThreads() }
  }, [fetchThreads])
  
  // ── Realtime: reset thread typing markers when switching/closing threads ──
  useEffect(() => {
    setThreadNewMessageIds(new Set())
    setThreadTypingUsers(prev => {
      prev.forEach(u => { if (u.timeout) clearTimeout(u.timeout) })
      return new Map()
    })
  }, [activeThread?.id])
  
  // ── Fetch messages for the active thread ──
  const fetchThreadMessages = useCallback(async (threadId: string) => {
    setIsLoadingThreadMessages(true)
    try {
      const response = await fetch(`/api/threads/${threadId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setThreadMessages(Array.isArray(data.messages) ? data.messages : [])
      } else {
        setThreadMessages([])
      }
    } catch (error) {
      console.error('Failed to fetch thread messages:', error)
      setThreadMessages([])
    } finally {
      setIsLoadingThreadMessages(false)
    }
  }, [])
  
  // Load thread messages whenever a thread is opened; clear on close
  useEffect(() => {
    if (activeThread) {
      fetchThreadMessages(activeThread.id)
    } else {
      setThreadMessages([])
    }
  }, [activeThread, fetchThreadMessages])
  
  // Keep the thread scrolled to the newest reply
  useEffect(() => {
    threadMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages])
  
  // ── Send a reply in the active thread (text and/or attachments) ──
  const sendThreadMessage = async () => {
    if (!activeThread || !activePersona || isSendingThreadMessage) return
    if (!newThreadMessage.trim() && threadPendingAttachments.count === 0) return
    
    setIsSendingThreadMessage(true)
    try {
      // Upload any pending attachments first (failed uploads are toasted
      // and their chips removed inside uploadAll)
      let uploaded: Awaited<ReturnType<typeof threadPendingAttachments.uploadAll>> = []
      if (threadPendingAttachments.count > 0) {
        uploaded = await threadPendingAttachments.uploadAll()
        if (uploaded.length === 0 && !newThreadMessage.trim()) return
      }
      
      const response = await fetch(`/api/threads/${activeThread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newThreadMessage.trim(),
          senderPersonaId: activePersona.id,
          attachments: uploaded.length > 0 ? uploaded : null,
        })
      })
      if (response.ok) {
        const data = await response.json()
        setThreadMessages(prev => prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message])
        setNewThreadMessage('')
        threadPendingAttachments.clearAll()
        // Mark the reply for the entrance animation
        setThreadNewMessageIds(prev => {
          const next = new Set(prev)
          next.add(data.message.id)
          return next
        })
        // Realtime echo to everyone else viewing this thread (threadId is
        // injected here because the POST response omits it)
        broadcastThreadMessage({ ...data.message, threadId: activeThread.id })
        // We just sent — our own typing chip stops
        sendThreadTyping(false)
        // Bump the local message count + refresh thread list ordering
        setActiveThread(prev => prev ? { ...prev, messageCount: prev.messageCount + 1 } : prev)
        fetchThreads()
      } else {
        const err = await response.json().catch(() => null)
        toast({
          title: 'Failed to send reply',
          description: err?.error || 'Please try again.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Failed to send thread message:', error)
      toast({ title: 'Failed to send reply', variant: 'destructive' })
    } finally {
      setIsSendingThreadMessage(false)
    }
  }
  
  // ── Boost modal ──
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
  
  // ── Helpers ──
  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      'Romance': '💕', 'Action': '⚔️', 'Horror': '👻', 'Fantasy': '🧙',
      'Sci-Fi': '🚀', 'Slice of Life': '🌸', 'Mystery': '🔍', 'Comedy': '😂',
      'Drama': '🎭', 'Adventure': '🗺️', 'Thriller': '😱', 'Historical': '📜',
      'Supernatural': '✨', 'Other': '📖'
    }
    return emojis[category] || '📖'
  }
  
  const getMemberRoleDisplay = (member: StorylineMember) => {
    if (member.role === 'owner') return { label: 'Owner', color: '#f59e0b', icon: <Crown className="w-3.5 h-3.5 text-amber-400" /> }
    if (member.role === 'admin') return { label: 'Admin', color: '#14b8a6', icon: <Sparkles className={`w-3 h-3 ${accent.text}`} /> }
    if (member.customRole) return { label: member.customRole.name, color: member.customRole.color, icon: null }
    return { label: 'Member', color: '#64748b', icon: null }
  }
  
  const getMemberGroups = () => {
    if (!storyline) return []
    const groups: { title: string; color: string; members: StorylineMember[] }[] = []
    const owners = (storyline.members || []).filter(m => m.role === 'owner')
    if (owners.length > 0) groups.push({ title: 'Owner', color: '#f59e0b', members: owners })
    const admins = (storyline.members || []).filter(m => m.role === 'admin')
    if (admins.length > 0) groups.push({ title: 'Admin', color: '#14b8a6', members: admins })
    const customRoleMembers = (storyline.members || []).filter(m => m.role !== 'owner' && m.role !== 'admin' && m.customRole)
    const roleGroups = customRoleMembers.reduce((acc, member) => {
      const roleName = member.customRole!.name
      const roleColor = member.customRole!.color
      if (!acc[roleName]) acc[roleName] = { title: roleName, color: roleColor, members: [] }
      acc[roleName].members.push(member)
      return acc
    }, {} as Record<string, { title: string; color: string; members: StorylineMember[] }>)
    Object.values(roleGroups).forEach(g => groups.push(g))
    const regularMembers = (storyline.members || []).filter(m => m.role !== 'owner' && m.role !== 'admin' && !m.customRole)
    if (regularMembers.length > 0) groups.push({ title: 'Members', color: '#64748b', members: regularMembers })
    return groups
  }
  
  // ── Loading States ──
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
  // Only show settings to users with canChangeSettings permission
  const canViewSettings = storyline.role === 'owner' || storyline.role === 'admin' || !!storyline.customRole?.canChangeSettings
  
  // ── Channel right-click context menu ──
  const handleChannelContextMenu = (e: React.MouseEvent, channel: Channel) => {
    const isMuted = mutedChannels.has(channel.id)
    const isSelected = selectedChannel?.id === channel.id
    const items: ContextMenuItem[] = [
      {
        label: 'Open Channel',
        icon: <ExternalLink className="w-3.5 h-3.5" />,
        disabled: isSelected,
        onClick: () => selectChannel(channel),
      },
      {
        label: 'Copy Channel Link',
        icon: <Copy className="w-3.5 h-3.5" />,
        onClick: () => {
          const url = `${window.location.origin}/storylines/${storylineId}?channel=${channel.id}`
          try { navigator.clipboard.writeText(url) } catch {}
          toast({ title: 'Channel link copied', description: url })
        },
      },
      {
        label: 'Mark Channel as Read',
        icon: <Check className="w-3.5 h-3.5" />,
        onClick: async () => {
          try {
            await fetch(`/api/storyline-channels/${channel.id}/unread`, { method: 'POST' })
            setUnreadChannels(prev => {
              const next = new Set(prev)
              next.delete(channel.id)
              return next
            })
            toast({ title: `#${channel.name} marked as read` })
          } catch {
            toast({ title: 'Could not mark channel as read', variant: 'destructive' })
          }
        },
      },
      {
        label: isMuted ? 'Unmute Channel' : 'Mute Channel',
        icon: isMuted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />,
        onClick: () => toggleChannelMute(channel.id),
      },
      {
        label: 'Edit Channel Topic',
        icon: <Pencil className="w-3.5 h-3.5" />,
        disabled: !canManageChannels,
        onClick: () => {
          const newTopic = window.prompt(`Edit topic for #${channel.name}:`, channel.topic || '')
          if (newTopic === null) return
          (async () => {
            try {
              const response = await fetch(`/api/storyline-channels/${channel.id}/topic`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: newTopic.trim() }),
              })
              if (response.ok) {
                const data = await response.json()
                const updatedTopic: string | null =
                  data.channel?.topic !== undefined && data.channel?.topic !== null
                    ? data.channel.topic
                    : (newTopic.trim() || null)
                // Update local state if this is the selected channel
                if (selectedChannel?.id === channel.id) {
                  setChannelTopic(updatedTopic)
                }
                // Update storyline.channels list
                setStoryline(prev => prev ? {
                  ...prev,
                  channels: (prev.channels || []).map(c => c.id === channel.id ? { ...c, topic: updatedTopic } : c),
                  categories: (prev.categories || []).map(cat => ({
                    ...cat,
                    channels: cat.channels.map(c => c.id === channel.id ? { ...c, topic: updatedTopic } : c),
                  })),
                } : null)
                toast({ title: 'Channel topic updated' })
              } else {
                const err = await response.json().catch(() => ({}))
                toast({ title: 'Could not update topic', description: (err as any).error || 'You may not have permission.', variant: 'destructive' })
              }
            } catch {
              toast({ title: 'Could not update topic', variant: 'destructive' })
            }
          })()
        },
      },
      {
        label: 'Pin Channel',
        icon: <Pin className="w-3.5 h-3.5" />,
        onClick: () => toast({ title: 'Pin Channel coming soon', description: 'Pinned channels will appear at the top of the channel list.' }),
      },
      {
        label: 'Notification Settings',
        icon: <Bell className="w-3.5 h-3.5" />,
        items: [
          { label: 'All Messages', icon: <BellRing className="w-3.5 h-3.5" />, onClick: () => toast({ title: `Notifications for #${channel.name}: All` }) },
          { label: 'Mentions Only', icon: <AtSign className="w-3.5 h-3.5" />, onClick: () => toast({ title: `Notifications for #${channel.name}: Mentions Only` }) },
          { label: isMuted ? 'Muted (current)' : 'Mute Channel', icon: <BellOff className="w-3.5 h-3.5" />, onClick: () => { if (!isMuted) toggleChannelMute(channel.id) } },
        ],
      },
      { type: 'separator' },
      {
        type: 'danger',
        label: canManageChannels ? 'Delete Channel' : 'Delete Channel (no permission)',
        icon: <Trash2 className="w-3.5 h-3.5" />,
        disabled: !canManageChannels,
        onClick: async () => {
          if (!confirm(`Delete #${channel.name}? All messages in this channel will be lost. This cannot be undone.`)) return
          try {
            // Try the channel delete endpoint (DELETE on the channel route)
            const response = await fetch(`/api/storyline-channels/${channel.id}`, { method: 'DELETE' })
            if (response.ok) {
              toast({ title: `Deleted #${channel.name}` })
              // Refetch storyline
              const refetch = await fetch(`/api/storylines/${storylineId}`)
              if (refetch.ok) {
                const d = await refetch.json()
                if (d.storyline) {
                  setStoryline(d.storyline)
                  if (selectedChannel?.id === channel.id) {
                    const firstChannel = d.storyline.categories?.length > 0 && d.storyline.categories[0]?.channels?.length > 0
                      ? d.storyline.categories[0].channels[0]
                      : d.storyline.channels?.[0] || null
                    if (firstChannel) selectChannel(firstChannel)
                    else setSelectedChannel(null)
                  }
                }
              }
            } else if (response.status === 404) {
              toast({ title: 'Channel deletion is coming soon', description: 'This endpoint is not yet available.', variant: 'destructive' })
            } else {
              const err = await response.json().catch(() => ({}))
              toast({ title: 'Could not delete channel', description: (err as any).error || `HTTP ${response.status}`, variant: 'destructive' })
            }
          } catch {
            toast({ title: 'Could not delete channel', variant: 'destructive' })
          }
        },
      },
      {
        type: 'danger',
        label: 'Report Channel',
        icon: <Flag className="w-3.5 h-3.5" />,
        onClick: async () => {
          const reason = window.prompt(`Report #${channel.name} — please enter a short reason:`)
          if (!reason || !reason.trim()) return
          try {
            const response = await fetch('/api/reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'storyline_message', referenceId: channel.id, reason: reason.trim() }),
            })
            if (response.ok) {
              toast({ title: 'Report submitted', description: 'Our moderation team will review it shortly.' })
            } else {
              const err = await response.json().catch(() => ({}))
              toast({ title: 'Failed to report', description: (err as any).error || 'Please try again later.', variant: 'destructive' })
            }
          } catch {
            toast({ title: 'Failed to report', variant: 'destructive' })
          }
        },
      },
    ]
    showContextMenu(e, items, `${channel.type === 'voice' ? '' : '#'}${channel.name}`)
  }
  
  // ── Render Channel in Sidebar ──
  const renderChannel = (channel: Channel) => {
    const isSelected = selectedChannel?.id === channel.id
    const isMuted = mutedChannels.has(channel.id)
    const isUnread = unreadChannels.has(channel.id)
    
    return (
      <Tooltip key={channel.id}>
        <TooltipTrigger asChild>
          <button
            onClick={() => selectChannel(channel)}
            onContextMenu={(e) => handleChannelContextMenu(e, channel)}
            className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-all group relative ${
              isSelected
                ? `${accent.bgTint} text-foreground font-medium`
                : isUnread
                  ? 'text-foreground hover:bg-white/[0.04]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
            }`}
          >
            {isSelected && <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full ${accent.bgSolid}`} />}
            <ChannelIcon type={channel.type} />
            <span className={`truncate text-left text-[13px] flex-1 ${isUnread && !isSelected ? 'font-medium' : ''}`}>{channel.name}</span>
            <ChannelTypeLabel type={channel.type} />
            {isUnread && !isSelected && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
            {isMuted && (
              <BellOff className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className={`${accent.bgSurface} border ${accent.borderSubtle} text-foreground z-50`}>
          <div className="flex items-center gap-1.5">
            <ChannelIcon type={channel.type} className="w-3.5 h-3.5" />
            <span className="font-medium">{channel.type === 'voice' ? '' : '#'}{channel.name}</span>
          </div>
          {channel.topic && <p className="text-xs text-muted-foreground mt-1 max-w-48">{channel.topic}</p>}
          {channel.slowMode && channel.slowMode > 0 && (
            <p className="text-xs text-amber-500/80 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Slow mode: {channel.slowMode}s
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }
  
  // ── Render Single Message ──
  const renderMessage = (message: ChannelMessage, showHeader: boolean = true) => {
    const isMine = message.sender.id === activePersona?.id
    const memberInfo = (storyline.members || []).find(m => m.user.id === message.sender.id)
    const memberRole = memberInfo ? getMemberRoleDisplay(memberInfo) : null
    const urls = message.content ? extractUrls(message.content) : []
    const hasThread = threads.some(t => t.messageId === message.id)
    
    return (
      <ContextMenu key={message.id}>
        <ContextMenuTrigger asChild>
          <div className={`flex gap-3 ${showHeader ? 'pt-2 mt-1' : 'py-0.5'} group persona-message hover:bg-white/[0.02] rounded-md transition-colors ${isMine ? accent.bgSubtle : ''}`}>
            {/* Avatar — only show on header messages, otherwise spacer */}
            <div className="flex-shrink-0 pt-0.5 w-10">
              {showHeader ? (
                <Avatar className={`w-10 h-10 border ${accent.avatarBorder} cursor-pointer hover:opacity-80 transition-opacity`} onClick={() => handleMemberClick(message.sender.id)}>
                  <AvatarImage src={message.sender.avatarUrl || undefined} />
                  <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-sm font-semibold`}>
                    {message.sender.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Reply reference */}
              {message.replyTo && (
                <div className="flex items-center gap-1.5 mb-1 px-2 py-1 rounded-md bg-white/[0.03] border-l-2 border-slate-500/50 cursor-pointer hover:bg-white/[0.05] transition-colors">
                  <Reply className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span className="text-xs text-slate-400 font-medium">{message.replyTo.senderName}</span>
                  <span className="text-xs text-slate-500 truncate">{message.replyTo.content}</span>
                </div>
              )}
              
              {/* Header row — only on header messages (grouping) */}
              {showHeader && (
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-semibold hover:underline cursor-pointer" style={memberRole && memberRole.color ? { color: memberRole.color } : { color: '#5eead4' }} onClick={() => handleMemberClick(message.sender.id)}>
                  {message.sender.name}
                </span>
                {memberRole && memberRole.label !== 'Member' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0" style={{ borderColor: memberRole.color + '40', color: memberRole.color, backgroundColor: memberRole.color + '15' }}>
                    {memberRole.icon}{memberRole.label}
                  </span>
                )}
                {message.isPinned && (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-400/80 flex-shrink-0">
                    <Pin className="w-2.5 h-2.5" />Pinned
                  </span>
                )}
                <span className="text-[11px] text-slate-500 flex-shrink-0 ml-0.5">
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </span>
                {message.editedAt && (
                  <span className="text-[10px] text-slate-600 flex-shrink-0">(edited)</span>
                )}
              </div>
              )}
              
              {/* Editing mode */}
              {editingMessage?.id === message.id ? (
                <div className="flex gap-2 mt-1">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editMessage() } if (e.key === 'Escape') { setEditingMessage(null); setEditContent('') } }}
                    className="flex-1 persona-input resize-none min-h-[36px] max-h-[100px] rounded-lg py-1.5 px-3 text-sm"
                    autoFocus
                  />
                  <div className="flex flex-col gap-1">
                    <Button onClick={editMessage} size="sm" className="btn-persona h-7 w-7 p-0 rounded-lg">
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button onClick={() => { setEditingMessage(null); setEditContent('') }} size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-slate-400">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Attachments — collapsible dropdown (collapsed by default),
                      uniform for multi-image and legacy single-image messages */}
                  <MessageAttachments attachments={message.attachments ?? (message.imageUrl ? [{ url: message.imageUrl }] : undefined)} />
                  
                  {/* Text */}
                  {message.content && (
                    <div className="text-[14px] text-slate-200/90 whitespace-pre-wrap leading-relaxed break-words">
                      {parseMessageWithMarkdown(message.content, storyline?.members.map((member) => member.user.username) ?? [])}
                    </div>
                  )}
                  
                  {/* URL Embed Previews */}
                  {urls.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {urls.slice(0, 2).map((url, i) => (
                        <LinkPreview key={i} url={url} />
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* Reactions */}
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
              
              {/* Thread indicator */}
              {hasThread && (
                <button 
                  onClick={() => {
                    const thread = threads.find(t => t.messageId === message.id)
                    if (thread) setActiveThread(thread)
                  }}
                  className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
                >
                  <ThreadIcon className="w-3.5 h-3.5" />
                  <span>Thread</span>
                  <span className="text-slate-600">•</span>
                  <span>{threads.find(t => t.messageId === message.id)?.messageCount || 0} messages</span>
                </button>
              )}
              
              {/* Hover action bar */}
              <div className="flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setReplyingTo(message); setEditingMessage(null) }} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all" title="Reply">
                  <Reply className="w-3 h-3" />
                </button>
                {isMine && (
                  <button onClick={() => { setEditingMessage(message); setEditContent(message.content) }} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all" title="Edit">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all" title="React">
                  <Smile className="w-3 h-3" />
                </button>
                {canPinMessages && (
                  <button onClick={() => togglePin(message.id, !!message.isPinned)} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all ${message.isPinned ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]'}`} title={message.isPinned ? 'Unpin' : 'Pin'}>
                    <Pin className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => { navigator.clipboard.writeText(message.content) }} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all" title="Copy Text">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={() => { setThreadParentMessage(message); setThreadName(`Thread: ${message.content.slice(0, 30)}...`); setShowThreadModal(true) }} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all" title="Create Thread">
                  <ThreadIcon className="w-3 h-3" />
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
          <ContextMenuItem onClick={() => { setReplyingTo(message) }} className="text-slate-200 focus:bg-white/[0.08] focus:text-slate-100">
            <Reply className="w-4 h-4 mr-2" /> Reply
          </ContextMenuItem>
          {isMine && (
            <ContextMenuItem onClick={() => { setEditingMessage(message); setEditContent(message.content) }} className="text-slate-200 focus:bg-white/[0.08] focus:text-slate-100">
              <Pencil className="w-4 h-4 mr-2" /> Edit Message
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={() => toggleReaction(message.id, '👍')} className="text-slate-200 focus:bg-white/[0.08] focus:text-slate-100">
            <Smile className="w-4 h-4 mr-2" /> React
          </ContextMenuItem>
          <ContextMenuItem onClick={() => togglePin(message.id, !!message.isPinned)} className="text-slate-200 focus:bg-white/[0.08] focus:text-slate-100">
            <Pin className="w-4 h-4 mr-2" /> {message.isPinned ? 'Unpin Message' : 'Pin Message'}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { setThreadParentMessage(message); setThreadName(`Thread: ${message.content.slice(0, 30)}...`); setShowThreadModal(true) }} className="text-slate-200 focus:bg-white/[0.08] focus:text-slate-100">
            <ThreadIcon className="w-4 h-4 mr-2" /> Create Thread
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-white/[0.06]" />
          <ContextMenuItem onClick={() => { navigator.clipboard.writeText(message.content) }} className="text-slate-200 focus:bg-white/[0.08] focus:text-slate-100">
            <Copy className="w-4 h-4 mr-2" /> Copy Text
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  }
  
  // ────────────────────────────────────────────────────────────────────────
  // ── MAIN RENDER ──
  // ────────────────────────────────────────────────────────────────────────
  
  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      {/* ── Channel Sidebar ── */}
      <div className="w-60 bg-[#0e1015] border-r border-white/[0.08] flex flex-col flex-shrink-0">
        {/* Storyline Header */}
        <div className="h-12 px-3 flex items-center gap-2 border-b border-white/[0.08] bg-[#0f1117]/50 flex-shrink-0 shadow-sm">
          <button onClick={onBack} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className={`w-7 h-7 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0 ${storyline.iconUrl ? '' : `bg-gradient-to-br ${accent.from} ${accent.to}`}`} title={storyline.name}>
            {storyline.iconUrl ? (
              <img src={storyline.iconUrl} alt={storyline.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-xs">{storyline.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-100 truncate text-sm leading-tight">{storyline.name}</h2>
          </div>
          {storyline.boostTier > 0 && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-400 gap-0.5 flex-shrink-0">
              <Zap className="w-2.5 h-2.5" />T{storyline.boostTier}
            </Badge>
          )}
          <button onClick={() => { setInviteCode(null); setInviteExpires(null); setInviteCopied(false); setShowInviteModal(true) }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all flex-shrink-0" title="Invite People">
            <UserPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={openBoostModal} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all flex-shrink-0" title="Boost">
            <Rocket className="w-3.5 h-3.5" />
          </button>
          {canViewSettings && (
            <button onClick={() => setShowSettings(true)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all flex-shrink-0" title="Settings">
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
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
                          <button onClick={() => { setShowCreateChannel(true); setNewChannelType('text') }} className="w-4 h-4 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] transition-all">
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {category.channels && category.channels.length > 0 ? (
                          category.channels.map(renderChannel)
                        ) : (
                          <p className="text-[11px] text-slate-400/40 text-center py-1.5 px-2">No channels</p>
                        )}
                      </div>
                      
                      {/* Threads under category channels */}
                      {category.channels.flatMap(ch => threads.filter(t => t.messageId && messages.some(m => m.id === t.messageId && m.channelId === ch.id))).length > 0 && (
                        <div className="ml-6 mt-1 space-y-0.5">
                          {threads.filter(t => messages.some(m => m.id === t.messageId)).slice(0, 3).map(thread => (
                            <button
                              key={thread.id}
                              onClick={() => setActiveThread(thread)}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${activeThread?.id === thread.id ? `${accent.bgTint} text-slate-100` : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'}`}
                            >
                              <ThreadIcon className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{thread.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between px-1 py-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">Channels</span>
                      {canManageChannels && (
                        <button onClick={() => { setShowCreateChannel(true); setNewChannelType('text') }} className="w-4 h-4 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] transition-all">
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5 mt-0.5">
                      {(storyline.channels || []).map(renderChannel)}
                      {(storyline.channels || []).length === 0 && (
                        <p className="text-[11px] text-slate-400/40 text-center py-3">No channels yet</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </TooltipProvider>
        </div>
        
        {/* Bottom Buttons */}
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
      
      {/* ── Main Chat Area ── */}
      {!showWiki && (
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Channel Header (Improved) ── */}
        <div className="border-b border-white/[0.08] bg-[#0f1117]/50 backdrop-blur-sm flex-shrink-0">
          {/* Main header row */}
          <div className="px-4 flex items-center" style={{ minHeight: '3rem' }}>
            <ChannelIcon type={channelType} className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div className="ml-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-slate-100">{selectedChannel?.name || 'Select a channel'}</h3>
                {channelType === 'announcement' && (
                  <Badge variant="outline" className="px-1.5 py-0 text-[9px] border-amber-500/30 bg-amber-500/10 text-amber-400 gap-0.5">
                    <Megaphone className="w-2.5 h-2.5" />Announcement
                  </Badge>
                )}
                {channelType === 'voice' && (
                  <Badge variant="outline" className="px-1.5 py-0 text-[9px] border-sky-500/30 bg-sky-500/10 text-sky-400 gap-0.5">
                    <Volume2 className="w-2.5 h-2.5" />Voice
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-3 flex-shrink-0">
              {/* Slow mode indicator */}
              {channelSlowMode && channelSlowMode > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] text-amber-400 font-medium">{channelSlowMode}s</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className={`${accent.bgSurface} border ${accent.borderSubtle}`}>
                      <p className="text-sm text-slate-200">Slow mode: {channelSlowMode} second{channelSlowMode !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-slate-400 mt-1">You must wait between messages</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Search Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => { setShowSearch(!showSearch); if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 100) }} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${showSearch ? 'text-slate-200 bg-white/[0.08]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'}`}>
                      <Search className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className={`${accent.bgSurface} border ${accent.borderSubtle}`}>Search Messages</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Notification Bell */}
              {selectedChannel && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => toggleChannelMute(selectedChannel.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all">
                        {mutedChannels.has(selectedChannel.id) ? <BellOff className="w-4 h-4 text-red-400/70" /> : <Bell className="w-4 h-4" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className={`${accent.bgSurface} border ${accent.borderSubtle}`}>
                      {mutedChannels.has(selectedChannel.id) ? 'Unmute Channel' : 'Mute Channel'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
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
          
          {/* Topic bar (click to expand) */}
          {channelTopic && (
            <button 
              onClick={() => setTopicExpanded(!topicExpanded)} 
              className="w-full px-4 pb-2 flex items-start gap-2 text-left hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-xs text-slate-500 truncate flex-1">{channelTopic}</span>
              {topicExpanded ? <ChevronUp className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />}
            </button>
          )}
          
          {/* Expanded topic */}
          {topicExpanded && channelTopic && (
            <div className={`mx-4 mb-2 p-3 rounded-lg ${accent.bgSurface} border ${accent.borderSubtle}`}>
              <p className="text-sm text-slate-200">{channelTopic}</p>
            </div>
          )}
          
          {/* Search bar (toggled) */}
          {showSearch && (
            <div className="px-4 pb-2 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages in this channel..."
                  className="pl-9 persona-input h-9 text-sm rounded-lg"
                />
              </div>
              <Button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }} variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 h-9">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Search Results Dropdown */}
          {showSearch && searchQuery && (
            <div className={`mx-4 mb-2 rounded-lg border ${accent.borderSubtle} ${accent.bgSurface} max-h-64 overflow-y-auto`}>
              {isSearching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                </div>
              ) : filteredSearchResults.length === 0 ? (
                <div className="text-center py-4 text-sm text-slate-500">No results found</div>
              ) : (
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                    {filteredSearchResults.length} result{filteredSearchResults.length !== 1 ? 's' : ''}
                  </div>
                  {filteredSearchResults.slice(0, 10).map(msg => (
                    <button key={msg.id} className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0" onClick={() => {
                      // Scroll to the message in the main list
                      const el = document.getElementById(`msg-${msg.id}`)
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      setShowSearch(false)
                      setSearchQuery('')
                      setSearchResults([])
                    }}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium" style={{ color: '#5eead4' }}>{msg.sender.name}</span>
                        <span className="text-[10px] text-slate-600">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{msg.content}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Welcome Message Banner (single instance) */}
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
        
        {/* Thread Panel (side panel for active thread) */}
        {activeThread ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2 border-b border-white/[0.08] flex items-center gap-3 bg-[#0f1117]/50">
              <ThreadIcon className="w-4 h-4 text-slate-400" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-slate-200 truncate">{activeThread.name}</h4>
                <p className="text-[11px] text-slate-500">
                  {activeThread.messageCount > 0
                    ? `${activeThread.messageCount} message${activeThread.messageCount !== 1 ? 's' : ''} in thread`
                    : 'Thread started'}
                </p>
              </div>
              <Button onClick={() => setActiveThread(null)} variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {/* Thread original message + replies */}
            <ScrollArea className="flex-1 px-4 py-3">
              {(() => {
                // Prefer the live message from the channel list (has sender +
                // attachments + stays fresh); fall back to the thread payload
                const origin = messages.find(m => m.id === activeThread.messageId)
                const originName = origin?.sender?.name || activeThread.message?.sender?.name || 'Unknown'
                const originContent = origin?.content ?? activeThread.message?.content ?? ''
                const originAtts = origin?.attachments ?? (origin?.imageUrl ? [{ url: origin.imageUrl }] : null)
                return (
                  <div className={`p-3 rounded-lg ${accent.bgSurface} border ${accent.borderSubtle} mb-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-slate-200">{originName}</span>
                      <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08]">Original message</span>
                    </div>
                    {originContent && (
                      <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">{originContent}</p>
                    )}
                    {originAtts && originAtts.length > 0 && (
                      <div className="mt-1.5">
                        <MessageAttachments attachments={originAtts} />
                      </div>
                    )}
                  </div>
                )
              })()}
              
              {/* Thread replies */}
              {isLoadingThreadMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                </div>
              ) : threadMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <ThreadIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No replies yet</p>
                  <p className="text-xs mt-1">Start the thread conversation below</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {threadMessages.map((tm) => (
                    <div key={tm.id} className={`flex gap-2.5 ${threadNewMessageIds.has(tm.id) ? 'message-enter' : ''}`}>
                      <Avatar className="w-7 h-7 border border-white/[0.08] flex-shrink-0 mt-0.5">
                        <AvatarImage src={tm.sender.avatarUrl || undefined} />
                        <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-[11px]`}>
                          {tm.sender.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-medium" style={{ color: '#5eead4' }}>{tm.sender.name}</span>
                          <span className="text-[10px] text-slate-600">{formatDistanceToNow(new Date(tm.createdAt), { addSuffix: true })}</span>
                        </div>
                        {tm.content && (
                          <p className="text-sm text-slate-300 whitespace-pre-wrap break-words leading-relaxed mt-0.5">
                            {parseMessageWithMarkdown(tm.content, storyline?.members.map((member) => member.user.username) ?? [])}
                          </p>
                        )}
                        <MessageAttachments attachments={tm.attachments ?? (tm.imageUrl ? [{ url: tm.imageUrl }] : undefined)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={threadMessagesEndRef} />
            </ScrollArea>
            
            {/* Thread reply composer */}
            <div className="p-3 border-t border-white/[0.08] bg-[#0f1117]/50">
              {activePersona ? (
                <>
                  {/* Pending attachment chips for thread replies */}
                  <AttachmentChipsBar picker={threadPendingAttachments} />
                  <div className="flex gap-2 items-center">
                    {/* Hidden multi-file attachment picker input for threads */}
                    <input
                      ref={threadFileInputRef}
                      type="file"
                      multiple
                      accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(',')}
                      onChange={(e) => {
                        threadPendingAttachments.addFiles(e.target.files)
                        e.target.value = ''
                      }}
                      className="hidden"
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex flex-shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => threadFileInputRef.current?.click()}
                            disabled={threadPendingAttachments.isAtMax || isSendingThreadMessage}
                            aria-label={threadPendingAttachments.isAtMax ? 'Maximum attachments reached' : 'Attach images to reply'}
                            title={threadPendingAttachments.isAtMax ? undefined : 'Attach images'}
                            className="text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 rounded-lg h-9 w-9 flex-shrink-0 border border-white/[0.08] disabled:opacity-50"
                          >
                            {threadPendingAttachments.anyUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {threadPendingAttachments.isAtMax && <TooltipContent>Max 5 attachments</TooltipContent>}
                    </Tooltip>
                    <Input
                      placeholder="Reply in thread..."
                      value={newThreadMessage}
                      onChange={(e) => { setNewThreadMessage(e.target.value); if (e.target.value.trim()) sendThreadTyping(true) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendThreadMessage() } }}
                      disabled={isSendingThreadMessage}
                      className="persona-input flex-1 h-9 text-sm rounded-lg"
                    />
                    <Button
                      onClick={sendThreadMessage}
                      disabled={(!newThreadMessage.trim() && threadPendingAttachments.count === 0) || isSendingThreadMessage || threadPendingAttachments.anyUploading}
                      className="btn-persona h-9 w-9 p-0 rounded-lg flex-shrink-0"
                    >
                      {isSendingThreadMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  {/* Thread typing indicator (realtime) */}
                  <TypingIndicator names={Array.from(threadTypingUsers.values()).map(u => u.name)} variant="thread" />
                </>
              ) : (
                <div className="text-center py-1.5 text-xs text-slate-500">
                  Create and activate a character to reply in threads
                </div>
              )}
            </div>
          </div>
        ) : (
        /* ── Messages ── */
        <ScrollArea className="flex-1 px-4 py-2">
          {!selectedChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Hash className="w-12 h-12 mb-3" />
              <p className="text-lg font-medium text-slate-200">Select a channel</p>
              <p className="text-sm">Choose a channel from the sidebar to start chatting</p>
            </div>
          ) : channelType === 'voice' ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Volume2 className="w-12 h-12 mb-3" />
              <p className="text-lg font-medium text-slate-200">Voice Channel</p>
              <p className="text-sm text-slate-400">{selectedChannel.name} is a voice channel</p>
              <p className="text-xs text-slate-500 mt-2">Voice channels are for voice conversations. Text messages go in text channels.</p>
              {channelTopic && (
                <div className={`mt-4 p-3 rounded-lg ${accent.bgSurface} border ${accent.borderSubtle} max-w-sm text-center`}>
                  <p className="text-sm text-slate-300">{channelTopic}</p>
                </div>
              )}
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 relative">
              {/* Ambient glow behind the empty state */}
              <div className="absolute top-1/2 -translate-y-8 w-56 h-56 rounded-full bg-teal-500/[0.07] blur-3xl pointer-events-none" aria-hidden="true" />
              <div className="relative w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-slate-200">No messages yet</p>
              <p className="text-sm mt-1 max-w-xs text-center leading-relaxed">
                Be the first to start the conversation{selectedChannel ? ` in #${selectedChannel.name}` : ''}!
              </p>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {hasMoreMessages && (
                <div className="flex justify-center my-4">
                  <button
                    onClick={() => setShowAllMessages(true)}
                    className={`px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all flex items-center gap-2`}
                  >
                    Load {hiddenMessageCount} earlier message{hiddenMessageCount !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
              {visibleMessages.map((msg, idx) => {
                const prevMsg = idx > 0 ? visibleMessages[idx - 1] : null
                // Show header (avatar + name + timestamp) if: first message, different sender, or >5 min gap
                const showHeader = !prevMsg || prevMsg.sender.id !== msg.sender.id ||
                  (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) > 5 * 60 * 1000
                // Date divider when the calendar day rolls over between messages
                const isNewDay = !prevMsg ||
                  new Date(prevMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString()
                return (
                  <div
                    key={msg.id}
                    className={newMessageIds.has(msg.id) ? 'message-enter' : undefined}
                  >
                    {isNewDay && <ChannelDateDivider date={msg.createdAt} />}
                    {renderMessage(msg, showHeader)}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        )}
        
        {/* ── Message Input ── */}
        {(!activeThread) && (
        <div className="p-4 border-t border-white/[0.08] bg-[#0f1117]/50 backdrop-blur-sm">
          {!activePersona ? (
            <div className="text-center py-2 persona-card rounded-xl">
              <p className="text-slate-500 text-sm">Create and activate a character to send messages</p>
            </div>
          ) : !selectedChannel ? (
            <div className="text-center py-2 text-slate-400/40 text-sm">Select a channel to start messaging</div>
          ) : channelType === 'voice' ? (
            <div className="text-center py-2 text-slate-500 text-sm">Messages can&apos;t be sent in voice channels</div>
          ) : (
            <div className="">
              {/* Reply preview */}
              {replyingTo && (
                <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                  <Reply className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-400 font-medium">Replying to </span>
                    <span className="text-xs font-semibold" style={{ color: '#5eead4' }}>{replyingTo.sender.name}</span>
                    <p className="text-xs text-slate-500 truncate">{replyingTo.content}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              
              {/* Pending attachment chips (multi-file picker) */}
              <AttachmentChipsBar picker={pendingAttachments} />
              
              <div className="flex gap-3 items-center">
                {/* Hidden multi-file attachment picker input */}
                <input
                  ref={channelFileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(',')}
                  onChange={(e) => {
                    pendingAttachments.addFiles(e.target.files)
                    e.target.value = ''
                  }}
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => channelFileInputRef.current?.click()}
                        disabled={pendingAttachments.isAtMax || isSending}
                        aria-label={pendingAttachments.isAtMax ? 'Maximum attachments reached' : 'Attach images'}
                        title={pendingAttachments.isAtMax ? undefined : 'Attach images'}
                        className="text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 rounded-xl h-11 w-11 flex-shrink-0 border border-white/[0.08] disabled:opacity-50"
                      >
                        {pendingAttachments.anyUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {pendingAttachments.isAtMax && <TooltipContent>Max 5 attachments</TooltipContent>}
                </Tooltip>
                <div className="flex-1 relative">
                  <Textarea 
                    placeholder={`Message #${selectedChannel.name}...`} 
                    value={newMessage} 
                    onChange={(e) => { setNewMessage(e.target.value); if (e.target.value.trim()) sendTyping(true) }} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} 
                    className="w-full persona-input resize-none h-11 min-h-[44px] max-h-[120px] rounded-xl py-2.5 px-4" 
                    disabled={isSending || slowModeCooldown > 0} 
                  />
                  {/* Slow mode overlay */}
                  {slowModeCooldown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                      <span className="text-sm text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        Wait {slowModeCooldown}s
                      </span>
                    </div>
                  )}
                </div>
                <Button onClick={sendMessage} disabled={(!newMessage.trim() && pendingAttachments.count === 0) || isSending || pendingAttachments.anyUploading || slowModeCooldown > 0} className="btn-persona h-11 w-11 rounded-xl flex-shrink-0 px-0">
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
              
              {/* Typing indicator + Slow mode info */}
              <div className="flex items-center justify-between mt-1.5 min-h-[20px]">
                <TypingIndicator names={Array.from(typingUsers.values()).map(u => u.name)} />
                {channelSlowMode && channelSlowMode > 0 && !slowModeCooldown && (
                  <span className="text-[10px] text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Slow mode: {channelSlowMode}s
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
      )}
      
      {/* ── Wiki View ── */}
      {showWiki && (
        <WikiTab
          storylineId={storylineId}
          userId={user?.id || ''}
          userRole={storyline.role || 'member'}
          onClose={() => setShowWiki(false)}
        />
      )}
      
      {/* ── Members Sidebar ── */}
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
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: group.color }}>{group.title}</span>
                    <span className="text-[11px] font-semibold" style={{ color: group.color + '80' }}>— {group.members.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {group.members.map((member) => (
                      <button key={member.id} onClick={() => handleMemberClick(member.user.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors text-left">
                        <span className="relative flex-shrink-0" title={member.user.isOnline ? 'Online' : 'Offline'}>
                          <Avatar className="w-7 h-7 border" style={{ borderColor: group.color + '40' }}>
                            <AvatarImage src={member.user.avatarUrl || undefined} />
                            <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-xs`}>
                              {member.user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {/* Online status dot (via the member's active persona) */}
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0e1015] ${member.user.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} aria-hidden="true">
                            {member.user.isOnline && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />}
                          </span>
                        </span>
                        <span className={`text-sm truncate ${member.user.isOnline ? '' : 'opacity-60'}`} style={{ color: group.color + 'cc' }}>{member.user.username}</span>
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
      
      {/* ── Invite Modal ── */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className={`persona-modal max-w-md ${accent.borderSubtle}`}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold persona-gradient-text flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-slate-400" />
              Invite Friends
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Share this SI.FY:// code to invite people to {storyline.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {inviteCode ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${accent.bgSurface} border ${accent.borderSubtle} flex items-center gap-2`}>
                  <code className={`flex-1 text-sm ${accent.text} font-mono truncate`}>
                    {inviteCode}
                  </code>
                  <Button onClick={copyInviteLink} variant="ghost" size="sm" className={inviteCopied ? 'text-green-400' : 'text-slate-400 hover:text-slate-200'}>
                    {inviteCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                {inviteExpires && (
                  <p className={`text-xs text-center ${accent.text} opacity-80`}>
                    {formatSifyExpiry(inviteExpires)}
                  </p>
                )}
                <p className="text-xs text-slate-500 text-center">
                  {inviteCopied ? 'Code copied to clipboard!' : 'Click the copy button to share the SI.FY:// invite code'}
                </p>
                <Button onClick={() => { setInviteCode(null); setInviteExpires(null); setInviteCopied(false) }} variant="ghost" className="w-full text-sm">
                  Create Another Code
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 block mb-1">Max Uses</label>
                    <Input type="number" min={0} value={inviteMaxUses} onChange={(e) => setInviteMaxUses(e.target.value)} placeholder="Unlimited" className={`bg-[#0e1015] ${accent.borderSubtle} text-slate-100`} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 block mb-1">Expires</label>
                    <select value={inviteExpiresIn} onChange={(e) => setInviteExpiresIn(e.target.value)} className={`w-full px-3 py-2 rounded-lg bg-[#0e1015] border ${accent.borderSubtle} text-slate-100`}>
                      <option value="1">1 hour</option>
                      <option value="24">1 day</option>
                      <option value="168">7 days</option>
                      <option value="720">30 days</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                </div>
                <Button onClick={handleCreateInvite} disabled={isCreatingInvite} className="btn-persona w-full">
                  {isCreatingInvite ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Generate Invite Code
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ── Pinned Messages Modal ── */}
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
                  {/* Attachments — collapsible dropdown (uniform for multi-image
                      and legacy single-image pinned messages) */}
                  <MessageAttachments attachments={pm.message.attachments ?? (pm.message.imageUrl ? [{ url: pm.message.imageUrl }] : undefined)} />
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
      
      {/* ── Create Channel Modal (Enhanced with type selector) ── */}
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
              <label className="text-sm text-slate-200/80 mb-1 block">Channel Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'text', icon: <Hash className="w-4 h-4" />, label: 'Text' },
                  { type: 'voice', icon: <Volume2 className="w-4 h-4" />, label: 'Voice' },
                  { type: 'announcement', icon: <Megaphone className="w-4 h-4" />, label: 'News' }
                ].map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => setNewChannelType(opt.type)}
                    className={`p-2.5 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${newChannelType === opt.type ? `${accent.borderMedium} ${accent.bgTint} ${accent.text}` : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]'}`}
                  >
                    {opt.icon}
                    <span className="text-[11px]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-200/80 mb-1 block">Channel Name</label>
              <div className="flex items-center gap-2">
                <ChannelIcon type={newChannelType} />
                <Input placeholder="channel-name" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="persona-input flex-1" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => { setShowCreateChannel(false); setNewChannelType('text') }} variant="ghost" className="flex-1">Cancel</Button>
              <Button onClick={handleCreateChannel} disabled={!newChannelName.trim() || isCreatingChannel} className="btn-persona flex-1">
                {isCreatingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ── Create Thread Modal ── */}
      <Dialog open={showThreadModal} onOpenChange={setShowThreadModal}>
        <DialogContent className={`persona-modal max-w-sm ${accent.borderSubtle}`}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold persona-gradient-text flex items-center gap-2">
              <ThreadIcon className="w-5 h-5 text-slate-400" />
              Create Thread
            </DialogTitle>
            <DialogDescription className="text-slate-400">Start a new thread from a message</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {threadParentMessage && (
              <div className={`p-3 rounded-lg ${accent.bgSurface} border ${accent.borderSubtle}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium" style={{ color: '#5eead4' }}>{threadParentMessage.sender.name}</span>
                </div>
                <p className="text-sm text-slate-300 line-clamp-3">{threadParentMessage.content}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-slate-200/80 mb-1 block">Thread Name</label>
              <Input placeholder="Thread name" value={threadName} onChange={(e) => setThreadName(e.target.value)} className="persona-input" />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => { setShowThreadModal(false); setThreadParentMessage(null) }} variant="ghost" className="flex-1">Cancel</Button>
              <Button onClick={handleCreateThread} disabled={!threadName.trim() || isCreatingThread} className="btn-persona flex-1">
                {isCreatingThread ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Thread'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ── Settings Modal ── */}
      {showSettings && (
        <StorylineSettings storylineId={storylineId} onClose={() => setShowSettings(false)} onUpdate={() => {
          async function refetch() {
            const response = await fetch(`/api/storylines/${storylineId}`)
            if (response.ok) { const data = await response.json(); setStoryline(data.storyline) }
          }
          refetch()
        }} />
      )}

      {/* ── Boost Modal ── */}
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
                  <button key={amount} onClick={() => setSelectedBoostAmount(amount)} disabled={userChronos < amount} className={`p-3 rounded-xl border transition-all ${selectedBoostAmount === amount ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : userChronos >= amount ? 'border-white/[0.08] bg-white/[0.03] text-slate-200 hover:bg-white/[0.05]' : 'border-white/[0.06] bg-white/[0.03] text-slate-400/40 cursor-not-allowed'}`}>
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

      {/* ── Character Profile Modal ── */}
      <CharacterProfileModal
        isOpen={!!selectedMemberProfile}
        persona={selectedMemberProfile!}
        onClose={() => setSelectedMemberProfile(null)}
        onStartChat={() => setSelectedMemberProfile(null)}
      />
    </div>
  )
}
