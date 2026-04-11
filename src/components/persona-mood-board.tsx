'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ImageIcon, RefreshCw, Sparkles, Palette, Mountain, Star, Layers } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonaMoodBoardProps {
  archetype: string | null
  secondaryArchetype?: string | null
  personalitySpectrums?: {
    introvertExtrovert: number
    intuitiveObservant: number
    thinkingFeeling: number
    judgingProspecting: number
    assertiveTurbulent: number
  } | null
  personalityDescription?: string | null
  appearance?: string | null
  mbtiType?: string | null
}

// ─── Archetype Aesthetic Data ─────────────────────────────────────────────────

const ARCHETYPE_PALETTE: Record<string, { colors: string[]; symbols: string[]; mood: string; pattern: string }> = {
  'Morally Grey': {
    colors: ['#9ca3af', '#6b7280', '#d1d5db', '#4b5563', '#e5e7eb'],
    symbols: ['⚖️', '🌑', '🌫️', '🗡️', '🎭', '🕯️'],
    mood: 'Twilight ambiguity, shifting shadows',
    pattern: 'diagonal',
  },
  'Dominant': {
    colors: ['#a78bfa', '#7c3aed', '#c4b5fd', '#5b21b6', '#ddd6fe'],
    symbols: ['👑', '🖤', '⚡', '🗡️', '🏛️', '🔥'],
    mood: 'Commanding presence, regal authority',
    pattern: 'radial',
  },
  'Protective': {
    colors: ['#60a5fa', '#3b82f6', '#93c5fd', '#1d4ed8', '#bfdbfe'],
    symbols: ['🛡️', '🤝', '🏠', '💪', '⭐', '🌅'],
    mood: 'Safe haven, guardian warmth',
    pattern: 'shield',
  },
  'Cold & Distant': {
    colors: ['#38bdf8', '#0ea5e9', '#7dd3fc', '#0284c7', '#bae6fd'],
    symbols: ['🧊', '❄️', '🏔️', '🌊', '💎', '🌫️'],
    mood: 'Frost-kissed isolation, crystalline silence',
    pattern: 'crystal',
  },
  'Obsessive': {
    colors: ['#f87171', '#ef4444', '#fca5a5', '#dc2626', '#fee2e2'],
    symbols: ['👁️', '🔮', '🕸️', '💗', '🔗', '🩸'],
    mood: 'Intense fixation, all-consuming focus',
    pattern: 'spiral',
  },
  'Brooding': {
    colors: ['#94a3b8', '#64748b', '#cbd5e1', '#475569', '#e2e8f0'],
    symbols: ['🌑', '⛈️', '📖', '🏚️', '🎭', '🪞'],
    mood: 'Heavy atmosphere, storm-laden silence',
    pattern: 'horizontal',
  },
  'Flirtatious': {
    colors: ['#f472b6', '#ec4899', '#f9a8d4', '#db2777', '#fce7f3'],
    symbols: ['😏', '🌹', '💋', '✨', '🦋', '🌸'],
    mood: 'Playful allure, warm blush tones',
    pattern: 'wave',
  },
  'Tsundere': {
    colors: ['#fb923c', '#f97316', '#fdba74', '#ea580c', '#fed7aa'],
    symbols: ['💢', '💗', '😤', '🌸', '🔥', '🥀'],
    mood: 'Thorny exterior, hidden warmth',
    pattern: 'zigzag',
  },
  'Yandere': {
    colors: ['#dc2626', '#991b1b', '#f87171', '#7f1d1d', '#fecaca'],
    symbols: ['🩸', '🔪', '💗', '🌹', '👁️', '🎀'],
    mood: 'Beautiful danger, obsessive devotion',
    pattern: 'spiral',
  },
  'Kuudere': {
    colors: ['#22d3ee', '#06b6d4', '#67e8f9', '#0891b2', '#cffafe'],
    symbols: ['🧊', '❄️', '🌊', '📖', '💎', '🪷'],
    mood: 'Frozen depths, stoic beauty',
    pattern: 'crystal',
  },
  'Mysterious': {
    colors: ['#8b5cf6', '#7c3aed', '#a78bfa', '#6d28d9', '#ddd6fe'],
    symbols: ['🌫️', '🔮', '🗝️', '🦉', '🌙', '🎭'],
    mood: 'Enigmatic shadows, hidden pathways',
    pattern: 'radial',
  },
  'Wholesome': {
    colors: ['#fbbf24', '#f59e0b', '#fcd34d', '#d97706', '#fef3c7'],
    symbols: ['🌻', '🌈', '☕', '🧸', '💕', '☀️'],
    mood: 'Golden warmth, nurturing glow',
    pattern: 'wave',
  },
  'Chaotic': {
    colors: ['#f59e0b', '#d97706', '#fbbf24', '#b45309', '#fef3c7'],
    symbols: ['🌀', '💥', '⚡', '🔥', '🎲', '🎆'],
    mood: 'Wild energy, explosive unpredictability',
    pattern: 'zigzag',
  },
  'Defiant': {
    colors: ['#ea580c', '#c2410c', '#fb923c', '#9a3412', '#fed7aa'],
    symbols: ['✊', '🔥', '⛓️', '⚡', '🏴', '💥'],
    mood: 'Burning rebellion, unbroken spirit',
    pattern: 'diagonal',
  },
  'Possessive': {
    colors: ['#fb7185', '#e11d48', '#fda4af', '#be123c', '#ffe4e6'],
    symbols: ['⛓️', '🌹', '🦅', '💍', '🔒', '🖤'],
    mood: 'Claiming embrace, fierce loyalty',
    pattern: 'spiral',
  },
  'Devoted': {
    colors: ['#d97706', '#b45309', '#fbbf24', '#92400e', '#fef3c7'],
    symbols: ['🕯️', '💗', '🤝', '⏳', '🏅', '🌙'],
    mood: 'Steadfast flame, unwavering loyalty',
    pattern: 'radial',
  },
  'Dark & Gritty': {
    colors: ['#6b7280', '#4b5563', '#9ca3af', '#374151', '#d1d5db'],
    symbols: ['🖤', '🌧️', '🔫', '🏚️', '💔', '🚬'],
    mood: 'Urban decay, rain-soaked noir',
    pattern: 'horizontal',
  },
  'Supernatural': {
    colors: ['#818cf8', '#6366f1', '#a5b4fc', '#4f46e5', '#e0e7ff'],
    symbols: ['👻', '🔮', '🌙', '✨', '🦇', '🌀'],
    mood: 'Ethereal glow, otherworldly presence',
    pattern: 'radial',
  },
  'Royalty': {
    colors: ['#eab308', '#ca8a04', '#fde047', '#a16207', '#fef9c3'],
    symbols: ['👑', '💍', '🏰', '⚜️', '🎭', '🦚'],
    mood: 'Opulent regalia, golden grandeur',
    pattern: 'radial',
  },
  'Warrior': {
    colors: ['#ef4444', '#dc2626', '#f87171', '#b91c1c', '#fecaca'],
    symbols: ['🗡️', '⚔️', '🛡️', '🔥', '🎖️', '🏔️'],
    mood: 'Battle-scarred steel, crimson dawn',
    pattern: 'diagonal',
  },
  'Scholar': {
    colors: ['#818cf8', '#6366f1', '#a5b4fc', '#4f46e5', '#c7d2fe'],
    symbols: ['📖', '📜', '🔮', '🔬', '🪶', '🏛️'],
    mood: 'Ancient libraries, candlelit knowledge',
    pattern: 'horizontal',
  },
  'Trauma-Coded': {
    colors: ['#fda4af', '#fb7185', '#fecdd3', '#e11d48', '#ffe4e6'],
    symbols: ['🩹', '💔', '🌹', '🪞', '🌧️', '🎭'],
    mood: 'Fractured beauty, fragile resilience',
    pattern: 'zigzag',
  },
  'Protector': {
    colors: ['#60a5fa', '#3b82f6', '#93c5fd', '#2563eb', '#bfdbfe'],
    symbols: ['🛡️', '🏰', '⭐', '🤝', '💪', '🌅'],
    mood: 'Steadfast guard, beacon of safety',
    pattern: 'shield',
  },
  'Street-Smart': {
    colors: ['#a1a1aa', '#71717a', '#d4d4d8', '#52525b', '#f4f4f5'],
    symbols: ['🏙️', '🚂', '🎲', '💡', '🪬', '🔑'],
    mood: 'Urban pulse, neon rain, survival instinct',
    pattern: 'diagonal',
  },
  'Trickster': {
    colors: ['#f59e0b', '#d97706', '#fbbf24', '#92400e', '#a78bfa'],
    symbols: ['🃏', '🎲', '🎭', '🦊', '✨', '🌀'],
    mood: 'Mischievous shadows, glittering deceit',
    pattern: 'zigzag',
  },
  'Rebel': {
    colors: ['#f97316', '#ea580c', '#fb923c', '#c2410c', '#fed7aa'],
    symbols: ['🔥', '✊', '⛓️', '⚡', '🏴', '💥'],
    mood: 'Revolutionary flames, broken chains',
    pattern: 'diagonal',
  },
  'Sage': {
    colors: ['#a78bfa', '#8b5cf6', '#c4b5fd', '#7c3aed', '#ddd6fe'],
    symbols: ['📚', '🌟', '🔮', '🦉', '🧘', '♾️'],
    mood: 'Cosmic wisdom, ancient knowledge',
    pattern: 'radial',
  },
  'Lover': {
    colors: ['#ec4899', '#db2777', '#f472b6', '#be185d', '#fce7f3'],
    symbols: ['💕', '🌹', '💋', '🦋', '🌸', '💗'],
    mood: 'Rose garden, intimate warmth',
    pattern: 'wave',
  },
  'Villain': {
    colors: ['#ef4444', '#991b1b', '#f87171', '#7f1d1d', '#450a0a'],
    symbols: ['💀', '👑', '🗡️', '🕷️', '🌑', '⚡'],
    mood: 'Dark power, menacing shadow',
    pattern: 'spiral',
  },
  'Hero': {
    colors: ['#3b82f6', '#2563eb', '#60a5fa', '#1d4ed8', '#fbbf24'],
    symbols: ['⚔️', '🛡️', '⭐', '🌅', '💪', '🏆'],
    mood: 'Golden sunrise, blue-sky hope',
    pattern: 'shield',
  },
  'Antihero': {
    colors: ['#9ca3af', '#6b7280', '#d1d5db', '#4b5563', '#fbbf24'],
    symbols: ['🦹', '🌑', '🗡️', '🎭', '💔', '🌫️'],
    mood: 'Twilight morality, lone wolf',
    pattern: 'diagonal',
  },
  'Caregiver': {
    colors: ['#f472b6', '#ec4899', '#f9a8d4', '#db2777', '#fce7f3'],
    symbols: ['💝', '🤗', '🌿', '☕', '🧸', '🌸'],
    mood: 'Healing hands, nurturing garden',
    pattern: 'wave',
  },
  'Explorer': {
    colors: ['#34d399', '#10b981', '#6ee7b7', '#059669', '#d1fae5'],
    symbols: ['🗺️', '🧭', '🏔️', '🌌', '🦅', '🌊'],
    mood: 'Uncharted horizons, emerald wilderness',
    pattern: 'diagonal',
  },
  'Creator': {
    colors: ['#22d3ee', '#06b6d4', '#67e8f9', '#0891b2', '#cffafe'],
    symbols: ['🎨', '✨', '🖌️', '💡', '🔭', '🌈'],
    mood: 'Sparks of creation, artistic vision',
    pattern: 'spiral',
  },
  'Ruler': {
    colors: ['#eab308', '#ca8a04', '#fde047', '#a16207', '#fef9c3'],
    symbols: ['👑', '🏰', '⚜️', '🗡️', '📜', '🔱'],
    mood: 'Commanding architecture, golden throne',
    pattern: 'radial',
  },
  'Other': {
    colors: ['#9ca3af', '#6b7280', '#d1d5db', '#4b5563', '#e5e7eb'],
    symbols: ['📖', '✨', '🌟', '🔮', '🎭', '🌙'],
    mood: 'Abstract mystery, undefined beauty',
    pattern: 'radial',
  },
}

