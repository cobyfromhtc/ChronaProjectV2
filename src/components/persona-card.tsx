'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MessageSquare, User, Sparkles, Crown, Heart, Zap, Star, Eye, Globe } from 'lucide-react'

interface PersonaConnectionData {
  id: string
  characterName: string
  relationshipType: string
  specificRole: string | null
  characterAge: number | null
  description: string | null
}

interface PersonaCardProps {
  persona: {
    id: string
    name: string
    avatarUrl: string | null
    bannerUrl: string | null
    bio: string | null
    username: string
    userId: string
    isOnline: boolean
    archetype: string | null
    gender: string | null
    age: number | null
    tags: string[]
    personalityDescription: string | null
    personalitySpectrums: {
      introvertExtrovert: number
      intuitiveObservant: number
      thinkingFeeling: number
      judgingProspecting: number
      assertiveTurbulent: number
    } | null
    bigFive: {
      openness: number
      conscientiousness: number
      extraversion: number
      agreeableness: number
      neuroticism: number
    } | null
    hexaco: {
      honestyHumility: number
      emotionality: number
      extraversion: number
      agreeableness: number
      conscientiousness: number
      opennessToExperience: number
    } | null
    strengths: string[]
    flaws: string[]
    values: string[]
    fears: string[]
    species: string | null
    likes: string[]
    dislikes: string[]
    hobbies: string[]
    skills: string[]
    languages: string[]
    habits: string[]
    speechPatterns: string[]
    backstory: string | null
    appearance: string | null
    mbtiType: string | null
    connections: PersonaConnectionData[]
  }
  onStartChat: (personaId: string) => void
  onViewProfile: (persona: any) => void
}

