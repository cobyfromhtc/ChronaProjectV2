'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Star, Zap, Crown, Lock, Globe, TrendingUp, Clock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StorylineServer {
  id: string
  name: string
  description: string
  coverImage?: string | null
  iconImage?: string | null
  bannerUrl?: string | null
  iconUrl?: string | null
  genre: string
  category?: string
  tags: string
  memberCount: number
  rating: number
  reviewCount: number
  createdAt?: string
  longDescription?: string | null
  isPublic?: boolean
  boostTier?: number
  boostChronos?: number
  owner?: {
    id: string
    name?: string | null
    username?: string | null
    avatar?: string | null
    avatarUrl?: string | null
  }
  _count?: {
    members?: number
    memberships?: number
    reviews?: number
  }
  isMember?: boolean
  members?: Array<{ userId: string }>
}

interface StorylineServerCardProps {
  server: StorylineServer
  onClick?: () => void
  variant?: 'default' | 'compact' | 'featured'
}

const categoryColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  'Fantasy': { 
    bg: 'bg-white/10', 
    text: 'text-gray-300', 
    border: 'border-white/20',
    gradient: 'from-gray-600/30 via-gray-300/20 to-white/30'
  },
  'Sci-Fi': { 
    bg: 'bg-cyan-500/20', 
    text: 'text-cyan-300', 
    border: 'border-cyan-500/30',
    gradient: 'from-cyan-600/30 via-blue-500/20 to-cyan-600/30'
  },
  'Horror': { 
    bg: 'bg-red-500/20', 
    text: 'text-red-300', 
    border: 'border-red-500/30',
    gradient: 'from-red-600/30 via-rose-500/20 to-red-600/30'
  },
  'Romance': { 
    bg: 'bg-pink-500/20', 
    text: 'text-pink-300', 
    border: 'border-pink-500/30',
    gradient: 'from-pink-600/30 via-rose-500/20 to-pink-600/30'
  },
  'Mystery': { 
    bg: 'bg-amber-500/20', 
    text: 'text-amber-300', 
    border: 'border-amber-500/30',
    gradient: 'from-amber-600/30 via-yellow-500/20 to-amber-600/30'
  },
  'Adventure': { 
    bg: 'bg-emerald-500/20', 
    text: 'text-emerald-300', 
    border: 'border-emerald-500/30',
    gradient: 'from-emerald-600/30 via-green-500/20 to-emerald-600/30'
  },
  'Drama': { 
    bg: 'bg-white/10', 
    text: 'text-gray-300', 
    border: 'border-white/20',
    gradient: 'from-gray-500/30 via-gray-400/20 to-white/30'
  },
  'Action': { 
    bg: 'bg-orange-500/20', 
    text: 'text-orange-300', 
    border: 'border-orange-500/30',
    gradient: 'from-orange-600/30 via-amber-500/20 to-orange-600/30'
  },
  'Comedy': { 
    bg: 'bg-yellow-500/20', 
    text: 'text-yellow-300', 
    border: 'border-yellow-500/30',
    gradient: 'from-yellow-600/30 via-amber-400/20 to-yellow-600/30'
  },
  'Slice of Life': { 
    bg: 'bg-rose-500/20', 
    text: 'text-rose-300', 
    border: 'border-rose-500/30',
    gradient: 'from-rose-500/30 via-pink-400/20 to-rose-500/30'
  },
  'Thriller': { 
    bg: 'bg-slate-500/20', 
    text: 'text-slate-300', 
    border: 'border-slate-500/30',
    gradient: 'from-slate-600/30 via-gray-500/20 to-slate-600/30'
  },
  'Historical': { 
    bg: 'bg-stone-500/20', 
    text: 'text-stone-300', 
    border: 'border-stone-500/30',
    gradient: 'from-stone-600/30 via-amber-700/20 to-stone-600/30'
  },
  'Supernatural': { 
    bg: 'bg-white/10', 
    text: 'text-gray-300', 
    border: 'border-white/20',
    gradient: 'from-gray-500/30 via-white/20 to-gray-400/30'
  },
  'Other': { 
    bg: 'bg-gray-500/20', 
    text: 'text-gray-300', 
    border: 'border-gray-500/30',
    gradient: 'from-gray-600/30 via-slate-500/20 to-gray-600/30'
  },
}

const categoryEmojis: Record<string, string> = {
  'Romance': '💕',
  'Action': '⚔️',
  'Horror': '👻',
  'Fantasy': '🧙',
  'Sci-Fi': '🚀',
  'Slice of Life': '🌸',
  'Mystery': '🔍',
  'Comedy': '😂',
  'Drama': '🎭',
  'Adventure': '🗺️',
  'Thriller': '😱',
  'Historical': '📜',
  'Supernatural': '✨',
  'Other': '📖'
}

