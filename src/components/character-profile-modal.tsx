'use client'

import { useState, useEffect, startTransition } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import { 
  X, MessageCircle, User, Sparkles, Heart, BookOpen,
  Brain, Star, Users, Eye, Link2, ChevronLeft, Hash, Loader2, Check, UserPlus, Zap, Clock, Flag,
  Target, Hexagon, Award, MessageSquare, Flame
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { apiFetch } from '@/lib/api-client'
import { ReportModal } from '@/components/report-modal'
import { useVariantAccent } from '@/lib/ui-variant-styles'

// Friend status interface
interface FriendStatus {
  isFriend: boolean
  hasPendingRequest: boolean
  hasSentRequest: boolean
}

// Connection interface
interface PersonaConnection {
  id: string
  characterName: string
  relationshipType: string
  specificRole: string | null
  characterAge: number | null
  description: string | null
}

// Big Five (OCEAN) personality traits
interface BigFiveTraits {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

// HEXACO personality traits (6-factor model)
interface HexacoTraits {
  honestyHumility: number
  emotionality: number
  extraversion: number
  agreeableness: number
  conscientiousness: number
  opennessToExperience: number
}

// Personality spectrums (MBTI-based)
interface PersonalitySpectrums {
  introvertExtrovert: number
  intuitiveObservant: number
  thinkingFeeling: number
  judgingProspecting: number
  assertiveTurbulent: number
}

// Full persona profile interface
interface PersonaProfile {
  id: string
  name: string
  avatarUrl: string | null
  bannerUrl?: string | null
  bio: string | null
  username: string
  userId: string
  isOnline: boolean
  archetype: string | null
  gender: string | null
  age: number | null
  tags: string[]
  personalityDescription: string | null
  personalitySpectrums: PersonalitySpectrums | null
  bigFive: BigFiveTraits | null
  hexaco: HexacoTraits | null
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
  discType: string | null
  disc: { dominance: number; influence: number; steadiness: number; conscientiousness: number } | null
  enneagram: { type: number | null; wing: number | null; instinctualVariant: string | null } | null
  strengthsFinder: { top5: string[] } | null
  connections: PersonaConnection[]
}

interface CharacterProfileModalProps {
  persona: PersonaProfile
  isOpen: boolean
  onClose: () => void
  onStartChat: (personaId: string) => void
}

// Helper component for tag chips
function TagChip({ label, color = 'purple' }: { label: string; color?: string }) {
  const colors: Record<string, string> = {
    purple: 'bg-white/[0.08] text-slate-300 border-white/[0.10]',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    red: 'bg-red-500/15 text-red-300 border-red-500/25',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    pink: 'bg-pink-500/15 text-pink-300 border-pink-500/25',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
  }
  
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs border ${colors[color] || colors.purple}`}>
      {label}
    </span>
  )
}

// Helper for spectrum bars with modern look
function SpectrumBar({ label, value, leftLabel, rightLabel, icon, accent }: { 
  label: string; 
  value: number; 
  leftLabel: string; 
  rightLabel: string;
  icon?: React.ReactNode;
  accent?: { from: string; to: string; bgSubtle: string; shadowGlow: string };
}) {
  const fromColor = accent?.from || 'from-teal-500';
  const toColor = accent?.to || 'to-cyan-400';
  
  return (
    <div className="bg-slate-900/20 rounded-xl p-4 border border-white/[0.06] transition-all duration-300 hover:border-white/[0.1]">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-medium text-slate-200">{label}</span>
      </div>
      <div className="flex justify-between text-xs text-slate-500 mb-2">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="h-3 bg-slate-950/40 rounded-full overflow-hidden relative">
        <div className={`absolute inset-0 bg-gradient-to-r ${fromColor}/20 via-${fromColor.slice(5)}/30 to-${toColor.slice(3)}/20`} />
        <div 
          className={`h-full bg-gradient-to-r ${fromColor} ${toColor} rounded-full relative`}
          style={{ width: `${value}%`, animation: 'spectrum-fill 0.8s ease-out' }}
        >
          <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg ${accent?.shadowGlow || 'shadow-teal-500/30'}`} />
        </div>
      </div>
    </div>
  )
}

