'use client'

import * as React from 'react'
import { TrendingUp, Hash } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'

interface TagWithCount {
  tag: string
  count: number
}

/**
 * "Trending Tags" cloud for the Discover page.
 *
 * Pulls all visible personas from /api/discovery, aggregates their `tags`
 * arrays, and renders the top N as a weighted tag cloud. Clicking a tag
 * fires `onTagClick(tag)` so the parent can filter the discovery list.
 *
 * Visual: each tag is a pill sized by frequency (more frequent = larger
 * font + bolder weight). Pills use the variant's primary color gradient
 * with a subtle hover lift.
 *
 * Empty state: shows a friendly "Be the first to add a tag!" message
 * with an icon instead of being blank.
 */
export function TrendingTagsCloud({
  limit = 12,
  onTagClick,
  className,
}: {
  limit?: number
  onTagClick?: (tag: string) => void
  className?: string
}) {
  const [tags, setTags] = React.useState<TagWithCount[]>([])
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await apiFetch('/api/discovery?filter=new&showOffline=true')
        const data = await res.json()
        const personas: any[] = data.personas || []
        const counts = new Map<string, number>()
        for (const p of personas) {
          const t = Array.isArray(p.tags) ? p.tags : (() => { try { return JSON.parse(p.tags || '[]') } catch { return [] } })()
          for (const tag of t) {
            if (typeof tag !== 'string') continue
            const key = tag.trim()
            if (!key) continue
            counts.set(key, (counts.get(key) || 0) + 1)
          }
        }
        const sorted = Array.from(counts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
        if (!cancelled) {
          setTags(sorted)
          setLoaded(true)
        }
      } catch {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [limit])

  if (!loaded) {
    // Skeleton: 6 shimmer pills of varying widths
    return (
      <div className={`flex flex-wrap gap-2 ${className || ''}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-7 rounded-full bg-muted/40 chrona-shimmer"
            style={{ width: `${60 + (i * 17) % 60}px` }}
          />
        ))}
      </div>
    )
  }

  if (tags.length === 0) {
    return (
      <div className={`flex flex-col items-center text-center py-6 ${className || ''}`}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/15 to-fuchsia-500/5 ring-1 ring-inset ring-violet-500/20 flex items-center justify-center mb-2">
          <Hash className="w-5 h-5 text-violet-300/80" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium text-foreground">No tags yet</p>
        <p className="text-xs text-muted-foreground mt-0.5">Be the first to add a tag to your persona!</p>
      </div>
    )
  }

  const maxCount = Math.max(...tags.map((t) => t.count))
  return (
    <div className={`flex flex-wrap gap-1.5 ${className || ''}`}>
      {tags.map((t, i) => {
        // Size pill by frequency (12px → 18px font, font-medium → font-bold)
        const ratio = maxCount === 0 ? 0 : t.count / maxCount
        const fontSize = 11 + Math.round(ratio * 7) // 11px → 18px
        const weight = ratio > 0.66 ? 'font-bold' : ratio > 0.33 ? 'font-semibold' : 'font-medium'
        const opacity = 0.55 + ratio * 0.45 // 0.55 → 1.0
        return (
          <button
            key={t.tag}
            onClick={() => onTagClick?.(t.tag)}
            className={`chrona-lift chrona-focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${weight}`}
            style={{
              fontSize: `${fontSize}px`,
              opacity,
              background: `linear-gradient(135deg, hsl(var(--primary) / ${0.12 + ratio * 0.15}), hsl(var(--primary) / ${0.04 + ratio * 0.08}))`,
              border: '1px solid hsl(var(--primary) / 0.18)',
              color: 'hsl(var(--foreground))',
              animationDelay: `${i * 30}ms`,
            }}
            title={`${t.count} persona${t.count === 1 ? '' : 's'}`}
          >
            <span className="text-[0.85em] opacity-60">#</span>
            {t.tag}
            <span className="ml-0.5 text-[0.7em] opacity-50 chrona-num">{t.count}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Container with header for the trending tags widget.
 * Drop this anywhere on the Discover page.
 */
export function TrendingTagsPanel({
  onTagClick,
  className,
}: {
  onTagClick?: (tag: string) => void
  className?: string
}) {
  return (
    <div className={`chrona-glass rounded-xl p-3 chrona-enter ${className || ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500/30 to-fuchsia-500/15 ring-1 ring-inset ring-violet-500/25 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-violet-300" strokeWidth={2} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Trending Tags</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Discover
        </span>
      </div>
      <TrendingTagsCloud onTagClick={onTagClick} />
    </div>
  )
}