export function StorylineServerCard({ server, onClick, variant = 'default' }: StorylineServerCardProps) {
  const displayCategory = server.genre || server.category || 'Other'
  const categoryStyle = categoryColors[displayCategory] || categoryColors['Other']
  const categoryEmoji = categoryEmojis[displayCategory] || '📖'
  const memberCount = server._count?.memberships || server._count?.members || server.memberCount || 0
  const iconImage = server.iconImage || server.iconUrl

  // Compact variant for sidebar
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all group text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white/15 group-hover:ring-white/30 transition-all">
          {iconImage ? (
            <img src={iconImage} alt={server.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-sm">{server.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{server.name}</p>
          <p className="text-xs text-gray-400/60">{memberCount} members</p>
        </div>
        {server.boostTier && server.boostTier > 0 && (
          <Badge variant="outline" className="text-xs border-amber-500/30 bg-amber-500/10 text-amber-400 px-1.5">
            <Zap className="w-2.5 h-2.5 mr-0.5" />
            {server.boostTier}
          </Badge>
        )}
      </button>
    )
  }

  // Featured variant for hero sections
  if (variant === 'featured') {
    return (
      <div
        onClick={onClick}
        className="relative rounded-2xl overflow-hidden cursor-pointer group border border-white/15 hover:border-white/30 transition-all"
      >
        {/* Banner Background */}
        <div className="h-48 relative">
          {server.bannerUrl || server.coverImage ? (
            <img 
              src={server.bannerUrl || server.coverImage || ''} 
              alt={server.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={cn("w-full h-full bg-gradient-to-br", categoryStyle.gradient)} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
          
          {/* Featured badge */}
          <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Featured
          </div>
          
          {/* Member count */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white text-xs font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {memberCount.toLocaleString()}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 relative -mt-12">
          {/* Server Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-gray-300 flex items-center justify-center overflow-hidden ring-4 ring-[#0a0a0a] shadow-xl mb-3">
            {iconImage ? (
              <img src={iconImage} alt={server.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-2xl">{server.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          
          <h3 className="text-xl font-bold text-white mb-1">{server.name}</h3>
          <p className="text-sm text-gray-300/70 line-clamp-2 mb-3">{server.description}</p>
          
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", categoryStyle.bg, categoryStyle.text, categoryStyle.border)}>
              {categoryEmoji} {displayCategory}
            </Badge>
            {server.boostTier && server.boostTier > 0 && (
              <Badge variant="outline" className="text-xs border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Zap className="w-3 h-3 mr-1" />
                Level {server.boostTier}
              </Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default variant - Discord-like server card
  return (
    <div
      onClick={onClick}
      className="rounded-xl border border-white/15 overflow-hidden cursor-pointer group hover:border-white/30 hover:shadow-lg hover:shadow-white/5 transition-all bg-[#111111]/80"
    >
      {/* Banner */}
      <div className="h-28 relative overflow-hidden">
        {server.bannerUrl || server.coverImage ? (
          <img 
            src={server.bannerUrl || server.coverImage || ''} 
            alt=""
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-300"
          />
        ) : (
          <div className={cn("w-full h-full bg-gradient-to-br", categoryStyle.gradient)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] to-transparent" />
        
        {/* Category badge */}
        <div className="absolute top-3 right-3">
          <Badge className={cn("text-xs font-medium", categoryStyle.bg, categoryStyle.text, categoryStyle.border)}>
            {categoryEmoji} {displayCategory}
          </Badge>
        </div>
        
        {/* Boost tier badge */}
        {server.boostTier && server.boostTier > 0 && (
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className="text-xs border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Zap className="w-3 h-3 mr-1" />
              Level {server.boostTier}
            </Badge>
          </div>
        )}
        
        {/* Privacy indicator */}
        <div className="absolute bottom-3 right-3">
          {server.isPublic === false ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-xs text-gray-300/80">
              <Lock className="w-3 h-3" />
              Private
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-xs text-emerald-300/80">
              <Globe className="w-3 h-3" />
              Public
            </div>
          )}
        </div>
        
        {/* Server Icon */}
        <div className="absolute -bottom-6 left-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white to-gray-300 flex items-center justify-center overflow-hidden ring-4 ring-[#111111] shadow-lg">
            {iconImage ? (
              <img src={iconImage} alt={server.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-xl">{server.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 pt-9">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-white group-hover:text-white transition-colors truncate">
            {server.name}
          </h3>
          {server.isMember && (
            <Badge variant="outline" className="text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0">
              <Check className="w-3 h-3 mr-1" />
              Joined
            </Badge>
          )}
        </div>
        
        <p className="text-sm text-gray-300/60 line-clamp-2 mb-3">
          {server.description}
        </p>
        
        {/* Tags */}
        {server.tags && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {server.tags.split(',').slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-gray-400/80 border border-white/15"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
        
        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-3 text-xs text-gray-400/60">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {memberCount}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400/50 text-amber-400/50" />
              {server.rating > 0 ? server.rating.toFixed(1) : 'New'}
            </span>
            {server.createdAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(server.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
          
          {/* Owner indicator */}
          {server.owner && (
            <div className="flex items-center gap-1.5">
              <Avatar className="w-5 h-5 border border-white/20">
                <AvatarImage src={server.owner.avatar || server.owner.avatarUrl || undefined} />
                <AvatarFallback className="bg-white/15 text-gray-200 text-[8px]">
                  {(server.owner.username || server.owner.name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-400/50">@{server.owner.username || server.owner.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}