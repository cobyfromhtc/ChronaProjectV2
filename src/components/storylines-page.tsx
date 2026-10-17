'use client'

import { useState, useEffect, useRef, useCallback, startTransition, type ChangeEvent } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Compass, Search, Plus, Users, X, Loader2, Check, Crown,
  Sparkles, BookOpen, Wand2, ImageIcon, Palette, Globe, Lock,
  Camera, Settings2, Hash, TrendingUp, Clock, User, MessageCircle,
  Star, Filter, UserPlus, Link2, AlertCircle, AlertTriangle, ShieldCheck, Megaphone,
  ChevronRight, Heart, Brain, UserCheck, ArrowRight, Lightbulb, Eye
} from 'lucide-react'
import { STORYLINE_CATEGORIES } from '@/lib/constants'
import { isAdult } from '@/lib/age-utils'
import { StorylineModal } from '@/components/storylines/StorylineModal'
import type { StorylineServer } from '@/components/storylines/StorylineServerCard'
import { STORYLINE_REFRESH_EVENT } from '@/components/sidebar'
import { CharacterProfileModal } from '@/components/character-profile-modal'
import { DmRequestDialog } from '@/app/page'
import { DM_REFRESH_EVENT } from '@/components/dm-sidebar'
import type { Conversation } from '@/app/page'
import { useToast } from '@/hooks/use-toast'
import { StorylineAdvancedSearch, type StorylineSearchFilters } from '@/components/storyline-advanced-search'
import { AdvancedSearch } from '@/components/advanced-search'
import { useVariantAccent, useVariantCombo } from '@/lib/ui-variant-styles'
import { apiFetch } from '@/lib/api-client'
import { ScenarioCard } from '@/components/scenario-card'
import { ScenarioCreateModal } from '@/components/scenario-create-modal'
import { ScenarioDetailModal } from '@/components/scenario-detail-modal'

interface StorylineItem {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  category: string
  memberCount: number
  isJoined: boolean
  isAdult?: boolean
  isOfficial?: boolean
  createdAt?: string
  tags: string[]
  lore: string | null
  owner: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

interface OnlinePersona {
  id: string
  name: string
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
  discType: string | null
  disc: {
    dominance: number
    influence: number
    steadiness: number
    conscientiousness: number
  } | null
  enneagram: {
    type: number | null
    wing: number | null
    instinctualVariant: string | null
  } | null
  strengthsFinder: {
    top5: string[]
  } | null
  rpStyle: string | null
  connections: {
    id: string
    characterName: string
    relationshipType: string
    specificRole: string | null
    characterAge: number | null
    description: string | null
  }[]
  matchReasons?: string[]
  mutualFriendCount?: number
}

interface ContinueChatItem {
  conversationId: string
  persona: {
    id: string
    name: string
    avatarUrl: string | null
    isOnline: boolean
    username: string
  }
  lastMessage: {
    content: string
    createdAt: string
    senderId: string
  } | null
  lastMessageAt: string
}

interface StorylinesPageProps {
  onViewStoryline?: (storylineId: string) => void
  onStartChat?: (conversation: Conversation) => void
}

type TabType = 'discover' | 'trending' | 'recent' | 'scenarios'

export function StorylinesPage({ onViewStoryline, onStartChat }: StorylinesPageProps) {
  const { user } = useAuth()
  const { activePersona, personas } = usePersonas()
  const { toast } = useToast()
  const accent = useVariantAccent()
  const combo = useVariantCombo()
  const viaSubtle = accent.toSubtle.replace('to-', 'via-').replace(/\/\d+$/, '/15')
  
  const [activeTab, setActiveTab] = useState<TabType>('discover')
  const [storylines, setStorylines] = useState<StorylineItem[]>([])
  const [onlinePersonas, setOnlinePersonas] = useState<OnlinePersona[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  
  // Discovery section states
  const [continueChatting, setContinueChatting] = useState<ContinueChatItem[]>([])
  const [forYouPersonas, setForYouPersonas] = useState<OnlinePersona[]>([])
  const [relatablePersonas, setRelatablePersonas] = useState<OnlinePersona[]>([])
  const [mutualFriends, setMutualFriends] = useState<OnlinePersona[]>([])
  const [sectionsLoaded, setSectionsLoaded] = useState(false)
  
  // Separate official and regular storylines
  const officialStoryline = storylines.find(sl => sl.isOfficial) || null
  const regularStorylines = storylines.filter(sl => !sl.isOfficial)
  
  // For storylines advanced search
  const [storylineFilters, setStorylineFilters] = useState<StorylineSearchFilters>({
    query: '',
    searchIn: ['all'],
    category: null,
    tags: []
  })
  const [popularTags, setPopularTags] = useState<{tag: string; count: number}[]>([])

  // For personas advanced search
  const [personaFilters, setPersonaFilters] = useState<{
    query: string
    searchIn: string[]
    mbti: string[]
    gender: string[]
    ageMin: number | null
    ageMax: number | null
    species: string[]
    archetype: string[]
    tags: string[]
    attributes: string[]
    likes: string[]
    hobbies: string[]
    skills: string[]
    syncPersonality: boolean
  }>({
    query: '',
    searchIn: ['all'],
    mbti: [],
    gender: [],
    ageMin: null,
    ageMax: null,
    species: [],
    archetype: [],
    tags: [],
    attributes: [],
    likes: [],
    hobbies: [],
    skills: [],
    syncPersonality: false
  })
  
  // Storyline modal state
  const [selectedStoryline, setSelectedStoryline] = useState<StorylineServer | null>(null)
  const [showStorylineModal, setShowStorylineModal] = useState(false)
  
  // Persona modal state
  const [selectedPersona, setSelectedPersona] = useState<OnlinePersona | null>(null)
  const [showDmRequestDialog, setShowDmRequestDialog] = useState(false)
  const [dmRequestTarget, setDmRequestTarget] = useState<{ id: string; name: string; username: string } | null>(null)
  
  // Create form state
  const userIsAdult = user?.dateOfBirth ? isAdult(new Date(user.dateOfBirth)) : false

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    lore: '',
    iconUrl: '',
    bannerUrl: '',
    category: 'Fantasy',
    isPublic: true,
    accentColor: '#8b5cf6',
    welcomeMessage: '',
    requireApproval: false,
    isAdult: false,
    tags: [] as string[],
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createStep, setCreateStep] = useState(1)
  const [createTagInput, setCreateTagInput] = useState('')
  const iconInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  
  // Join storyline via invite code
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinPreview, setJoinPreview] = useState<{
    name: string; description: string | null; iconUrl: string | null; memberCount: number; owner: { username: string; avatarUrl: string | null }
  } | null>(null)
  const [isCheckingCode, setIsCheckingCode] = useState(false)
  
  // Scenario states
  const [scenarios, setScenarios] = useState<any[]>([])
  const [scenariosLoading, setScenariosLoading] = useState(false)
  const [showScenarioDetail, setShowScenarioDetail] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [showCreateScenario, setShowCreateScenario] = useState(false)
  const [scenarioSearch, setScenarioSearch] = useState('')
  const [scenarioCategory, setScenarioCategory] = useState('all')
  const [scenarioSort, setScenarioSort] = useState<'new' | 'popular' | 'recent'>('popular')
  
  const checkInviteCode = async () => {
    if (!joinCode.trim()) return
    setIsCheckingCode(true)
    setJoinError(null)
    setJoinPreview(null)
    try {
      const response = await fetch(`/api/join/${joinCode.trim()}`)
      if (response.ok) {
        const data = await response.json()
        setJoinPreview(data.invite.storyline)
      } else {
        const data = await response.json()
        setJoinError(data.error || 'Invalid invite code')
      }
    } catch (error) {
      setJoinError('Failed to check invite code')
    } finally {
      setIsCheckingCode(false)
    }
  }
  
