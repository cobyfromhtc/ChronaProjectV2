'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** Visual variant: 'default' (subtle), 'vibrant' (gradient accent), 'minimal' (icon-less) */
  variant?: 'default' | 'vibrant' | 'minimal'
  /** Optional icon size in px (default 40) */
  iconSize?: number
}

/**
 * Reusable empty state for lists/grids.
 *
 * Visual hierarchy:
 *  - Large icon in a soft gradient circle (or none if variant='minimal')
 *  - Bold title
 *  - Muted description
 *  - Optional call-to-action button
 *
 * Usage:
 *   <EmptyState icon={Users} title="No friends yet" description="Add someone to start chatting" action={<Button>Add Friend</Button>} />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'default',
  iconSize = 40,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4 select-none',
        className
      )}
    >
      {variant !== 'minimal' && Icon && (
        <div
          className={cn(
            'mb-4 flex items-center justify-center rounded-full',
            'bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5',
            'ring-1 ring-inset ring-primary/15 shadow-[0_8px_24px_-12px_rgba(124,58,237,0.25)]',
            variant === 'vibrant' && 'ring-2 ring-primary/30'
          )}
          style={{ width: iconSize * 2.2, height: iconSize * 2.2 }}
        >
          <Icon
            className="text-primary/70"
            style={{ width: iconSize, height: iconSize }}
            strokeWidth={1.5}
          />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
