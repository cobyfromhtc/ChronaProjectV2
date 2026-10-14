'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/api-client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Star, Users, Play, Info, Loader2, Check } from 'lucide-react'
import { NavigationTopbar } from '@/components/navigation-topbar'
import { useUIVariant } from '@/stores/ui-variant-store'


interface FeaturedStoryline {
  id: string
  name: string
  description: string | null
  lore: string | null
  iconUrl: string | null
  bannerUrl: string | null
  category: string
  tags: string[]
  accentColor: string | null
  memberCount: number
  boostChronos: number
  boostTier: number
  isJoined: boolean
  owner: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

interface FeaturedStorylinesBannerProps {
  onJoinStoryline?: (storylineId: string) => void
  onNavigate?: (item: string) => void
  onOpenEditProfile?: () => void
  onOpenMyPersonas?: () => void
  navigationMode?: 'static' | 'linear'
}

// Genre-based gradient map for fallback backgrounds
const GENRE_GRADIENTS: Record<string, string> = {
  'Romance': 'from-rose-900/80 via-pink-900/60 to-rose-950/90',
  'Action': 'from-red-900/80 via-orange-900/60 to-red-950/90',
  'Horror': 'from-gray-950/90 via-red-950/70 to-black/95',
  'Fantasy': 'from-violet-900/80 via-purple-900/60 to-indigo-950/90',
  'Sci-Fi': 'from-cyan-900/80 via-teal-900/60 to-slate-950/90',
  'Slice of Life': 'from-amber-900/70 via-yellow-900/50 to-orange-950/80',
  'Mystery': 'from-slate-900/80 via-gray-900/60 to-slate-950/90',
  'Comedy': 'from-emerald-900/70 via-lime-900/50 to-green-950/80',
  'Drama': 'from-indigo-900/80 via-blue-900/60 to-slate-950/90',
  'Adventure': 'from-emerald-900/80 via-teal-900/60 to-cyan-950/90',
  'Thriller': 'from-red-950/80 via-slate-900/60 to-gray-950/90',
  'Historical': 'from-amber-900/80 via-yellow-950/60 to-stone-950/90',
  'Supernatural': 'from-slate-950/80 via-teal-900/60 to-slate-950/90',
  'Other': 'from-slate-900/80 via-gray-900/60 to-slate-950/90',
}

function getGenreGradient(category: string): string {
  return GENRE_GRADIENTS[category] || GENRE_GRADIENTS['Other']
}

// Estimate a rating percentage from member count and boost data
function estimateRating(storyline: FeaturedStoryline): number {
  const base = Math.min(storyline.memberCount * 3, 60)
  const boostBonus = Math.min(storyline.boostChronos / 50, 30)
  return Math.min(Math.round(base + boostBonus + 10), 99)
}

export function FeaturedStorylinesBanner({ onJoinStoryline, onNavigate, onOpenEditProfile, onOpenMyPersonas, navigationMode = 'static' }: FeaturedStorylinesBannerProps) {
  const { variant: uiVariant } = useUIVariant()
  // Show the embedded topbar inside the banner only in Chrona V1 and Static navigation mode
  // In Linear mode, the page-level NavigationTopbar is already shown above the content
  const showTopbar = uiVariant === 'chrona' && navigationMode === 'static'
  const [storylines, setStorylines] = useState<FeaturedStoryline[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [selectedStoryline, setSelectedStoryline] = useState<FeaturedStoryline | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  // Fetch featured storylines
  useEffect(() => {
    async function fetchFeatured() {
      try {
        const response = await apiFetch('/api/storylines?sortBy=popular&limit=10')
        if (response.ok) {
          const data = await response.json()
          setStorylines(data.storylines || [])
        }
      } catch (error) {
        console.error('Failed to fetch featured storylines:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchFeatured()
  }, [])

  // Auto-rotate
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    autoPlayRef.current = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % Math.max(storylines.length, 1))
        setIsTransitioning(false)
      }, 400)
    }, 5000)
  }, [storylines.length])

  useEffect(() => {
    if (storylines.length > 1 && !isPaused) {
      startAutoPlay()
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [storylines.length, isPaused, startAutoPlay])

  const goToSlide = (index: number) => {
    if (index === currentIndex) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(index)
      setIsTransitioning(false)
    }, 400)
    // Reset auto-play timer
    if (!isPaused) startAutoPlay()
  }

  const handleJoinClick = (storyline: FeaturedStoryline) => {
    setSelectedStoryline(storyline)
    setJoinModalOpen(true)
  }

  const handleJoinConfirm = async () => {
    if (!selectedStoryline) return
    setIsJoining(true)
    try {
      const response = await apiFetch(`/api/storylines/${selectedStoryline.id}/join`, {
        method: 'POST',
      })
      if (response.ok) {
        // Update the storyline in the list
        setStorylines((prev) =>
          prev.map((s) => (s.id === selectedStoryline.id ? { ...s, isJoined: true } : s))
        )
        onJoinStoryline?.(selectedStoryline.id)
      }
    } catch (error) {
      console.error('Failed to join storyline:', error)
    } finally {
      setIsJoining(false)
      setJoinModalOpen(false)
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="relative w-full h-[280px] bg-background overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-card to-background animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        {/* Topbar skeleton */}
        <div className="relative z-10 pt-4 px-6">
          <div className="mx-auto max-w-7xl h-12 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      </div>
    )
  }

  // No storylines available - show placeholder
  if (storylines.length === 0) {
    return (
      <div className="relative w-full h-[280px] overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/[0.04] to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        {/* Topbar inside banner */}
        {showTopbar && (
          <div className="relative z-20 pt-3 px-6">
            <NavigationTopbar variant="inside-banner" onNavigate={onNavigate} onOpenEditProfile={onOpenEditProfile} onOpenMyPersonas={onOpenMyPersonas} onOpenFindUsers={() => window.dispatchEvent(new CustomEvent('chrona:open-find-users'))} />
          </div>
        )}
        <div className={`relative z-10 h-full flex flex-col justify-end p-5 ${showTopbar ? '-mt-12' : ''}`}>
          <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center mb-3">
            <Star className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">Featured Storylines</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Discover immersive worlds and join epic adventures. Create your own storyline to get featured here!
          </p>
        </div>
      </div>
    )
  }

  const current = storylines[currentIndex]
  const rating = estimateRating(current)
  const genreGradient = getGenreGradient(current.category)

  return (
    <>
      <div
        className="relative w-full h-[280px] overflow-hidden flex-shrink-0 group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Background Layer */}
        <div className="absolute inset-0">
          {current.bannerUrl ? (
            <img
              src={current.bannerUrl}
              alt={current.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${genreGradient}`} />
          )}
          {/* Overlay gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-transparent to-transparent" />
        </div>

        {/* Topbar INSIDE the banner with spacing from top */}
        {showTopbar && (
          <div className="relative z-20 pt-3 px-6">
            <NavigationTopbar variant="inside-banner" onNavigate={onNavigate} onOpenEditProfile={onOpenEditProfile} onOpenMyPersonas={onOpenMyPersonas} onOpenFindUsers={() => window.dispatchEvent(new CustomEvent('chrona:open-find-users'))} />
          </div>
        )}

        {/* Content */}
        <div
          className={`relative z-10 h-full flex flex-col justify-end p-5 ${showTopbar ? '-mt-12' : ''} transition-all duration-500 ${
            isTransitioning ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Storyline icon + name */}
          <div className="flex items-end gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shadow-md flex-shrink-0 bg-secondary/50">
              {current.iconUrl ? (
                <img src={current.iconUrl} alt={current.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center">
                  <span className="text-base font-bold text-primary-foreground">{current.name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight truncate">
                {current.name}
              </h2>
              {/* Rating */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  <span className="text-sm font-semibold text-primary tabular-nums">{rating}%</span>
                </div>
                <span className="text-muted-foreground/50 text-xs">|</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{current.category}</span>
                <span className="text-muted-foreground/50 text-xs">|</span>
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground tabular-nums">{current.memberCount} members</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-foreground/80 max-w-xl leading-relaxed line-clamp-2 mb-3">
            {current.description || current.lore || `Join the ${current.category.toLowerCase()} world of ${current.name} and create your story.`}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => handleJoinClick(current)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 hover:-translate-y-px active:translate-y-0 transition-all shadow-md shadow-primary/20"
            >
              {current.isJoined ? (
                <>
                  <Play className="w-4 h-4 fill-primary-foreground" />
                  Enter Storyline
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-primary-foreground" />
                  Join Storyline
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSelectedStoryline(current)
                setJoinModalOpen(true)
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-secondary/60 backdrop-blur-sm text-foreground text-sm font-medium hover:bg-secondary border border-border hover:border-primary/40 transition-all"
            >
              <Info className="w-4 h-4" />
              More Info
            </button>
          </div>
        </div>

        {/* Dot Indicators */}
        {storylines.length > 1 && (
          <div className="absolute bottom-3 right-5 z-20 flex items-center gap-1.5">
            {storylines.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-6 h-2 rounded-full bg-primary'
                    : 'w-2 h-2 rounded-full bg-foreground/30 hover:bg-foreground/50'
                }`}
                aria-label={`Go to storyline ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Progress bar */}
        {!isPaused && storylines.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-foreground/10">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: '0%',
                animation: isPaused ? 'none' : 'progressBar 5s linear',
              }}
            />
          </div>
        )}
      </div>

      {/* Join Storyline Modal */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground max-w-md">
          {selectedStoryline && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    {selectedStoryline.iconUrl ? (
                      <img src={selectedStoryline.iconUrl} alt={selectedStoryline.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-foreground">{selectedStoryline.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <span className="truncate">{selectedStoryline.name}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedStoryline.description || selectedStoryline.lore || 'No description available.'}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground tabular-nums">{selectedStoryline.memberCount} members</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-secondary border border-border">
                    <span className="text-sm text-foreground">{selectedStoryline.category}</span>
                  </div>
                </div>

                {/* Tags */}
                {selectedStoryline.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStoryline.tags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/25"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  {selectedStoryline.isJoined ? (
                    <Button
                      onClick={() => {
                        setJoinModalOpen(false)
                        onJoinStoryline?.(selectedStoryline.id)
                      }}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2 fill-primary-foreground" />
                      Enter Storyline
                    </Button>
                  ) : (
                    <Button
                      onClick={handleJoinConfirm}
                      disabled={isJoining}
                      className="flex-1"
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Join
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setJoinModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
