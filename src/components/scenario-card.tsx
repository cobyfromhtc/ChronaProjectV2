'use client'

import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Eye, MessageSquare, Heart, Lock, Sparkles } from 'lucide-react'
import { useVariantAccent } from '@/lib/ui-variant-styles'
import {
  CATEGORY_COLORS,
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  MOOD_EMOJIS,
  formatCount,
  formatTimeAgo,
  isNewScenario,
} from '@/lib/scenario-constants'

interface ScenarioCardProps {
  scenario: {
    id: string
    title: string
    description: string | null
    imageUrl: string | null
    bannerUrl: string | null
    category: string
    mood: string | null
    tags: string[]
    viewCount: number
    chatCount: number
    likeCount: number
    createdAt: string
    contentRating?: string
    isFeatured?: boolean
    persona: { name: string; avatarUrl: string | null; mbtiType: string | null; archetype: string | null; gender: string | null }
    creatorId: string
    creator: { username: string; avatarUrl: string | null }
    isLiked?: boolean
  }
  onClick: (id: string) => void
  onLike?: (id: string) => void
  isMinor?: boolean
}

export const ScenarioCard = React.memo(function ScenarioCard({ scenario, onClick, onLike, isMinor }: ScenarioCardProps) {
  const accent = useVariantAccent()
  const [bannerError, setBannerError] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [likeAnim, setLikeAnim] = useState(false)

  const gradient = CATEGORY_GRADIENTS[scenario.category] || CATEGORY_GRADIENTS.other
  const categoryColor = CATEGORY_COLORS[scenario.category] || CATEGORY_COLORS.other
  const moodEmoji = scenario.mood ? MOOD_EMOJIS[scenario.mood.toLowerCase()] || '✨' : null
  const isNew = isNewScenario(scenario.createdAt)

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLike?.(scenario.id)
    if (!scenario.isLiked) {
      setLikeAnim(true)
      setTimeout(() => setLikeAnim(false), 400)
    }
  }

  return (
    <div
      className="relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-300 group border-white/[0.08] hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/10 bg-[#0d0f14] hover:-translate-y-0.5"
      onClick={() => onClick(scenario.id)}
    >
      {/* Border glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(20,184,166,0.15), 0 0 20px rgba(20,184,166,0.06)' }} />

      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Banner Area */}
      <div className="h-28 relative overflow-hidden">
        {scenario.bannerUrl && !bannerError ? (
          <>
            <img
              src={scenario.bannerUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setBannerError(true)}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-[#0d0f14]/40 to-transparent" />
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-transparent to-transparent" />
            {/* Decorative floating orbs */}
            <div className="absolute top-2 right-8 w-14 h-14 rounded-full bg-white/5 blur-xl transition-transform duration-700 group-hover:translate-x-2 group-hover:-translate-y-1" />
            <div className="absolute bottom-1 left-10 w-10 h-10 rounded-full bg-white/5 blur-lg transition-transform duration-700 group-hover:-translate-x-2 group-hover:translate-y-1" />
            <div className="absolute top-6 left-1/2 w-8 h-8 rounded-full bg-white/[0.03] blur-md transition-transform duration-700 group-hover:translate-x-4 group-hover:translate-y-2" />
          </div>
        )}

        {/* Hover shimmer overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-[shimmer-slide_2s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
        </div>

        {/* Featured shimmer animation */}
        {scenario.isFeatured && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/[0.06] to-transparent" style={{ backgroundSize: '200% 100%', animation: 'featured-shimmer 3s ease-in-out infinite' }} />
          </div>
        )}

        {/* Category badge (top-right) */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {(scenario.contentRating === 'mature' || scenario.contentRating === 'explicit') && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-0.5 ${
              scenario.contentRating === 'explicit'
                ? 'bg-red-600/30 text-red-300 border-red-500/40'
                : 'bg-red-500/20 text-red-300 border-red-500/30'
            }`}>
              <Lock className="w-2.5 h-2.5" />
              18+
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border backdrop-blur-sm flex items-center gap-1 ${categoryColor}`}>
            <span className="text-[9px]">{CATEGORY_ICONS[scenario.category] || '📖'}</span>
            {scenario.category.charAt(0).toUpperCase() + scenario.category.slice(1).replace('-', ' ')}
          </span>
        </div>

        {/* New badge (top-left) */}
        {isNew && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/30 backdrop-blur-sm">
            <Sparkles className="w-2.5 h-2.5 text-teal-300" />
            <span className="text-[9px] font-medium text-teal-300">New</span>
          </div>
        )}

        {/* Mood emoji */}
        {moodEmoji && !isNew && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-sm">
            {moodEmoji}
          </div>
        )}

        {/* Featured badge */}
        {scenario.isFeatured && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
            <span className="text-[9px] font-medium text-amber-300">Featured</span>
          </div>
        )}

        {/* Avatar (bottom-left, overlapping) */}
        <div className="absolute -bottom-5 left-3 z-10">
          <Avatar className={`w-10 h-10 border-2 border-[#0d0f14] shadow-lg transition-transform duration-300 group-hover:scale-110`}>
            {!avatarError ? (
              <AvatarImage src={scenario.imageUrl || scenario.persona.avatarUrl || undefined} onError={() => setAvatarError(true)} />
            ) : null}
            <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-sm font-semibold`}>
              {scenario.persona.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pt-7 pb-3">
        {/* Persona name */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-medium ${accent.text} truncate`}>
            {scenario.persona.name}
          </span>
          {scenario.persona.mbtiType && (
            <span className="px-1 py-0 rounded text-[8px] bg-fuchsia-500/15 text-fuchsia-300/80 border border-fuchsia-500/20 flex-shrink-0">
              {scenario.persona.mbtiType}
            </span>
          )}
          {scenario.persona.archetype && (
            <span className="px-1 py-0 rounded text-[8px] bg-teal-500/15 text-teal-300/80 border border-teal-500/20 flex-shrink-0 hidden sm:inline">
              {scenario.persona.archetype}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-tight mb-1.5">
          {scenario.title}
        </h3>

        {/* Description */}
        {scenario.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">
            {scenario.description}
          </p>
        )}

        {/* Tags */}
        {scenario.tags && scenario.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {scenario.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.05] text-slate-400/80 border border-white/[0.06] hover:bg-white/[0.08] transition-colors">
                {tag}
              </span>
            ))}
            {scenario.tags.length > 2 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.05] text-slate-500">
                +{scenario.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Bottom stats row */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 text-[10px] text-slate-500">
            <span className="flex items-center gap-0.5 hover:text-slate-300 transition-colors" title="Views">
              <Eye className="w-3 h-3" />
              {formatCount(scenario.viewCount)}
            </span>
            <span className="flex items-center gap-0.5 hover:text-slate-300 transition-colors" title="Chats">
              <MessageSquare className="w-3 h-3" />
              {formatCount(scenario.chatCount)}
            </span>
            <button
              className={`flex items-center gap-0.5 cursor-pointer transition-all hover:text-rose-400 p-0.5 -m-0.5 ${
                scenario.isLiked ? 'text-rose-400' : ''
              } ${likeAnim ? 'scale-125' : 'scale-100'}`}
              style={{ transition: 'transform 0.15s ease, color 0.15s ease' }}
              onClick={handleLikeClick}
            >
              <Heart className={`w-3 h-3 transition-transform ${scenario.isLiked ? 'fill-current' : ''} ${likeAnim ? 'scale-125' : ''}`} />
              {formatCount(scenario.likeCount)}
            </button>
            <span className="text-slate-600">·</span>
            <span className="text-[9px] text-slate-600" title={new Date(scenario.createdAt).toLocaleDateString()}>
              {formatTimeAgo(scenario.createdAt)}
            </span>
          </div>

          {/* Creator */}
          <div
            className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
            onClick={(e) => {
              e.stopPropagation()
              window.dispatchEvent(new CustomEvent('chrona:open-user-profile', { detail: { userId: scenario.creatorId } }))
            }}
          >
            <Avatar className="w-3.5 h-3.5 flex-shrink-0">
              <AvatarImage src={scenario.creator.avatarUrl || undefined} />
              <AvatarFallback className="text-[6px] bg-slate-700 text-slate-300">
                {scenario.creator.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-slate-500 hover:text-teal-300 transition-colors truncate max-w-[80px]">
              @{scenario.creator.username}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})
