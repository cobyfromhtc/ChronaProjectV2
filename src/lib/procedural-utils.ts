// ─── Shared Procedural Generation Utilities ───────────────────────────────────
// Used by: persona-mood-board.tsx, persona-dna-sigil.tsx
// Deterministic hash and seeded RNG for consistent procedural generation.

/**
 * Simple deterministic string hash (djb2 variant).
 * Returns a positive 32-bit integer.
 */
export function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces values in [0, 1).
 */
export function createRng(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Parse a hex color to { r, g, b } */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace('#', '')
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  }
}

/** Convert { r, g, b } to hex */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`
}

/** Blend two hex colors by a factor t (0–1) */
export function blendColors(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1)
  const b = hexToRgb(c2)
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t)
  return rgbToHex(mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b))
}

/** Lighten a hex color by a factor (0–1) */
export function lightenColor(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  )
}

/** Darken a hex color by a factor (0–1) */
export function darkenColor(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor))
}

/** Add alpha to a hex color → rgba string */
export function hexWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}