  const handleJoinWithCode = async () => {
    if (!joinCode.trim() || isJoining) return
    setIsJoining(true)
    setJoinError(null)
    try {
      const response = await fetch(`/api/join/${joinCode.trim()}`, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setShowJoinModal(false)
        setJoinCode('')
        setJoinPreview(null)
        fetchStorylines()
        window.dispatchEvent(new CustomEvent(STORYLINE_REFRESH_EVENT))
      } else {
        const data = await response.json()
        setJoinError(data.error || 'Failed to join')
      }
    } catch (error) {
      setJoinError('Failed to join storyline')
    } finally {
      setIsJoining(false)
    }
  }
  
  // Preset accent colors
  const accentColors = [
    '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308',
    '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1'
  ]
  
  // Convert StorylineItem to StorylineServer for modal
  const convertToServer = (item: StorylineItem): StorylineServer => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    coverImage: item.iconUrl,
    iconImage: item.iconUrl,
    genre: item.category,
    tags: '',
    memberCount: item.memberCount,
    rating: 0,
    reviewCount: 0,
    createdAt: item.createdAt || new Date().toISOString(),
    owner: item.owner
  })
  
  // Handle clicking on a storyline card
  const handleStorylineClick = (storyline: StorylineItem) => {
    setShowCreateModal(false)
    setSelectedStoryline(convertToServer(storyline))
    setShowStorylineModal(true)
  }
  
  // Handle entering a storyline
  const handleEnterStoryline = (storylineId: string) => {
    setShowStorylineModal(false)
    setSelectedStoryline(null)
    onViewStoryline?.(storylineId)
  }
  
  // Fetch storylines
  const fetchStorylines = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (storylineFilters.query) params.set('q', storylineFilters.query)
      if (storylineFilters.category) params.set('category', storylineFilters.category)
      if (storylineFilters.tags.length > 0) params.set('tags', storylineFilters.tags.join(','))
      if (storylineFilters.searchIn.length > 0 && !storylineFilters.searchIn.includes('all')) {
        params.set('searchIn', storylineFilters.searchIn.join(','))
      }
      
      const response = await fetch(`/api/storylines?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStorylines(data.storylines)
        if (data.popularTags) {
          setPopularTags(data.popularTags)
        }
      }
    } catch (error) {
      console.error('Failed to fetch storylines:', error)
    } finally {
      setIsLoading(false)
    }
  }, [storylineFilters])
  
  // Fetch online personas
  const fetchOnlinePersonas = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('filter', 'new')
      
      if (personaFilters.query) params.set('q', personaFilters.query)
      if (personaFilters.searchIn.length > 0 && !personaFilters.searchIn.includes('all')) {
        params.set('searchIn', personaFilters.searchIn.join(','))
      }
      if (personaFilters.mbti.length > 0) params.set('mbti', personaFilters.mbti.join(','))
      if (personaFilters.gender.length > 0) params.set('gender', personaFilters.gender.join(','))
      if (personaFilters.ageMin !== null) params.set('ageMin', personaFilters.ageMin.toString())
      if (personaFilters.ageMax !== null) params.set('ageMax', personaFilters.ageMax.toString())
      if (personaFilters.species.length > 0) params.set('species', personaFilters.species.join(','))
      if (personaFilters.archetype.length > 0) params.set('archetype', personaFilters.archetype.join(','))
      if (personaFilters.tags.length > 0) params.set('tags', personaFilters.tags.join(','))
      if (personaFilters.attributes.length > 0) params.set('attributes', personaFilters.attributes.join(','))
      if (personaFilters.likes.length > 0) params.set('likes', personaFilters.likes.join(','))
      if (personaFilters.hobbies.length > 0) params.set('hobbies', personaFilters.hobbies.join(','))
      if (personaFilters.skills.length > 0) params.set('skills', personaFilters.skills.join(','))
      if (personaFilters.syncPersonality) params.set('syncPersonality', 'true')
      
      const response = await fetch(`/api/discovery?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOnlinePersonas(data.personas)
      }
    } catch (error) {
      console.error('Failed to fetch online personas:', error)
    } finally {
      setIsLoading(false)
    }
  }, [personaFilters])
  
  // Fetch scenarios
  const fetchScenarios = useCallback(async () => {
    setScenariosLoading(true)
    try {
      const params = new URLSearchParams()
      if (scenarioSearch) params.set('search', scenarioSearch)
      if (scenarioCategory !== 'all') params.set('category', scenarioCategory)
      params.set('sort', scenarioSort)
      params.set('limit', '50')
      const res = await apiFetch(`/api/scenarios?${params}`)
      if (res.ok) {
        const data = await res.json()
        setScenarios(data.scenarios || [])
      }
    } catch (e) {
      console.error('Failed to fetch scenarios:', e)
    } finally {
      setScenariosLoading(false)
    }
  }, [scenarioSearch, scenarioCategory, scenarioSort])
  
  useEffect(() => {
    startTransition(() => {
      if (activeTab === 'scenarios') {
        fetchScenarios()
        fetchOnlinePersonas()
      } else {
        fetchStorylines()
      }
    })
  }, [activeTab, fetchStorylines, fetchOnlinePersonas, fetchScenarios])
  
  // Fetch discovery sections (once on mount)
  const fetchDiscoverySections = useCallback(async () => {
    try {
      const [chatRes, forYouRes, relatableRes, mutualRes] = await Promise.allSettled([
        fetch('/api/discovery?section=continue-chatting'),
        fetch('/api/discovery?section=for-you'),
        fetch('/api/discovery?section=relatable'),
        fetch('/api/discovery?section=mutual-friends'),
      ])
      
      if (chatRes.status === 'fulfilled' && chatRes.value.ok) {
        const data = await chatRes.value.json()
        setContinueChatting(data.conversations || [])
      }
      if (forYouRes.status === 'fulfilled' && forYouRes.value.ok) {
        const data = await forYouRes.value.json()
        setForYouPersonas(data.personas || [])
      }
      if (relatableRes.status === 'fulfilled' && relatableRes.value.ok) {
        const data = await relatableRes.value.json()
        setRelatablePersonas(data.personas || [])
      }
      if (mutualRes.status === 'fulfilled' && mutualRes.value.ok) {
        const data = await mutualRes.value.json()
        setMutualFriends(data.personas || [])
      }
    } catch (error) {
      console.error('Failed to fetch discovery sections:', error)
    } finally {
      setSectionsLoaded(true)
    }
  }, [])
  
  useEffect(() => {
    startTransition(() => {
      fetchDiscoverySections()
    })
  }, [fetchDiscoverySections])
  
  // Join storyline
  const handleJoin = async (storylineId: string) => {
    setJoiningId(storylineId)
    try {
      const response = await fetch(`/api/storylines/${storylineId}/join`, {
        method: 'POST'
      })
      
      if (response.ok) {
        fetchStorylines()
        window.dispatchEvent(new CustomEvent(STORYLINE_REFRESH_EVENT))
      } else {
        const data = await response.json()
        alert(data.error)
      }
    } catch (error) {
      console.error('Failed to join storyline:', error)
    } finally {
      setJoiningId(null)
    }
  }
  
  // Create storyline
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setCreateError('Name is required')
      return
    }
    
    setIsCreating(true)
    setCreateError('')
    
    try {
      const response = await fetch('/api/storylines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setShowCreateModal(false)
        setCreateForm({
          name: '',
          description: '',
          lore: '',
          iconUrl: '',
          bannerUrl: '',
          category: 'Fantasy',
          isPublic: true,
          accentColor: '#8b5cf6',
          welcomeMessage: '',
          requireApproval: false,
          isAdult: false,
          tags: [] as string[],
        })
        setCreateStep(1)
        setCreateTagInput('')
        fetchStorylines()
        window.dispatchEvent(new CustomEvent(STORYLINE_REFRESH_EVENT))
      } else {
        setCreateError(data.error || 'Failed to create storyline')
      }
    } catch (error) {
      console.error('Failed to create storyline:', error)
      setCreateError('Something went wrong')
    } finally {
      setIsCreating(false)
    }
  }
  
  // Handle image upload
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, field: 'iconUrl' | 'bannerUrl') => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        setCreateForm(prev => ({ ...prev, [field]: data.url || data.avatarUrl }))
      }
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }
  
  // Start conversation with persona
  const startConversation = async (targetPersonaId: string) => {
    if (!activePersona) {
      toast({ title: 'No Active Character', description: 'Please create and activate a character first!', variant: 'destructive' })
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
        // Check if we need to show DM request dialog
        if (data.needsDmRequest && data.targetPersona) {
          setDmRequestTarget(data.targetPersona)
          setShowDmRequestDialog(true)
          return
        }
        
        // Check if conversation was created
        if (data.conversation && onStartChat) {
          // Fetch conversations to get the full conversation data
          const convResponse = await fetch('/api/conversations')
          if (convResponse.ok) {
            const convData = await convResponse.json()
            const newConv = convData.conversations.find((c: Conversation) => c.id === data.conversation.id)
            if (newConv) {
              setSelectedPersona(null)
              onStartChat(newConv)
              // Refresh DM sidebar
              window.dispatchEvent(new CustomEvent(DM_REFRESH_EVENT))
            }
          }
        } else if (data.dmRequest) {
          // DM request was sent successfully
          toast({ title: 'Request sent!', description: 'Your message request has been sent', variant: 'default' })
          setSelectedPersona(null)
        }
      } else {
        toast({ title: 'Failed to Start Conversation', description: data.error || 'Something went wrong', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
      toast({ title: 'Failed to Start Conversation', description: 'Network error. Please try again.', variant: 'destructive' })
    }
  }
  
  // Handle successful DM request (when conversation is created)
  const handleDmRequestSuccess = async (conversationId: string) => {
    setShowDmRequestDialog(false)
    setDmRequestTarget(null)
    
    if (onStartChat) {
      const convResponse = await fetch('/api/conversations')
      if (convResponse.ok) {
        const convData = await convResponse.json()
        const newConv = convData.conversations.find((c: Conversation) => c.id === conversationId)
        if (newConv) {
          onStartChat(newConv)
          // Refresh DM sidebar
          window.dispatchEvent(new CustomEvent(DM_REFRESH_EVENT))
        }
      }
    }
  }
  
  // Get category icon
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Romance': '💕',
      'Action': '⚔️',
      'Horror': '👻',
      'Fantasy': '🧙',
      'Sci-Fi': '🚀',
      'Slice of Life': '🌸',
      'Mystery': '🔍',
      'Comedy': '😂',
      'Drama': '🎭',
      'Adventure': '🗺️',
      'Thriller': '😱',
      'Historical': '📜',
      'Supernatural': '✨',
      'Other': '📖'
    }
    return icons[category] || '📖'
  }
  
  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Romance': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      'Action': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'Horror': 'bg-red-500/20 text-red-300 border-red-500/30',
      'Fantasy': `${accent.bgTint} text-slate-300 ${accent.borderSubtle}`,
      'Sci-Fi': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      'Slice of Life': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      'Mystery': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Comedy': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Drama': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      'Adventure': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'Thriller': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      'Historical': 'bg-stone-500/20 text-stone-300 border-stone-500/30',
      'Supernatural': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      'Other': 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
    return colors[category] || `${accent.bgTint} text-slate-300 ${accent.borderSubtle}`
  }
  
  // Format time ago helper
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d`
    return `${Math.floor(diffDays / 7)}w`
  }
  
  return (
    <div className={`flex flex-col h-full min-h-0 bg-gradient-to-b ${accent.bgSurfaceDeep.replace('bg-', 'from-')} ${accent.bgSurface.replace('bg-', 'via-')} ${accent.bgSurfaceDeep.replace('bg-', 'to-')}`}>
      {/* Header */}
      <div className={`h-12 border-b border-white/[0.08] flex items-center px-4 gap-4 ${accent.bgSurface}/50 backdrop-blur-sm flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent.from} ${accent.to} flex items-center justify-center`}>
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-100">Discover</span>
        </div>
        
        {/* Search is handled by StorylineAdvancedSearch component below */}
        <div className="flex-1" />
        
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setJoinCode(''); setJoinPreview(null); setJoinError(null); setShowJoinModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-200 text-sm font-medium hover:bg-white/[0.08] transition-all"
          >
            <Link2 className="w-4 h-4" />
            Join
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${accent.from} ${accent.to} text-white text-sm font-medium transition-all relative overflow-hidden`}
          >
            <span className="absolute inset-0 overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" style={{ animation: 'btn-shimmer 3s ease-in-out infinite' }} />
            </span>
            <Plus className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Create Storyline</span>
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.08] bg-[#0e1015]/50 flex-shrink-0">
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'discover'
              ? `${accent.bgTint} text-slate-100 border ${accent.borderSubtle}`
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
          }`}
        >
          <Compass className="w-4 h-4" />
          Discover
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'trending'
              ? `${accent.bgTint} text-slate-100 border ${accent.borderSubtle}`
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Trending
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'recent'
              ? `${accent.bgTint} text-slate-100 border ${accent.borderSubtle}`
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
          }`}
        >
          <Clock className="w-4 h-4" />
          Recent
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'scenarios'
              ? `${accent.bgTint} text-slate-100 border ${accent.borderSubtle}`
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Scenarios
          <span className="ml-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>
      
      {/* Advanced Search - Show appropriate search based on tab */}
      <div className="px-4 py-2 bg-[#0e1015]/30 border-b border-white/[0.06] flex-shrink-0">
        {activeTab === 'scenarios' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search scenarios..."
                  value={scenarioSearch}
                  onChange={(e) => setScenarioSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/30 transition-all"
                />
              </div>
              {/* Sort options */}
              <div className="flex items-center gap-1">
                {[
                  { value: 'new' as const, label: 'New', icon: <Clock className="w-3.5 h-3.5" /> },
                  { value: 'popular' as const, label: 'Popular', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                  { value: 'recent' as const, label: 'Viewed', icon: <Eye className="w-3.5 h-3.5" /> },
                ].map(sort => (
                  <button
                    key={sort.value}
                    onClick={() => setScenarioSort(sort.value)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      scenarioSort === sort.value
                        ? `${accent.bgTint} ${accent.text} ${accent.borderSubtle} border`
                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                    }`}
                  >
                    {sort.icon}
                    <span className="hidden sm:inline">{sort.label}</span>
                  </button>
                ))}
              </div>
              <select
                value={scenarioCategory}
                onChange={(e) => setScenarioCategory(e.target.value)}
                className="h-9 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-300 appearance-none cursor-pointer focus:outline-none focus:border-teal-500/30 transition-all pr-8"
              >
                <option value="all" className="bg-[#0d0f14]">All Categories</option>
                <option value="romance" className="bg-[#0d0f14]">Romance</option>
                <option value="drama" className="bg-[#0d0f14]">Drama</option>
                <option value="fantasy" className="bg-[#0d0f14]">Fantasy</option>
                <option value="sci-fi" className="bg-[#0d0f14]">Sci-Fi</option>
                <option value="horror" className="bg-[#0d0f14]">Horror</option>
                <option value="mystery" className="bg-[#0d0f14]">Mystery</option>
                <option value="comedy" className="bg-[#0d0f14]">Comedy</option>
                <option value="adventure" className="bg-[#0d0f14]">Adventure</option>
                <option value="slice-of-life" className="bg-[#0d0f14]">Slice of Life</option>
                <option value="thriller" className="bg-[#0d0f14]">Thriller</option>
                <option value="supernatural" className="bg-[#0d0f14]">Supernatural</option>
                <option value="historical" className="bg-[#0d0f14]">Historical</option>
                <option value="other" className="bg-[#0d0f14]">Other</option>
              </select>
              {personas.length > 0 && (
                <button
                  onClick={() => setShowCreateScenario(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r ${accent.from} ${accent.to} text-white transition-all whitespace-nowrap`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create
                </button>
              )}
            </div>
            {/* Category filter pills (horizontal scrollable) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {[
                { value: 'all', label: 'All', emoji: '🌐' },
                { value: 'romance', label: 'Romance', emoji: '💕' },
                { value: 'adventure', label: 'Adventure', emoji: '🗺️' },
                { value: 'drama', label: 'Drama', emoji: '🎭' },
                { value: 'fantasy', label: 'Fantasy', emoji: '🧙' },
                { value: 'sci-fi', label: 'Sci-Fi', emoji: '🚀' },
                { value: 'horror', label: 'Horror', emoji: '👻' },
                { value: 'mystery', label: 'Mystery', emoji: '🔍' },
                { value: 'comedy', label: 'Comedy', emoji: '😂' },
                { value: 'slice-of-life', label: 'Slice of Life', emoji: '🌸' },
                { value: 'thriller', label: 'Thriller', emoji: '😱' },
                { value: 'supernatural', label: 'Supernatural', emoji: '✨' },
                { value: 'historical', label: 'Historical', emoji: '📜' },
                { value: 'other', label: 'Other', emoji: '📖' },
              ].map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setScenarioCategory(cat.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                    scenarioCategory === cat.value
                      ? `${accent.bgTint} ${accent.text} ${accent.borderSubtle} border`
                      : 'border-white/[0.06] text-slate-400 bg-white/[0.02] hover:bg-white/[0.05] hover:text-slate-300'
                  }`}
                >
                  <span className="text-[11px]">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <StorylineAdvancedSearch 
            onSearch={setStorylineFilters}
            popularTags={popularTags}
            isLoading={isLoading}
          />
        )}
      </div>
      
      {/* Discovery Sections - Netflix-style horizontal rows */}
      {activeTab === 'discover' && (
        <div className="flex-shrink-0 border-b border-white/[0.06]">
          {/* Continue Chatting */}
          {continueChatting.length > 0 && (
            <div className="py-4">
              <div className="flex items-center justify-between px-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${accent.from} ${accent.to} flex items-center justify-center`}>
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">Continue Chatting</h3>
                </div>
                <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {continueChatting.map((chat) => (
                  <div
                    key={chat.conversationId}
                    onClick={() => {
                      if (onStartChat) {
                        // Find or create conversation and open it
                        const convResponse = fetch('/api/conversations').then(async (res) => {
                          if (res.ok) {
                            const data = await res.json()
                            const conv = data.conversations.find((c: Conversation) => c.id === chat.conversationId)
                            if (conv) onStartChat(conv)
                          }
                        })
                      }
                    }}
                    className="flex-shrink-0 w-56 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] overflow-hidden cursor-pointer transition-all group"
                  >
                    <div className="p-3 flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-10 h-10 border border-white/[0.1]">
                          <AvatarImage src={chat.persona.avatarUrl || undefined} />
                          <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-sm font-semibold`}>
                            {chat.persona.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {chat.persona.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0e1015]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-100 truncate">{chat.persona.name}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">@{chat.persona.username}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 flex-shrink-0">{formatTimeAgo(chat.lastMessageAt)}</span>
                    </div>
                    {chat.lastMessage && (
                      <div className="px-3 pb-3">
                        <p className="text-xs text-slate-400/70 line-clamp-1">{chat.lastMessage.content || '📷 Image'}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* For You */}
          {forYouPersonas.length > 0 && (
            <div className="py-4">
              <div className="flex items-center justify-between px-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">For You</h3>
                </div>
                <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {forYouPersonas.map((persona) => (
                  <div
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona)}
                    className="flex-shrink-0 w-48 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] overflow-hidden cursor-pointer transition-all group"
                  >
                    {/* Mini banner */}
                    <div className={`h-16 bg-gradient-to-br from-rose-600/20 via-pink-600/10 to-rose-800/20 relative`}>
                      {persona.isOnline && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                      )}
                      <div className="absolute -bottom-4 left-3">
                        <Avatar className="w-10 h-10 border-2 border-[#0e1015]">
                          <AvatarImage src={persona.avatarUrl || undefined} />
                          <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-sm font-semibold`}>
                            {persona.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    <div className="pt-6 px-3 pb-3">
                      <p className="text-sm font-medium text-slate-100 truncate">{persona.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">@{persona.username}</p>
                      {persona.matchReasons && persona.matchReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {persona.matchReasons.slice(0, 2).map((reason, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-300/80 border border-rose-500/20">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Relatable Personas */}
          {relatablePersonas.length > 0 && (
            <div className="py-4">
              <div className="flex items-center justify-between px-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">Relate-able Personas</h3>
                </div>
                <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {relatablePersonas.map((persona) => (
                  <div
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona)}
                    className="flex-shrink-0 w-48 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] overflow-hidden cursor-pointer transition-all group"
                  >
                    {/* Mini banner */}
                    <div className={`h-16 bg-gradient-to-br from-amber-600/20 via-orange-600/10 to-amber-800/20 relative`}>
                      {persona.isOnline && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                      )}
                      <div className="absolute -bottom-4 left-3">
                        <Avatar className="w-10 h-10 border-2 border-[#0e1015]">
                          <AvatarImage src={persona.avatarUrl || undefined} />
                          <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-sm font-semibold`}>
                            {persona.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    <div className="pt-6 px-3 pb-3">
                      <p className="text-sm font-medium text-slate-100 truncate">{persona.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">@{persona.username}</p>
                      {persona.matchReasons && persona.matchReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {persona.matchReasons.slice(0, 2).map((reason, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300/80 border border-amber-500/20">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Mutual Friends */}
          {mutualFriends.length > 0 && (
            <div className="py-4">
              <div className="flex items-center justify-between px-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                    <UserCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">Mutual Friends</h3>
                </div>
                <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {mutualFriends.map((persona) => (
                  <div
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona)}
                    className="flex-shrink-0 w-48 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] overflow-hidden cursor-pointer transition-all group"
                  >
                    {/* Mini banner */}
                    <div className={`h-16 bg-gradient-to-br from-teal-600/20 via-emerald-600/10 to-teal-800/20 relative`}>
                      {persona.isOnline && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                      )}
                      <div className="absolute -bottom-4 left-3">
                        <Avatar className="w-10 h-10 border-2 border-[#0e1015]">
                          <AvatarImage src={persona.avatarUrl || undefined} />
                          <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-sm font-semibold`}>
                            {persona.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    <div className="pt-6 px-3 pb-3">
                      <p className="text-sm font-medium text-slate-100 truncate">{persona.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">@{persona.username}</p>
                      {persona.mutualFriendCount && persona.mutualFriendCount > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <Users className="w-3 h-3 text-teal-400" />
                          <span className="text-[10px] text-teal-300/80">{persona.mutualFriendCount} mutual friend{persona.mutualFriendCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Loading skeleton for sections */}
          {!sectionsLoaded && (
            <div className="py-4">
              <div className="flex gap-3 overflow-x-auto px-4 pb-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex-shrink-0 w-48 h-32 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className={`w-10 h-10 border-2 ${accent.borderStrong} border-t-transparent rounded-full animate-spin`} />
              </div>
            ) : activeTab !== 'scenarios' && officialStoryline ? (
              /* Storylines with Official Featured Section */
              <>
                {/* Official Community Featured Card */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <h2 className="text-sm font-semibold text-teal-300 uppercase tracking-wider">Official Community</h2>
                  </div>
                  <div
                    className="rounded-xl border-2 border-teal-500/30 overflow-hidden cursor-pointer hover:border-teal-400/50 transition-all group bg-gradient-to-r from-teal-950/40 to-cyan-950/30"
                    onClick={() => handleStorylineClick(officialStoryline)}
                  >
                    {/* Banner */}
                    <div className="h-28 bg-gradient-to-br from-teal-600/30 via-cyan-600/20 to-teal-800/30 relative">
                      {officialStoryline.iconUrl && (
                        <img src={officialStoryline.iconUrl} alt="" className="w-full h-full object-cover opacity-30" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-teal-950/80 to-transparent" />
                      {/* Official badge top-left */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/20 border border-teal-400/40">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                        <span className="text-xs font-bold text-teal-200">OFFICIAL</span>
                      </div>
                      {/* Category badge top-right */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(officialStoryline.category)}`}>
                          {getCategoryIcon(officialStoryline.category)} {officialStoryline.category}
                        </span>
                      </div>
                      {/* Icon bottom-left */}
                      <div className="absolute bottom-3 left-3">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center border-2 border-teal-900 shadow-lg shadow-teal-500/20 overflow-hidden">
                          {officialStoryline.iconUrl ? (
                            <img src={officialStoryline.iconUrl} alt={officialStoryline.name} className="w-full h-full object-cover" />
                          ) : (
                            <Crown className="w-8 h-8 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4 pt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-100">{officialStoryline.name}</h3>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          <ShieldCheck className="w-3 h-3" /> Official
                        </span>
                      </div>
                      
                      {officialStoryline.description && (
                        <p className="text-sm text-slate-300/70 mb-3 line-clamp-2">{officialStoryline.description}</p>
                      )}
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {officialStoryline.tags.slice(0, 5).map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-teal-500/10 text-teal-300/80 border border-teal-500/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between pt-3 border-t border-teal-500/20">
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {officialStoryline.memberCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Megaphone className="w-3.5 h-3.5" />
                            Announcements
                          </span>
                        </div>
                        {officialStoryline.isJoined ? (
                          <span className="flex items-center gap-1 text-sm text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Joined
                          </span>
                        ) : (
                          <span className="text-sm text-teal-300 hover:text-teal-200 transition-colors font-medium">
                            Join Community →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Regular Storylines */}
                {regularStorylines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <div className="relative mb-3">
                      <div className={`absolute inset-0 w-16 h-16 -m-2 rounded-full bg-gradient-to-br ${accent.from} ${accent.to} opacity-8 blur-lg`} />
                      <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center border border-white/[0.08] relative">
                        <BookOpen className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-400">No other storylines found</p>
                    <p className="text-xs text-slate-500 mt-1">Be the first to create one!</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Compass className="w-4 h-4 text-slate-400" />
                      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">All Storylines</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {regularStorylines.map(sl => (
                        <div
                          key={sl.id}
                          className={`rounded-xl border ${sl.isOfficial ? 'border-teal-500/30' : 'border-white/[0.08]'} overflow-hidden cursor-pointer hover:border-teal-500/30 transition-all group ${sl.isOfficial ? 'bg-gradient-to-r from-teal-950/20 to-cyan-950/10' : `${accent.bgSurface}/80`}`}
                          onClick={() => handleStorylineClick(sl)}
                        >
                          {/* Banner */}
                          <div className={`h-24 bg-gradient-to-br ${accent.fromSubtle} ${viaSubtle} ${accent.toSubtle} relative`}>
                            {sl.iconUrl && (
                              <img src={sl.iconUrl} alt="" className="w-full h-full object-cover opacity-30" />
                            )}
                            <div className={`absolute inset-0 bg-gradient-to-t ${accent.bgSurface.replace('bg-', 'from-')} to-transparent`} />
                            <div className="absolute bottom-3 left-3">
                              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${accent.from} ${accent.to} flex items-center justify-center border-2 ${accent.bgSurface} shadow-lg overflow-hidden`}>
                                {sl.iconUrl ? (
                                  <img src={sl.iconUrl} alt={sl.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white font-bold text-xl">{sl.name.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                            </div>
                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                              {sl.isOfficial && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                                  <ShieldCheck className="w-3 h-3" /> OFFICIAL
                                </span>
                              )}
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(sl.category)}`}>
                                {getCategoryIcon(sl.category)} {sl.category}
                              </span>
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-100">{sl.name}</h3>
                              {sl.isAdult && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">18+</span>
                              )}
                            </div>
                            
                            {sl.description && (
                              <p className="text-sm text-slate-300/70 mb-3 line-clamp-2">{sl.description}</p>
                            )}
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {sl.tags && sl.tags.length > 0 ? sl.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-white/[0.05] text-slate-400/80 border border-white/[0.08]">
                                  {tag}
                                </span>
                              )) : (
                                <>
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-white/[0.05] text-slate-400/80 border border-white/[0.08]">
                                    {sl.category.toLowerCase()}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-white/[0.05] text-slate-400/80 border border-white/[0.08]">
                                    roleplay
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  {sl.memberCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5" />
                                  4.8
                                </span>
                              </div>
                              {sl.isJoined ? (
                                <span className="flex items-center gap-1 text-sm text-emerald-400">
                                  <Check className="w-3.5 h-3.5" /> Joined
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                                  View Details →
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : activeTab === 'scenarios' ? (
              /* Scenarios Grid + Online Personas */
              <div className="space-y-8 relative">
                {/* Gradient mesh background for scenarios section */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/[0.03] rounded-full blur-[120px]" />
                  <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-cyan-500/[0.02] rounded-full blur-[100px]" />
                  <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-teal-600/[0.02] rounded-full blur-[100px]" />
                </div>

                {/* Scenarios Section */}
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Scenarios</h2>
                    {scenarios.length > 0 && (
                      <span className="text-xs text-slate-500 ml-1">({scenarios.length})</span>
                    )}
                  </div>
                  
                  {scenariosLoading ? (
                    /* Skeleton loading states */
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0d0f14]" style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 100}ms` }}>
                          <div className="h-28 bg-gradient-to-r from-white/[0.02] via-white/[0.05] to-white/[0.02] bg-[length:200%_100%]" style={{ animation: 'featured-shimmer 1.5s ease-in-out infinite' }} />
                          <div className="px-3 pt-7 pb-3 space-y-2">
                            <div className="h-3 w-1/3 rounded bg-white/[0.06]" />
                            <div className="h-4 w-3/4 rounded bg-white/[0.04]" />
                            <div className="h-3 w-full rounded bg-white/[0.03]" />
                            <div className="h-3 w-2/3 rounded bg-white/[0.03]" />
                            <div className="flex gap-2 pt-2">
                              <div className="h-3 w-10 rounded bg-white/[0.04]" />
                              <div className="h-3 w-10 rounded bg-white/[0.04]" />
                              <div className="h-3 w-10 rounded bg-white/[0.04]" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : scenarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center relative">
                      {/* Decorative gradient ring */}
                      <div className="relative mb-6">
                        <div className={`absolute inset-0 w-32 h-32 -m-4 rounded-full bg-gradient-to-br ${accent.from} ${accent.to} opacity-10 blur-2xl animate-pulse`} />
                        <div className="absolute inset-0 w-28 h-28 -m-2 rounded-full border-2 border-teal-500/20 animate-[spin_20s_linear_infinite]" style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center border border-white/[0.1] backdrop-blur-sm relative">
                          <Sparkles className="w-10 h-10 text-teal-400 absolute" />
                        </div>
                        {/* Floating particles */}
                        <div className="absolute -top-2 left-2 w-2 h-2 rounded-full bg-teal-400 opacity-60 animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }} />
                        <div className="absolute -bottom-1 right-0 w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-40 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }} />
                        <div className="absolute top-2 -right-2 w-1 h-1 rounded-full bg-teal-300 opacity-50 animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }} />
                      </div>
                      <p className="text-xl font-semibold text-slate-100">No scenarios yet</p>
                      <p className="text-sm text-slate-400 mt-2 max-w-xs">
                        Scenario cards let other users discover and chat with your characters in unique settings
                      </p>
                      <button
                        onClick={() => personas.length > 0 ? setShowCreateScenario(true) : undefined}
                        disabled={personas.length === 0}
                        className={`mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all relative overflow-hidden ${
                          personas.length > 0
                            ? `bg-gradient-to-r ${accent.from} ${accent.to} text-white hover:opacity-90 shadow-lg shadow-teal-500/20`
                            : 'bg-white/[0.05] text-slate-500 border border-white/[0.08] cursor-not-allowed'
                        }`}
                      >
                        {/* Shimmer effect on Create button */}
                        {personas.length > 0 && (
                          <span className="absolute inset-0 overflow-hidden">
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" style={{ animation: 'btn-shimmer 3s ease-in-out infinite' }} />
                          </span>
                        )}
                        <Plus className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Create Scenario</span>
                      </button>
                      {personas.length === 0 && (
                        <p className="text-xs text-slate-500 mt-2">Create a character first to start making scenarios</p>
                      )}
                      {/* Tip section */}
                      <div className="mt-6 flex items-start gap-2 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06] max-w-sm">
                        <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-500 text-left">
                          <span className="text-slate-400 font-medium">Tip: </span>
                          Scenarios set the stage for roleplay — add a location, mood, and opening message to bring your character to life.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Featured Scenario Banner - shows most popular scenario */}
                      {scenarios.length > 0 && (() => {
                        const featured = [...scenarios].sort((a: any, b: any) => (b.likeCount + b.viewCount) - (a.likeCount + a.viewCount))[0]
                        if (!featured || featured.likeCount + featured.viewCount === 0) return null
                        return (
                          <div
                            onClick={() => { setSelectedScenarioId(featured.id); setShowScenarioDetail(true) }}
                            className="relative rounded-xl overflow-hidden cursor-pointer group border border-white/[0.08] hover:border-teal-500/30 transition-all"
                          >
                            <div className="h-40 relative overflow-hidden">
                              {featured.bannerUrl ? (
                                <img src={featured.bannerUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-teal-600/30 via-cyan-600/20 to-teal-800/30" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f14] via-[#0d0f14]/70 to-transparent" />
                              {/* Featured badge */}
                              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
                                <Star className="w-3 h-3 text-amber-300" />
                                <span className="text-[10px] font-medium text-amber-300">Featured</span>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <div className="flex items-end gap-3">
                                <Avatar className="w-12 h-12 border-2 border-[#0d0f14] shadow-lg flex-shrink-0">
                                  <AvatarImage src={featured.imageUrl || featured.persona?.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-400 text-white text-sm font-semibold">
                                    {featured.persona?.name?.charAt(0).toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-bold text-white truncate">{featured.title}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    {featured.persona?.name && (
                                      <span className="text-xs text-teal-300">{featured.persona.name}</span>
                                    )}
                                    <span className="text-xs text-slate-500">•</span>
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                      <Eye className="w-3 h-3" />{featured.viewCount || 0}
                                    </span>
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                      <Heart className="w-3 h-3" />{featured.likeCount || 0}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                      {/* Scenario Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {scenarios.map((scenario: any, index: number) => (
                          <div
                            key={scenario.id}
                            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                          >
                            <ScenarioCard
                              scenario={scenario}
                              isMinor={!userIsAdult}
                              onClick={(id) => {
                                setSelectedScenarioId(id)
                                setShowScenarioDetail(true)
                              }}
                              onLike={async (id) => {
                                try {
                                  const res = await apiFetch(`/api/scenarios/${id}/like`, { method: 'POST' })
                                  if (res.ok) {
                                    const data = await res.json()
                                    setScenarios(prev => prev.map((s: any) => s.id === id ? { ...s, isLiked: data.liked, likeCount: data.likeCount } : s))
                                  }
                                } catch (e) {
                                  console.error('Failed to toggle like:', e)
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Online Personas Section (kept below scenarios) */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Online Characters</h2>
                  </div>
                  
                  {onlinePersonas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="relative mb-4">
                        <div className={`absolute inset-0 w-20 h-20 -m-3 rounded-full bg-gradient-to-br ${accent.from} ${accent.to} opacity-10 blur-xl animate-pulse`} />
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center border border-white/[0.08] relative">
                          <User className="w-7 h-7 text-slate-400 animate-pulse" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-300">No characters online right now</p>
                      <p className="text-xs text-slate-500 mt-1.5 max-w-xs">Check back soon or create your own character to start chatting!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {onlinePersonas.map((persona) => (
                        <div
                          key={persona.id}
                          onClick={() => setSelectedPersona(persona)}
                          className={`rounded-xl border border-white/[0.08] overflow-hidden cursor-pointer hover:${accent.borderSubtle} transition-all group ${accent.bgSurface}/80`}
                        >
                          {/* Banner */}
                          <div className={`h-24 bg-gradient-to-br ${accent.fromSubtle} ${viaSubtle} ${accent.toSubtle} relative`}>
                            <div className={`absolute inset-0 bg-gradient-to-t ${accent.bgSurface.replace('bg-', 'from-')} to-transparent`} />
                            <div className="absolute bottom-3 left-3">
                              <Avatar className={`w-14 h-14 border-2 ${accent.avatarBorder} ring-2 ${accent.bgSurface}`}>
                                <AvatarImage src={persona.avatarUrl || undefined} />
                                <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-lg font-semibold`}>
                                  {persona.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            {/* Online indicator */}
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-xs text-emerald-300">Online</span>
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-slate-100">{persona.name}</h3>
                                <p className="text-xs text-slate-400">@{persona.username}</p>
                              </div>
                              {persona.archetype && (
                                <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(persona.archetype)}`}>
                                  {persona.archetype}
                                </span>
                              )}
                            </div>
                            
                            {persona.bio && (
                              <p className="text-sm text-slate-300/70 mb-3 line-clamp-2">{persona.bio}</p>
                            )}
                            
                            {/* Tags */}
                            {persona.tags && persona.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {persona.tags.slice(0, 3).map((tag, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-white/[0.05] text-slate-400/80 border border-white/[0.08]">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {persona.gender || 'Unknown'}
                                </span>
                                {persona.age && (
                                  <span>{persona.age} yrs</span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startConversation(persona.id)
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r ${accent.from} ${accent.to} text-white transition-all`}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                Chat
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Storylines Grid (fallback when no official server yet) */
              storylines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="relative mb-6">
                    <div className={`absolute inset-0 w-36 h-36 -m-5 rounded-full bg-gradient-to-br ${accent.from} ${accent.to} opacity-10 blur-2xl animate-pulse`} />
                    <div className={`absolute inset-0 w-32 h-32 -m-3 rounded-full border ${accent.borderSubtle} opacity-50`} />
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center border border-white/[0.1] backdrop-blur-sm relative">
                      <BookOpen className={`w-10 h-10 text-teal-400`} />
                    </div>
                  </div>
                  <p className="text-xl font-semibold text-slate-100">No storylines found</p>
                  <p className="text-sm text-slate-400 mt-2 max-w-xs">
                    Every great story starts with a single page. Create your first storyline and invite others to join your world!
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className={`mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r ${accent.from} ${accent.to} text-white text-sm font-medium transition-all hover:opacity-90`}
                  >
                    <Wand2 className="w-4 h-4" />
                    Create Your First Storyline
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {storylines.map(sl => (
                    <div 
                      key={sl.id} 
                      className={`rounded-xl border ${sl.isOfficial ? 'border-teal-500/30' : 'border-white/[0.08]'} overflow-hidden cursor-pointer hover:border-teal-500/30 transition-all group ${sl.isOfficial ? 'bg-gradient-to-r from-teal-950/20 to-cyan-950/10' : `${accent.bgSurface}/80`}`}
                      onClick={() => handleStorylineClick(sl)}
                    >
                      {/* Banner */}
                      <div className={`h-24 bg-gradient-to-br ${accent.fromSubtle} ${viaSubtle} ${accent.toSubtle} relative`}>
                        {sl.iconUrl && (
                          <img src={sl.iconUrl} alt="" className="w-full h-full object-cover opacity-30" />
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-t ${accent.bgSurface.replace('bg-', 'from-')} to-transparent`} />
                        <div className="absolute bottom-3 left-3">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${accent.from} ${accent.to} flex items-center justify-center border-2 ${accent.bgSurface} shadow-lg overflow-hidden`}>
                            {sl.iconUrl ? (
                              <img src={sl.iconUrl} alt={sl.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-bold text-xl">{sl.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          {sl.isOfficial && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                              <ShieldCheck className="w-3 h-3" /> OFFICIAL
                            </span>
                          )}
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(sl.category)}`}>
                            {getCategoryIcon(sl.category)} {sl.category}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-100">{sl.name}</h3>
                          {sl.isOfficial && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              <ShieldCheck className="w-3 h-3" /> Official
                            </span>
                          )}
                          {sl.isAdult && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">18+</span>
                          )}
                        </div>
                        
                        {sl.description && (
                          <p className="text-sm text-slate-300/70 mb-3 line-clamp-2">{sl.description}</p>
                        )}
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {sl.tags && sl.tags.length > 0 ? sl.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-white/[0.05] text-slate-400/80 border border-white/[0.08]">
                              {tag}
                            </span>
                          )) : (
                            <>
                              <span className="px-2 py-0.5 rounded-full text-xs bg-white/[0.05] text-slate-400/80 border border-white/[0.08]">
                                {sl.category.toLowerCase()}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-xs bg-white/[0.05] text-slate-400/80 border border-white/[0.08]">
                                roleplay
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Stats */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {sl.memberCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5" />
                              4.8
                            </span>
                          </div>
                          {sl.isJoined ? (
                            <span className="flex items-center gap-1 text-sm text-emerald-400">
                              <Check className="w-3.5 h-3.5" /> Joined
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                              View Details →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Create Storyline Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b ${accent.bgSurface.replace('bg-', 'from-')} to-[#0e1015] ${accent.borderSubtle}`}>
          <DialogHeader>
            <DialogTitle className={`text-xl font-bold bg-gradient-to-r ${accent.from} ${accent.to} bg-clip-text text-transparent flex items-center gap-2`}>
              <Wand2 className="w-5 h-5 text-slate-400" />
              Create a Storyline
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a group space for shared storytelling adventures!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {createError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {createError}
              </div>
            )}

            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <button
                    onClick={() => setCreateStep(step)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      createStep === step
                        ? `${accent.bgSolid} text-white`
                        : createStep > step
                        ? `${accent.bgHeavy} text-slate-200`
                        : 'bg-white/[0.05] text-slate-500'
                    }`}
                  >
                    {step}
                  </button>
                  {step < 3 && (
                    <div className={`w-8 h-0.5 ${createStep > step ? accent.bgHeavy : 'bg-white/[0.05]'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Basic Info */}
            {createStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">Storyline Name *</Label>
                  <input
                    placeholder="Enter a compelling name..."
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg bg-[#0e1015] border border-white/[0.08] text-slate-100 placeholder-slate-500/50 focus:outline-none focus:${accent.borderSubtle}`}
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">Description</Label>
                  <Textarea
                    placeholder="What's this storyline about?"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    rows={3}
                    className="bg-[#0e1015] border-white/[0.08] text-slate-100 placeholder-slate-500/50 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">Lore / World Building</Label>
                  <Textarea
                    placeholder="Describe the world, setting, or background lore..."
                    value={createForm.lore}
                    onChange={(e) => setCreateForm({ ...createForm, lore: e.target.value })}
                    rows={4}
                    className="bg-[#0e1015] border-white/[0.08] text-slate-100 placeholder-slate-500/50 resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-200 text-sm font-medium">Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {STORYLINE_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, category: cat })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          createForm.category === cat
                            ? `${accent.bgHeavy} text-slate-100 border ${accent.borderMedium}`
                            : 'bg-white/[0.03] text-slate-300/70 border border-white/[0.06] hover:bg-white/[0.05]'
                        }`}
                      >
                        <span>{getCategoryIcon(cat)}</span>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Category Tags */}
                <div className="space-y-3">
                  <Label className="text-slate-200 text-sm font-medium flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" />
                    Custom Tags
                    <span className="text-slate-500 font-normal text-xs">(no emojis, max 10 tags)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Add a tag (e.g., medieval, romance, adventure)..."
                      value={createTagInput}
                      onChange={(e) => setCreateTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const tag = createTagInput.trim().toLowerCase()
                          // Remove emojis and limit length
                          const cleanTag = tag.replace(/[\p{Emoji}]/gu, '').slice(0, 20)
                          if (cleanTag && !createForm.tags.includes(cleanTag) && createForm.tags.length < 10) {
                            setCreateForm({ ...createForm, tags: [...createForm.tags, cleanTag] })
                          }
                          setCreateTagInput('')
                        }
                      }}
                      className="flex-1 h-9 bg-[#0e1015] border-white/[0.08] text-slate-100 placeholder-slate-500/40 text-sm"
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const tag = createTagInput.trim().toLowerCase()
                        const cleanTag = tag.replace(/[\p{Emoji}]/gu, '').slice(0, 20)
                        if (cleanTag && !createForm.tags.includes(cleanTag) && createForm.tags.length < 10) {
                          setCreateForm({ ...createForm, tags: [...createForm.tags, cleanTag] })
                        }
                        setCreateTagInput('')
                      }}
                      className={`px-4 h-9 rounded-lg ${accent.bgTint} border ${accent.borderSubtle} text-slate-200 text-sm hover:${accent.bgHeavy} transition-colors`}
                    >
                      Add
                    </button>
                  </div>
                  {createForm.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {createForm.tags.map(tag => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${accent.bgHeavy} ${accent.text} text-xs border ${accent.borderMedium}`}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => setCreateForm({ ...createForm, tags: createForm.tags.filter(t => t !== tag) })}
                            className="hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setCreateStep(2)}
                  disabled={!createForm.name.trim()}
                  className={`w-full py-2.5 rounded-lg bg-gradient-to-r ${accent.from} ${accent.to} text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  Next: Appearance
                  <span>→</span>
                </button>
              </>
            )}

            {/* Step 2: Appearance */}
            {createStep === 2 && (
              <>
                <div className="space-y-3">
                  <Label className="text-slate-200 text-sm font-medium">Icon Image</Label>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${accent.from} ${accent.to} flex items-center justify-center border-2 ${accent.avatarBorder} overflow-hidden`}>
                      {createForm.iconUrl ? (
                        <img src={createForm.iconUrl} alt="Icon" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-white/60" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={iconInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'iconUrl')}
                        className="hidden"
                      />
                      <button
                        onClick={() => iconInputRef.current?.click()}
                        className={`px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-200 text-sm hover:${accent.bgTint} transition-colors`}
                      >
                        <Camera className="w-4 h-4 inline mr-2" />
                        Upload Icon
                      </button>
                      {createForm.iconUrl && (
                        <button
                          onClick={() => setCreateForm({ ...createForm, iconUrl: '' })}
                          className="ml-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm hover:bg-red-500/20 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-200 text-sm font-medium">Banner Image</Label>
                  <div className="flex items-center gap-4">
                    <div className={`w-full h-24 rounded-lg bg-gradient-to-br ${accent.fromSubtle} ${accent.toSubtle} flex items-center justify-center border border-white/[0.08] overflow-hidden`}>
                      {createForm.bannerUrl ? (
                        <img src={createForm.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-500 text-sm">Banner preview</span>
                      )}
                    </div>
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'bannerUrl')}
                    className="hidden"
                  />
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    className={`px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-200 text-sm hover:${accent.bgTint} transition-colors`}
                  >
                    <Camera className="w-4 h-4 inline mr-2" />
                    Upload Banner
                  </button>
                  {createForm.bannerUrl && (
                    <button
                      onClick={() => setCreateForm({ ...createForm, bannerUrl: '' })}
                      className="ml-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm hover:bg-red-500/20 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-200 text-sm font-medium">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    {accentColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, accentColor: color })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          createForm.accentColor === color
                            ? 'border-white scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={createForm.accentColor}
                      onChange={(e) => setCreateForm({ ...createForm, accentColor: e.target.value })}
                      className={`w-8 h-8 rounded-full cursor-pointer border-2 ${accent.borderSubtle}`}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCreateStep(1)}
                    className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-slate-300 hover:bg-white/[0.05] transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setCreateStep(3)}
                    className={`flex-1 py-2.5 rounded-lg bg-gradient-to-r ${accent.from} ${accent.to} text-white font-medium transition-all flex items-center justify-center gap-2`}
                  >
                    Next: Settings
                    <span>→</span>
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Settings */}
            {createStep === 3 && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">Welcome Message</Label>
                  <Textarea
                    placeholder="A message that new members will see when joining..."
                    value={createForm.welcomeMessage}
                    onChange={(e) => setCreateForm({ ...createForm, welcomeMessage: e.target.value })}
                    rows={3}
                    className="bg-[#0e1015] border-white/[0.08] text-slate-100 placeholder-slate-500/50 resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-slate-200 text-sm font-medium">Visibility</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, isPublic: true })}
                      className={`flex-1 p-4 rounded-lg border transition-all ${
                        createForm.isPublic
                          ? `${accent.bgTint} ${accent.borderMedium} text-slate-100`
                          : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <Globe className="w-5 h-5 mx-auto mb-2" />
                      <div className="text-sm font-medium">Public</div>
                      <div className="text-xs mt-1 opacity-60">Anyone can find and join</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, isPublic: false })}
                      className={`flex-1 p-4 rounded-lg border transition-all ${
                        !createForm.isPublic
                          ? `${accent.bgTint} ${accent.borderMedium} text-slate-100`
                          : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <Lock className="w-5 h-5 mx-auto mb-2" />
                      <div className="text-sm font-medium">Private</div>
                      <div className="text-xs mt-1 opacity-60">Invite only</div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <div className="text-slate-200 text-sm font-medium">Require Approval</div>
                    <div className="text-slate-500 text-xs mt-1">New members must be approved before joining</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, requireApproval: !createForm.requireApproval })}
                    className={`w-12 h-6 rounded-full transition-all ${
                      createForm.requireApproval
                        ? accent.bgSolid
                        : accent.bgTint
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      createForm.requireApproval ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Adult Server Toggle - Only visible to adults */}
                {userIsAdult && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-red-500/5 to-orange-500/5 border border-red-500/15">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <div className="text-slate-200 text-sm font-medium">Adult Server</div>
                        <div className="text-slate-500 text-xs mt-1">Adult servers are only visible to users 18+</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, isAdult: !createForm.isAdult })}
                      className={`w-12 h-6 rounded-full transition-all ${
                        createForm.isAdult
                          ? 'bg-gradient-to-r from-red-500 to-orange-500'
                          : 'bg-white/[0.06]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        createForm.isAdult ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCreateStep(2)}
                    className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-slate-300 hover:bg-white/[0.05] transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isCreating || !createForm.name.trim()}
                    className={`flex-1 py-2.5 rounded-lg bg-gradient-to-r ${accent.from} ${accent.to} text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Create Storyline
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Cancel button (always visible) */}
            <button
              onClick={() => {
                setShowCreateModal(false)
                setCreateStep(1)
              }}
              className="w-full py-2 text-slate-500 text-sm hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Storyline Preview Modal */}
      <StorylineModal
        server={selectedStoryline}
        open={showStorylineModal}
        onOpenChange={(open) => {
          setShowStorylineModal(open)
          if (!open) {
            setSelectedStoryline(null)
            fetchStorylines()
          }
        }}
        currentUserId={user?.id}
        onEnterStoryline={handleEnterStoryline}
      />
      
      {/* Persona Profile Modal */}
      {selectedPersona && (
        <CharacterProfileModal
          persona={selectedPersona}
          isOpen={!!selectedPersona}
          onClose={() => setSelectedPersona(null)}
          onStartChat={(personaId) => {
            startConversation(personaId)
            setSelectedPersona(null)
          }}
        />
      )}
      
      {/* Join Storyline via Invite Code Modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className={`max-w-md bg-gradient-to-b ${accent.bgSurface.replace('bg-', 'from-')} to-[#0e1015] ${accent.borderSubtle}`}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-bold bg-gradient-to-r ${accent.from} ${accent.to} bg-clip-text text-transparent flex items-center gap-2`}>
              <Link2 className="w-5 h-5 text-slate-400" />
              Join Storyline
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter an invite code to join a storyline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {joinError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {joinError}
              </div>
            )}
            {!joinPreview ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Invite Code</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter invite code..."
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.trim())}
                      onKeyDown={(e) => e.key === 'Enter' && checkInviteCode()}
                      className={`bg-[#0e1015] ${accent.borderSubtle} text-slate-100 font-mono`}
                    />
                    <Button onClick={checkInviteCode} disabled={!joinCode.trim() || isCheckingCode} className={`bg-gradient-to-r ${accent.from} ${accent.to} text-white flex-shrink-0`}>
                      {isCheckingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Ask a storyline member for an invite link or code
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Preview card */}
                <div className={`p-4 rounded-xl border ${accent.borderSubtle} ${accent.bgSubtle}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent.from} ${accent.to} flex items-center justify-center overflow-hidden flex-shrink-0`}>
                      {joinPreview.iconUrl ? (
                        <img src={joinPreview.iconUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-lg">{joinPreview.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-100 truncate">{joinPreview.name}</h4>
                      {joinPreview.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{joinPreview.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {joinPreview.memberCount} members
                    </span>
                    <span className="flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />
                      {joinPreview.owner.username}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => { setJoinPreview(null); setJoinError(null) }} variant="ghost" className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleJoinWithCode} disabled={isJoining} className={`flex-1 bg-gradient-to-r ${accent.from} ${accent.to} text-white`}>
                    {isJoining ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Joining...</> : 'Join Storyline'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DM Request Dialog */}
      <DmRequestDialog
        isOpen={showDmRequestDialog}
        onClose={() => { setShowDmRequestDialog(false); setDmRequestTarget(null) }}
        targetPersona={dmRequestTarget}
        myPersona={activePersona}
        onSuccess={handleDmRequestSuccess}
      />

      {/* Scenario Detail Modal */}
      <ScenarioDetailModal
        isOpen={showScenarioDetail}
        onClose={() => { setShowScenarioDetail(false); setSelectedScenarioId(null) }}
        scenarioId={selectedScenarioId}
        onStartChat={(personaId, initialMessage) => {
          startConversation(personaId)
        }}
        onScenarioDeleted={() => {
          setShowScenarioDetail(false)
          setSelectedScenarioId(null)
          fetchScenarios()
        }}
      />

      {/* Scenario Create Modal */}
      <ScenarioCreateModal
        isOpen={showCreateScenario}
        onClose={() => setShowCreateScenario(false)}
        onCreated={() => {
          setShowCreateScenario(false)
          fetchScenarios()
        }}
        personas={personas.map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl || null, mbtiType: p.mbtiType || null, archetype: p.archetype || null }))}
      />
    </div>
  )
}