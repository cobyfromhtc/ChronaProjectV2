'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * A skeleton placeholder that shimmers. Used for loading states while
 * data is being fetched. Pairs nicely with the shadcn/ui Skeleton primitive
 * but adds an animated gradient sweep.
 */
export function SkeletonCard({
  className,
  showAvatar = true,
  showTitle = true,
  lines = 2,
}: {
  className?: string
  showAvatar?: boolean
  showTitle?: boolean
  lines?: number
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/60 bg-card/50 p-4',
        'transition-colors hover:border-border',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {showAvatar && (
          <div className="h-12 w-12 rounded-full bg-muted/60 shimmer-bg flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0 space-y-2">
          {showTitle && <div className="h-4 w-2/3 rounded bg-muted/60 shimmer-bg" />}
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded bg-muted/40 shimmer-bg"
              style={{ width: `${85 - i * 15}%` }}
            />
          ))}
        </div>
      </div>
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
            rgba(255, 255, 255, 0.06) 50%,
            transparent 100%
          );
          animation: shimmer-sweep 1.6s infinite;
        }
        @keyframes shimmer-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.shimmer-bg)::after {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * A grid of SkeletonCards for loading list views.
 */
export function SkeletonGrid({
  count = 6,
  className,
  cardClassName,
}: {
  count?: number
  className?: string
  cardClassName?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className={cardClassName} />
      ))}
    </div>
  )
}
