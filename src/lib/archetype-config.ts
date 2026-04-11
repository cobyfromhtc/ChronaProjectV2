// ─── Centralized Archetype Configuration ─────────────────────────────────────
// Single source of truth for all archetype visual mappings.
// Used by: persona-card, marketplace-page, discover-page, persona-mood-board, persona-dna-sigil

import {
  Globe, Crown, Shield, Eye, Zap, Heart, Star,
  Sparkles, User, MessageSquare, BookOpen, Flame,
  Layers, Swords, Brain, Gem, Snowflake, Sun,
  Hurricane, Fist, Lock, Candle, Moon, Ghost,
  Trophy, Scroll, Bandage, ShieldCheck, City,
  Joker, Flame as Flame2, Lotus, Love, Skull,
  HeroStar, Care, Compass, Palette, Scepter
} from 'lucide-react'

// ─── Archetype Emoji + Tailwind Colors (Marketplace) ─────────────────────────

export const ARCHETYPE_EMOJI_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  'All': { icon: '✨', color: 'text-gray-300', bgColor: 'bg-white/10' },
  'Morally Grey': { icon: '⚖️', color: 'text-gray-300', bgColor: 'bg-gray-500/30' },
  'Dominant': { icon: '🖤', color: 'text-purple-300', bgColor: 'bg-purple-500/30' },
  'Protective': { icon: '🛡️', color: 'text-blue-300', bgColor: 'bg-blue-500/30' },
  'Cold & Distant': { icon: '🧊', color: 'text-sky-300', bgColor: 'bg-sky-500/30' },
  'Obsessive': { icon: '👁️', color: 'text-red-300', bgColor: 'bg-red-500/30' },
  'Brooding': { icon: '🌑', color: 'text-slate-300', bgColor: 'bg-slate-500/30' },
  'Flirtatious': { icon: '😏', color: 'text-pink-300', bgColor: 'bg-pink-500/30' },
  'Tsundere': { icon: '💢', color: 'text-orange-300', bgColor: 'bg-orange-500/30' },
  'Yandere': { icon: '🩸', color: 'text-red-400', bgColor: 'bg-red-600/30' },
  'Kuudere': { icon: '🧊', color: 'text-cyan-300', bgColor: 'bg-cyan-500/30' },
  'Mysterious': { icon: '🌫️', color: 'text-violet-300', bgColor: 'bg-violet-500/30' },
  'Wholesome': { icon: '🌻', color: 'text-yellow-300', bgColor: 'bg-yellow-500/30' },
  'Chaotic': { icon: '🌀', color: 'text-amber-300', bgColor: 'bg-amber-500/30' },
  'Defiant': { icon: '✊', color: 'text-orange-400', bgColor: 'bg-orange-600/30' },
  'Possessive': { icon: '⛓️', color: 'text-rose-300', bgColor: 'bg-rose-500/30' },
  'Devoted': { icon: '🕯️', color: 'text-amber-200', bgColor: 'bg-amber-400/20' },
  'Dark & Gritty': { icon: '🖤', color: 'text-gray-400', bgColor: 'bg-gray-700/40' },
  'Supernatural': { icon: '👻', color: 'text-indigo-300', bgColor: 'bg-indigo-500/30' },
  'Royalty': { icon: '👑', color: 'text-yellow-400', bgColor: 'bg-yellow-500/30' },
  'Warrior': { icon: '🗡️', color: 'text-red-300', bgColor: 'bg-red-500/30' },
  'Scholar': { icon: '📖', color: 'text-indigo-300', bgColor: 'bg-indigo-400/30' },
  'Trauma-Coded': { icon: '🩹', color: 'text-rose-200', bgColor: 'bg-rose-400/20' },
  'Protector': { icon: '🛡️', color: 'text-blue-400', bgColor: 'bg-blue-500/30' },
  'Street-Smart': { icon: '🏙️', color: 'text-zinc-300', bgColor: 'bg-zinc-500/30' },
  'Trickster': { icon: '🃏', color: 'text-amber-300', bgColor: 'bg-amber-500/30' },
  'Rebel': { icon: '🔥', color: 'text-orange-400', bgColor: 'bg-orange-600/30' },
  'Sage': { icon: '📚', color: 'text-violet-300', bgColor: 'bg-violet-500/30' },
  'Lover': { icon: '💕', color: 'text-pink-300', bgColor: 'bg-pink-500/30' },
  'Villain': { icon: '💀', color: 'text-red-400', bgColor: 'bg-red-500/30' },
  'Hero': { icon: '⚔️', color: 'text-blue-400', bgColor: 'bg-blue-500/30' },
  'Antihero': { icon: '🦹', color: 'text-gray-400', bgColor: 'bg-gray-500/30' },
  'Caregiver': { icon: '💝', color: 'text-pink-300', bgColor: 'bg-pink-500/30' },
  'Explorer': { icon: '🗺️', color: 'text-emerald-300', bgColor: 'bg-emerald-500/30' },
  'Creator': { icon: '🎨', color: 'text-cyan-300', bgColor: 'bg-cyan-500/30' },
  'Ruler': { icon: '👑', color: 'text-yellow-400', bgColor: 'bg-yellow-500/30' },
  'Other': { icon: '📖', color: 'text-gray-300', bgColor: 'bg-gray-500/30' },
}

