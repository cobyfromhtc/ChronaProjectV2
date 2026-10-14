// =============================================
// Shared Scenario Constants & Utilities
// =============================================

// Category colors for badges
export const CATEGORY_COLORS: Record<string, string> = {
  romance: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  drama: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  fantasy: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'sci-fi': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  horror: 'bg-red-500/20 text-red-300 border-red-500/30',
  mystery: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  comedy: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  adventure: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'slice-of-life': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  thriller: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  supernatural: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  historical: 'bg-stone-500/20 text-stone-300 border-stone-500/30',
  other: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
}

// Category gradient map for fallback banners
export const CATEGORY_GRADIENTS: Record<string, string> = {
  romance: 'from-pink-600/40 via-rose-600/20 to-pink-800/30',
  drama: 'from-violet-600/40 via-purple-600/20 to-violet-800/30',
  fantasy: 'from-purple-600/40 via-fuchsia-600/20 to-purple-800/30',
  'sci-fi': 'from-cyan-600/40 via-blue-600/20 to-cyan-800/30',
  horror: 'from-red-600/40 via-rose-700/20 to-red-900/30',
  mystery: 'from-amber-600/40 via-yellow-600/20 to-amber-800/30',
  comedy: 'from-yellow-500/40 via-amber-500/20 to-yellow-700/30',
  adventure: 'from-teal-600/40 via-emerald-500/20 to-teal-800/30',
  'slice-of-life': 'from-emerald-600/40 via-green-500/20 to-emerald-800/30',
  thriller: 'from-slate-600/40 via-gray-600/20 to-slate-800/30',
  supernatural: 'from-indigo-600/40 via-violet-500/20 to-indigo-800/30',
  historical: 'from-stone-600/40 via-amber-700/20 to-stone-800/30',
  other: 'from-gray-600/40 via-slate-500/20 to-gray-800/30',
}

// Category icons (emoji map for small badges)
export const CATEGORY_ICONS: Record<string, string> = {
  romance: '💕',
  drama: '🎭',
  fantasy: '🧙',
  'sci-fi': '🚀',
  horror: '👻',
  mystery: '🔍',
  comedy: '😂',
  adventure: '🗺️',
  'slice-of-life': '🌸',
  thriller: '😱',
  supernatural: '✨',
  historical: '📜',
  other: '📖',
}

// Mood emojis
export const MOOD_EMOJIS: Record<string, string> = {
  playful: '😄',
  intense: '🔥',
  mysterious: '🌙',
  romantic: '💕',
  dark: '🌑',
  wholesome: '🌸',
  chaotic: '⚡',
  melancholic: '🌧️',
}

// Content rating config
export const RATING_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  safe: { label: 'Safe', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: '🟢' },
  moderate: { label: 'Moderate', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: '🟡' },
  mature: { label: 'Mature', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: '🔴' },
  explicit: { label: 'Explicit', color: 'bg-red-600/20 text-red-300 border-red-600/30', icon: '⛔' },
}

// Format large numbers compactly (e.g., 1.2k, 3.5M)
export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

// Format a date string as a human-readable time ago
export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

// Check if a scenario was created recently (within 24 hours)
export function isNewScenario(createdAt: string): boolean {
  const date = new Date(createdAt)
  const now = new Date()
  return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000
}
