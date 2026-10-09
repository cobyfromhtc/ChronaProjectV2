'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  X, Loader2, Heart, Eye, MessageSquare, MapPin, Tag, Sparkles,
  MessageCircle, Shirt, ShieldCheck, User, Calendar, Clock, Lock, AlertTriangle,
  Share2, Flag, ChevronDown, ChevronUp, TrendingUp, Users, Pencil
} from 'lucide-react'
import { useVariantAccent } from '@/lib/ui-variant-styles'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { useToast } from '@/hooks/use-toast'
import { isAdult } from '@/lib/age-utils'
import { apiFetch } from '@/lib/api-client'
import { ScenarioEditModal } from '@/components/scenario-edit-modal'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  MOOD_EMOJIS,
  RATING_CONFIG,
  formatCount,
  formatTimeAgo,
  isNewScenario,
} from '@/lib/scenario-constants'

interface ScenarioDetailModalProps {
  isOpen: boolean
  onClose: () => void
  scenarioId: string | null
  onStartChat: (personaId: string, initialMessage?: string) => void
  onScenarioDeleted?: () => void
}

interface ScenarioData {
  id: string
  personaId: string
  creatorId: string
  title: string
  description: string | null
  imageUrl: string | null
  bannerUrl: string | null
  location: string | null
  attire: string | null
  initialMessages: string[]
  mood: string | null
  tags: string[]
  category: string
  isPublic: boolean
  isFeatured: boolean
  viewCount: number
  chatCount: number
  likeCount: number
  contentRating: string
  createdAt: string
  updatedAt: string
  isLiked: boolean
  persona: {
    id: string
    name: string
    avatarUrl: string | null
    mbtiType: string | null
    archetype: string | null
    gender: string | null
    species: string | null
    age: number | null
  } | null
  creator: {
    id: string
    username: string
    avatarUrl: string | null
  } | null
}

