'use client'

import { useState, useEffect, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { PersonaCard } from '@/components/persona-card'
import { getArchetypeGradientColor } from '@/lib/archetype-config'
import { 
  Search, TrendingUp, Clock, Star, Users, Sparkles, 
  Flame, Crown, Heart, ChevronRight, Filter, Grid3X3, List,
  Sparkles as SparklesIcon, ArrowUpRight, User, MessageCircle,
  BookOpen, Zap, Globe, Target, Compass
} from 'lucide-react'

// Types
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
    avatarUrl: string | null
    relationshipType: string
    specificRole: string | null
    characterAge: number | null
    description: string | null
  }[]
}

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
  owner: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

interface ScenarioItem {
  id: string
  title: string
  description: string | null
  genre: string | null
  tags: string[]
  createdAt: string
  creator: {
    username: string
  }
}

interface DiscoverPageProps {
  onSelectPersona?: (persona: OnlinePersona) => void
  onOpenMyCharacters?: () => void
  onViewStoryline?: (storylineId: string) => void
}

// Section type
type SectionType = 'all' | 'trending' | 'partners' | 'storylines' | 'scenarios'

// Category colors for storylines
const CATEGORY_COLORS: Record<string, string> = {
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

export function DiscoverPage({ onSelectPersona, onOpenMyCharacters, onViewStoryline }: DiscoverPageProps) {
  const [personas, setPersonas] = useState<OnlinePersona[]>([])
  const [ageGapPersonas, setAgeGapPersonas] = useState<OnlinePersona[]>([]) // Age-filtered for partner matching
  const [storylines, setStorylines] = useState<StorylineItem[]>([])
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SectionType>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [ageRangeInfo, setAgeRangeInfo] = useState<{ min: number; max: number | null } | null>(null)

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch personas (general discovery)
        const personasRes = await apiFetch('/api/discovery')
        if (personasRes.ok) {
          const data = await personasRes.json()
          setPersonas(data.personas || [])
        }

        // Fetch personas with age gap filtering (for partner matching)
        const ageGapRes = await apiFetch('/api/discovery?ageGap=true&showOffline=true')
        if (ageGapRes.ok) {
          const data = await ageGapRes.json()
          setAgeGapPersonas(data.personas || [])
          setAgeRangeInfo(data.ageRange || null)
        }

        // Fetch storylines
        const storylinesRes = await apiFetch('/api/storylines')
        if (storylinesRes.ok) {
          const data = await storylinesRes.json()
          setStorylines(data.storylines || [])
        }

        // Fetch scenarios
        const scenariosRes = await apiFetch('/api/scenarios')
        if (scenariosRes.ok) {
          const data = await scenariosRes.json()
          setScenarios(data.scenarios || [])
        }
      } catch (error) {
        console.error('Failed to fetch discovery data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Get online personas (for display in "All" section)
  const onlinePersonas = useMemo(() => personas.filter(p => p.isOnline), [personas])
  
  // Get age-appropriate partners (filtered by age gap rules)
  const partnerPersonas = useMemo(() => {
    // Use age-gap filtered personas for partner matching
    // These are already filtered to only show users you can chat with
    return ageGapPersonas
  }, [ageGapPersonas])
  
  // Get online age-appropriate partners
  const onlinePartnerPersonas = useMemo(() => partnerPersonas.filter(p => p.isOnline), [partnerPersonas])

  // Get offline age-appropriate partners (for "Discover Partners" section)
  const offlinePartnerPersonas = useMemo(() => partnerPersonas.filter(p => !p.isOnline), [partnerPersonas])

  // Get trending personas (sorted by tags/engagement)
  const trendingPersonas = useMemo(() => {
    return [...personas].sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0)).slice(0, 8)
  }, [personas])

  // Get featured storylines (not joined, looking for members)
  const featuredStorylines = useMemo(() => {
    return storylines.filter(s => !s.isJoined).slice(0, 6)
  }, [storylines])


  // Get category color
  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || 'bg-white/10 text-gray-300 border-white/20'
  }

  // Section navigation items
  const sectionItems = [
    { id: 'all' as SectionType, label: 'All', icon: Compass },
    { id: 'trending' as SectionType, label: 'Trending', icon: TrendingUp },
    { id: 'partners' as SectionType, label: 'Find Partners', icon: Target },
    { id: 'storylines' as SectionType, label: 'Storylines', icon: Crown },
    { id: 'scenarios' as SectionType, label: 'Scenarios', icon: BookOpen },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Community Discovery</h1>
              <p className="text-sm text-white/40 mt-1">Explore characters, find partners, and discover new stories</p>
            </div>
            <div className="flex items-center gap-2">
              {onOpenMyCharacters && (
                <button
                  onClick={onOpenMyCharacters}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Characters
                </button>
              )}
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                  viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                  viewMode === 'list' ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search characters, storylines, scenarios..."
              className="h-12 pl-12 pr-4 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-white/20 focus:ring-white/5"
            />
          </div>
        </div>
        
        {/* Section Tabs */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {sectionItems.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                  activeSection === section.id
                    ? "bg-white text-black"
                    : "bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white/80 border border-white/5"
                )}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
                {section.id === 'partners' && onlinePartnerPersonas.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                    {onlinePartnerPersonas.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-8">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* ALL SECTION - Combined view */}
              {activeSection === 'all' && (
                <>
                  {/* Online Now - Partner Matching (Age-appropriate) */}
                  {onlinePartnerPersonas.length > 0 && (
                    <Section
                      title="Online Now"
                      subtitle="Find RP partners currently active (age-appropriate)"
                      icon={<Zap className="w-5 h-5 text-emerald-400" />}
                      action={
                        <button 
                          onClick={() => setActiveSection('partners')}
                          className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1"
                        >
                          View all <ChevronRight className="w-4 h-4" />
                        </button>
                      }
                    >
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {onlinePartnerPersonas.slice(0, 6).map((persona) => (
                          <OnlinePartnerCard
                            key={persona.id}
                            persona={persona}
                            onSelect={() => onSelectPersona?.(persona)}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Discover Partners - Offline age-appropriate partners */}
                  {offlinePartnerPersonas.length > 0 && (
                    <Section
                      title="Discover Partners"
                      subtitle="Age-appropriate partners looking for RP"
                      icon={<Target className="w-5 h-5 text-cyan-400" />}
                      action={
                        <button 
                          onClick={() => setActiveSection('partners')}
                          className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1"
                        >
                          View all <ChevronRight className="w-4 h-4" />
                        </button>
                      }
                    >
                      {ageRangeInfo && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 inline-flex items-center gap-2">
                          <span className="text-xs text-cyan-300">
                            {ageRangeInfo.max 
                              ? `Ages ${ageRangeInfo.min}-${ageRangeInfo.max}` 
                              : `Ages ${ageRangeInfo.min}+`
                            }
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {offlinePartnerPersonas.slice(0, 4).map((persona) => (
                          <PartnerMatchCard
                            key={persona.id}
                            persona={persona}
                            onSelect={() => onSelectPersona?.(persona)}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Trending Characters */}
                  {trendingPersonas.length > 0 && (
                    <Section
                      title="Trending Characters"
                      subtitle="Popular personas in the community"
                      icon={<Flame className="w-5 h-5 text-orange-400" />}
                      action={
                        <button 
                          onClick={() => setActiveSection('trending')}
                          className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1"
                        >
                          View all <ChevronRight className="w-4 h-4" />
                        </button>
                      }
                    >
                      <div className={cn(
                        "grid gap-4",
                        viewMode === 'grid' 
                          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                          : "grid-cols-1"
                      )}>
                        {trendingPersonas.slice(0, 4).map((persona) => (
                          viewMode === 'list' ? (
                            <PersonaListItem
                              key={persona.id}
                              persona={persona}
                              onSelect={() => onSelectPersona?.(persona)}
                            />
                          ) : (
                            <PersonaCard
                              key={persona.id}
                              persona={persona}
                              onStartChat={() => {}}
                              onViewProfile={() => onSelectPersona?.(persona)}
                            />
                          )
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Featured Storylines */}
                  {featuredStorylines.length > 0 && (
                    <Section
                      title="Storylines Looking for Members"
                      subtitle="Join ongoing adventures"
                      icon={<Crown className="w-5 h-5 text-amber-400" />}
                      action={
                        <button 
                          onClick={() => setActiveSection('storylines')}
                          className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1"
                        >
                          View all <ChevronRight className="w-4 h-4" />
                        </button>
                      }
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {featuredStorylines.slice(0, 3).map((storyline) => (
                          <StorylineCard
                            key={storyline.id}
                            storyline={storyline}
                            onView={() => onViewStoryline?.(storyline.id)}
                            categoryColor={getCategoryColor(storyline.category)}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* New Scenarios */}
                  {scenarios.length > 0 && (
                    <Section
                      title="Quick Start Scenarios"
                      subtitle="Jump into roleplay instantly"
                      icon={<BookOpen className="w-5 h-5 text-blue-400" />}
                      action={
                        <button 
                          onClick={() => setActiveSection('scenarios')}
                          className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1"
                        >
                          View all <ChevronRight className="w-4 h-4" />
                        </button>
                      }
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {scenarios.slice(0, 4).map((scenario) => (
                          <ScenarioCard key={scenario.id} scenario={scenario} />
                        ))}
                      </div>
                    </Section>
                  )}
                </>
              )}

              {/* TRENDING SECTION */}
              {activeSection === 'trending' && (
                <div className={cn(
                  "grid gap-4",
                  viewMode === 'grid' 
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                    : "grid-cols-1"
                )}>
                  {trendingPersonas.map((persona) => (
                    viewMode === 'list' ? (
                      <PersonaListItem
                        key={persona.id}
                        persona={persona}
                        onSelect={() => onSelectPersona?.(persona)}
                      />
                    ) : (
                      <PersonaCard
                        key={persona.id}
                        persona={persona}
                        onStartChat={() => {}}
                        onViewProfile={() => onSelectPersona?.(persona)}
                      />
                    )
                  ))}
                </div>
              )}

              {/* PARTNERS SECTION */}
              {activeSection === 'partners' && (
                <div className="space-y-4">
                  {/* Age range info */}
                  {ageRangeInfo && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                      <Target className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-sm text-white/70">
                          Showing partners you can chat with
                          {ageRangeInfo.max 
                            ? ` (ages ${ageRangeInfo.min}-${ageRangeInfo.max})` 
                            : ` (ages ${ageRangeInfo.min}+)`
                          }
                        </p>
                        <p className="text-xs text-white/40">Based on your age and platform safety rules</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {onlinePartnerPersonas.length} age-appropriate partners currently online ({partnerPersonas.length} total)
                  </div>
                  {partnerPersonas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                        <Target className="w-8 h-8 text-white/50" />
                      </div>
                      <p className="text-lg font-medium text-white/70">No compatible partners found</p>
                      <p className="text-sm text-white/40 mt-1">Try again later or expand your search</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {partnerPersonas.map((persona) => (
                        <PartnerMatchCard
                          key={persona.id}
                          persona={persona}
                          onSelect={() => onSelectPersona?.(persona)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STORYLINES SECTION */}
              {activeSection === 'storylines' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredStorylines.map((storyline) => (
                    <StorylineCard
                      key={storyline.id}
                      storyline={storyline}
                      onView={() => onViewStoryline?.(storyline.id)}
                      categoryColor={getCategoryColor(storyline.category)}
                    />
                  ))}
                </div>
              )}

              {/* SCENARIOS SECTION */}
              {activeSection === 'scenarios' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {scenarios.map((scenario) => (
                    <ScenarioCard key={scenario.id} scenario={scenario} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {['Online Now', 'Trending', 'Storylines'].map((section) => (
        <div key={section}>
          <div className="h-6 w-32 bg-white/5 rounded animate-pulse mb-4" />
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-48 h-32 bg-white/[0.02] rounded-xl border border-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Section wrapper component
function Section({ 
  title, 
  subtitle, 
  icon, 
  action, 
  children 
}: { 
  title: string
  subtitle: string
  icon: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-sm text-white/40">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// Online Partner Card (Horizontal compact)
function OnlinePartnerCard({ 
  persona, 
  onSelect 
}: { 
  persona: OnlinePersona
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="flex-shrink-0 w-48 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all text-left group"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="relative">
          <Avatar className="w-10 h-10 border border-emerald-500/30">
            <AvatarImage src={persona.avatarUrl || undefined} />
            <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-sm font-semibold">
              {persona.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{persona.name}</p>
          <p className="text-xs text-white/40">@{persona.username}</p>
        </div>
      </div>
      {persona.bio && (
        <p className="text-xs text-white/50 line-clamp-2">{persona.bio}</p>
      )}
    </button>
  )
}

// Partner Match Card (Full size with actions)
function PartnerMatchCard({ 
  persona, 
  onSelect 
}: { 
  persona: OnlinePersona
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left group"
    >
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <Avatar className="w-16 h-16 border-2 border-emerald-500/30">
            <AvatarImage src={persona.avatarUrl || undefined} />
            <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-xl font-bold">
              {persona.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-black flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-black" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{persona.name}</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Online
            </span>
          </div>
          <p className="text-sm text-white/40 mb-2">@{persona.username}</p>
          {persona.bio && (
            <p className="text-sm text-white/50 line-clamp-2 mb-3">{persona.bio}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {persona.tags?.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/50 border border-white/10">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <MessageCircle className="w-5 h-5 text-white/20 group-hover:text-emerald-400 transition-colors" />
      </div>
    </button>
  )
}

// Persona List Item Component (for list view mode - shared PersonaCard only supports grid)
function PersonaListItem({
  persona,
  onSelect
}: {
  persona: OnlinePersona
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all text-left group"
    >
      <Avatar className="w-14 h-14 border border-white/10 flex-shrink-0">
        <AvatarImage src={persona.avatarUrl || undefined} />
        <AvatarFallback className="bg-white/10 text-white font-semibold">
          {persona.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white truncate">{persona.name}</h3>
          {persona.isOnline && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </div>
        <p className="text-sm text-white/40 truncate">
          @{persona.username} {persona.archetype && `• ${persona.archetype}`}
        </p>
        {persona.bio && (
          <p className="text-xs text-white/30 line-clamp-1 mt-1">{persona.bio}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {persona.mbtiType && (
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/5 text-white/60 border border-white/10">
            {persona.mbtiType}
          </span>
        )}
        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
      </div>
    </button>
  )
}

// Storyline Card Component
function StorylineCard({
  storyline,
  onView,
  categoryColor
}: {
  storyline: StorylineItem
  onView: () => void
  categoryColor: string
}) {
  return (
    <button
      onClick={onView}
      className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.03] transition-all text-left group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
          {storyline.iconUrl ? (
            <img src={storyline.iconUrl} alt={storyline.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-lg">{storyline.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{storyline.name}</h3>
          <p className="text-xs text-white/40">by @{storyline.owner.username}</p>
        </div>
        <span className={cn("px-2 py-1 rounded-lg text-xs font-medium border", categoryColor)}>
          {storyline.category}
        </span>
      </div>
      {storyline.description && (
        <p className="text-sm text-white/50 line-clamp-2 mb-3">{storyline.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {storyline.memberCount} members
          </span>
        </div>
        <span className="text-sm text-white/50 group-hover:text-white transition-colors flex items-center gap-1">
          View <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  )
}

// Scenario Card Component
function ScenarioCard({ scenario }: { scenario: ScenarioItem }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.03] transition-all">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white">{scenario.title}</h3>
        {scenario.genre && (
          <span className="px-2 py-1 rounded-lg text-xs bg-white/5 text-white/60 border border-white/10">
            {scenario.genre}
          </span>
        )}
      </div>
      {scenario.description && (
        <p className="text-sm text-white/50 line-clamp-2 mb-3">{scenario.description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>by @{scenario.creator.username}</span>
        <span>{scenario.tags?.length || 0} tags</span>
      </div>
    </div>
  )
}