// Section component
function Section({ title, icon: Icon, children, className = '' }: { 
  title: string; 
  icon: any; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// Text block for longer content with markdown support
function TextBlock({ content, className = '', accent }: { content: string; className?: string; accent?: { bgSubtle: string; borderSubtle: string } }) {
  return (
    <div className={`bg-slate-900/15 rounded-xl p-4 border border-white/[0.06] ${className}`}>
      <div className="text-slate-100/90 text-sm leading-relaxed whitespace-pre-wrap markdown-content">
        <ReactMarkdown
          components={{
            strong: ({ children }) => <strong className="font-bold text-slate-100">{children}</strong>,
            em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
            code: ({ children }) => (
              <code className={`${accent?.bgSubtle || 'bg-orange-500/15'} px-1.5 py-0.5 rounded text-slate-200 text-xs font-mono`}>
                {children}
              </code>
            ),
            a: ({ href, children }) => (
              <a href={href} className="text-slate-400 underline underline-offset-2 hover:text-slate-300" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className={`border-l-2 ${accent?.borderSubtle || 'border-orange-500/20'} pl-4 italic text-slate-300 my-2`}>
                {children}
              </blockquote>
            ),
            ul: ({ children }) => <ul className="list-disc pl-4 my-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 my-2">{children}</ol>,
            li: ({ children }) => <li className="my-0.5">{children}</li>,
            hr: () => <hr className={`${accent?.borderSubtle || 'border-orange-500/20'} my-3`} />,
            h1: ({ children }) => <h1 className="text-lg font-bold text-slate-100 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-bold text-slate-100 mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold text-slate-100 mb-1">{children}</h3>,
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

// Tag grid
function TagGrid({ items, color = 'purple' }: { items: string[] | string | null; color?: string }) {
  // Handle both array and JSON string inputs
  let parsedItems: string[] = []
  if (items) {
    if (Array.isArray(items)) {
      parsedItems = items
    } else if (typeof items === 'string') {
      try {
        const parsed = JSON.parse(items)
        parsedItems = Array.isArray(parsed) ? parsed : []
      } catch {
        parsedItems = []
      }
    }
  }
  
  if (parsedItems.length === 0) return null
  
  return (
    <div className="flex flex-wrap gap-2">
      {parsedItems.map((item, i) => (
        <TagChip key={i} label={item} color={color} />
      ))}
    </div>
  )
}

// MBTI Compatibility System
// Based on cognitive function stack alignment and known type pairings

function getMbtiFunctions(type: string): string[] {
  const functionMap: Record<string, string[]> = {
    'INTJ': ['Ni', 'Te', 'Fi', 'Se'],
    'INTP': ['Ti', 'Ne', 'Si', 'Fe'],
    'ENTJ': ['Te', 'Ni', 'Se', 'Fi'],
    'ENTP': ['Ne', 'Ti', 'Fe', 'Si'],
    'INFJ': ['Ni', 'Fe', 'Ti', 'Se'],
    'INFP': ['Fi', 'Ne', 'Si', 'Te'],
    'ENFJ': ['Fe', 'Ni', 'Se', 'Ti'],
    'ENFP': ['Ne', 'Fi', 'Te', 'Si'],
    'ISTJ': ['Si', 'Te', 'Fi', 'Ne'],
    'ISFJ': ['Si', 'Fe', 'Ti', 'Ne'],
    'ESTJ': ['Te', 'Si', 'Ne', 'Fi'],
    'ESFJ': ['Fe', 'Si', 'Ne', 'Ti'],
    'ISTP': ['Ti', 'Se', 'Ni', 'Fe'],
    'ISFP': ['Fi', 'Se', 'Ni', 'Te'],
    'ESTP': ['Se', 'Ti', 'Fe', 'Ni'],
    'ESFP': ['Se', 'Fi', 'Te', 'Ni'],
  }
  return functionMap[type.toUpperCase()] || []
}

function calculateMbtiCompatibility(type1: string, type2: string): { score: number; description: string; level: 'high' | 'medium' | 'low' } {
  if (!type1 || !type2) return { score: 0, description: '', level: 'low' }

  const t1 = type1.toUpperCase()
  const t2 = type2.toUpperCase()

  // Known golden pairings (very high compatibility)
  const goldenPairs: Record<string, string[]> = {
    'INTJ': ['ENFP', 'ENTP'],
    'INTP': ['ENTJ', 'ENFJ'],
    'ENTJ': ['INTP', 'INFP'],
    'ENTP': ['INTJ', 'INFJ'],
    'INFJ': ['ENFP', 'ENTP'],
    'INFP': ['ENFJ', 'ENTJ'],
    'ENFJ': ['INFP', 'INTP'],
    'ENFP': ['INFJ', 'INTJ'],
    'ISTJ': ['ESFP', 'ESTP'],
    'ISFJ': ['ESFP', 'ESTP'],
    'ESTJ': ['ISFP', 'ISTP'],
    'ESFJ': ['ISFP', 'ISTP'],
    'ISTP': ['ESFJ', 'ESTJ'],
    'ISFP': ['ESFJ', 'ESTJ'],
    'ESTP': ['ISTJ', 'ISFJ'],
    'ESFP': ['ISTJ', 'ISFJ'],
  }

  // Same type
  if (t1 === t2) {
    return { score: 82, description: `Both ${t1}s share the same cognitive style. You naturally understand each other's thought processes and decision-making, though you may share the same blind spots.`, level: 'high' }
  }

  // Golden pair check
  if (goldenPairs[t1]?.includes(t2) || goldenPairs[t2]?.includes(t1)) {
    return { score: 94, description: `${t1} and ${t2} are a golden pairing! Your dominant functions complement each other perfectly, creating natural chemistry and mutual growth.`, level: 'high' }
  }

  // Calculate based on cognitive function overlap
  const f1 = getMbtiFunctions(t1)
  const f2 = getMbtiFunctions(t2)

  if (f1.length === 0 || f2.length === 0) return { score: 0, description: '', level: 'low' }

  // Check function complementarity (dominant matches inferior of other)
  const dom1 = f1[0]
  const dom2 = f2[0]
  const complementaryPairs: Record<string, string> = {
    'Ni': 'Se', 'Se': 'Ni', 'Ne': 'Si', 'Si': 'Ne',
    'Ti': 'Fe', 'Fe': 'Ti', 'Te': 'Fi', 'Fi': 'Te',
  }

  let functionOverlap = 0
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (f1[i] === f2[j]) {
        // Higher weight for dominant functions matching
        functionOverlap += (4 - i) * (4 - j) * 0.5
      }
    }
  }

  // Complementary dominant functions bonus
  const isComplementary = complementaryPairs[dom1] === dom2
  if (isComplementary) functionOverlap += 12

  // Same attitude (both I or both E) bonus
  const sameAttitude = t1[0] === t2[0]
  if (sameAttitude) functionOverlap += 3

  // Same perceiving preference bonus
  const samePerceiving = t1[1] === t2[1] || t1[2] === t2[2]
  if (samePerceiving) functionOverlap += 2

  // Calculate score from overlap (max theoretical overlap ~40)
  const rawScore = Math.min(functionOverlap / 30, 1) * 60 + 30
  const score = Math.round(Math.min(rawScore, 92))

  // Determine descriptions
  const sharedFunctions = f1.filter(f => f2.includes(f))
  let description = ''
  if (score >= 75) {
    description = `${t1} and ${t2} share great cognitive synergy${sharedFunctions.length > 0 ? ` through ${sharedFunctions.join('/')}` : ''}. Both types value ${sameAttitude ? (t1[0] === 'I' ? 'introspection and depth' : 'engagement and action') : 'different but complementary approaches'}, creating a balanced dynamic.`
  } else if (score >= 55) {
    description = `${t1} and ${t2} have moderate compatibility. ${sameAttitude ? 'You share similar energy preferences' : 'Your different energies can be complementary'}, though some friction may arise from ${sharedFunctions.length > 0 ? 'different applications of shared functions' : 'different cognitive priorities'}.`
  } else {
    description = `${t1} and ${t2} have contrasting cognitive styles. While this creates growth opportunities and fresh perspectives, it may require patience and understanding to bridge your different approaches.`
  }

  return {
    score,
    description,
    level: score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low',
  }
}

// Circular Progress Indicator for compatibility
function CompatibilityRing({ score, level }: { score: number; level: 'high' | 'medium' | 'low' }) {
  const radius = 36
  const stroke = 5
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference

  const colorMap = {
    high: { stroke: '#10b981', bg: 'rgba(16,185,129,0.1)', text: 'text-emerald-400' },
    medium: { stroke: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: 'text-amber-400' },
    low: { stroke: '#ef4444', bg: 'rgba(239,68,68,0.1)', text: 'text-red-400' },
  }
  const colors = colorMap[level]

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          stroke="rgba(255,255,255,0.06)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress arc */}
        <circle
          stroke={colors.stroke}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${colors.text}`}>{score}</span>
        <span className="text-[8px] text-slate-500 uppercase tracking-wider">Match</span>
      </div>
    </div>
  )
}

interface FollowStatusData {
  isFollowing: boolean
  followersCount: number
  followingCount: number
}

export function CharacterProfileModal({ 
  persona, 
  isOpen, 
  onClose, 
  onStartChat 
}: CharacterProfileModalProps) {
  const { user } = useAuth()
  const { activePersona } = usePersonas()
  const accent = useVariantAccent()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'appearance' | 'personality' | 'attributes'>('overview')
  const [followStatus, setFollowStatus] = useState<FollowStatusData | null>(null)
  const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(true)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [followError, setFollowError] = useState<string | null>(null)
  
  // Friend status state
  const [friendStatus, setFriendStatus] = useState<FriendStatus | null>(null)
  const [isLoadingFriendStatus, setIsLoadingFriendStatus] = useState(true)
  const [isFriendLoading, setIsFriendLoading] = useState(false)
  const [friendError, setFriendError] = useState<string | null>(null)
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null)
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false)
  
  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      startTransition(() => {
        setFriendError(null)
        setFriendSuccess(null)
      })
    }
  }, [isOpen])

  // Fetch follow status on mount
  useEffect(() => {
    if (!isOpen || !persona?.userId) return

    const fetchFollowStatus = async () => {
      try {
        const response = await apiFetch(`/api/follow/status?targetUserId=${persona.userId}`)
        
        if (response.ok) {
          const data = await response.json()
          setFollowStatus({
            isFollowing: data.isFollowing,
            followersCount: data.followersCount,
            followingCount: data.followingCount,
          })
        } else {
          setFollowStatus({
            isFollowing: false,
            followersCount: 0,
            followingCount: 0,
          })
        }
      } catch (error) {
        console.error('Error fetching follow status:', error)
        setFollowStatus({
          isFollowing: false,
          followersCount: 0,
          followingCount: 0,
        })
      } finally {
        setIsLoadingFollowStatus(false)
      }
    }

    fetchFollowStatus()
  }, [isOpen, persona?.userId])

  // Fetch friend status on mount
  useEffect(() => {
    if (!isOpen || !persona?.userId) return

    const fetchFriendStatus = async () => {
      try {
        const response = await apiFetch(`/api/friends/status?targetUserId=${persona.userId}`)
        
        if (response.ok) {
          const data = await response.json()
          setFriendStatus({
            isFriend: data.isFriend || false,
            hasPendingRequest: data.hasPendingRequest || false,
            hasSentRequest: data.hasSentRequest || false,
          })
        } else {
          setFriendStatus({
            isFriend: false,
            hasPendingRequest: false,
            hasSentRequest: false,
          })
        }
      } catch (error) {
        console.error('Error fetching friend status:', error)
        setFriendStatus({
          isFriend: false,
          hasPendingRequest: false,
          hasSentRequest: false,
        })
      } finally {
        setIsLoadingFriendStatus(false)
      }
    }

    fetchFriendStatus()
  }, [isOpen, persona?.userId])

  const handleFollow = async () => {
    if (!user || !persona?.userId || user.id === persona.userId) return

    setIsFollowLoading(true)
    setFollowError(null)
    
    try {
      const isFollowing = followStatus?.isFollowing ?? false
      
      const url = `/api/follow?targetUserId=${persona.userId}`

      const response = await apiFetch(url, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: isFollowing ? undefined : JSON.stringify({ targetUserId: persona.userId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Update local state
        setFollowStatus(prev => {
          if (!prev) return prev
          return {
            ...prev,
            isFollowing: !prev.isFollowing,
            followersCount: prev.isFollowing 
              ? Math.max(0, prev.followersCount - 1) 
              : prev.followersCount + 1,
            followingCount: prev.followingCount,
          }
        })
      } else {
        setFollowError(data.error || 'Failed to update follow status')
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
      setFollowError('Failed to update follow status. Please try again.')
    } finally {
      setIsFollowLoading(false)
    }
  }

  // Handle add friend
  const handleAddFriend = async () => {
    if (!user || !persona?.userId || user.id === persona.userId) return

    setIsFriendLoading(true)
    setFriendError(null)
    setFriendSuccess(null)
    
    try {
      const response = await apiFetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: persona.username }),
      })

      const data = await response.json()

      if (response.ok) {
        setFriendSuccess('Friend request sent!')
        setFriendStatus(prev => prev ? { ...prev, hasSentRequest: true } : { isFriend: false, hasPendingRequest: false, hasSentRequest: true })
      } else {
        setFriendError(data.error || 'Failed to send friend request')
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      setFriendError('Failed to send friend request. Please try again.')
    } finally {
      setIsFriendLoading(false)
    }
  }

  if (!isOpen) return null

  const tabs: { id: 'overview' | 'appearance' | 'personality' | 'attributes'; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Eye className="w-4 h-4" /> },
    { id: 'personality', label: 'Personality', icon: <Brain className="w-4 h-4" /> },
    { id: 'attributes', label: 'Attributes', icon: <Hash className="w-4 h-4" /> },
  ]

  const isFollowing = followStatus?.isFollowing ?? false
  const isOwnProfile = user?.id === persona.userId

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="w-full max-w-2xl max-h-[90vh] bg-gradient-to-b from-[#100e0d] to-[#0c0a09] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Banner Image */}
        {persona.bannerUrl ? (
          <div className="h-28 sm:h-36 relative overflow-hidden">
            <img src={persona.bannerUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#100e0d] via-[#100e0d]/50 to-transparent" />
            <div className="absolute inset-0 backdrop-blur-[1px]" />
          </div>
        ) : (
          <div className="h-28 sm:h-36 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${accent.fromSubtle || 'from-teal-600/20'} ${accent.toSubtle || 'via-cyan-600/10'} to-teal-800/20`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#100e0d] via-[#100e0d]/40 to-transparent" />
            <div className="absolute top-4 right-12 w-20 h-20 rounded-full bg-white/5 blur-xl" />
            <div className="absolute bottom-2 left-16 w-14 h-14 rounded-full bg-white/[0.03] blur-lg" />
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between -mt-10 relative z-10">
          <div className="flex items-center gap-3">
            {/* Avatar with animated gradient border */}
            <div className="relative p-[2px] rounded-full" style={{ background: 'conic-gradient(from var(--gradient-angle, 0deg), #14b8a6, #06b6d4, #14b8a6)', animation: 'gradient-border-rotate 3s linear infinite' }}>
              <Avatar className="w-12 h-12 border-0">
                <AvatarImage src={persona.avatarUrl || undefined} />
                <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-lg font-bold`}>
                  {persona.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">{persona.name}</h2>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">@{persona.username}</span>
                {persona.isOnline && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'online-pulse 2s infinite' }} />
                    Online
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Report Button */}
            {!isOwnProfile && (
              <button
                onClick={() => setShowReportModal(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Report this persona"
              >
                <Flag className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm">
                <span className="font-semibold text-slate-100">{followStatus?.followersCount ?? 0}</span>
                <span className="text-slate-400"> followers</span>
              </span>
            </div>
            <div className="w-px h-6 bg-white/[0.05]" />
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-slate-400" />
              <span className="text-sm">
                <span className="font-semibold text-slate-100">{followStatus?.followingCount ?? 0}</span>
                <span className="text-slate-400"> following</span>
              </span>
            </div>
          </div>
          
          {/* Follow Button */}
          {!isOwnProfile && (
            <button
              onClick={handleFollow}
              disabled={isFollowLoading}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isFollowing
                  ? `${accent.bgSubtle} text-slate-300 border ${accent.borderSubtle} hover:${accent.bgTint}`
                  : `${accent.bgSolid} text-white hover:opacity-90`
              }`}
            >
              {isFollowLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Follow</span>
                </>
              )}
            </button>
          )}
          
          {/* Add Friend Button */}
          {!isOwnProfile && !friendStatus?.isFriend && !friendStatus?.hasSentRequest && (
            <button
              onClick={handleAddFriend}
              disabled={isFriendLoading}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
            >
              {isFriendLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Friend</span>
                </>
              )}
            </button>
          )}
          
          {/* Request Sent Badge */}
          {!isOwnProfile && !friendStatus?.isFriend && friendStatus?.hasSentRequest && (
            <span className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Request Sent</span>
            </span>
          )}
          
          {/* Already Friends Badge */}
          {!isOwnProfile && friendStatus?.isFriend && (
            <span className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Friends</span>
            </span>
          )}
          
          {/* Friend Error/Success Messages */}
          {friendError && (
            <span className="text-xs text-red-400">{friendError}</span>
          )}
          {friendSuccess && (
            <span className="text-xs text-emerald-400">{friendSuccess}</span>
          )}
          
          {/* Follow Error */}
          {followError && (
            <span className="text-xs text-red-400">{followError}</span>
          )}
          
          {/* Message Button */}
          <button
            onClick={() => onStartChat(persona.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${accent.from} ${accent.to} text-white hover:opacity-90 transition-all flex items-center gap-2`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Message</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2 border-b border-white/[0.08] flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? `${accent.bgSubtle} text-slate-200 border ${accent.borderSubtle}`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {persona.bio && (
                <TextBlock content={persona.bio} accent={accent} />
              )}
              
              {persona.tags && persona.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {persona.tags.map((tag, i) => (
                      <TagChip key={i} label={tag} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              {persona.appearance ? (
                <TextBlock content={persona.appearance} accent={accent} />
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No appearance description provided
                </div>
              )}
            </div>
          )}

          {activeTab === 'personality' && (
            <div className="space-y-6">
              {persona.personalityDescription && (
                <TextBlock content={persona.personalityDescription} accent={accent} />
              )}
              
              {/* MBTI Compatibility Card */}
              {!isOwnProfile && activePersona?.mbtiType && persona.mbtiType && (() => {
                const compat = calculateMbtiCompatibility(activePersona.mbtiType, persona.mbtiType)
                if (compat.score === 0) return null
                return (
                  <div className={`rounded-xl border p-4 ${
                    compat.level === 'high' 
                      ? 'bg-emerald-500/[0.04] border-emerald-500/20' 
                      : compat.level === 'medium'
                        ? 'bg-amber-500/[0.04] border-amber-500/20'
                        : 'bg-red-500/[0.04] border-red-500/20'
                  }`}>
                    <div className="flex items-start gap-4">
                      <CompatibilityRing score={compat.score} level={compat.level} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Flame className={`w-4 h-4 ${
                            compat.level === 'high' ? 'text-emerald-400' : compat.level === 'medium' ? 'text-amber-400' : 'text-red-400'
                          }`} />
                          <h4 className="text-sm font-semibold text-slate-200">Personality Compatibility</h4>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-fuchsia-500/15 text-fuchsia-300/80 border border-fuchsia-500/20 font-medium">
                            {activePersona.mbtiType}
                          </span>
                          <span className="text-slate-500 text-xs">×</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-fuchsia-500/15 text-fuchsia-300/80 border border-fuchsia-500/20 font-medium">
                            {persona.mbtiType}
                          </span>
                          <span className={`text-xs font-medium ${
                            compat.level === 'high' ? 'text-emerald-400' : compat.level === 'medium' ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {compat.level === 'high' ? 'Great match!' : compat.level === 'medium' ? 'Decent match' : 'Challenging match'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{compat.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })()}
              
              {/* MBTI Personality Spectrums */}
              {persona.personalitySpectrums && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Personality Spectrums (MBTI)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SpectrumBar
                      label="Energy"
                      value={persona.personalitySpectrums.introvertExtrovert}
                      leftLabel="Introvert"
                      rightLabel="Extrovert"
                      icon={<Zap className="w-4 h-4 text-slate-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Perception"
                      value={persona.personalitySpectrums.intuitiveObservant}
                      leftLabel="Intuitive"
                      rightLabel="Observant"
                      icon={<Eye className="w-4 h-4 text-slate-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Decisions"
                      value={persona.personalitySpectrums.thinkingFeeling}
                      leftLabel="Thinking"
                      rightLabel="Feeling"
                      icon={<Heart className="w-4 h-4 text-slate-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Structure"
                      value={persona.personalitySpectrums.judgingProspecting}
                      leftLabel="Judging"
                      rightLabel="Prospecting"
                      icon={<Sparkles className="w-4 h-4 text-slate-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Identity"
                      value={persona.personalitySpectrums.assertiveTurbulent}
                      leftLabel="Assertive"
                      rightLabel="Turbulent"
                      icon={<Star className="w-4 h-4 text-slate-400" />}
                      accent={accent}
                    />
                  </div>
                </div>
              )}
              
              {/* Big Five (OCEAN) Personality Traits */}
              {persona.bigFive && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Big Five (OCEAN) Traits
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SpectrumBar
                      label="Openness"
                      value={persona.bigFive.openness}
                      leftLabel="Practical"
                      rightLabel="Open"
                      icon={<Brain className="w-4 h-4 text-cyan-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Conscientiousness"
                      value={persona.bigFive.conscientiousness}
                      leftLabel="Flexible"
                      rightLabel="Organized"
                      icon={<BookOpen className="w-4 h-4 text-cyan-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Extraversion"
                      value={persona.bigFive.extraversion}
                      leftLabel="Reserved"
                      rightLabel="Social"
                      icon={<Users className="w-4 h-4 text-cyan-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Agreeableness"
                      value={persona.bigFive.agreeableness}
                      leftLabel="Competitive"
                      rightLabel="Cooperative"
                      icon={<Heart className="w-4 h-4 text-cyan-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Neuroticism"
                      value={persona.bigFive.neuroticism}
                      leftLabel="Stable"
                      rightLabel="Reactive"
                      icon={<Zap className="w-4 h-4 text-cyan-400" />}
                      accent={accent}
                    />
                  </div>
                </div>
              )}
              
              {/* HEXACO Personality Traits (6-factor model) */}
              {persona.hexaco && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    HEXACO Traits (6-Factor Model)
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Includes Honesty-Humility dimension not found in Big Five
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SpectrumBar
                      label="Honesty-Humility"
                      value={persona.hexaco.honestyHumility}
                      leftLabel="Self-Serving"
                      rightLabel="Genuine"
                      icon={<Heart className="w-4 h-4 text-emerald-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Emotionality"
                      value={persona.hexaco.emotionality}
                      leftLabel="Unemotional"
                      rightLabel="Sensitive"
                      icon={<Zap className="w-4 h-4 text-emerald-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="eXtraversion"
                      value={persona.hexaco.extraversion}
                      leftLabel="Introverted"
                      rightLabel="Extroverted"
                      icon={<Users className="w-4 h-4 text-emerald-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Agreeableness"
                      value={persona.hexaco.agreeableness}
                      leftLabel="Competitive"
                      rightLabel="Cooperative"
                      icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Conscientiousness"
                      value={persona.hexaco.conscientiousness}
                      leftLabel="Flexible"
                      rightLabel="Organized"
                      icon={<BookOpen className="w-4 h-4 text-emerald-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Openness"
                      value={persona.hexaco.opennessToExperience}
                      leftLabel="Practical"
                      rightLabel="Curious"
                      icon={<Eye className="w-4 h-4 text-emerald-400" />}
                      accent={accent}
                    />
                  </div>
                </div>
              )}
              
              {/* DISC Profile */}
              {persona.disc && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    DISC Profile
                    {persona.discType && (
                      <span className="ml-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
                        {persona.discType}
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SpectrumBar
                      label="Dominance"
                      value={persona.disc.dominance}
                      leftLabel="Collaborative"
                      rightLabel="Direct"
                      icon={<Zap className="w-4 h-4 text-red-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Influence"
                      value={persona.disc.influence}
                      leftLabel="Reserved"
                      rightLabel="Enthusiastic"
                      icon={<MessageSquare className="w-4 h-4 text-amber-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Steadiness"
                      value={persona.disc.steadiness}
                      leftLabel="Fast-paced"
                      rightLabel="Steady"
                      icon={<Heart className="w-4 h-4 text-emerald-400" />}
                      accent={accent}
                    />
                    <SpectrumBar
                      label="Conscientiousness"
                      value={persona.disc.conscientiousness}
                      leftLabel="Intuitive"
                      rightLabel="Analytical"
                      icon={<Brain className="w-4 h-4 text-sky-400" />}
                      accent={accent}
                    />
                  </div>
                </div>
              )}

              {/* Enneagram Type */}
              {persona.enneagram?.type && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Hexagon className="w-4 h-4" />
                    Enneagram
                    <span className="ml-1 px-2 py-0.5 rounded text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/25">
                      Type {persona.enneagram.type}{persona.enneagram.wing ? `w${persona.enneagram.wing}` : ''}
                    </span>
                    {persona.enneagram.instinctualVariant && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/25">
                        {persona.enneagram.instinctualVariant}
                      </span>
                    )}
                  </h4>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    {/* Enneagram 9-pointed star diagram */}
                    <div className="flex justify-center mb-3">
                      <svg width="120" height="120" viewBox="0 0 120 120" className="opacity-80">
                        {/* Outer circle */}
                        <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth="1" />
                        {/* Inner triangle (3-6-9) */}
                        <polygon points="60,8 104,95 16,95" fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="0.8" />
                        {/* 9 points */}
                        {[...Array(9)].map((_, i) => {
                          const angle = (i * 40 - 90) * (Math.PI / 180)
                          const x = 60 + 55 * Math.cos(angle)
                          const y = 60 + 55 * Math.sin(angle)
                          const isActive = i + 1 === persona.enneagram!.type
                          const isWing = persona.enneagram!.wing && (i + 1 === persona.enneagram!.wing)
                          return (
                            <g key={i}>
                              <circle cx={x} cy={y} r={isActive ? 8 : isWing ? 6 : 4} fill={isActive ? 'rgba(20,184,166,0.6)' : isWing ? 'rgba(6,182,212,0.4)' : 'rgba(148,163,184,0.15)'} stroke={isActive ? '#14b8a6' : isWing ? '#06b6d4' : 'rgba(148,163,184,0.2)'} strokeWidth={isActive ? 2 : 1} />
                              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={isActive || isWing ? 'white' : 'rgba(148,163,184,0.5)'} fontSize={isActive ? 10 : 8} fontWeight={isActive ? 'bold' : 'normal'}>{i + 1}</text>
                            </g>
                          )
                        })}
                        {/* Connection lines between points */}
                        {[1,2,4,5,7,8].map(i => {
                          const nextMap: Record<number,number> = {1:4,4:2,2:8,8:5,5:7,7:1}
                          const a1 = (i * 40 - 90) * (Math.PI / 180)
                          const a2 = (nextMap[i] * 40 - 90) * (Math.PI / 180)
                          return <line key={i} x1={60 + 55 * Math.cos(a1)} y1={60 + 55 * Math.sin(a1)} x2={60 + 55 * Math.cos(a2)} y2={60 + 55 * Math.sin(a2)} stroke="rgba(148,163,184,0.1)" strokeWidth="0.5" />
                        })}
                      </svg>
                    </div>
                    <p className="text-sm text-slate-400">
                      {(() => {
                        const types: Record<number, { name: string; description: string; fear: string; desire: string }> = {
                          1: { name: 'The Perfectionist', description: 'Principled, purposeful, self-controlled', fear: 'Being corrupt/evil', desire: 'Being good/having integrity' },
                          2: { name: 'The Helper', description: 'Generous, empathetic, people-pleasing', fear: 'Being unwanted/unloved', desire: 'To feel loved' },
                          3: { name: 'The Achiever', description: 'Adaptable, excelling, driven', fear: 'Being worthless', desire: 'To feel valuable' },
                          4: { name: 'The Individualist', description: 'Expressive, dramatic, self-absorbed', fear: 'Having no identity', desire: 'To be unique' },
                          5: { name: 'The Investigator', description: 'Perceptive, innovative, secretive', fear: 'Being useless', desire: 'To be competent' },
                          6: { name: 'The Loyalist', description: 'Engaging, responsible, anxious', fear: 'Being without support', desire: 'To have security' },
                          7: { name: 'The Enthusiast', description: 'Spontaneous, versatile, acquisitive', fear: 'Being deprived', desire: 'To be satisfied' },
                          8: { name: 'The Challenger', description: 'Self-confident, decisive, confrontational', fear: 'Being controlled', desire: 'To protect themselves' },
                          9: { name: 'The Peacemaker', description: 'Receptive, reassuring, complacent', fear: 'Being in conflict', desire: 'Inner stability' },
                        }
                        const t = types[persona.enneagram!.type!]
                        return t ? (
                          <>
                            <span className="text-slate-200 font-medium">{t.name}</span> — {t.description}
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <span className="text-red-400 block mb-0.5">Core Fear</span>
                                <span className="text-slate-300">{t.fear}</span>
                              </div>
                              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <span className="text-emerald-400 block mb-0.5">Core Desire</span>
                                <span className="text-slate-300">{t.desire}</span>
                              </div>
                            </div>
                          </>
                        ) : null
                      })()}
                    </p>
                  </div>
                </div>
              )}

              {/* StrengthsFinder Top 5 */}
              {persona.strengthsFinder?.top5 && persona.strengthsFinder.top5.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    CliftonStrengths Top 5
                  </h4>
                  <div className="flex gap-2">
                    {persona.strengthsFinder.top5.map((strength, idx) => (
                      <div key={idx} className="flex-1 p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/25 text-center">
                        <div className="text-[10px] text-emerald-400/70">#{idx + 1}</div>
                        <div className="text-xs font-bold text-emerald-300">{strength}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!persona.personalitySpectrums && !persona.bigFive && !persona.hexaco && !persona.personalityDescription && !persona.disc && !persona.enneagram?.type && !persona.strengthsFinder?.top5?.length && (
                <div className="text-center py-8 text-slate-500">
                  No personality information provided
                </div>
              )}
            </div>
          )}

          {activeTab === 'attributes' && (
            <div className="space-y-4">
              {/* Personality Typing Badges */}
              {(persona.mbtiType || persona.discType || persona.enneagram?.type) && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {persona.mbtiType && (
                    <span className="px-3 py-1 rounded-lg bg-fuchsia-500/15 text-fuchsia-300 text-sm font-medium border border-fuchsia-500/25">
                      MBTI: {persona.mbtiType}
                    </span>
                  )}
                  {persona.discType && (
                    <span className="px-3 py-1 rounded-lg bg-amber-500/15 text-amber-300 text-sm font-medium border border-amber-500/25">
                      DISC: {persona.discType}
                    </span>
                  )}
                  {persona.enneagram?.type && (
                    <span className="px-3 py-1 rounded-lg bg-sky-500/15 text-sky-300 text-sm font-medium border border-sky-500/25">
                      Enneagram: {persona.enneagram.type}{persona.enneagram.wing ? `w${persona.enneagram.wing}` : ''}
                    </span>
                  )}
                  {persona.strengthsFinder?.top5 && persona.strengthsFinder.top5.length > 0 && (
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-sm font-medium border border-emerald-500/25">
                      Top Strength: {persona.strengthsFinder.top5[0]}
                    </span>
                  )}
                </div>
              )}

              {persona.strengths && persona.strengths.length > 0 && (
                <Section title="Strengths" icon={Star}>
                  <TagGrid items={persona.strengths} color="green" />
                </Section>
              )}

              {persona.flaws && persona.flaws.length > 0 && (
                <Section title="Flaws" icon={Star}>
                  <TagGrid items={persona.flaws} color="red" />
                </Section>
              )}

              {persona.values && persona.values.length > 0 && (
                <Section title="Values" icon={Heart}>
                  <TagGrid items={persona.values} color="pink" />
                </Section>
              )}

              {persona.fears && persona.fears.length > 0 && (
                <Section title="Fears" icon={Eye}>
                  <TagGrid items={persona.fears} color="amber" />
                </Section>
              )}

              {persona.likes && persona.likes.length > 0 && (
                <Section title="Likes" icon={Heart}>
                  <TagGrid items={persona.likes} color="cyan" />
                </Section>
              )}

              {persona.dislikes && persona.dislikes.length > 0 && (
                <Section title="Dislikes" icon={X}>
                  <TagGrid items={persona.dislikes} color="red" />
                </Section>
              )}

              {persona.hobbies && persona.hobbies.length > 0 && (
                <Section title="Hobbies" icon={BookOpen}>
                  <TagGrid items={persona.hobbies} color="purple" />
                </Section>
              )}

              {persona.skills && persona.skills.length > 0 && (
                <Section title="Skills" icon={Star}>
                  <TagGrid items={persona.skills} color="blue" />
                </Section>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
      
      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        type="persona"
        reportedId={persona.userId}
        referenceId={persona.id}
        reportedName={persona.name}
      />
    </div>
  )
}
