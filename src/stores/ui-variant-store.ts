'use client'

import { create } from 'zustand'

export type UIVariant = 'chrona' | 'minimal' | 'bold' | 'elegant'

interface UIVariantState {
  variant: UIVariant
  setVariant: (variant: UIVariant) => void
}

const STORAGE_KEY = 'chrona-ui-variant'

const VALID_VARIANTS: UIVariant[] = ['chrona', 'minimal', 'bold', 'elegant']

function getInitialVariant(): UIVariant {
  if (typeof window === 'undefined') return 'chrona'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && VALID_VARIANTS.includes(stored as UIVariant)) {
      return stored as UIVariant
    }
    // Migrate old variants to chrona
    if (['neon-cyber', 'aurora', 'retro-terminal'].includes(stored || '')) {
      localStorage.setItem(STORAGE_KEY, 'chrona')
    }
  } catch {}
  return 'chrona'
}

export const useUIVariant = create<UIVariantState>((set) => ({
  variant: 'chrona',
  setVariant: (variant: UIVariant) => {
    try {
      localStorage.setItem(STORAGE_KEY, variant)
    } catch {}
    
    // Apply UI variant class to document
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      // Remove all UI variant classes
      root.classList.remove('ui-chrona', 'ui-minimal', 'ui-bold', 'ui-elegant')
      // Add the new one
      root.classList.add(`ui-${variant}`)
      
      // Dispatch custom event so other components can react
      window.dispatchEvent(new CustomEvent('chrona:ui-variant-changed', { detail: { variant } }))
    }
    
    set({ variant })
  },
}))

// Initialize on client side
if (typeof window !== 'undefined') {
  const initial = getInitialVariant()
  // Apply immediately
  const root = document.documentElement
  root.classList.remove('ui-chrona', 'ui-minimal', 'ui-bold', 'ui-elegant', 'ui-neon-cyber', 'ui-aurora', 'ui-retro-terminal')
  root.classList.add(`ui-${initial}`)
  useUIVariant.setState({ variant: initial })
}

export const UI_VARIANT_INFO: Record<UIVariant, { name: string; description: string; accent: string; icon: string }> = {
  'chrona': {
    name: 'Chrona',
    description: 'Classic teal & glassmorphism',
    accent: 'Teal/Cyan',
    icon: '🌊',
  },
  'minimal': {
    name: 'Minimal',
    description: 'Clean lines & subtle elegance',
    accent: 'Slate/Neutral',
    icon: '✦',
  },
  'bold': {
    name: 'Bold',
    description: 'Vibrant colors & strong presence',
    accent: 'Violet/Rose',
    icon: '◆',
  },
  'elegant': {
    name: 'Elegant',
    description: 'Warm tones & refined luxury',
    accent: 'Rose/Gold',
    icon: '❖',
  },
}
