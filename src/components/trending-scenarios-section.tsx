'use client'

import React, { useState, useEffect, useCallback, startTransition } from 'react'
import { motion } from 'framer-motion'
import { Flame, Sparkles } from 'lucide-react'
import { ScenarioCard } from '@/components/scenario-card'
import { apiFetch } from '@/lib/api-client'

// =============================================
// Trending This Week — horizontal showcase of
// scenarios whose creators opted in to trending
// =============================================

interface TrendingScenario {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  bannerUrl: string | null
  category: string
  mood: string | null
  tags: string[]
  viewCount: number
  chatCount: number
  likeCount: number
  createdAt: string
  contentRating?: string
  persona: { name: string; avatarUrl: string | null; mbtiType: string | null; archetype: string | null; gender: string | null }
  creatorId: string
  creator: { username: string; avatarUrl: string | null }
  isLiked?: boolean
}

interface TrendingScenariosSectionProps {
  onOpenScenario: (id: string) => void
  refreshKey?: string | number
}

export function TrendingScenariosSection({ onOpenScenario, refreshKey }: TrendingScenariosSectionProps) {
  const [scenarios, setScenarios] = useState<TrendingScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const fetchTrending = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await apiFetch('/api/scenarios/trending')
      if (res.ok) {
        const data = await res.json()
        setScenarios(Array.isArray(data.scenarios) ? data.scenarios : [])
      } else {
        setFailed(true)
      }
    } catch (e) {
      console.error('Failed to fetch trending scenarios:', e)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      fetchTrending()
    })
  }, [fetchTrending, refreshKey])

  const handleLike = async (id: string) => {
    try {
      const res = await apiFetch(`/api/scenarios/${id}/like`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setScenarios(prev =>
          prev.map(s => (s.id === id ? { ...s, isLiked: data.liked, likeCount: data.likeCount } : s))
        )
      }
    } catch (e) {
      console.error('Failed to toggle like:', e)
    }
  }

  return (
    <section aria-label="Trending scenarios this week" className="relative">
      {/* Section header */}
      <div className="flex items-baseline gap-2.5 mb-1 flex-wrap">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="fire">🔥</span>
          Trending This Week
        </h2>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25 font-medium">
          {scenarios.length > 0 ? `Top ${scenarios.length}` : 'Opt-in'}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Scenarios their creators opted in to showcase
      </p>

      {loading ? (
        /* Loading skeletons */
        <div className="flex gap-3 overflow-hidden" aria-busy="true">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-[260px] flex-shrink-0 rounded-xl border border-white/[0.06] bg-[#0d0f14] overflow-hidden"
              style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 100}ms` }}
            >
              <div className="h-28 bg-gradient-to-r from-white/[0.02] via-white/[0.05] to-white/[0.02]" />
              <div className="px-3 pt-7 pb-3 space-y-2">
                <div className="h-3 w-1/3 rounded bg-white/[0.06]" />
                <div className="h-4 w-3/4 rounded bg-white/[0.04]" />
                <div className="h-3 w-full rounded bg-white/[0.03]" />
              </div>
            </div>
          ))}
        </div>
      ) : failed ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-slate-400">Couldn&apos;t load trending scenarios right now.</p>
          <button
            onClick={fetchTrending}
            className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/25 hover:bg-fuchsia-500/20 transition-all"
          >
            Try again
          </button>
        </div>
      ) : scenarios.length === 0 ? (
        /* Empty state — nobody has opted in yet */
        <div className="relative rounded-2xl border border-fuchsia-500/15 bg-gradient-to-br from-fuchsia-500/[0.06] via-[#0d0f14] to-violet-500/[0.04] p-6 sm:p-8 overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/25 flex items-center justify-center flex-shrink-0">
              <Flame className="w-7 h-7 text-fuchsia-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-100">No trending scenarios yet</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-lg leading-relaxed">
                When you create or edit a scenario, you can opt in with{' '}
                <span className="text-fuchsia-300 font-medium">&ldquo;Allow in trending &amp; showcase&rdquo;</span>{' '}
                — opted-in scenarios show up here based on weekly likes, views and chats.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400/60" />
              Opt-in only — always your choice
            </div>
          </div>
        </div>
      ) : (
        /* Horizontal scroll row */
        <div className="relative -mx-1 px-1">
          <div
            className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            role="list"
          >
            {scenarios.map((scenario, index) => (
              <motion.div
                key={scenario.id}
                role="listitem"
                className="relative w-[240px] sm:w-[260px] flex-shrink-0"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                {/* Weekly rank badge — top 3 get medal styling */}
                <span
                  aria-label={`Weekly rank ${index + 1}`}
                  className={`absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide leading-none backdrop-blur-md border shadow-lg ${
                    index === 0
                      ? 'bg-amber-500/85 border-amber-300/40 text-amber-950 shadow-amber-500/30'
                      : index === 1
                        ? 'bg-slate-300/85 border-white/40 text-slate-800 shadow-slate-400/25'
                        : index === 2
                          ? 'bg-orange-600/85 border-orange-300/40 text-orange-50 shadow-orange-500/25'
                          : 'bg-black/70 border-white/15 text-slate-300 shadow-black/40'
                  }`}
                >
                  <span className="text-[10px] leading-none">{index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : null}</span>
                  <span className="tabular-nums leading-none">#{index + 1}</span>
                </span>
                <ScenarioCard
                  scenario={scenario}
                  onClick={onOpenScenario}
                  onLike={handleLike}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
