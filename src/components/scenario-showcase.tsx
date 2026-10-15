'use client'

import React, { useState, useEffect, useCallback, useMemo, startTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ChevronLeft, ChevronRight, Heart, Star, Eye, Sparkles, Pause,
} from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import {
  CATEGORY_COLORS,
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  MOOD_EMOJIS,
  formatCount,
} from '@/lib/scenario-constants'

// =============================================
// Persona of the Week — banner-style showcase
// featuring one opted-in persona per week, with
// their scenarios auto-rotating every 5 seconds
// =============================================

interface ShowcaseScenario {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  bannerUrl: string | null
  location: string | null
  mood: string | null
  tags: string[]
  category: string
  viewCount: number
  chatCount: number
  likeCount: number
  createdAt: string
  isLiked?: boolean
}

interface ShowcasePersona {
  id: string
  name: string
  avatarUrl: string | null
  mbtiType: string | null
  archetype: string | null
  gender: string | null
  species: string | null
  age: number | null
  description: string | null
  creator: {
    id: string
    username: string
    avatarUrl: string | null
  } | null
}

interface ScenarioShowcaseProps {
  onOpenScenario: (id: string) => void
  refreshKey?: string | number
}

const ROTATE_MS = 5000

export function ScenarioShowcase({ onOpenScenario, refreshKey }: ScenarioShowcaseProps) {
  const [persona, setPersona] = useState<ShowcasePersona | null>(null)
  const [scenarios, setScenarios] = useState<ShowcaseScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [bannerError, setBannerError] = useState(false)

  const fetchShowcase = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await apiFetch('/api/scenarios/showcase')
      if (res.ok) {
        const data = await res.json()
        setPersona(data.persona || null)
        setScenarios(Array.isArray(data.scenarios) ? data.scenarios : [])
        setIndex(0)
      } else {
        setFailed(true)
      }
    } catch (e) {
      console.error('Failed to fetch showcase:', e)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      fetchShowcase()
    })
  }, [fetchShowcase, refreshKey])

  // Reset banner error state when the visible scenario changes — render-phase
  // adjustment (documented React pattern; avoids synchronous setState in an effect)
  const [prevIndex, setPrevIndex] = useState(0)
  if (prevIndex !== index) {
    setPrevIndex(index)
    setBannerError(false)
  }

  // Auto-rotation every 5s — paused on hover, no timer for <2 scenarios
  useEffect(() => {
    if (paused || scenarios.length < 2) return
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % scenarios.length)
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [paused, scenarios.length])

  const current = scenarios.length > 0 ? scenarios[Math.min(index, scenarios.length - 1)] : null
  const categorySlug = current?.category || 'other'
  const moodEmoji = current?.mood ? MOOD_EMOJIS[current.mood.toLowerCase()] || '✨' : null

  const goToPrev = useCallback(() => {
    if (scenarios.length === 0) return
    setIndex(prev => (prev - 1 + scenarios.length) % scenarios.length)
  }, [scenarios.length])

  const goToNext = useCallback(() => {
    if (scenarios.length === 0) return
    setIndex(prev => (prev + 1) % scenarios.length)
  }, [scenarios.length])

  const openCreatorProfile = useMemo(() => {
    return () => {
      if (persona?.creator?.id) {
        window.dispatchEvent(
          new CustomEvent('chrona:open-user-profile', { detail: { userId: persona.creator.id } })
        )
      }
    }
  }, [persona])

  // ---------- Render states ----------
  if (loading) {
    return (
      <section aria-label="Persona of the week showcase" aria-busy="true">
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f14] overflow-hidden">
          <div className="h-44 bg-gradient-to-r from-white/[0.02] via-white/[0.05] to-white/[0.02]" style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        </div>
      </section>
    )
  }

  if (failed) {
    return (
      <section aria-label="Persona of the week showcase">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-slate-400">Couldn&apos;t load the showcase right now.</p>
          <button
            onClick={fetchShowcase}
            className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium text-violet-300 bg-violet-500/10 border border-violet-500/25 hover:bg-violet-500/20 transition-all"
          >
            Try again
          </button>
        </div>
      </section>
    )
  }

  if (!persona || !current) {
    // Empty state — nobody has opted in yet
    return (
      <section aria-label="Persona of the week showcase">
        <div className="relative rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] via-[#0d0f14] to-fuchsia-500/[0.04] p-6 sm:p-8 overflow-hidden">
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
              <Star className="w-7 h-7 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-100">No Persona of the Week yet</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-lg leading-relaxed">
                Each week we feature a persona whose scenarios their creator opted in to showcase. Opt in from any
                scenario&apos;s settings to be considered for the spotlight.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-violet-400/60" />
              Rotates weekly — top 3 candidates
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Persona of the week showcase">
      {/* Header */}
      <div className="flex items-baseline gap-2.5 mb-1 flex-wrap">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="star">⭐</span>
          Persona of the Week
        </h2>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25 font-medium">
          Creator showcase
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        A rotating spotlight on opted-in scenarios and the personas behind them
      </p>

      {/* Banner */}
      <div
        className="group relative rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-[#0d0f14] to-fuchsia-500/[0.05] overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Ambient starry glows */}
        <div className="absolute -top-20 right-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-fuchsia-500/[0.07] blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_1fr] gap-0">
          {/* LEFT — Persona info */}
          <div className="p-5 sm:p-6 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/50 to-fuchsia-500/50 blur-[6px] opacity-60" />
                <Avatar className="relative w-16 h-16 rounded-2xl border-2 border-violet-400/30">
                  <AvatarImage src={persona.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xl font-bold rounded-2xl">
                    {persona.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-100 truncate">{persona.name}</h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {persona.archetype && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25">
                      {persona.archetype}
                    </span>
                  )}
                  {persona.mbtiType && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/25">
                      {persona.mbtiType}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {persona.description && (
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {persona.description}
              </p>
            )}

            {/* Creator credit */}
            {persona.creator && (
              <button
                onClick={openCreatorProfile}
                className="flex items-center gap-2 group w-fit"
                title={`View @${persona.creator.username}'s profile`}
              >
                <Avatar className="w-5 h-5 border border-white/[0.1]">
                  <AvatarImage src={persona.creator.avatarUrl || undefined} />
                  <AvatarFallback className="bg-slate-700 text-slate-300 text-[9px]">
                    {persona.creator.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-slate-500 group-hover:text-violet-300 transition-colors">
                  by <span className="font-medium">@{persona.creator.username}</span>
                </span>
              </button>
            )}

            {/* Rotation dots (left pane bottom on desktop) */}
            {scenarios.length > 1 && (
              <div className="mt-auto flex items-center gap-1.5 pt-2" role="tablist" aria-label="Showcase scenarios">
                {scenarios.map((s, i) => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Show scenario ${i + 1}: ${s.title}`}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index
                        ? 'w-6 bg-gradient-to-r from-violet-400 to-fuchsia-400'
                        : 'w-1.5 bg-white/15 hover:bg-white/30'
                    }`}
                  />
                ))}
                {paused && scenarios.length > 1 && (
                  <span className="ml-2 flex items-center gap-1 text-[9px] text-slate-600">
                    <Pause className="w-3 h-3" /> paused
                  </span>
                )}
              </div>
            )}
          </div>

          {/* RIGHT — Rotating scenario feature */}
          <div className="relative min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="p-5 sm:p-6"
              >
                {/* Scenario image with gradient fallback */}
                <div className="rounded-xl overflow-hidden border border-white/[0.08] h-36 sm:h-44 relative mb-4">
                  {current.bannerUrl && !bannerError ? (
                    <img
                      src={current.bannerUrl}
                      alt={`Banner for ${current.title}`}
                      className="w-full h-full object-cover"
                      onError={() => setBannerError(true)}
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${CATEGORY_GRADIENTS[categorySlug] || CATEGORY_GRADIENTS.other} relative`}>
                      <div className="absolute top-4 right-12 w-20 h-20 rounded-full bg-white/5 blur-xl" />
                      <div className="absolute bottom-2 left-16 w-14 h-14 rounded-full bg-white/5 blur-lg" />
                      <div className="absolute top-10 left-1/3 w-10 h-10 rounded-full bg-white/[0.04] blur-md" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14]/80 via-transparent to-transparent" />

                  {/* Category + mood chips */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border backdrop-blur-sm flex items-center gap-1 ${CATEGORY_COLORS[categorySlug] || CATEGORY_COLORS.other}`}>
                      <span className="text-[9px]">{CATEGORY_ICONS[categorySlug] || '📖'}</span>
                      {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1).replace('-', ' ')}
                    </span>
                    {current.mood && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-sm border border-white/[0.1] text-slate-300 flex items-center gap-1">
                        {moodEmoji} <span className="capitalize">{current.mood}</span>
                      </span>
                    )}
                  </div>

                  {/* Persona avatar overlapping bottom-right */}
                  <div className="absolute right-4" style={{ bottom: '-18px' }}>
                    <Avatar className="w-11 h-11 border-2 border-[#0d0f14] shadow-lg">
                      <AvatarImage src={current.imageUrl || persona.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm font-semibold">
                        {persona.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                {/* Title + description */}
                <div className="pt-4 pr-1">
                  <h4 className="text-base font-bold text-slate-100 leading-snug pr-16">{current.title}</h4>
                  {current.description && (
                    <p className="text-sm text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {current.description}
                    </p>
                  )}

                  {/* Stats + CTA */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1" title="Likes">
                        <Heart className="w-3.5 h-3.5 text-rose-400/70" />
                        {formatCount(current.likeCount || 0)}
                      </span>
                      <span className="flex items-center gap-1" title="Views">
                        <Eye className="w-3.5 h-3.5" />
                        {formatCount(current.viewCount || 0)}
                      </span>
                      {current.location && (
                        <span className="hidden md:inline text-slate-600 truncate max-w-[160px]">
                          · {current.location}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onOpenScenario(current.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90 shadow-lg shadow-fuchsia-500/20 transition-all"
                    >
                      View scenario
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Prev / next arrows */}
            {scenarios.length > 1 && (
              <>
                <button
                  onClick={goToPrev}
                  aria-label="Previous scenario"
                  className="absolute top-1/2 -translate-y-1/2 left-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.12] text-slate-300 flex items-center justify-center hover:bg-black/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNext}
                  aria-label="Next scenario"
                  className="absolute top-1/2 -translate-y-1/2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.12] text-slate-300 flex items-center justify-center hover:bg-black/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile dots (below the banner) */}
        {scenarios.length > 1 && (
          <div className="lg:hidden flex items-center justify-center gap-1.5 pb-4" role="tablist" aria-label="Showcase scenarios">
            {scenarios.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === index}
                aria-label={`Show scenario ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? 'w-6 bg-gradient-to-r from-violet-400 to-fuchsia-400'
                    : 'w-1.5 bg-white/15 hover:bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
