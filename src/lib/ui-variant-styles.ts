'use client'

import { useUIVariant, type UIVariant } from '@/stores/ui-variant-store'

/**
 * Variant-specific Tailwind class mappings.
 * Each layout variant maps to a different color palette:
 * - chrona: teal/cyan (default sidebar layout)
 * - chrona-v2: violet/fuchsia (glassmorphic floating dock layout)
 * - chrona-v3: rose/pink (zen centered layout)
 */

export interface VariantAccentClasses {
  text: string
  textDim: string
  bgTint: string
  bgSolid: string
  bgSubtle: string
  bgHeavy: string
  borderSubtle: string
  borderMedium: string
  borderStrong: string
  ringFocus: string
  ringColor: string
  from: string
  to: string
  fromSubtle: string
  toSubtle: string
  shadowGlow: string
  avatarFrom: string
  avatarTo: string
  avatarBorder: string
  onlineBg: string
  successBg: string
  successText: string
  successBorder: string
  bgSurface: string
  bgSurfaceDeep: string
}

const VARIANT_ACCENTS: Record<UIVariant, VariantAccentClasses> = {
  chrona: {
    text: 'text-primary',
    textDim: 'text-primary/70',
    bgTint: 'bg-primary/15',
    bgSolid: 'bg-primary',
    bgSubtle: 'bg-primary/10',
    bgHeavy: 'bg-primary/20',
    borderSubtle: 'border-primary/20',
    borderMedium: 'border-primary/30',
    borderStrong: 'border-primary',
    ringFocus: 'ring-primary/40',
    ringColor: 'ring-primary',
    from: 'from-teal-500',
    to: 'to-cyan-400',
    fromSubtle: 'from-teal-500/20',
    toSubtle: 'to-cyan-500/10',
    shadowGlow: 'shadow-primary/20',
    avatarFrom: 'from-primary/40',
    avatarTo: 'to-primary/50',
    avatarBorder: 'border-primary/20',
    onlineBg: 'bg-emerald-500',
    successBg: 'bg-emerald-500/10',
    successText: 'text-emerald-400',
    successBorder: 'border-emerald-500/20',
    bgSurface: 'bg-card',
    bgSurfaceDeep: 'bg-background',
  },
  'chrona-v2': {
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
    to: 'to-fuchsia-400',
    fromSubtle: 'from-violet-500/20',
    toSubtle: 'to-fuchsia-500/10',
    shadowGlow: 'shadow-violet-500/20',
    avatarFrom: 'from-violet-500/40',
    avatarTo: 'to-fuchsia-500/50',
    avatarBorder: 'border-violet-500/20',
    onlineBg: 'bg-emerald-500',
    successBg: 'bg-emerald-500/10',
    successText: 'text-emerald-400',
    successBorder: 'border-emerald-500/20',
    bgSurface: 'bg-[#16141e]',
    bgSurfaceDeep: 'bg-[#0f0e14]',
  },
  'chrona-v3': {
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
    to: 'to-fuchsia-400',
    fromSubtle: 'from-rose-500/20',
    toSubtle: 'to-fuchsia-500/10',
    shadowGlow: 'shadow-rose-500/20',
    avatarFrom: 'from-rose-500/40',
    avatarTo: 'to-fuchsia-500/50',
    avatarBorder: 'border-rose-500/20',
    onlineBg: 'bg-emerald-500',
    successBg: 'bg-emerald-500/10',
    successText: 'text-emerald-400',
    successBorder: 'border-emerald-500/20',
    bgSurface: 'bg-[#161216]',
    bgSurfaceDeep: 'bg-[#100d11]',
  },
}

export function useVariantAccent(): VariantAccentClasses {
  const { variant } = useUIVariant()
  return VARIANT_ACCENTS[variant]
}

export function getVariantAccent(variant: UIVariant): VariantAccentClasses {
  return VARIANT_ACCENTS[variant]
}

export function useVariantCombo() {
  const accent = useVariantAccent()

  return {
    accent,
    activeItem: `${accent.bgSubtle} ${accent.text}`,
    icon: accent.text,
    badge: `${accent.bgSubtle} ${accent.text} ${accent.borderSubtle}`,
    avatarBordered: accent.avatarBorder,
    avatarFallback: `bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo}`,
    selectedButton: `${accent.bgHeavy} ${accent.text} ${accent.borderMedium}`,
    gradientText: `bg-gradient-to-r ${accent.from} ${accent.to} bg-clip-text text-transparent`,
    surface: accent.bgSurface,
    surfaceDeep: accent.bgSurfaceDeep,
    glow: `shadow-[0_0_20px_hsl(var(--primary)/0.1)]`,
  }
}
