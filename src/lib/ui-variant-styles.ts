'use client'

import { useUIVariant, type UIVariant } from '@/stores/ui-variant-store'

/**
 * Variant-specific Tailwind class mappings.
 * Used to dynamically apply accent colors that match the selected UI variant.
 * 
 * Each variant maps to a different color palette:
 * - chrona: teal/cyan (default)
 * - minimal: slate/neutral
 * - bold: violet/rose
 * - elegant: rose/gold
 */

export interface VariantAccentClasses {
  /** Primary text color (e.g., text-teal-400 → text-slate-400) */
  text: string
  /** Primary text color dimmer (e.g., text-teal-500) */
  textDim: string
  /** Background tinted (e.g., bg-teal-500/15) */
  bgTint: string
  /** Background solid (e.g., bg-teal-500) */
  bgSolid: string
  /** Background subtle (e.g., bg-teal-500/10) */
  bgSubtle: string
  /** Background heavy (e.g., bg-teal-500/20) */
  bgHeavy: string
  /** Border subtle (e.g., border-teal-500/20) */
  borderSubtle: string
  /** Border medium (e.g., border-teal-500/30) */
  borderMedium: string
  /** Border strong (e.g., border-teal-400) */
  borderStrong: string
  /** Ring focus (e.g., ring-teal-400/40) */
  ringFocus: string
  /** Ring color for selected states */
  ringColor: string
  /** Gradient from (e.g., from-teal-500) */
  from: string
  /** Gradient to (e.g., to-cyan-400) */
  to: string
  /** Gradient from subtle (e.g., from-teal-500/20) */
  fromSubtle: string
  /** Gradient to subtle (e.g., to-cyan-500/10) */
  toSubtle: string
  /** Shadow glow (e.g., shadow-teal-500/20) */
  shadowGlow: string
  /** Avatar fallback gradient from */
  avatarFrom: string
  /** Avatar fallback gradient to */
  avatarTo: string
  /** Avatar border (e.g., border-teal-500/20) */
  avatarBorder: string
  /** Online status dot */
  onlineBg: string
  /** Completed/success badge background */
  successBg: string
  /** Completed/success badge text */
  successText: string
  /** Completed/success badge border */
  successBorder: string
  /** Background surface (#0f1117 equivalent) */
  bgSurface: string
  /** Background surface deep (#0b0d11 equivalent) */
  bgSurfaceDeep: string
}