// ─── Deterministic Hash & RNG ────────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

function createRng(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Color Utilities ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace('#', '')
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  }
}

function blendColors(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1)
  const b = hexToRgb(c2)
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t)
  const r = mix(a.r, b.r)
  const g = mix(a.g, b.g)
  const bl = mix(a.b, b.b)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

// ─── Procedural Panel Generators ─────────────────────────────────────────────

function generateColorPalette(
  archetype: string | null,
  secondaryArchetype: string | null,
  rng: () => number
): { colors: string[]; names: string[] } {
  const primary = ARCHETYPE_PALETTE[archetype || 'Other'] || ARCHETYPE_PALETTE['Other']
  const secondary = secondaryArchetype ? (ARCHETYPE_PALETTE[secondaryArchetype] || ARCHETYPE_PALETTE['Other']) : null

  // Blend primary and secondary colors for a unique palette
  const colors: string[] = []
  const names: string[] = []

  // Primary archetype colors (3)
  colors.push(primary.colors[0])
  names.push('Core')
  colors.push(primary.colors[1])
  names.push('Depth')

  if (secondary) {
    // Blend between primary and secondary (2)
    colors.push(blendColors(primary.colors[2], secondary.colors[0], 0.5))
    names.push('Bridge')
    colors.push(secondary.colors[1])
    names.push('Accent')
    colors.push(blendColors(primary.colors[4], secondary.colors[2], 0.3))
    names.push('Highlight')
  } else {
    colors.push(primary.colors[2])
    names.push('Light')
    colors.push(primary.colors[3])
    names.push('Shadow')
    colors.push(primary.colors[4])
    names.push('Highlight')
  }

  return { colors, names }
}

