'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MessageSquare, User, Sparkles, Crown, Heart, Zap, Star, Eye, Globe, Shield } from 'lucide-react'

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
    secondaryArchetype?: string | null
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

// Archetype icons and colors - full set matching PERSONA_ARCHETYPES
const archetypeConfig: Record<string, { icon: any; color: string; gradient: string; bg: string }> = {
  // New behaviour-based archetypes
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
  // Classic archetypes (kept for backward compatibility)
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
  'default': { icon: User, color: 'text-white', gradient: 'from-gray-500 to-gray-400', bg: 'from-gray-500/10 to-gray-400/10' },
}

export function PersonaCard({ persona, onStartChat, onViewProfile }: PersonaCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [bannerLoaded, setBannerLoaded] = useState(false)
  
  const config = archetypeConfig[persona.archetype || 'default'] || archetypeConfig['default']
  const ArchetypeIcon = config.icon
  const secondaryConfig = persona.secondaryArchetype ? (archetypeConfig[persona.secondaryArchetype] || archetypeConfig['default']) : null
  const SecondaryIcon = secondaryConfig?.icon
  
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
            ? 'border-white/50 bg-black/95 shadow-lg shadow-white/5'
            : 'border-white/15 bg-black/70'
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
                  ? 'from-emerald-400 via-white to-gray-300'
                  : 'from-gray-500/50 via-gray-400/50 to-gray-500/50'
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
                <AvatarFallback className="bg-gradient-to-br from-gray-600 via-gray-500 to-gray-700 text-white text-lg font-bold">
                  {persona.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              {/* Archetype icons - primary and secondary */}
              <div className="absolute -bottom-1.5 -right-1.5 z-20 flex items-center">
                {persona.archetype && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full bg-[#12091f]" />
                    <div className={`absolute inset-[3px] rounded-full bg-gradient-to-br ${config.gradient}`} />
                    <ArchetypeIcon className="w-2.5 h-2.5 text-white relative z-10" />
                  </div>
                )}
                {persona.secondaryArchetype && SecondaryIcon && (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center relative -ml-1.5 -mb-0.5">
                    <div className="absolute inset-0 rounded-full bg-[#12091f]" />
                    <div className={`absolute inset-[2px] rounded-full bg-gradient-to-br ${secondaryConfig!.gradient} opacity-80`} />
                    <SecondaryIcon className="w-2 h-2 text-white relative z-10" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content section */}
          <div className="px-3 pt-8 pb-3">
            {/* Name row with personality badge */}
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-white text-sm truncate flex-1">
                {persona.name}
              </h3>
              {personalityBadge && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-400/20 text-gray-300 border border-gray-400/30">
                  {personalityBadge}
                </span>
              )}
            </div>

            {/* Username */}
            <p className="text-[10px] text-gray-400/60 truncate mb-1">@{persona.username}</p>

            {/* Info row: gender, age, species */}
            {infoParts.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-gray-400/70 mb-1.5">
                {infoParts.map((part, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-gray-400/40">•</span>}
                    <span>{part}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Bio preview */}
            {persona.bio && (
              <p className="text-[10px] text-gray-300/50 line-clamp-2 mb-2">
                {persona.bio}
              </p>
            )}

            {/* Tags - max 2 visible */}
            {persona.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {persona.tags.slice(0, 2).map((tag, index) => (
                  <span
                    key={index}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300/70"
                  >
                    {tag}
                  </span>
                ))}
                {persona.tags.length > 2 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400/50">
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
                        <div className="absolute inset-0 rounded-full bg-white/10" />
                        <div
                          className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ${
                            value > 50 ? 'bg-white/60' : 'bg-gray-400/60'
                          }`}
                          style={{ height: `${Math.abs(value - 50) * 2}%` }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-black border-white/20 px-2 py-1"
                      sideOffset={5}
                    >
                      <p className="text-[9px] text-white font-medium">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-[8px] text-gray-300">{value}%</p>
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
                className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all flex items-center justify-center gap-1"
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
                    ? 'bg-white text-black hover:bg-gray-100 shadow-md shadow-white/10'
                    : 'bg-white/10 text-gray-200 hover:bg-white/20 border border-white/10'
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