export function ScenarioDetailModal({ isOpen, onClose, scenarioId, onStartChat, onScenarioDeleted }: ScenarioDetailModalProps) {
  const accent = useVariantAccent()
  const { user } = useAuth()
  const { personas } = usePersonas()
  const { toast } = useToast()

  const [scenario, setScenario] = useState<ScenarioData | null>(null)
  const [loading, setLoading] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeLoading, setLikeLoading] = useState(false)
  const [likeAnim, setLikeAnim] = useState(false)
  const [selectedGreeting, setSelectedGreeting] = useState<number | null>(null)
  const [isAgeRestricted, setIsAgeRestricted] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const isCreator = user && scenario && user.id === scenario.creatorId

  // Determine if user is adult for age-gating
  const userIsAdult = user?.dateOfBirth ? isAdult(new Date(user.dateOfBirth)) : false

  const fetchScenario = useCallback(async () => {
    if (!scenarioId) return
    setLoading(true)
    try {
      const res = await apiFetch(`/api/scenarios/${scenarioId}`)
      if (res.ok) {
        const data = await res.json()
        setScenario(data.scenario)
        setIsLiked(data.scenario.isLiked)
        setLikeCount(data.scenario.likeCount)
        setIsAgeRestricted(false)
      } else if (res.status === 403) {
        const data = await res.json()
        if (data.restricted) {
          setIsAgeRestricted(true)
          setScenario(null)
        }
      }
    } catch (e) {
      console.error('Failed to fetch scenario:', e)
    } finally {
      setLoading(false)
    }
  }, [scenarioId])

  useEffect(() => {
    if (isOpen && scenarioId) {
      fetchScenario()
      setSelectedGreeting(null)
      setDescriptionExpanded(false)
    }
  }, [isOpen, scenarioId, fetchScenario])

  const handleLike = async () => {
    if (!scenarioId || likeLoading) return
    setLikeLoading(true)
    try {
      const res = await apiFetch(`/api/scenarios/${scenarioId}/like`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        const wasLiked = isLiked
        setIsLiked(data.liked)
        setLikeCount(data.likeCount)
        if (!wasLiked && data.liked) {
          setLikeAnim(true)
          setTimeout(() => setLikeAnim(false), 400)
        }
      }
    } catch (e) {
      console.error('Failed to toggle like:', e)
    } finally {
      setLikeLoading(false)
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}?scenario=${scenarioId}`
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link Copied!', description: 'Scenario link has been copied to your clipboard.' })
    }).catch(() => {
      toast({ title: 'Share', description: url })
    })
  }

  const handleStartChat = () => {
    if (!scenario?.persona) return
    const initialMessage = selectedGreeting !== null && scenario.initialMessages[selectedGreeting]
      ? scenario.initialMessages[selectedGreeting]
      : undefined
    onStartChat(scenario.personaId, initialMessage)
    onClose()
  }

  const categoryColor = scenario ? CATEGORY_COLORS[scenario.category] || CATEGORY_COLORS.other : ''
  const ratingConfig = scenario ? RATING_CONFIG[scenario.contentRating] || RATING_CONFIG.safe : null
  const moodEmoji = scenario?.mood ? MOOD_EMOJIS[scenario.mood.toLowerCase()] || '✨' : null
  const isNew = scenario ? isNewScenario(scenario.createdAt) : false

  // Description truncation
  const DESCRIPTION_LIMIT = 300
  const shouldTruncateDescription = scenario?.description && scenario.description.length > DESCRIPTION_LIMIT
  const displayedDescription = shouldTruncateDescription && !descriptionExpanded
    ? scenario!.description!.slice(0, DESCRIPTION_LIMIT) + '...'
    : scenario?.description

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden p-0 bg-gradient-to-b from-[#0d0f14] to-[#0a0c10] border-white/[0.08]">
        {loading ? (
          /* Loading skeleton */
          <div className="p-0">
            <Skeleton className="w-full h-40 rounded-none" />
            <div className="px-5 pt-9 pb-5 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : isAgeRestricted ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Age-Restricted Content</h3>
            <p className="text-sm text-slate-400 mb-1">
              This scenario contains mature content that is only available to users 18 and older.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              You must be 18+ to view or interact with this content.
            </p>
            <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-300">
                Content rating: {scenario?.contentRating === 'mature' ? 'Mature' : 'Explicit'}
              </span>
            </div>
          </div>
        ) : !scenario ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-slate-400">Scenario not found</p>
          </div>
        ) : (
          <>
            {/* Banner Header with frosted glass overlay */}
            <div className="relative h-32 sm:h-40 overflow-hidden">
              {scenario.bannerUrl ? (
                <>
                  <img src={scenario.bannerUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-[#0d0f14]/60 to-[#0d0f14]/20" />
                  <div className="absolute inset-0 backdrop-blur-[2px] bg-[#0d0f14]/10" />
                </>
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${accent.fromSubtle || 'from-teal-600/30'} ${accent.toSubtle || 'via-cyan-600/20'} to-teal-800/30`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-[#0d0f14]/40 to-transparent" />
                  {/* Decorative orbs */}
                  <div className="absolute top-4 right-12 w-20 h-20 rounded-full bg-white/5 blur-xl" />
                  <div className="absolute bottom-2 left-16 w-14 h-14 rounded-full bg-white/[0.03] blur-lg" />
                </div>
              )}
              {/* Frosted glass header overlay */}
              <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#0d0f14]/90 via-[#0d0f14]/40 to-transparent backdrop-blur-sm" />

              {/* Category badge + Content rating badge */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {(scenario.contentRating === 'mature' || scenario.contentRating === 'explicit') && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                    scenario.contentRating === 'explicit'
                      ? 'bg-red-600/30 text-red-300 border-red-500/40'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    <Lock className="w-3 h-3" />
                    18+
                  </span>
                )}
                {scenario.isFeatured && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium border bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Featured
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${categoryColor}`}>
                  <span className="text-[10px]">{CATEGORY_ICONS[scenario.category] || '📖'}</span>
                  {scenario.category.charAt(0).toUpperCase() + scenario.category.slice(1).replace('-', ' ')}
                </span>
              </div>

              {/* New badge */}
              {isNew && (
                <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 backdrop-blur-sm">
                  <Sparkles className="w-3 h-3 text-teal-300" />
                  <span className="text-[10px] font-medium text-teal-300">New</span>
                </div>
              )}

              {/* Mood emoji */}
              {moodEmoji && !isNew && (
                <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-lg">
                  {moodEmoji}
                </div>
              )}

              {/* Avatar */}
              <div className="absolute -bottom-6 left-5 z-10">
                <Avatar className="w-14 h-14 border-[3px] border-[#0d0f14] shadow-lg">
                  <AvatarImage src={scenario.imageUrl || scenario.persona?.avatarUrl || undefined} />
                  <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-lg font-bold`}>
                    {scenario.persona?.name.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="h-[calc(90vh-200px)] max-h-[500px]">
              <div className="px-5 pt-9 pb-5 space-y-5">
                {/* Title */}
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{scenario.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {scenario.creator && (
                      <div
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('chrona:open-user-profile', { detail: { userId: scenario.creatorId } }))
                        }}
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={scenario.creator.avatarUrl || undefined} />
                          <AvatarFallback className="text-[8px] bg-slate-700 text-slate-300">
                            {scenario.creator.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-400 hover:text-teal-300 transition-colors">@{scenario.creator.username}</span>
                      </div>
                    )}
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(scenario.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Stats row with icons and micro-animations */}
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5 hover:text-slate-200 transition-colors group/stat">
                    <Eye className="w-4 h-4 transition-transform group-hover/stat:scale-110" />
                    <span className="font-medium text-slate-300">{formatCount(scenario.viewCount)}</span> views
                  </span>
                  <span className="flex items-center gap-1.5 hover:text-slate-200 transition-colors group/stat">
                    <MessageSquare className="w-4 h-4 transition-transform group-hover/stat:scale-110" />
                    <span className="font-medium text-slate-300">{formatCount(scenario.chatCount)}</span> chats
                  </span>
                  <span className="flex items-center gap-1.5 hover:text-rose-400 transition-colors group/stat">
                    <Heart className={`w-4 h-4 transition-transform group-hover/stat:scale-110 ${isLiked ? 'text-rose-400 fill-current' : ''}`} />
                    <span className="font-medium text-slate-300">{formatCount(likeCount)}</span> likes
                  </span>
                  {scenario.isFeatured && (
                    <span className="flex items-center gap-1 text-amber-400/80">
                      <TrendingUp className="w-4 h-4" />
                      Featured
                    </span>
                  )}
                </div>

                {/* Description with "Read more" */}
                {scenario.description && (
                  <div>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{displayedDescription}</p>
                    {shouldTruncateDescription && (
                      <button
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors mt-1"
                      >
                        {descriptionExpanded ? (
                          <>Show less <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>Read more <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Info pills */}
                <div className="flex flex-wrap gap-2">
                  {scenario.location && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.03] border border-white/[0.06] text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-teal-400" />
                      {scenario.location}
                    </span>
                  )}
                  {scenario.mood && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.03] border border-white/[0.06] text-slate-300">
                      🎭 {scenario.mood.charAt(0).toUpperCase() + scenario.mood.slice(1)}
                    </span>
                  )}
                  {scenario.attire && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.03] border border-white/[0.06] text-slate-300">
                      <Shirt className="w-3.5 h-3.5 text-teal-400" />
                      {scenario.attire}
                    </span>
                  )}
                  {ratingConfig && (
                    <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${ratingConfig.color}`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {ratingConfig.label}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {scenario.tags && scenario.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-white/[0.05] text-slate-400/80 border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Character Info */}
                {scenario.persona && (
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">Character</p>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-white/[0.1]">
                        <AvatarImage src={scenario.persona.avatarUrl || undefined} />
                        <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-sm font-semibold`}>
                          {scenario.persona.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-slate-100">{scenario.persona.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {scenario.persona.mbtiType && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-fuchsia-500/15 text-fuchsia-300/80 border border-fuchsia-500/20">
                              {scenario.persona.mbtiType}
                            </span>
                          )}
                          {scenario.persona.archetype && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-teal-500/15 text-teal-300/80 border border-teal-500/20">
                              {scenario.persona.archetype}
                            </span>
                          )}
                          {scenario.persona.gender && (
                            <span className="text-[10px] text-slate-500">{scenario.persona.gender}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Initial Messages / Greetings */}
                {scenario.initialMessages && scenario.initialMessages.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Select a Greeting to Start
                    </p>
                    <div className="space-y-2">
                      {scenario.initialMessages.map((msg, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedGreeting(i)}
                          className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                            selectedGreeting === i
                              ? `${accent.borderMedium} ${accent.bgTint} border shadow-lg shadow-teal-500/5`
                              : 'border-white/[0.06] bg-white/[0.01] hover:border-teal-500/20 hover:bg-white/[0.03] hover:shadow-md hover:shadow-teal-500/5'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                              selectedGreeting === i
                                ? `${accent.bgSolid} border-transparent`
                                : 'border-slate-600'
                            }`}>
                              {selectedGreeting === i && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              )}
                            </div>
                            <p className="text-sm text-slate-200 flex-1">{msg}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-white/[0.06]">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                  isLiked
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-rose-400 hover:border-rose-500/20'
                } ${likeAnim ? 'scale-110' : 'scale-100'}`}
                style={{ transition: 'all 0.15s ease' }}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''} ${likeAnim ? 'scale-125' : ''} transition-transform`} style={likeAnim ? { animation: 'heart-burst 0.4s ease-out' } : undefined} />
                {likeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : formatCount(likeCount)}
              </button>
              {isCreator && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-teal-400 hover:border-teal-500/20"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-teal-400 hover:border-teal-500/20"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleStartChat}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:opacity-90 shadow-lg shadow-teal-500/20 transition-all relative overflow-hidden"
              >
                <MessageCircle className="w-4 h-4" />
                Chat with {scenario.persona?.name || 'Character'}
              </button>
            </div>
          </>
        )}
      </DialogContent>

    </Dialog>

    {/* Edit Modal - rendered outside the detail Dialog to avoid z-index conflicts */}
    <ScenarioEditModal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      onSaved={fetchScenario}
      onDeleted={() => {
        setShowEditModal(false)
        onClose()
        onScenarioDeleted?.()
      }}
      scenarioId={scenarioId}
      personas={personas.map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl, mbtiType: p.mbtiType, archetype: p.archetype }))}
    />
    </>
  )
}
