'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Search, MessageSquare, Settings, Bell, ArrowLeft,
  CornerDownLeft, ArrowUp, ArrowDown, Command, Edit2, Send
} from 'lucide-react'

// =============================================================
// Keyboard Shortcuts Help Overlay
// =============================================================
// Press `?` (Shift+/) anywhere to show available keyboard
// shortcuts. Press Escape or click outside to close.
// =============================================================

interface Shortcut {
  keys: string[]
  description: string
  icon: typeof Search
  category: string
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['?'], description: 'Show this shortcuts panel', icon: Command, category: 'General' },
  { keys: ['Esc'], description: 'Close dialogs / panels', icon: X, category: 'General' },
  { keys: ['/'], description: 'Open Search (find users, servers, channels)', icon: Search, category: 'General' },
  { keys: ['G', 'H'], description: 'Go to Discover (home)', icon: ArrowLeft, category: 'Navigation' },
  { keys: ['G', 'F'], description: 'Go to Friends', icon: MessageSquare, category: 'Navigation' },
  { keys: ['G', 'S'], description: 'Go to Storylines', icon: MessageSquare, category: 'Navigation' },
  { keys: ['G', 'C'], description: 'Go to Chronos wallet', icon: Settings, category: 'Navigation' },
  { keys: ['G', 'M'], description: 'Go to Marketplace', icon: Bell, category: 'Navigation' },
  { keys: [','], description: 'Open Settings', icon: Settings, category: 'General' },
  // Chat
  { keys: ['Enter'], description: 'Send message', icon: Send, category: 'Chat' },
  { keys: ['Shift', 'Enter'], description: 'New line in message', icon: CornerDownLeft, category: 'Chat' },
  { keys: ['↑'], description: 'Edit your last message', icon: ArrowUp, category: 'Chat' },
  { keys: ['R'], description: 'Reply to selected message', icon: CornerDownLeft, category: 'Chat' },
  { keys: ['E'], description: 'Edit selected message', icon: Edit2, category: 'Chat' },
]

const CATEGORIES = ['General', 'Navigation', 'Chat']

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger when typing in an input/textarea
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // `?` (Shift+/) to open
      if (e.key === '?' && !isTyping) {
        e.preventDefault()
        setOpen(true)
        return
      }
      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  // Listen for an event to open (from a menu item)
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('chrona:open-shortcuts', handler)
    return () => window.removeEventListener('chrona:open-shortcuts', handler)
  }, [])

  if (!open || typeof document === 'undefined') return null

  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    shortcuts: SHORTCUTS.filter(s => s.category === cat),
  }))

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setOpen(false)} />
      <div
        className="relative w-full max-w-lg max-h-[80vh] rounded-2xl bg-popover border border-border shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
        style={{ animation: 'fadeInScale 0.18s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Command className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Keyboard Shortcuts</h2>
              <p className="text-[11px] text-muted-foreground">Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">?</kbd> anytime to open this</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {grouped.map(group => (
            <section key={group.category}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{group.category}</h3>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut, i) => {
                  const Icon = shortcut.icon
                  return (
                    <div key={`${group.category}-${i}`} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-foreground">{shortcut.description}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, idx) => (
                          <span key={idx} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-muted-foreground text-[10px]">then</span>}
                            <kbd className="min-w-[24px] h-6 px-1.5 rounded-md bg-muted border border-border text-[11px] font-mono font-semibold text-foreground flex items-center justify-center">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-card/30 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">Shortcuts work when not typing in a text field</p>
          <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
