'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Renders text with a vibrant primary-to-secondary gradient.
 * Useful for hero titles, dashboard headers, and CTAs.
 *
 * Usage:
 *   <GradientText className="text-4xl font-bold">Chrona</GradientText>
 */
export function GradientText({
  children,
  className,
  from = 'from-primary',
  via,
  to = 'to-fuchsia-500',
}: {
  children: React.ReactNode
  className?: string
  from?: string
  via?: string
  to?: string
}) {
  const gradient = via
    ? cn('bg-gradient-to-r', from, via, to)
    : cn('bg-gradient-to-r', from, to)
  return (
    <span
      className={cn(
        'bg-clip-text text-transparent',
        gradient,
        className
      )}
    >
      {children}
    </span>
  )
}

/**
 * A small badge with an animated pulse dot. Useful for "Online", "Live",
 * "New" status indicators.
 */
export function PulseBadge({
  children,
  className,
  color = 'emerald',
  pulse = true,
}: {
  children: React.ReactNode
  className?: string
  color?: 'emerald' | 'violet' | 'amber' | 'rose' | 'sky'
  pulse?: boolean
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    sky: 'bg-sky-500',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        'bg-muted/60 text-muted-foreground ring-1 ring-inset ring-border/50',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              colorMap[color]
            )}
          />
        )}
        <span
          className={cn('relative inline-flex h-2 w-2 rounded-full', colorMap[color])}
        />
      </span>
      {children}
    </span>
  )
}

/**
 * Animated counter that smoothly transitions from 0 to the target number.
 * Used to give dashboards a "live data" feel.
 */
export function AnimatedCounter({
  value,
  className,
  durationMs = 800,
  formatWithCommas = true,
}: {
  value: number
  className?: string
  durationMs?: number
  formatWithCommas?: boolean
}) {
  const [display, setDisplay] = React.useState(0)
  const prevRef = React.useRef(0)

  React.useEffect(() => {
    const start = prevRef.current
    const end = value
    if (start === end) return
    const startTime = performance.now()
    let raf: number
    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / durationMs)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(start + (end - start) * eased)
      setDisplay(current)
      if (t < 1) raf = requestAnimationFrame(tick)
      else prevRef.current = end
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  const formatted = formatWithCommas ? display.toLocaleString() : String(display)
  return <span className={className}>{formatted}</span>
}
