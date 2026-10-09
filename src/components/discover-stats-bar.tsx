'use client'

import * as React from 'react'
import { Users, BookOpen, Sparkles, Coins, TrendingUp } from 'lucide-react'
import { AnimatedCounter, GradientText, PulseBadge } from '@/components/ui/gradient-text'
import { apiFetch } from '@/lib/api-client'

interface DiscoverStats {
  onlineCount?: number
  totalPersonas?: number
  totalStorylines?: number
  totalScenarios?: number
  userChronos?: number
}

/**
 * Compact stats bar shown at the top of the Discover page.
 * Fetches live counts from existing endpoints and displays them
 * with animated counters + a pulse "live" badge.
 *
 * The component is resilient: if any fetch fails, it just hides that
 * particular stat rather than crashing the page.
 */
export function DiscoverStatsBar({ className }: { className?: string }) {
  const [stats, setStats] = React.useState<DiscoverStats>({})
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Reuse the existing /api/discovery endpoint — it returns personas.
        // We just need the count for "online now".
        const [discoveryRes, storylinesRes, meRes] = await Promise.allSettled([
          apiFetch('/api/discovery?filter=new&showOffline=false'),
          apiFetch('/api/storylines'),
          apiFetch('/api/auth/me'),
        ])
        if (cancelled) return
        const next: DiscoverStats = {}
        if (discoveryRes.status === 'fulfilled') {
          const data = await discoveryRes.value.json()
          const personas = data.personas || data.onlinePersonas || []
          next.onlineCount = Array.isArray(personas) ? personas.length : 0
          next.totalPersonas = data.totalPersonas ?? next.onlineCount
        }
        if (storylinesRes.status === 'fulfilled') {
          const data = await storylinesRes.value.json()
          next.totalStorylines = Array.isArray(data.storylines) ? data.storylines.length : 0
        }
        if (meRes.status === 'fulfilled') {
          const data = await meRes.value.json()
          next.userChronos = data.user?.chronos ?? 0
        }
        if (!cancelled) {
          setStats(next)
          setLoaded(true)
        }
      } catch {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) {
    // Skeleton: 4 stat chips that shimmer
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${className || ''}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-card/50 border border-border/60 shimmer-bg"
          />
        ))}
        <style jsx>{`
          :global(.shimmer-bg) {
            position: relative;
            overflow: hidden;
          }
          :global(.shimmer-bg)::after {
            content: '';
            position: absolute;
            inset: 0;
            transform: translateX(-100%);
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.05) 50%,
              transparent 100%
            );
            animation: shimmer-sweep 1.6s infinite;
          }
          @keyframes shimmer-sweep {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    )
  }

  const stats_list = [
    {
      icon: Users,
      label: 'Online Now',
      value: stats.onlineCount ?? 0,
      color: 'text-emerald-400',
      bg: 'from-emerald-500/15 to-emerald-500/5',
      ring: 'ring-emerald-500/20',
      showPulse: true,
    },
    {
      icon: BookOpen,
      label: 'Storylines',
      value: stats.totalStorylines ?? 0,
      color: 'text-sky-400',
      bg: 'from-sky-500/15 to-sky-500/5',
      ring: 'ring-sky-500/20',
    },
    {
      icon: Sparkles,
      label: 'Personas',
      value: stats.totalPersonas ?? 0,
      color: 'text-violet-400',
      bg: 'from-violet-500/15 to-violet-500/5',
      ring: 'ring-violet-500/20',
    },
    {
      icon: Coins,
      label: 'Your Chronos',
      value: stats.userChronos ?? 0,
      color: 'text-amber-400',
      bg: 'from-amber-500/15 to-amber-500/5',
      ring: 'ring-amber-500/20',
    },
  ]

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${className || ''}`}>
      {stats_list.map((s) => {
        const Icon = s.icon
        return (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br ${s.bg} p-3 ring-1 ring-inset ${s.ring} transition-transform hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-1">
              <Icon className={`w-4 h-4 ${s.color}`} strokeWidth={2} />
              {s.showPulse && s.value > 0 && (
                <PulseBadge color="emerald" className="!px-1.5 !py-0 text-[10px]">
                  Live
                </PulseBadge>
              )}
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums leading-tight">
              <AnimatedCounter value={s.value} durationMs={600} />
            </div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              {s.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Smaller "welcome strip" that greets the user by name and shows
 * a gradient tagline. Used above the stats bar.
 */
export function DiscoverWelcomeStrip({ username }: { username?: string | null }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="mb-3">
      <h2 className="text-xl font-bold tracking-tight">
        {greeting}
        {username ? <>, <GradientText from="from-violet-400" to="to-fuchsia-400">{username}</GradientText></> : null}
        <span className="ml-1">👋</span>
      </h2>
      <p className="text-sm text-muted-foreground mt-0.5">
        Discover new characters, join storylines, and craft your story.
      </p>
    </div>
  )
}
