'use client'

import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// =============================================================
// Chrona Context Menu System
// =============================================================
// A lightweight, fully custom right-click context menu system.
// Any component can show a context menu by calling `showContextMenu`
// with the click event, a list of menu items, and optional data.
//
// Menu items support:
//   - label, icon, onClick
//   - separator (type: 'separator')
//   - danger style (type: 'danger')
//   - disabled state
//   - submenu (items: MenuItem[])  — supports one level of nesting
//
// The menu auto-positions to stay within the viewport, closes on
// outside click, scroll, Escape, and item click.
// =============================================================

export interface ContextMenuItem {
  type?: 'item' | 'separator' | 'label' | 'danger'
  label?: string
  icon?: ReactNode
  onClick?: () => void
  disabled?: boolean
  shortcut?: string
  items?: ContextMenuItem[] // submenu
  accent?: 'teal' | 'amber' | 'rose' | 'violet' | 'cyan' | 'slate'
}

interface MenuState {
  x: number
  y: number
  items: ContextMenuItem[]
  title?: string
}

interface ContextMenuContextValue {
  showContextMenu: (e: React.MouseEvent | MouseEvent, items: ContextMenuItem[], title?: string) => void
  hideContextMenu: () => void
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null)

export function useContextMenu() {
  const ctx = useContext(ContextMenuContext)
  if (!ctx) {
    // Return a no-op fallback so components can call it even before the provider mounts
    return {
      showContextMenu: (e: React.MouseEvent | MouseEvent, _items: ContextMenuItem[]) => {
        // Fallback: allow the native menu
      },
      hideContextMenu: () => {},
    }
  }
  return ctx
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [submenuOpen, setSubmenuOpen] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const hideContextMenu = useCallback(() => {
    setMenu(null)
    setSubmenuOpen(null)
  }, [])

  const showContextMenu = useCallback((e: React.MouseEvent | MouseEvent, items: ContextMenuItem[], title?: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSubmenuOpen(null)
    setMenu({ x: e.clientX, y: e.clientY, items, title })
  }, [])

  // Close on Escape, scroll, or click outside
  useEffect(() => {
    if (!menu) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu()
    }
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) hideContextMenu()
    }
    const handleScroll = () => hideContextMenu()
    const handleResize = () => hideContextMenu()
    window.addEventListener('keydown', handleKey)
    window.addEventListener('click', handleClick, true)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('click', handleClick, true)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [menu, hideContextMenu])

  // Compute position with viewport clamping
  const computePosition = (x: number, y: number) => {
    const MENU_WIDTH = 220
    const MENU_HEIGHT = Math.min(menu?.items.length * 36 + 60 || 200, 400)
    let left = x
    let top = y
    if (x + MENU_WIDTH > window.innerWidth - 8) left = window.innerWidth - MENU_WIDTH - 8
    if (y + MENU_HEIGHT > window.innerHeight - 8) top = window.innerHeight - MENU_HEIGHT - 8
    if (left < 8) left = 8
    if (top < 8) top = 8
    return { left, top }
  }

  const position = menu ? computePosition(menu.x, menu.y) : { left: 0, top: 0 }

  const accentColor: Record<string, string> = {
    teal: 'text-teal-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    violet: 'text-violet-400',
    cyan: 'text-cyan-400',
    slate: 'text-slate-400',
  }

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}
      {menu && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[10001] min-w-[200px] rounded-xl bg-[#12141a]/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl shadow-black/50 overflow-hidden py-1.5 select-none"
          style={{ left: position.left, top: position.top, animation: 'fadeInScale 0.12s ease-out' }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {menu.title && (
            <div className="px-3 py-1.5 mb-1 border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {menu.title}
            </div>
          )}
          {menu.items.map((item, idx) => {
            if (item.type === 'separator') {
              return <div key={idx} className="my-1 h-px bg-white/[0.06]" />
            }
            if (item.type === 'label') {
              return (
                <div key={idx} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  {item.label}
                </div>
              )
            }
            const isDanger = item.type === 'danger'
            const hasSubmenu = Boolean(item.items && item.items.length > 0)
            return (
              <div
                key={idx}
                className="relative"
                onMouseEnter={() => setSubmenuOpen(hasSubmenu ? idx : null)}
              >
                <button
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (hasSubmenu) {
                      setSubmenuOpen(submenuOpen === idx ? null : idx)
                      return
                    }
                    item.onClick?.()
                    hideContextMenu()
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 mx-1 rounded-lg text-sm transition-colors text-left ${
                    item.disabled
                      ? 'text-slate-600 cursor-not-allowed'
                      : isDanger
                        ? 'text-rose-400 hover:bg-rose-500/10'
                        : 'text-slate-200 hover:bg-teal-500/10 hover:text-white'
                  }`}
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  {item.icon && (
                    <span className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${isDanger ? 'text-rose-400' : accentColor[item.accent || 'slate']}`}>
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-[10px] text-slate-500 font-mono">{item.shortcut}</span>
                  )}
                  {hasSubmenu && (
                    <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-500 flex-shrink-0">
                      <path d="M3 1 L7 5 L3 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                {/* Submenu */}
                {hasSubmenu && submenuOpen === idx && item.items && (
                  <div
                    className="absolute left-full top-0 -ml-1 min-w-[200px] rounded-xl bg-[#12141a]/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl shadow-black/50 overflow-hidden py-1.5"
                    style={{ animation: 'fadeIn 0.1s ease-out' }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {item.items.map((sub, sidx) => {
                      if (sub.type === 'separator') return <div key={sidx} className="my-1 h-px bg-white/[0.06]" />
                      const subDanger = sub.type === 'danger'
                      return (
                        <button
                          key={sidx}
                          disabled={sub.disabled}
                          onClick={(e) => {
                            e.stopPropagation()
                            sub.onClick?.()
                            hideContextMenu()
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 mx-1 rounded-lg text-sm transition-colors text-left ${
                            sub.disabled
                              ? 'text-slate-600 cursor-not-allowed'
                              : subDanger
                                ? 'text-rose-400 hover:bg-rose-500/10'
                                : 'text-slate-200 hover:bg-teal-500/10 hover:text-white'
                          }`}
                          style={{ width: 'calc(100% - 8px)' }}
                        >
                          {sub.icon && (
                            <span className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${subDanger ? 'text-rose-400' : accentColor[sub.accent || 'slate']}`}>
                              {sub.icon}
                            </span>
                          )}
                          <span className="flex-1 truncate">{sub.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </ContextMenuContext.Provider>
  )
}
