'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface PersonaHoverCardProps {
  persona: {
    name: string
    avatarUrl?: string | null
    archetype?: string | null
    gender?: string | null
    age?: number | null
    tags?: string[]
    bio?: string | null
    description?: string | null
    personalityDescription?: string | null
    backstory?: string | null
    mbtiType?: string | null
    isOnline?: boolean
    username?: string
  }
  children: React.ReactNode
  /** Side to prefer; auto-flips if not enough space */
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** Delay before showing (ms) */
  delay?: number
}

/**
 * A lightweight hover card that shows a persona preview on mouseover.
 * Uses React Portal to escape any parent overflow/clipping.
 *
 * Visual: a glassy card with avatar, name, archetype badge, age/gender,
 * first 2 tags, truncated bio, and an online status dot.
 *
 * Usage:
 *   <PersonaHoverCard persona={persona}>
 *     <button>Hover me</button>
 *   </PersonaHoverCard>
 */
export function PersonaHoverCard({
  persona,
  children,
  side = 'right',
  delay = 400,
}: PersonaHoverCardProps) {
  const [show, setShow] = React.useState(false)
  const [coords, setCoords] = React.useState({ x: 0, y: 0, actualSide: side })
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const childRef = React.useRef<HTMLDivElement>(null)

  const handleEnter = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShow(true), delay)
  }, [delay])

  const handleLeave = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShow(false)
  }, [])

  // Position the card when it becomes visible
  React.useEffect(() => {
    if (!show || !childRef.current) return
    const rect = childRef.current.getBoundingClientRect()
    const cardWidth = 320
    const cardHeight = 200
    const gap = 12
    let actualSide = side
    let x = rect.right + gap
    let y = rect.top
    // Auto-flip if not enough space
    if (side === 'right' && rect.right + cardWidth + gap > window.innerWidth) {
      actualSide = 'left'
      x = rect.left - cardWidth - gap
    }
    if (side === 'left' && rect.left - cardWidth - gap < 0) {
      actualSide = 'right'
      x = rect.right + gap
    }
    if (side === 'bottom' && rect.bottom + cardHeight + gap > window.innerHeight) {
      actualSide = 'top'
      y = rect.top - cardHeight - gap
    }
    if (side === 'top' && rect.top - cardHeight - gap < 0) {
      actualSide = 'bottom'
      y = rect.bottom + gap
    }
    if (actualSide === 'top') y = rect.top - cardHeight - gap
    if (actualSide === 'bottom') y = rect.bottom + gap
    if (actualSide === 'left') x = rect.left - cardWidth - gap
    if (actualSide === 'right') x = rect.right + gap
    // Clamp to viewport
    x = Math.max(8, Math.min(x, window.innerWidth - cardWidth - 8))
    y = Math.max(8, Math.min(y, window.innerHeight - cardHeight - 8))
    setCoords({ x, y, actualSide })
  }, [show, side])

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const tags = (persona.tags || []).slice(0, 4)
  const bio = persona.bio || persona.description || persona.personalityDescription || persona.backstory || ''

  return (
    <>
      <div
        ref={childRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="inline-block"
        style={{ display: 'inline-flex' }}
      >
        {children}
      </div>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none chrona-enter"
          style={{
            left: coords.x,
            top: coords.y,
            width: 320,
          }}
        >
          <div className="chrona-glass rounded-xl p-4 shadow-2xl border border-border/60">
            {/* Header: avatar + name + online dot */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center text-lg font-bold text-violet-200 ring-2 ring-violet-500/20">
                  {persona.avatarUrl ? (
                    <img
                      src={persona.avatarUrl}
                      alt={persona.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    persona.name?.charAt(0)?.toUpperCase() || '?'
                  )}
                </div>
                {persona.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground truncate">
                  {persona.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {persona.username ? `@${persona.username}` : ''}
                  {persona.archetype ? ` · ${persona.archetype}` : ''}
                </p>
              </div>
              {persona.mbtiType && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-500/20">
                  {persona.mbtiType}
                </span>
              )}
            </div>
            {/* Info row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              {persona.age != null && <span>Age {persona.age}</span>}
              {persona.gender && <span>· {persona.gender}</span>}
            </div>
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((t, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {/* Bio */}
            {bio && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {bio}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