// ─── Archetype Lucide Icon + Gradient (Persona Card) ─────────────────────────

export const ARCHETYPE_ICON_CONFIG: Record<string, { icon: any; color: string; gradient: string; bg: string }> = {
  'Morally Grey': { icon: Globe, color: 'text-gray-300', gradient: 'from-gray-500 to-zinc-500', bg: 'from-gray-500/30 to-zinc-500/20' },
  'Dominant': { icon: Crown, color: 'text-purple-300', gradient: 'from-purple-600 to-violet-600', bg: 'from-purple-600/30 to-violet-600/20' },
  'Protective': { icon: Shield, color: 'text-blue-300', gradient: 'from-blue-500 to-sky-500', bg: 'from-blue-500/30 to-sky-500/20' },
  'Cold & Distant': { icon: Eye, color: 'text-sky-300', gradient: 'from-sky-400 to-cyan-400', bg: 'from-sky-400/30 to-cyan-400/20' },
  'Obsessive': { icon: Zap, color: 'text-red-300', gradient: 'from-red-600 to-rose-700', bg: 'from-red-600/30 to-rose-700/20' },
  'Brooding': { icon: Globe, color: 'text-slate-300', gradient: 'from-slate-600 to-gray-700', bg: 'from-slate-600/30 to-gray-700/20' },
  'Flirtatious': { icon: Heart, color: 'text-pink-300', gradient: 'from-pink-400 to-rose-400', bg: 'from-pink-400/30 to-rose-400/20' },
  'Tsundere': { icon: Zap, color: 'text-orange-300', gradient: 'from-orange-400 to-amber-400', bg: 'from-orange-400/30 to-amber-400/20' },
  'Yandere': { icon: Zap, color: 'text-red-400', gradient: 'from-red-700 to-rose-800', bg: 'from-red-700/30 to-rose-800/20' },
  'Kuudere': { icon: Eye, color: 'text-cyan-300', gradient: 'from-cyan-400 to-sky-400', bg: 'from-cyan-400/30 to-sky-400/20' },
  'Mysterious': { icon: Globe, color: 'text-violet-300', gradient: 'from-violet-500 to-purple-600', bg: 'from-violet-500/30 to-purple-600/20' },
  'Wholesome': { icon: Star, color: 'text-yellow-300', gradient: 'from-yellow-400 to-amber-300', bg: 'from-yellow-400/30 to-amber-300/20' },
  'Chaotic': { icon: Zap, color: 'text-amber-300', gradient: 'from-amber-500 to-orange-500', bg: 'from-amber-500/30 to-orange-500/20' },
  'Defiant': { icon: Zap, color: 'text-orange-400', gradient: 'from-orange-600 to-red-500', bg: 'from-orange-600/30 to-red-500/20' },
  'Possessive': { icon: Heart, color: 'text-rose-300', gradient: 'from-rose-500 to-red-500', bg: 'from-rose-500/30 to-red-500/20' },
  'Devoted': { icon: Heart, color: 'text-amber-200', gradient: 'from-amber-300 to-yellow-200', bg: 'from-amber-300/30 to-yellow-200/20' },
  'Dark & Gritty': { icon: Globe, color: 'text-gray-400', gradient: 'from-gray-800 to-zinc-800', bg: 'from-gray-800/30 to-zinc-800/20' },
  'Supernatural': { icon: Sparkles, color: 'text-indigo-300', gradient: 'from-indigo-500 to-violet-600', bg: 'from-indigo-500/30 to-violet-600/20' },
  'Royalty': { icon: Crown, color: 'text-yellow-400', gradient: 'from-yellow-500 to-amber-500', bg: 'from-yellow-500/30 to-amber-500/20' },
  'Warrior': { icon: Zap, color: 'text-red-300', gradient: 'from-red-500 to-orange-600', bg: 'from-red-500/30 to-orange-600/20' },
  'Scholar': { icon: Eye, color: 'text-indigo-300', gradient: 'from-indigo-400 to-blue-500', bg: 'from-indigo-400/30 to-blue-500/20' },
  'Trauma-Coded': { icon: Heart, color: 'text-rose-200', gradient: 'from-rose-300 to-pink-400', bg: 'from-rose-300/30 to-pink-400/20' },
  'Protector': { icon: Shield, color: 'text-blue-400', gradient: 'from-blue-400 to-indigo-400', bg: 'from-blue-400/30 to-indigo-400/20' },
  'Street-Smart': { icon: Globe, color: 'text-zinc-300', gradient: 'from-zinc-500 to-gray-600', bg: 'from-zinc-500/30 to-gray-600/20' },
  'Trickster': { icon: Sparkles, color: 'text-amber-400', gradient: 'from-amber-500 to-violet-500', bg: 'from-amber-500/30 to-violet-500/20' },
  'Rebel': { icon: Zap, color: 'text-orange-400', gradient: 'from-red-600 to-orange-600', bg: 'from-red-600/30 to-orange-600/20' },
  'Sage': { icon: Eye, color: 'text-indigo-400', gradient: 'from-violet-500 to-gray-500', bg: 'from-violet-500/30 to-gray-500/20' },
  'Lover': { icon: Heart, color: 'text-pink-400', gradient: 'from-pink-500 to-rose-500', bg: 'from-pink-500/30 to-rose-500/20' },
  'Villain': { icon: Zap, color: 'text-red-400', gradient: 'from-red-500 to-rose-500', bg: 'from-red-500/30 to-rose-500/20' },
  'Hero': { icon: Crown, color: 'text-blue-400', gradient: 'from-amber-500 to-orange-500', bg: 'from-amber-500/30 to-orange-500/20' },
  'Antihero': { icon: Globe, color: 'text-gray-400', gradient: 'from-gray-500 to-slate-500', bg: 'from-gray-500/30 to-slate-500/20' },
  'Caregiver': { icon: Heart, color: 'text-rose-400', gradient: 'from-teal-500 to-cyan-500', bg: 'from-teal-500/30 to-cyan-500/20' },
  'Explorer': { icon: Eye, color: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-500', bg: 'from-emerald-500/30 to-teal-500/20' },
  'Creator': { icon: Sparkles, color: 'text-cyan-400', gradient: 'from-indigo-500 to-gray-500', bg: 'from-indigo-500/30 to-gray-500/20' },
  'Ruler': { icon: Crown, color: 'text-yellow-400', gradient: 'from-yellow-500 to-amber-500', bg: 'from-yellow-500/30 to-amber-500/20' },
  'Other': { icon: User, color: 'text-gray-400', gradient: 'from-gray-500 to-gray-400', bg: 'from-gray-500/10 to-gray-400/10' },
}

// Default fallback
export const ARCHETYPE_DEFAULT = { icon: User, color: 'text-white', gradient: 'from-gray-500 to-gray-400', bg: 'from-gray-500/10 to-gray-400/10' }

// ─── Archetype Gradient Colors (Discover Page) ───────────────────────────────

export const ARCHETYPE_GRADIENT_COLORS: Record<string, string> = {
  'Morally Grey': 'from-gray-500/20 to-zinc-500/20 border-gray-500/30',
  'Dominant': 'from-purple-600/20 to-violet-600/20 border-purple-500/30',
  'Protective': 'from-blue-500/20 to-sky-500/20 border-blue-500/30',
  'Cold & Distant': 'from-sky-400/20 to-cyan-400/20 border-sky-400/30',
  'Obsessive': 'from-red-600/20 to-rose-700/20 border-red-600/30',
  'Brooding': 'from-slate-600/20 to-gray-700/20 border-slate-500/30',
  'Flirtatious': 'from-pink-400/20 to-rose-400/20 border-pink-400/30',
  'Tsundere': 'from-orange-400/20 to-amber-400/20 border-orange-400/30',
  'Yandere': 'from-red-700/20 to-rose-800/20 border-red-700/30',
  'Kuudere': 'from-cyan-400/20 to-sky-400/20 border-cyan-400/30',
  'Mysterious': 'from-violet-500/20 to-purple-600/20 border-violet-500/30',
  'Wholesome': 'from-yellow-400/20 to-amber-300/20 border-yellow-400/30',
  'Chaotic': 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  'Defiant': 'from-orange-600/20 to-red-500/20 border-orange-600/30',
  'Possessive': 'from-rose-500/20 to-red-500/20 border-rose-500/30',
  'Devoted': 'from-amber-300/20 to-yellow-200/20 border-amber-300/30',
  'Dark & Gritty': 'from-gray-800/20 to-zinc-800/20 border-gray-700/30',
  'Supernatural': 'from-indigo-500/20 to-violet-600/20 border-indigo-500/30',
  'Royalty': 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  'Warrior': 'from-red-500/20 to-orange-600/20 border-red-500/30',
  'Scholar': 'from-indigo-400/20 to-blue-500/20 border-indigo-400/30',
  'Trauma-Coded': 'from-rose-300/20 to-pink-400/20 border-rose-300/30',
  'Protector': 'from-blue-400/20 to-indigo-400/20 border-blue-400/30',
  'Street-Smart': 'from-zinc-500/20 to-gray-600/20 border-zinc-500/30',
  'Hero': 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  'Villain': 'from-red-500/20 to-rose-500/20 border-red-500/30',
  'Antihero': 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
  'Trickster': 'from-gray-500/20 to-violet-500/20 border-white/20',
  'Lover': 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
  'Rebel': 'from-red-600/20 to-orange-600/20 border-red-600/30',
  'Creator': 'from-indigo-500/20 to-gray-500/20 border-white/20',
  'Caregiver': 'from-teal-500/20 to-cyan-500/20 border-teal-500/30',
  'Explorer': 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
  'Sage': 'from-violet-500/20 to-gray-500/20 border-white/20',
  'Ruler': 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  'Other': 'from-gray-500/20 to-gray-400/20 border-gray-500/30',
}

// ─── Archetype Hex Colors (DNA Sigil) ────────────────────────────────────────

export const ARCHETYPE_HEX_COLORS: Record<string, string> = {
  'Morally Grey': '#9ca3af',
  'Dominant': '#a78bfa',
  'Protective': '#60a5fa',
  'Cold & Distant': '#38bdf8',
  'Obsessive': '#f87171',
  'Brooding': '#94a3b8',
  'Flirtatious': '#f472b6',
  'Tsundere': '#fb923c',
  'Yandere': '#dc2626',
  'Kuudere': '#22d3ee',
  'Mysterious': '#8b5cf6',
  'Wholesome': '#fbbf24',
  'Chaotic': '#f59e0b',
  'Defiant': '#ea580c',
  'Possessive': '#fb7185',
  'Devoted': '#d97706',
  'Dark & Gritty': '#6b7280',
  'Supernatural': '#818cf8',
  'Royalty': '#eab308',
  'Warrior': '#ef4444',
  'Scholar': '#818cf8',
  'Trauma-Coded': '#fda4af',
  'Protector': '#60a5fa',
  'Street-Smart': '#a1a1aa',
  'Trickster': '#f59e0b',
  'Rebel': '#f97316',
  'Sage': '#a78bfa',
  'Lover': '#ec4899',
  'Villain': '#ef4444',
  'Hero': '#3b82f6',
  'Antihero': '#9ca3af',
  'Caregiver': '#f472b6',
  'Explorer': '#34d399',
  'Creator': '#22d3ee',
  'Ruler': '#eab308',
  'Other': '#9ca3af',
}

export const ARCHETYPE_DEFAULT_HEX = '#6b7280'

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getArchetypeIconConfig(archetype: string | null | undefined) {
  if (!archetype) return ARCHETYPE_DEFAULT
  return ARCHETYPE_ICON_CONFIG[archetype] || ARCHETYPE_DEFAULT
}

export function getArchetypeGradientColor(archetype: string | null | undefined): string {
  if (!archetype) return 'from-white/10 to-white/5 border-white/10'
  return ARCHETYPE_GRADIENT_COLORS[archetype] || 'from-white/10 to-white/5 border-white/10'
}

export function getArchetypeHexColor(archetype: string | null | undefined): string {
  if (!archetype) return ARCHETYPE_DEFAULT_HEX
  return ARCHETYPE_HEX_COLORS[archetype] || ARCHETYPE_DEFAULT_HEX
}

export function getArchetypeEmojiConfig(archetype: string | null | undefined) {
  if (!archetype) return ARCHETYPE_EMOJI_CONFIG['Other']
  return ARCHETYPE_EMOJI_CONFIG[archetype] || ARCHETYPE_EMOJI_CONFIG['Other']
}
