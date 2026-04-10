'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  Star, Filter, Trash2, Zap
} from 'lucide-react'
import { STORYLINE_CATEGORIES } from '@/lib/constants'
import { StorylineModal } from '@/components/storylines/StorylineModal'
import type { StorylineServer } from '@/components/storylines/StorylineServerCard'
import { STORYLINE_REFRESH_EVENT } from '@/components/sidebar'
import { CharacterProfileModal } from '@/components/character-profile-modal'
import { DmRequestDialog } from '@/app/page'
import { DM_REFRESH_EVENT } from '@/components/dm-sidebar'
import type { Conversation } from '@/app/page'
import { useToast } from '@/hooks/use-toast'
import { StorylineAdvancedSearch, type StorylineSearchFilters } from '@/components/storyline-advanced-search'
import { ScenariosPage as ScenariosComponent } from '@/components/scenarios-page'

interface StorylineItem {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  category: string
  memberCount: number
  isJoined: boolean
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
}

interface StorylinesPageProps {
  onViewStoryline?: (storylineId: string) => void
  onStartChat?: (conversation: Conversation) => void
}

type TabType = 'discover' | 'trending' | 'recent' | 'my-personas' | 'scenarios'

export function StorylinesPage({ onViewStoryline, onStartChat }: StorylinesPageProps) {
  const { user } = useAuth()
  const { personas: myPersonas, activePersona, activatePersona, deletePersona } = usePersonas()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState<TabType>('discover')
  const [storylines, setStorylines] = useState<StorylineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  
  // For storylines advanced search
  const [storylineFilters, setStorylineFilters] = useState<StorylineSearchFilters>({
    query: '',
    searchIn: ['all'],
    category: null,
    tags: []
  })
  const [popularTags, setPopularTags] = useState<{tag: string; count: number}[]>([])

  // For my personas search/filter
  const [myPersonasSearch, setMyPersonasSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  
  // Storyline modal state
  const [selectedStoryline, setSelectedStoryline] = useState<StorylineServer | null>(null)
  const [showStorylineModal, setShowStorylineModal] = useState(false)
  
  // Persona modal state
  const [selectedPersona, setSelectedPersona] = useState<OnlinePersona | null>(null)
  const [showDmRequestDialog, setShowDmRequestDialog] = useState(false)
  const [dmRequestTarget, setDmRequestTarget] = useState<{ id: string; name: string; username: string } | null>(null)
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    lore: '',
    iconUrl: '',
    bannerUrl: '',
    category: 'Fantasy',
    isPublic: true,
    accentColor: '#ffffff',
    welcomeMessage: '',
    requireApproval: false,
    tags: [] as string[],
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createStep, setCreateStep] = useState(1)
  const [createTagInput, setCreateTagInput] = useState('')
  const iconInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  
  // Preset accent colors
  const accentColors = [
    '#ffffff', '#ec4899', '#f43f5e', '#f97316', '#eab308',
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
  
  useEffect(() => {
    // Only fetch storylines for non-my-personas tabs
    if (activeTab !== 'my-personas') {
      fetchStorylines()
    }
  }, [activeTab, fetchStorylines])
  
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
          accentColor: '#ffffff',
          welcomeMessage: '',
          requireApproval: false,
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
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'iconUrl' | 'bannerUrl') => {
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
      'Fantasy': 'bg-white/10 text-gray-300 border-white/20',
      'Sci-Fi': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      'Slice of Life': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      'Mystery': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Comedy': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Drama': 'bg-white/10 text-gray-300 border-white/20',
      'Adventure': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'Thriller': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      'Historical': 'bg-stone-500/20 text-stone-300 border-stone-500/30',
      'Supernatural': 'bg-white/10 text-gray-300 border-white/20',
      'Other': 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
    return colors[category] || 'bg-white/10 text-gray-300 border-white/20'
  }
  
  return (
    <div className="flex flex-col h-full persona-bg">
      {/* Header */}
      <div className="h-14 border-b border-white/5 flex items-center px-4 gap-4 bg-black/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white/90">Discover</span>
        </div>
        
        {/* Search is handled by StorylineAdvancedSearch component below */}
        <div className="flex-1" />
        
        <div className="ml-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-persona flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Storyline
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-white/5 bg-black/30">
        <button
          onClick={() => setActiveTab('discover')}
          className={`persona-tab flex items-center gap-2 ${activeTab === 'discover' ? 'persona-tab-active' : ''}`}
        >
          <Compass className="w-4 h-4" />
          Discover
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`persona-tab flex items-center gap-2 ${activeTab === 'trending' ? 'persona-tab-active' : ''}`}
        >
          <TrendingUp className="w-4 h-4" />
          Trending
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`persona-tab flex items-center gap-2 ${activeTab === 'recent' ? 'persona-tab-active' : ''}`}
        >
          <Clock className="w-4 h-4" />
          Recent
        </button>
        <button
          onClick={() => setActiveTab('my-personas')}
          className={`persona-tab flex items-center gap-2 ${activeTab === 'my-personas' ? 'persona-tab-active' : ''}`}
        >
          <User className="w-4 h-4" />
          My Personas
          {myPersonas.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-white/60">
              {myPersonas.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`persona-tab flex items-center gap-2 ${activeTab === 'scenarios' ? 'persona-tab-active' : ''}`}
        >
          <Sparkles className="w-4 h-4" />
          Scenarios
        </button>
      </div>
      
      {/* Search - Show appropriate search based on tab */}
      <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5">
        {activeTab === 'my-personas' ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search your personas..."
              value={myPersonasSearch}
              onChange={(e) => setMyPersonasSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/20"
            />
          </div>
        ) : activeTab === 'scenarios' ? null : (
          <StorylineAdvancedSearch 
            onSearch={setStorylineFilters}
            popularTags={popularTags}
            isLoading={isLoading}
          />
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'scenarios' ? (
          <ScenariosComponent />
        ) : (
        <ScrollArea className="h-full p-4">
          <div className="max-w-5xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeTab === 'my-personas' ? (
              /* My Personas Grid */
              myPersonas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                    <User className="w-8 h-8 text-white/50" />
                  </div>
                  <p className="text-lg font-medium text-white/70">No personas yet</p>
                  <p className="text-sm text-white/40 mt-1">Create your first character to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myPersonas
                    .filter(p => !myPersonasSearch || 
                      p.name.toLowerCase().includes(myPersonasSearch.toLowerCase()) ||
                      p.archetype?.toLowerCase().includes(myPersonasSearch.toLowerCase()) ||
                      p.tags?.some(t => t.toLowerCase().includes(myPersonasSearch.toLowerCase()))
                    )
                    .map((persona) => (
                    <div
                      key={persona.id}
                      className={`persona-card overflow-hidden cursor-pointer group transition-all ${
                        persona.isActive 
                          ? 'border-2 border-emerald-500/50 bg-emerald-500/5' 
                          : 'persona-card-hover'
                      }`}
                    >
                      {/* Banner */}
                      <div className="h-24 bg-gradient-to-br from-white/5 via-white/[0.02] to-white/[0.05] relative">
                        {persona.bannerUrl && (
                          <img src={persona.bannerUrl} alt="" className="w-full h-full object-cover opacity-50" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-3 left-3">
                          <Avatar className="w-14 h-14 border-2 border-white/20 ring-2 ring-black">
                            <AvatarImage src={persona.avatarUrl || undefined} />
                            <AvatarFallback className="bg-white/10 text-white text-lg font-semibold">
                              {persona.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        {/* Active indicator */}
                        {persona.isActive && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span className="text-xs text-emerald-300 font-medium">Active</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-white/90">{persona.name}</h3>
                            <p className="text-xs text-white/40">{persona.archetype || 'No archetype'}</p>
                          </div>
                          {persona.mbtiType && (
                            <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-white/60 border border-white/10">
                              {persona.mbtiType}
                            </span>
                          )}
                        </div>
                        
                        {persona.description && (
                          <p className="text-sm text-white/50 mb-3 line-clamp-2">{persona.description}</p>
                        )}
                        
                        {/* Tags */}
                        {persona.tags && persona.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {persona.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/60 border border-white/10">
                                {tag}
                              </span>
                            ))}
                            {persona.tags.length > 3 && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/40 border border-white/10">
                                +{persona.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <div className="flex items-center gap-3 text-xs text-white/40">
                            {persona.age && <span>{persona.age} yrs</span>}
                            {persona.gender && <span>{persona.gender}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {!persona.isActive && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  activatePersona(persona.id)
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Delete this persona?')) {
                                  deletePersona(persona.id)
                                }
                              }}
                              className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Storylines Grid */
              storylines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                    <BookOpen className="w-8 h-8 text-white/50" />
                  </div>
                  <p className="text-lg font-medium text-white/70">No storylines found</p>
                  <p className="text-sm text-white/40 mt-1">Create one to start a new adventure!</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 btn-persona flex items-center gap-2 text-sm"
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
                      className="persona-card persona-card-hover overflow-hidden cursor-pointer group"
                      onClick={() => handleStorylineClick(sl)}
                    >
                      {/* Banner */}
                      <div className="h-24 bg-gradient-to-br from-white/5 via-white/[0.02] to-white/[0.05] relative">
                        {sl.iconUrl && (
                          <img src={sl.iconUrl} alt="" className="w-full h-full object-cover opacity-30" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-3 left-3">
                          <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border-2 border-black shadow-lg overflow-hidden">
                            {sl.iconUrl ? (
                              <img src={sl.iconUrl} alt={sl.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-bold text-xl">{sl.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(sl.category)}`}>
                            {getCategoryIcon(sl.category)} {sl.category}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-semibold text-white/90 mb-1">{sl.name}</h3>
                        
                        {sl.description && (
                          <p className="text-sm text-white/50 mb-3 line-clamp-2">{sl.description}</p>
                        )}
                        
                        {/* Tags placeholder */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/60 border border-white/10">
                            {sl.category.toLowerCase()}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/60 border border-white/10">
                            roleplay
                          </span>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <div className="flex items-center gap-3 text-xs text-white/40">
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
                            <span className="text-sm text-white/50 hover:text-white/80 transition-colors">
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
        )}
      </div>
      
      {/* Create Storyline Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#111111] to-[#0a0a0a] border-white/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-gray-400" />
              Create a Storyline
            </DialogTitle>
            <DialogDescription className="text-gray-400/70">
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
                        ? 'bg-white text-white'
                        : createStep > step
                        ? 'bg-white/15 text-gray-200'
                        : 'bg-white/5 text-gray-400/60'
                    }`}
                  >
                    {step}
                  </button>
                  {step < 3 && (
                    <div className={`w-8 h-0.5 ${createStep > step ? 'bg-white/15' : 'bg-white/5'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Basic Info */}
            {createStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-200 text-sm font-medium">Storyline Name *</Label>
                  <input
                    placeholder="Enter a compelling name..."
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/15 text-white placeholder-gray-500/50 focus:outline-none focus:border-white/30"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-200 text-sm font-medium">Description</Label>
                  <Textarea
                    placeholder="What's this storyline about?"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    rows={3}
                    className="bg-[#0a0a0a] border-white/15 text-white placeholder-gray-500/50 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-200 text-sm font-medium">Lore / World Building</Label>
                  <Textarea
                    placeholder="Describe the world, setting, or background lore..."
                    value={createForm.lore}
                    onChange={(e) => setCreateForm({ ...createForm, lore: e.target.value })}
                    rows={4}
                    className="bg-[#0a0a0a] border-white/15 text-white placeholder-gray-500/50 resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-gray-200 text-sm font-medium">Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {STORYLINE_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, category: cat })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          createForm.category === cat
                            ? 'bg-white/15 text-white border border-white/30'
                            : 'bg-white/5 text-gray-300/70 border border-white/10 hover:bg-white/5'
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
                  <Label className="text-gray-200 text-sm font-medium flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" />
                    Custom Tags
                    <span className="text-gray-400/50 font-normal text-xs">(no emojis, max 10 tags)</span>
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
                      className="flex-1 h-9 bg-[#0a0a0a] border-white/15 text-white placeholder-gray-500/40 text-sm"
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
                      className="px-4 h-9 rounded-lg bg-white/10 border border-white/20 text-gray-200 text-sm hover:bg-white/15 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {createForm.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {createForm.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-gray-200 text-xs border border-white/20"
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
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-gray-700 to-gray-500 text-white font-medium hover:from-white hover:to-gray-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                  <Label className="text-gray-200 text-sm font-medium">Icon Image</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-white to-gray-300 flex items-center justify-center border-2 border-white/20 overflow-hidden">
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
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/15 text-gray-200 text-sm hover:bg-white/10 transition-colors"
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
                  <Label className="text-gray-200 text-sm font-medium">Banner Image</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-full h-24 rounded-lg bg-gradient-to-br from-gray-400/20 via-gray-300/10 to-cyan-500/5 flex items-center justify-center border border-white/15 overflow-hidden">
                      {createForm.bannerUrl ? (
                        <img src={createForm.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400/50 text-sm">Banner preview</span>
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
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/15 text-gray-200 text-sm hover:bg-white/10 transition-colors"
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
                  <Label className="text-gray-200 text-sm font-medium">Accent Color</Label>
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
                      className="w-8 h-8 rounded-full cursor-pointer border-2 border-white/20"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCreateStep(1)}
                    className="flex-1 py-2.5 rounded-lg border border-white/15 text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setCreateStep(3)}
                    className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-gray-700 to-gray-500 text-white font-medium hover:from-white hover:to-gray-400 transition-all flex items-center justify-center gap-2"
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
                  <Label className="text-gray-200 text-sm font-medium">Welcome Message</Label>
                  <Textarea
                    placeholder="A message that new members will see when joining..."
                    value={createForm.welcomeMessage}
                    onChange={(e) => setCreateForm({ ...createForm, welcomeMessage: e.target.value })}
                    rows={3}
                    className="bg-[#0a0a0a] border-white/15 text-white placeholder-gray-500/50 resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-gray-200 text-sm font-medium">Visibility</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, isPublic: true })}
                      className={`flex-1 p-4 rounded-lg border transition-all ${
                        createForm.isPublic
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400/70 hover:bg-white/5'
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
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400/70 hover:bg-white/5'
                      }`}
                    >
                      <Lock className="w-5 h-5 mx-auto mb-2" />
                      <div className="text-sm font-medium">Private</div>
                      <div className="text-xs mt-1 opacity-60">Invite only</div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <div className="text-gray-200 text-sm font-medium">Require Approval</div>
                    <div className="text-gray-400/60 text-xs mt-1">New members must be approved before joining</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, requireApproval: !createForm.requireApproval })}
                    className={`w-12 h-6 rounded-full transition-all ${
                      createForm.requireApproval
                        ? 'bg-white/20'
                        : 'bg-white/10'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      createForm.requireApproval ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCreateStep(2)}
                    className="flex-1 py-2.5 rounded-lg border border-white/15 text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isCreating || !createForm.name.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-gray-700 to-gray-500 text-white font-medium hover:from-white hover:to-gray-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
              className="w-full py-2 text-gray-400/60 text-sm hover:text-gray-300 transition-colors"
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
      
      {/* DM Request Dialog */}
      <DmRequestDialog
        isOpen={showDmRequestDialog}
        onClose={() => { setShowDmRequestDialog(false); setDmRequestTarget(null) }}
        targetPersona={dmRequestTarget}
        myPersona={activePersona}
        onSuccess={handleDmRequestSuccess}
      />
    </div>
  )
}