// Archetype icons and colors
const archetypeConfig: Record<string, { icon: any; color: string; gradient: string; bg: string }> = {
  'Hero': { icon: Crown, color: 'text-amber-400', gradient: 'from-amber-500 to-orange-500', bg: 'from-amber-500/30 to-orange-500/20' },
  'Villain': { icon: Zap, color: 'text-red-400', gradient: 'from-red-500 to-rose-500', bg: 'from-red-500/30 to-rose-500/20' },
  'Mentor': { icon: Star, color: 'text-blue-400', gradient: 'from-blue-500 to-cyan-500', bg: 'from-blue-500/30 to-cyan-500/20' },
  'Lover': { icon: Heart, color: 'text-pink-400', gradient: 'from-pink-500 to-rose-500', bg: 'from-pink-500/30 to-rose-500/20' },
  'Explorer': { icon: Eye, color: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-500', bg: 'from-emerald-500/30 to-teal-500/20' },
  'Creator': { icon: Sparkles, color: 'text-purple-400', gradient: 'from-purple-500 to-violet-500', bg: 'from-purple-500/30 to-violet-500/20' },
  'default': { icon: User, color: 'text-purple-400', gradient: 'from-purple-500 to-fuchsia-500', bg: 'from-purple-500/30 to-fuchsia-500/20' },
}

export function PersonaCard({ persona, onStartChat, onViewProfile }: PersonaCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [bannerLoaded, setBannerLoaded] = useState(false)
  
  const config = archetypeConfig[persona.archetype || 'default'] || archetypeConfig['default']
  const ArchetypeIcon = config.icon
  
  // Get personality indicator (MBTI or simplified)
  const getPersonalityBadge = () => {
    if (persona.mbtiType) {
      return persona.mbtiType
    }
    if (persona.personalitySpectrums) {
      const e = persona.personalitySpectrums.introvertExtrovert > 50 ? 'E' : 'I'
      const n = persona.personalitySpectrums.intuitiveObservant > 50 ? 'N' : 'S'
      const t = persona.personalitySpectrums.thinkingFeeling > 50 ? 'T' : 'F'
      const j = persona.personalitySpectrums.judgingProspecting > 50 ? 'J' : 'P'
      return `${e}${n}${t}${j}`
    }
    return null
  }
  
  const personalityBadge = getPersonalityBadge()
  
  // Format info display
  const infoParts = [persona.gender, persona.age ? `${persona.age}y` : null, persona.species].filter(Boolean)
  
  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={`relative group cursor-pointer transition-all duration-300 ease-out ${isHovered ? 'scale-[1.02] z-10' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onViewProfile(persona)}
      >
        {/* Glow effect on hover */}
        <div className={`absolute -inset-1 rounded-2xl transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${config.bg} rounded-2xl blur-xl opacity-50`} />
        </div>

        {/* Card container */}
        <div className={`relative rounded-xl border transition-all duration-300 ${
          isHovered
            ? 'border-purple-500/50 bg-[#1a0f30]/95 shadow-lg shadow-purple-500/5'
            : 'border-purple-500/15 bg-[#12091f]/70'
        }`}>
          {/* Banner Section */}
          <div className="relative h-24">
            {persona.bannerUrl ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#12091f] z-10" />
                <img
                  src={persona.bannerUrl}
                  alt=""
                  className={`w-full h-full object-cover transition-all duration-500 ${isHovered ? 'scale-110 brightness-105' : 'scale-100'} ${bannerLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setBannerLoaded(true)}
                />
              </>
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${config.bg}`} />
            )}

            {/* Online status badge */}
            {persona.isOnline && (
              <div className="absolute top-2 right-2 z-20">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Avatar - positioned absolutely on the card container, not inside banner */}
          <div className="absolute top-[72px] left-3 z-30">
            <div className={`relative transition-transform duration-300 ${isHovered ? 'scale-105' : ''}`}>
              {/* Solid background to prevent any bleeding */}
              <div className="absolute inset-0 rounded-full bg-[#12091f] scale-110" />
              
              {/* Outer ring */}
              <div className={`absolute inset-0 rounded-full p-[2px] bg-gradient-to-br ${
                persona.isOnline
                  ? 'from-emerald-400 via-purple-500 to-fuchsia-500'
                  : 'from-purple-500/50 via-fuchsia-500/50 to-purple-500/50'
              } transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-70'}`}>
                <div className="w-full h-full rounded-full bg-[#12091f]" />
              </div>

              {/* Avatar - 56px (w-14 h-14) - with solid border to prevent bleeding */}
              <Avatar className="w-14 h-14 border-[3px] border-[#12091f] relative z-10">
                <AvatarImage
                  src={persona.avatarUrl || undefined}
                  className={`transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-purple-700 text-white text-lg font-bold">
                  {persona.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              {/* Archetype icon */}
              {persona.archetype && (
                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full z-20 flex items-center justify-center">
                  {/* Solid background to prevent bleeding */}
                  <div className="absolute inset-0 rounded-full bg-[#12091f]" />
                  {/* Gradient background */}
                  <div className={`absolute inset-[3px] rounded-full bg-gradient-to-br ${config.gradient}`} />
                  <ArchetypeIcon className="w-2.5 h-2.5 text-white relative z-10" />
                </div>
              )}
            </div>
          </div>

          {/* Content section */}
          <div className="px-3 pt-8 pb-3">
            {/* Name row with personality badge */}
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-purple-100 text-sm truncate flex-1">
                {persona.name}
              </h3>
              {personalityBadge && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  {personalityBadge}
                </span>
              )}
            </div>

            {/* Username */}
            <p className="text-[10px] text-purple-400/60 truncate mb-1">@{persona.username}</p>

            {/* Info row: gender, age, species */}
            {infoParts.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-purple-400/70 mb-1.5">
                {infoParts.map((part, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-purple-500/40">•</span>}
                    <span>{part}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Bio preview */}
            {persona.bio && (
              <p className="text-[10px] text-purple-300/50 line-clamp-2 mb-2">
                {persona.bio}
              </p>
            )}

            {/* Tags - max 2 visible */}
            {persona.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {persona.tags.slice(0, 2).map((tag, index) => (
                  <span
                    key={index}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300/70"
                  >
                    {tag}
                  </span>
                ))}
                {persona.tags.length > 2 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400/50">
                    +{persona.tags.length - 2}
                  </span>
                )}
              </div>
            )}

            {/* Personality bars - mini horizontal */}
            {persona.personalitySpectrums && (
              <div className="flex items-center gap-0.5 mb-2 h-3">
                {Object.entries(persona.personalitySpectrums).map(([key, value]) => (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div className="relative w-1 h-full cursor-help">
                        <div className="absolute inset-0 rounded-full bg-purple-500/20" />
                        <div
                          className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ${
                            value > 50 ? 'bg-fuchsia-500/60' : 'bg-purple-500/60'
                          }`}
                          style={{ height: `${Math.abs(value - 50) * 2}%` }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-[#1a0f30] border-purple-500/30 px-2 py-1"
                      sideOffset={5}
                    >
                      <p className="text-[9px] text-purple-100 font-medium">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-[8px] text-purple-300">{value}%</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewProfile(persona)
                }}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all flex items-center justify-center gap-1"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onStartChat(persona.id)
                }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                  persona.isOnline
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500 shadow-md shadow-purple-500/20'
                    : 'bg-purple-500/15 text-purple-200 hover:bg-purple-500/25 border border-purple-500/20'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