const VARIANT_ACCENTS: Record<UIVariant, VariantAccentClasses> = {
  chrona: {
    text: 'text-teal-400',
    textDim: 'text-teal-500',
    bgTint: 'bg-teal-500/15',
    bgSolid: 'bg-teal-500',
    bgSubtle: 'bg-teal-500/10',
    bgHeavy: 'bg-teal-500/20',
    borderSubtle: 'border-teal-500/20',
    borderMedium: 'border-teal-500/30',
    borderStrong: 'border-teal-400',
    ringFocus: 'ring-teal-400/40',
    ringColor: 'ring-teal-400',
    from: 'from-teal-500',
    to: 'to-cyan-400',
    fromSubtle: 'from-teal-500/20',
    toSubtle: 'to-cyan-500/10',
    shadowGlow: 'shadow-teal-500/20',
    avatarFrom: 'from-teal-500/40',
    avatarTo: 'to-cyan-500/50',
    avatarBorder: 'border-teal-500/20',
    onlineBg: 'bg-emerald-500',
    successBg: 'bg-emerald-500/10',
    successText: 'text-emerald-400',
    successBorder: 'border-emerald-500/20',
    bgSurface: 'bg-[#0f1117]',
    bgSurfaceDeep: 'bg-[#0b0d11]',
  },
  minimal: {
    text: 'text-slate-400',
    textDim: 'text-slate-500',
    bgTint: 'bg-slate-400/15',
    bgSolid: 'bg-slate-500',
    bgSubtle: 'bg-slate-400/10',
    bgHeavy: 'bg-slate-400/20',
    borderSubtle: 'border-slate-400/20',
    borderMedium: 'border-slate-400/30',
    borderStrong: 'border-slate-400',
    ringFocus: 'ring-slate-400/40',
    ringColor: 'ring-slate-400',
    from: 'from-slate-500',
    to: 'to-slate-400',
    fromSubtle: 'from-slate-500/20',
    toSubtle: 'to-slate-400/10',
    shadowGlow: 'shadow-slate-400/20',
    avatarFrom: 'from-slate-400/40',
    avatarTo: 'to-slate-500/50',
    avatarBorder: 'border-slate-400/20',
    onlineBg: 'bg-emerald-500',
    successBg: 'bg-emerald-500/10',
    successText: 'text-emerald-400',
    successBorder: 'border-emerald-500/20',
    bgSurface: 'bg-[#0e1014]',
    bgSurfaceDeep: 'bg-[#0c0d10]',
  },
  bold: {
    text: 'text-violet-400',
    textDim: 'text-violet-500',
    bgTint: 'bg-violet-500/15',
    bgSolid: 'bg-violet-500',
    bgSubtle: 'bg-violet-500/10',
    bgHeavy: 'bg-violet-500/20',
    borderSubtle: 'border-violet-500/20',
    borderMedium: 'border-violet-500/30',
    borderStrong: 'border-violet-400',
    ringFocus: 'ring-violet-400/40',
    ringColor: 'ring-violet-400',
    from: 'from-violet-500',
    to: 'to-rose-400',
    fromSubtle: 'from-violet-500/20',
    toSubtle: 'to-rose-500/10',
    shadowGlow: 'shadow-violet-500/20',
    avatarFrom: 'from-violet-500/40',
    avatarTo: 'to-rose-500/50',
    avatarBorder: 'border-violet-500/20',
    onlineBg: 'bg-emerald-400',
    successBg: 'bg-emerald-500/10',
    successText: 'text-emerald-400',
    successBorder: 'border-emerald-500/20',
    bgSurface: 'bg-[#0e0a18]',
    bgSurfaceDeep: 'bg-[#0a0812]',
  },
  elegant: {
    text: 'text-rose-400',
    textDim: 'text-rose-500',
    bgTint: 'bg-rose-500/15',
    bgSolid: 'bg-rose-500',
    bgSubtle: 'bg-rose-500/10',
    bgHeavy: 'bg-rose-500/20',
    borderSubtle: 'border-rose-500/20',
    borderMedium: 'border-rose-500/30',
    borderStrong: 'border-rose-400',
    ringFocus: 'ring-rose-400/40',
    ringColor: 'ring-rose-400',
    from: 'from-rose-500',
    to: 'to-amber-400',
    fromSubtle: 'from-rose-500/20',
    toSubtle: 'to-amber-500/10',
    shadowGlow: 'shadow-rose-500/20',
    avatarFrom: 'from-rose-500/40',
    avatarTo: 'to-amber-500/50',
    avatarBorder: 'border-rose-500/20',
    onlineBg: 'bg-emerald-400',
    successBg: 'bg-emerald-500/10',
    successText: 'text-emerald-400',
    successBorder: 'border-emerald-500/20',
    bgSurface: 'bg-[#120e0c]',
    bgSurfaceDeep: 'bg-[#0e0b09]',
  },
}

/**
 * Hook to get variant-specific accent color classes.
 * Returns an object with Tailwind class strings that change based on the active UI variant.
 * 
 * Usage:
 * ```tsx
 * const accent = useVariantAccent()
 * return <div className={`${accent.text} ${accent.bgTint}`}>Hello</div>
 * ```
 */
export function useVariantAccent(): VariantAccentClasses {
  const { variant } = useUIVariant()
  return VARIANT_ACCENTS[variant]
}

/**
 * Get variant accent classes without hook (for use outside components)
 */
export function getVariantAccent(variant: UIVariant): VariantAccentClasses {
  return VARIANT_ACCENTS[variant]
}

/**
 * Pre-defined common class combinations for quick use
 */
export function useVariantCombo() {
  const accent = useVariantAccent()
  
  return {
    accent,
    /** Active nav/item: tinted background + accent text */
    activeItem: `${accent.bgSubtle} ${accent.text}`,
    /** Accent icon style */
    icon: accent.text,
    /** Accent badge: subtle bg + text + border */
    badge: `${accent.bgSubtle} ${accent.text} ${accent.borderSubtle}`,
    /** Avatar with variant border */
    avatarBordered: accent.avatarBorder,
    /** Avatar fallback gradient */
    avatarFallback: `bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo}`,
    /** Selected/active button */
    selectedButton: `${accent.bgHeavy} ${accent.text} ${accent.borderMedium}`,
    /** Accent gradient text */
    gradientText: `bg-gradient-to-r ${accent.from} ${accent.to} bg-clip-text text-transparent`,
    /** Surface background (replaces #0f1117) */
    surface: accent.bgSurface,
    /** Deep surface background (replaces #0b0d11) */
    surfaceDeep: accent.bgSurfaceDeep,
    /** Glow shadow */
    glow: `shadow-[0_0_20px_hsl(var(--primary)/0.1)]`,
  }
}