function generateAtmosphereSvg(
  archetype: string | null,
  secondaryArchetype: string | null,
  rng: () => number
): string {
  const primary = ARCHETYPE_PALETTE[archetype || 'Other'] || ARCHETYPE_PALETTE['Other']
  const pattern = primary.pattern
  const c = primary.colors

  // Create atmospheric SVG with gradients and shapes
  const secondaryColor = secondaryArchetype
    ? (ARCHETYPE_PALETTE[secondaryArchetype] || ARCHETYPE_PALETTE['Other']).colors[0]
    : c[2]

  let shapes = ''

  // Base gradient
  shapes += `
    <defs>
      <radialGradient id="atm-grad" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="${c[2]}" stop-opacity="0.4"/>
        <stop offset="50%" stop-color="${c[0]}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${c[1]}" stop-opacity="0.6"/>
      </radialGradient>
      <linearGradient id="atm-line" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c[0]}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.3"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#atm-grad)"/>
  `

  // Pattern-specific shapes
  switch (pattern) {
    case 'radial':
      for (let i = 0; i < 5; i++) {
        const r = 20 + rng() * 60
        const cx = 30 + rng() * 140
        const cy = 30 + rng() * 140
        shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c[i % c.length]}" stroke-opacity="0.15" stroke-width="1"/>`
      }
      break
    case 'diagonal':
      for (let i = 0; i < 8; i++) {
        const x1 = rng() * 200
        const y1 = rng() * 200
        const x2 = x1 + 40 + rng() * 80
        const y2 = y1 + 40 + rng() * 80
        shapes += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c[i % c.length]}" stroke-opacity="0.2" stroke-width="2"/>`
      }
      break
    case 'wave':
      for (let i = 0; i < 4; i++) {
        const y = 30 + i * 45
        const amp = 10 + rng() * 20
        shapes += `<path d="M0 ${y} Q 50 ${y - amp} 100 ${y} Q 150 ${y + amp} 200 ${y}" fill="none" stroke="${c[i % c.length]}" stroke-opacity="0.2" stroke-width="2"/>`
      }
      break
    case 'zigzag':
      for (let i = 0; i < 4; i++) {
        const y = 30 + i * 45
        const amp = 15 + rng() * 25
        shapes += `<path d="M0 ${y} L 25 ${y - amp} L 50 ${y} L 75 ${y + amp} L 100 ${y} L 125 ${y - amp} L 150 ${y} L 175 ${y + amp} L 200 ${y}" fill="none" stroke="${c[i % c.length]}" stroke-opacity="0.2" stroke-width="1.5"/>`
      }
      break
    case 'crystal':
      for (let i = 0; i < 6; i++) {
        const cx = 30 + rng() * 140
        const cy = 30 + rng() * 140
        const s = 8 + rng() * 20
        const rot = rng() * 360
        shapes += `<polygon points="${cx},${cy - s} ${cx + s * 0.7},${cy} ${cx},${cy + s * 0.5} ${cx - s * 0.7},${cy}" fill="${c[i % c.length]}" fill-opacity="0.1" stroke="${c[i % c.length]}" stroke-opacity="0.3" transform="rotate(${rot}, ${cx}, ${cy})"/>`
      }
      break
    case 'spiral':
      for (let i = 0; i < 3; i++) {
        const cx = 60 + rng() * 80
        const cy = 60 + rng() * 80
        let path = `M ${cx} ${cy}`
        for (let a = 0; a < 6.28; a += 0.3) {
          const r = 5 + a * 6
          const x = cx + r * Math.cos(a)
          const y = cy + r * Math.sin(a)
          path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`
        }
        shapes += `<path d="${path}" fill="none" stroke="${c[i % c.length]}" stroke-opacity="0.2" stroke-width="1.5"/>`
      }
      break
    case 'shield':
      shapes += `<path d="M100 20 L170 50 L170 120 Q170 170 100 190 Q30 170 30 120 L30 50 Z" fill="none" stroke="${c[0]}" stroke-opacity="0.15" stroke-width="2"/>`
      shapes += `<path d="M100 45 L145 65 L145 110 Q145 145 100 160 Q55 145 55 110 L55 65 Z" fill="none" stroke="${c[2]}" stroke-opacity="0.1" stroke-width="1.5"/>`
      break
    case 'horizontal':
      for (let i = 0; i < 6; i++) {
        const y = 15 + i * 32
        const w = 60 + rng() * 120
        const x = rng() * (200 - w)
        shapes += `<rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="${c[i % c.length]}" fill-opacity="0.12"/>`
      }
      break
  }

  // Add subtle light spots
  for (let i = 0; i < 3; i++) {
    const cx = 30 + rng() * 140
    const cy = 30 + rng() * 140
    const r = 15 + rng() * 30
    shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c[2]}" fill-opacity="0.06"/>`
  }

  // Secondary archetype accent
  if (secondaryArchetype) {
    const sec = ARCHETYPE_PALETTE[secondaryArchetype] || ARCHETYPE_PALETTE['Other']
    const angle = rng() * 360
    shapes += `<circle cx="160" cy="40" r="25" fill="${sec.colors[0]}" fill-opacity="0.08"/>`
    shapes += `<circle cx="160" cy="40" r="15" fill="${sec.colors[1]}" fill-opacity="0.06"/>`
  }

  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${shapes}</svg>`
}

function generateTextureSvg(
  archetype: string | null,
  secondaryArchetype: string | null,
  spectrums: PersonaMoodBoardProps['personalitySpectrums'],
  rng: () => number
): string {
  const primary = ARCHETYPE_PALETTE[archetype || 'Other'] || ARCHETYPE_PALETTE['Other']
  const c = primary.colors

  let shapes = ''

  // Background
  shapes += `<rect width="200" height="200" fill="${c[1]}" fill-opacity="0.15"/>`

  // Generate texture pattern based on personality spectrums
  const spectrumValues = spectrums
    ? [spectrums.introvertExtrovert, spectrums.intuitiveObservant, spectrums.thinkingFeeling, spectrums.judgingProspecting, spectrums.assertiveTurbulent]
    : [50, 50, 50, 50, 50]

  // Grid of small shapes modulated by spectrum values
  const gridSize = 8
  const cellW = 200 / gridSize
  const cellH = 200 / gridSize

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = col * cellW + cellW / 2
      const y = row * cellH + cellH / 2
      const spectrumIdx = (row + col) % 5
      const val = spectrumValues[spectrumIdx] / 100
      const r = rng()

      // Different shape based on spectrum
      if (r < 0.4) {
        // Dot
        const radius = 1 + val * 4
        shapes += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${c[spectrumIdx % c.length]}" fill-opacity="${0.1 + val * 0.3}"/>`
      } else if (r < 0.7) {
        // Line segment
        const len = 3 + val * 8
        const angle = rng() * Math.PI
        const dx = len * Math.cos(angle)
        const dy = len * Math.sin(angle)
        shapes += `<line x1="${x - dx}" y1="${y - dy}" x2="${x + dx}" y2="${y + dy}" stroke="${c[spectrumIdx % c.length]}" stroke-opacity="${0.1 + val * 0.25}" stroke-width="0.8"/>`
      } else {
        // Tiny square
        const size = 1 + val * 4
        const rot = rng() * 90
        shapes += `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="${c[spectrumIdx % c.length]}" fill-opacity="${0.08 + val * 0.2}" transform="rotate(${rot}, ${x}, ${y})"/>`
      }
    }
  }

  // Secondary archetype overlay
  if (secondaryArchetype) {
    const sec = ARCHETYPE_PALETTE[secondaryArchetype] || ARCHETYPE_PALETTE['Other']
    for (let i = 0; i < 4; i++) {
      const x = 20 + rng() * 160
      const y = 20 + rng() * 160
      const r = 10 + rng() * 25
      shapes += `<circle cx="${x}" cy="${y}" r="${r}" fill="${sec.colors[0]}" fill-opacity="0.05"/>`
    }
  }

  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${shapes}</svg>`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PersonaMoodBoard({
  archetype,
  secondaryArchetype,
  personalitySpectrums,
  personalityDescription,
  appearance,
  mbtiType,
}: PersonaMoodBoardProps) {
  const [isGenerated, setIsGenerated] = useState(false)
  const [variant, setVariant] = useState(0) // For regeneration

  // Deterministic seed from persona traits
  const seed = useMemo(() => {
    const parts: string[] = []
    if (archetype) parts.push(archetype)
    if (secondaryArchetype) parts.push(secondaryArchetype)
    if (personalitySpectrums) {
      parts.push(String(personalitySpectrums.introvertExtrovert))
      parts.push(String(personalitySpectrums.thinkingFeeling))
    }
    if (mbtiType) parts.push(mbtiType)
    parts.push(String(variant)) // Include variant for regeneration
    return hashString(parts.join('|') || 'default-mood')
  }, [archetype, secondaryArchetype, personalitySpectrums, mbtiType, variant])

  // Each generator gets its own independent rng instance so React's
  // useMemo evaluation order never causes state drift between panels.
  const rngPalette = useMemo(() => createRng(seed), [seed])
  const rngAtmosphere = useMemo(() => createRng(seed + 1), [seed])
  const rngTexture = useMemo(() => createRng(seed + 2), [seed])

  const primary = ARCHETYPE_PALETTE[archetype || 'Other'] || ARCHETYPE_PALETTE['Other']

  // Generate all 4 panels
  const palette = useMemo(() => generateColorPalette(archetype, secondaryArchetype, rngPalette), [archetype, secondaryArchetype, rngPalette])
  const atmosphereSvg = useMemo(() => generateAtmosphereSvg(archetype, secondaryArchetype, rngAtmosphere), [archetype, secondaryArchetype, rngAtmosphere])
  const textureSvg = useMemo(() => generateTextureSvg(archetype, secondaryArchetype, personalitySpectrums, rngTexture), [archetype, secondaryArchetype, personalitySpectrums, rngTexture])

  // Symbolism: combine primary + secondary symbols
  const symbols = useMemo(() => {
    const primaryData = ARCHETYPE_PALETTE[archetype || 'Other'] || ARCHETYPE_PALETTE['Other']
    const primarySymbols = primaryData.symbols
    const secondarySymbols = secondaryArchetype
      ? (ARCHETYPE_PALETTE[secondaryArchetype] || ARCHETYPE_PALETTE['Other']).symbols
      : []
    // Interleave primary and secondary
    const combined: string[] = []
    const max = Math.max(primarySymbols.length, secondarySymbols.length)
    for (let i = 0; i < max; i++) {
      if (i < primarySymbols.length) combined.push(primarySymbols[i])
      if (i < secondarySymbols.length) combined.push(secondarySymbols[i])
    }
    return combined.slice(0, 9) // Max 9 for a 3x3 grid
  }, [archetype, secondaryArchetype])

  const handleGenerate = () => {
    setIsGenerated(true)
  }

  const handleRegenerate = () => {
    setVariant(v => v + 1)
    setIsGenerated(true)
  }

  const panelData = [
    { label: 'Atmosphere', icon: Mountain, description: primary.mood + (secondaryArchetype ? ` + ${secondaryArchetype}` : '') },
    { label: 'Symbolism', icon: Star, description: 'Icons & symbols' },
    { label: 'Colors', icon: Palette, description: 'Character palette' },
    { label: 'Texture', icon: Layers, description: 'Personality texture' },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-white/40" />
          <span className="text-sm font-medium text-white/70">Mood Board</span>
          {isGenerated && (
            <span className="text-[10px] text-white/30">
              {archetype || 'Character'}{secondaryArchetype ? ` × ${secondaryArchetype}` : ''}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={isGenerated ? handleRegenerate : handleGenerate}
          className="h-7 px-3 text-xs text-white/50 hover:text-white hover:bg-white/10"
        >
          {isGenerated ? (
            <>
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Remix
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-1.5" />
              Generate Mood Board
            </>
          )}
        </Button>
      </div>

      {/* Mood Board Grid */}
      {!isGenerated ? (
        // Empty state
        <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 border-dashed text-center">
          <Sparkles className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/50">Generate visual vibes for this character</p>
          <p className="text-[10px] text-white/30 mt-1">
            4 procedural panels: atmosphere, symbolism, colors, and texture
          </p>
          <Button
            onClick={handleGenerate}
            className="mt-3 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white text-xs"
            size="sm"
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            Generate
          </Button>
        </div>
      ) : (
        // 4-panel grid
        <div className="grid grid-cols-2 gap-2">
          {/* Atmosphere Panel */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 group">
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${primary.colors[1]}20, ${primary.colors[0]}15, ${primary.colors[2]}10)` }}
            />
            <div
              className="absolute inset-0"
              dangerouslySetInnerHTML={{ __html: atmosphereSvg }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Mountain className="w-3 h-3 text-white/60" />
                <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">Atmosphere</span>
              </div>
              <p className="text-[9px] text-white/40 line-clamp-2 leading-relaxed">{primary.mood}</p>
            </div>
          </div>

          {/* Symbolism Panel */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 group">
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(circle at 50% 50%, ${primary.colors[0]}15, transparent 70%)` }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="grid grid-cols-3 gap-3">
                {symbols.map((symbol, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{
                      background: `${primary.colors[i % primary.colors.length]}15`,
                      border: `1px solid ${primary.colors[i % primary.colors.length]}25`,
                    }}
                  >
                    {symbol}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-1.5">
                <Star className="w-3 h-3 text-white/60" />
                <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">Symbolism</span>
              </div>
            </div>
          </div>

          {/* Color Palette Panel */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 group">
            <div className="absolute inset-0 flex flex-col">
              {/* Main color swatches */}
              <div className="flex-1 flex">
                {palette.colors.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1 relative group/swatch"
                    style={{ backgroundColor: color }}
                  >
                    <div className="absolute inset-x-0 bottom-0 p-1.5 opacity-0 group-hover/swatch:opacity-100 transition-opacity">
                      <span className="text-[8px] font-mono text-white/90 bg-black/40 px-1 py-0.5 rounded backdrop-blur-sm">
                        {color}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Color names */}
              <div className="flex border-t border-white/10">
                {palette.names.map((name, i) => (
                  <div
                    key={i}
                    className="flex-1 py-1.5 text-center"
                    style={{ background: `${palette.colors[i]}20` }}
                  >
                    <span className="text-[8px] text-white/50">{name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <Palette className="w-3 h-3 text-white/60" />
              <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-sm">Colors</span>
            </div>
          </div>

          {/* Texture Panel */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 group">
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(180deg, ${primary.colors[0]}10, ${primary.colors[1]}15)` }}
            />
            <div
              className="absolute inset-0"
              dangerouslySetInnerHTML={{ __html: textureSvg }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers className="w-3 h-3 text-white/60" />
                <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">Texture</span>
              </div>
              <p className="text-[9px] text-white/40">
                {personalitySpectrums ? 'Spectrum-modulated pattern' : 'Archetype-derived texture'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
