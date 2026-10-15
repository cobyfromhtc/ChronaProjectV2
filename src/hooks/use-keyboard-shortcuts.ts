'use client'

import { useEffect } from 'react'

// =============================================================
// Keyboard Shortcuts Hook
// =============================================================
// Wires up global keyboard shortcuts for Chrona. Listens for:
//   ?         → open shortcuts overlay (handled by the overlay itself)
//   /         → open Search modal
//   ,         → open Settings panel
//   G then H  → go to Home/Discover
//   G then F  → go to Friends
//   G then S  → go to Storylines
//   G then C  → go to Chronos
//   G then M  → go to Marketplace
//
// All shortcuts are ignored when the user is typing in an input,
// textarea, or contentEditable element.
// =============================================================

interface UseKeyboardShortcutsOptions {
  onNavigate?: (item: string) => void
}

export function useKeyboardShortcuts({ onNavigate }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    // Track the "G" prefix for two-key sequences (G+H, G+F, etc.)
    let gPressed = false
    let gTimeout: ReturnType<typeof setTimeout> | null = null

    const isTyping = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
    }

    const resetG = () => {
      gPressed = false
      if (gTimeout) { clearTimeout(gTimeout); gTimeout = null }
    }

    const handleKey = (e: KeyboardEvent) => {
      // Never interfere with modifier keys (Ctrl/Cmd/Alt combinations)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const typing = isTyping(e.target)

      // `/` opens search (only when not typing)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('chrona:open-find-users'))
        return
      }

      // `,` opens settings (only when not typing)
      if (e.key === ',' && !typing) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('chrona:open-settings'))
        return
      }

      // `G` prefix for two-key navigation sequences (only when not typing)
      if (!typing) {
        if (e.key === 'g' || e.key === 'G') {
          if (!gPressed) {
            gPressed = true
            if (gTimeout) clearTimeout(gTimeout)
            gTimeout = setTimeout(resetG, 1500) // reset after 1.5s if no second key
          }
          return
        }

        if (gPressed) {
          const key = e.key.toLowerCase()
          const navMap: Record<string, string> = {
            h: 'home',
            f: 'friends',
            s: 'storylines',
            c: 'chronos',
            m: 'marketplace',
          }
          if (navMap[key]) {
            e.preventDefault()
            onNavigate?.(navMap[key])
            resetG()
            return
          }
          // If any other key is pressed after G, reset
          resetG()
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      if (gTimeout) clearTimeout(gTimeout)
    }
  }, [onNavigate])
}
