'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  MessageSquare, UserPlus, BookOpen, Sparkles, Coins,
  ShoppingBag, Trophy, Bell, ChevronRight,
} from 'lucide-react'
import { GradientText } from '@/components/ui/gradient-text'

interface QuickAction {
  id: string
  label: string
  icon: React.ElementType
  onClick: () => void
  badge?: number
  accent: string
  iconBg: string
}

interface QuickActionsPanelProps {
  onNavigate?: (item: string) => void
  unreadNotifications?: number
  pendingFriendRequests?: number
  chronosBalance?: number
  className?: string
}

/**
 * A compact "Quick Actions" panel for the Discover page sidebar.
 * Shows the most common actions (Start DM, Find Friends, Browse Storylines,
 * Create Persona, Marketplace, Achievements, Claim Daily, Notifications)
 * as a grid of tappable cards with gradient icons.
 *
 * Each card has:
 *  - A gradient icon badge
 *  - A short label
 *  - An optional badge counter (e.g. unread notifications)
 *  - A hover lift effect
 */
export function QuickActionsPanel({
  onNavigate,
  unreadNotifications = 0,
  pendingFriendRequests = 0,
  chronosBalance = 0,
  className,
}: QuickActionsPanelProps) {
  const actions: QuickAction[] = [
    {
      id: 'discover',
      label: 'Find Characters',
      icon: Sparkles,
      onClick: () => onNavigate?.('discover'),
      accent: 'text-violet-300',
      iconBg: 'from-violet-500/25 to-violet-500/10',
    },
    {
      id: 'friends',
      label: 'Find Friends',
      icon: UserPlus,
      onClick: () => onNavigate?.('friends'),
      badge: pendingFriendRequests || undefined,
      accent: 'text-sky-300',
      iconBg: 'from-sky-500/25 to-sky-500/10',
    },
    {
      id: 'storylines',
      label: 'Browse Storylines',
      icon: BookOpen,
      onClick: () => onNavigate?.('storylines'),
      accent: 'text-teal-300',
      iconBg: 'from-teal-500/25 to-teal-500/10',
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: ShoppingBag,
      onClick: () => onNavigate?.('marketplace'),
      accent: 'text-amber-300',
      iconBg: 'from-amber-500/25 to-amber-500/10',
    },
    {
      id: 'chronos',
      label: 'Claim Daily',
      icon: Coins,
      onClick: () => onNavigate?.('chronos'),
      accent: 'text-yellow-300',
      iconBg: 'from-yellow-500/25 to-yellow-500/10',
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: Trophy,
      onClick: () => onNavigate?.('achievements'),
      accent: 'text-rose-300',
      iconBg: 'from-rose-500/25 to-rose-500/10',
    },
  ]

  return (
    <div className={cn('chrona-glass rounded-xl p-3 chrona-enter', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
        {chronosBalance > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-400 font-medium chrona-num">
            <Coins className="w-3 h-3" />
            {chronosBalance.toLocaleString()}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action, i) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={cn(
                'chrona-lift chrona-focus-ring group relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg',
                'bg-muted/20 hover:bg-muted/40 border border-border/40 hover:border-border/60',
                'transition-all'
              )}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Badge */}
              {action.badge != null && action.badge > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-rose-500 text-white">
                  {action.badge > 9 ? '9+' : action.badge}
                </span>
              )}
              {/* Icon */}
              <div
                className={cn(
                  'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center',
                  action.iconBg,
                  'ring-1 ring-inset ring-white/5'
                )}
              >
                <Icon className={cn('w-4 h-4', action.accent)} strokeWidth={2} />
              </div>
              {/* Label */}
              <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                {action.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * A "Recently Active" panel showing up to 5 recently-active personas.
 * Compact avatar list with name + archetype. Clicking navigates to that persona.
 */
export function RecentlyActivePanel({
  personas,
  onSelect,
  className,
}: {
  personas: Array<{
    id: string
    name: string
    avatarUrl?: string | null
    archetype?: string | null
    isOnline?: boolean
  }>
  onSelect?: (id: string) => void
  className?: string
}) {
  if (!personas || personas.length === 0) return null
  return (
    <div className={cn('chrona-glass rounded-xl p-3 chrona-enter', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Recently Active</h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Live
        </span>
      </div>
      <div className="space-y-1.5">
        {personas.slice(0, 5).map((p, i) => (
          <button
            key={p.id}
            onClick={() => onSelect?.(p.id)}
            className={cn(
              'chrona-lift w-full flex items-center gap-2 p-1.5 rounded-lg',
              'hover:bg-muted/30 transition-colors'
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/15 flex items-center justify-center text-xs font-bold text-violet-200">
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt={p.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  p.name?.charAt(0)?.toUpperCase() || '?'
                )}
              </div>
              {p.isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-background" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {p.archetype || 'Unknown'}
              </p>
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
