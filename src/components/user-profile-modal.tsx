'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api-client'
import { useVariantAccent } from '@/lib/ui-variant-styles'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import {
  X,
  MapPin,
  Calendar,
  UserPlus,
  UserMinus,
  UserCheck,
  MessageCircle,
  MoreHorizontal,
  Shield,
  Flag,
  Smile,
  Globe,
  Link2,
  Eye,
  EyeOff,
  Heart,
  ChevronDown,
  Loader2,
  Users,
  Sparkles,
  Layers,
  BookOpen,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// ========================
// Types
// ========================

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onMessage?: (userId: string) => void
}

interface PersonaSummary {
  id: string
  name: string
  avatarUrl: string | null
  mbtiType: string | null
  archetype: string | null
}

interface ScenarioSummary {
  id: string
  title: string
  imageUrl: string | null
  bannerUrl: string | null
  category: string
  likeCount: number
}

interface SocialLinkEntry {
  platform: string
  value: string
  visible: boolean
}

interface UserProfile {
  id: string
  username: string
  avatarUrl: string | null
  bannerUrl: string | null
  bio: string | null
  status: string | null
  pronouns: string | null
  location: string | null
  socialLinks: SocialLinkEntry[]
  followerCount: number
  followingCount: number
  isFollowing: boolean
  isFriend: boolean
  hasSentFriendRequest: boolean
  hasPendingFriendRequest: boolean
  isOwnProfile: boolean
  chronos?: number
  createdAt: string
  personas: PersonaSummary[]
  scenarios: ScenarioSummary[]
  personaCount: number
  scenarioCount: number
}

type ProfileTab = 'about' | 'personas' | 'scenarios' | 'social'

// ========================
// Social Platform Icons (reused from edit-profile-modal)
// ========================

const SOCIAL_PLATFORMS: Record<string, { label: string; icon: React.ReactNode; color: string; getUrl: (val: string) => string }> = {
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    getUrl: (v) => v.startsWith('http') ? v : `https://youtube.com/${v}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    color: '#E4405F',
    getUrl: (v) => v.startsWith('http') ? v : `https://instagram.com/${v.replace('@', '')}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  discord: {
    label: 'Discord',
    color: '#5865F2',
    getUrl: () => '#',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
      </svg>
    ),
  },
  twitter: {
    label: 'X (Twitter)',
    color: '#000000',
    getUrl: (v) => v.startsWith('http') ? v : `https://x.com/${v.replace('@', '')}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    color: '#000000',
    getUrl: (v) => v.startsWith('http') ? v : `https://tiktok.com/@${v.replace('@', '')}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  },
  twitch: {
    label: 'Twitch',
    color: '#9146FF',
    getUrl: (v) => v.startsWith('http') ? v : `https://twitch.tv/${v}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    ),
  },
  spotify: {
    label: 'Spotify',
    color: '#1DB954',
    getUrl: (v) => v.startsWith('http') ? v : `https://open.spotify.com/${v}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  },
  reddit: {
    label: 'Reddit',
    color: '#FF4500',
    getUrl: (v) => v.startsWith('http') ? v : `https://reddit.com/u/${v.replace('u/', '')}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    ),
  },
  steam: {
    label: 'Steam',
    color: '#1B2838',
    getUrl: (v) => v.startsWith('http') ? v : `https://steamcommunity.com/${v}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
      </svg>
    ),
  },
  github: {
    label: 'GitHub',
    color: '#FFFFFF',
    getUrl: (v) => v.startsWith('http') ? v : `https://github.com/${v}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
  },
  website: {
    label: 'Website',
    color: '#6366F1',
    getUrl: (v) => v.startsWith('http') ? v : `https://${v}`,
    icon: <Globe className="w-4 h-4" />,
  },
}

// ========================
// Helpers
// ========================

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

// ========================
// Component
// ========================

export function UserProfileModal({ isOpen, onClose, userId, onMessage }: UserProfileModalProps) {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const accent = useVariantAccent()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('about')
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [isFriendLoading, setIsFriendLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!userId || !isOpen) return

    setLoading(true)
    setError(null)

    try {
      const response = await apiFetch(`/api/users/${userId}/profile`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('User not found')
        } else {
          setError('Failed to load profile')
        }
        setProfile(null)
        return
      }
      const data = await response.json()
      setProfile(data.profile)
    } catch {
      setError('Failed to load profile')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [userId, isOpen])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Reset tab when user changes
  useEffect(() => {
    setActiveTab('about')
    setShowMenu(false)
  }, [userId])

  // Follow/Unfollow
  const handleFollowToggle = async () => {
    if (!profile || isFollowLoading) return
    setIsFollowLoading(true)

    try {
      if (profile.isFollowing) {
        // Unfollow
        const response = await apiFetch(`/api/follow?targetUserId=${profile.id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('Failed to unfollow')
        toast({ title: 'Unfollowed', description: `You unfollowed ${profile.username}` })
      } else {
        // Follow
        const response = await apiFetch('/api/follow', {
          method: 'POST',
          body: JSON.stringify({ targetUserId: profile.id }),
        })
        if (!response.ok) throw new Error('Failed to follow')
        toast({ title: 'Following', description: `You are now following ${profile.username}` })
      }

      // Optimistically update UI
      setProfile((prev) => prev ? {
        ...prev,
        isFollowing: !prev.isFollowing,
        followerCount: prev.isFollowing ? prev.followerCount - 1 : prev.followerCount + 1,
      } : prev)
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setIsFollowLoading(false)
    }
  }

  // Add Friend
  const handleAddFriend = async () => {
    if (!profile || isFriendLoading) return
    setIsFriendLoading(true)

    try {
      const response = await apiFetch('/api/friends', {
        method: 'POST',
        body: JSON.stringify({ username: profile.username }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to send friend request', variant: 'destructive' })
        return
      }

      toast({ title: 'Friend request sent!', description: `Request sent to ${profile.username}` })
      setProfile((prev) => prev ? { ...prev, hasSentFriendRequest: true } : prev)
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setIsFriendLoading(false)
    }
  }

  // Block user
  const handleBlock = async () => {
    if (!profile) return
    try {
      const response = await apiFetch('/api/friends/block', {
        method: 'POST',
        body: JSON.stringify({ userId: profile.id }),
      })
      if (!response.ok) throw new Error('Failed to block')
      toast({ title: 'Blocked', description: `${profile.username} has been blocked` })
      setShowMenu(false)
    } catch {
      toast({ title: 'Error', description: 'Failed to block user', variant: 'destructive' })
    }
  }

  // Report user
  const handleReport = async () => {
    if (!profile) return
    try {
      const response = await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportedId: profile.id,
          type: 'user',
          reason: 'User report from profile',
        }),
      })
      if (!response.ok) throw new Error('Failed to report')
      toast({ title: 'Reported', description: 'Thank you for your report. We will review it shortly.' })
      setShowMenu(false)
    } catch {
      toast({ title: 'Error', description: 'Failed to submit report', variant: 'destructive' })
    }
  }

  const isOwnProfile = profile?.isOwnProfile ?? (currentUser?.id === userId)

  // ========================
  // Render
  // ========================

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[520px] p-0 gap-0 bg-[#0d0f14] border-white/[0.08] rounded-xl overflow-hidden max-h-[90vh]"
      >
        <VisuallyHidden>
          <DialogTitle>User Profile</DialogTitle>
        </VisuallyHidden>

        {loading ? (
          // Loading state
          <div className="flex items-center justify-center py-20">
            <Loader2 className={`w-8 h-8 animate-spin ${accent.text}`} />
          </div>
        ) : error ? (
          // Error state
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className={`w-14 h-14 rounded-full ${accent.bgSubtle} flex items-center justify-center mb-4`}>
              <Users className={`w-7 h-7 ${accent.text}`} />
            </div>
            <p className="text-slate-300 font-medium text-lg mb-1">Something went wrong</p>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProfile}
              className="border-white/[0.08] text-slate-300 hover:bg-white/[0.05]"
            >
              Try Again
            </Button>
          </div>
        ) : !profile ? null : (
          <ScrollArea className="max-h-[90vh]">
            <div className="flex flex-col">
              {/* ====== Banner Header ====== */}
              <div className="relative">
                {/* Banner */}
                <div className="w-full h-32 relative overflow-hidden">
                  {profile.bannerUrl ? (
                    <img
                      src={profile.bannerUrl}
                      alt={`${profile.username}'s banner`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${accent.fromSubtle} ${accent.toSubtle}`} />
                  )}
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-transparent to-transparent" />
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Avatar overlapping bottom-left */}
                <div className="absolute -bottom-10 left-5">
                  <Avatar className="w-20 h-20 border-4 border-[#0d0f14] rounded-full">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-2xl font-bold`}>
                      {profile.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* ====== User Info Section ====== */}
              <div className="px-5 pt-12 pb-3">
                {/* Username + status + pronouns */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white">{profile.username}</h2>
                  {profile.status && (
                    <span className={`text-xs ${accent.text} ${accent.bgSubtle} px-2 py-0.5 rounded-full ${accent.borderSubtle} border flex items-center gap-1`}>
                      <Smile className="w-3 h-3" />
                      {profile.status}
                    </span>
                  )}
                  {profile.pronouns && (
                    <span className="text-xs text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">
                      {profile.pronouns}
                    </span>
                  )}
                </div>

                {/* Location + Member since */}
                <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-slate-500">
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {profile.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {format(new Date(profile.createdAt), 'MMM yyyy')}
                  </span>
                </div>
              </div>

              {/* ====== Action Bar ====== */}
              {!isOwnProfile && (
                <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
                  {/* Follow / Unfollow */}
                  <Button
                    size="sm"
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    className={
                      profile.isFollowing
                        ? `bg-white/[0.06] hover:bg-red-500/20 hover:text-red-400 text-slate-300 border ${accent.borderSubtle} transition-all`
                        : `bg-gradient-to-r ${accent.from} ${accent.to} text-white hover:opacity-90`
                    }
                  >
                    {isFollowLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : profile.isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-1" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>

                  {/* Add Friend / Already Friends / Pending */}
                  {profile.isFriend ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 pointer-events-none"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Friends
                    </Button>
                  ) : profile.hasSentFriendRequest ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-500/30 text-amber-400 bg-amber-500/10 pointer-events-none"
                    >
                      <Loader2 className="w-4 h-4 mr-1" />
                      Pending
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddFriend}
                      disabled={isFriendLoading}
                      className={`border-white/[0.08] text-slate-300 hover:bg-white/[0.05]`}
                    >
                      {isFriendLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add Friend
                        </>
                      )}
                    </Button>
                  )}

                  {/* Message */}
                  {onMessage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMessage(profile.id)}
                      className="border-white/[0.08] text-slate-300 hover:bg-white/[0.05]"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                  )}

                  {/* Three-dot menu */}
                  <div className="relative ml-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowMenu(!showMenu)}
                      className="text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] h-8 w-8 p-0"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                    {showMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                        <div className="absolute right-0 top-full mt-1 z-50 bg-[#14161d] border border-white/[0.08] rounded-lg shadow-xl py-1 min-w-[140px]">
                          <button
                            onClick={handleBlock}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-red-400 transition-colors"
                          >
                            <Shield className="w-4 h-4" />
                            Block
                          </button>
                          <button
                            onClick={handleReport}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-amber-400 transition-colors"
                          >
                            <Flag className="w-4 h-4" />
                            Report
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Own profile — Edit Profile button */}
              {isOwnProfile && (
                <div className="px-5 pb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onClose}
                    className="border-white/[0.08] text-slate-300 hover:bg-white/[0.05]"
                  >
                    Edit Profile
                  </Button>
                </div>
              )}

              {/* ====== Stats Row ====== */}
              <div className="px-5 pb-3">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Followers', value: profile.followerCount, icon: <Users className="w-3.5 h-3.5" /> },
                    { label: 'Following', value: profile.followingCount, icon: <Users className="w-3.5 h-3.5" /> },
                    { label: 'Personas', value: profile.personaCount, icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { label: 'Scenarios', value: profile.scenarioCount, icon: <Layers className="w-3.5 h-3.5" /> },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 text-center"
                    >
                      <div className={`${accent.text} flex items-center justify-center gap-1 mb-0.5`}>
                        {stat.icon}
                        <span className="text-sm font-bold">{formatCount(stat.value)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ====== Tab Navigation ====== */}
              <div className="px-5 border-b border-white/[0.06]">
                <div className="flex gap-0">
                  {([
                    { key: 'about' as ProfileTab, label: 'About', icon: <BookOpen className="w-3.5 h-3.5" /> },
                    { key: 'personas' as ProfileTab, label: 'Personas', icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { key: 'scenarios' as ProfileTab, label: 'Scenarios', icon: <Layers className="w-3.5 h-3.5" /> },
                    { key: 'social' as ProfileTab, label: 'Links', icon: <Link2 className="w-3.5 h-3.5" /> },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 py-2.5 px-2 text-sm font-medium transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                        activeTab === tab.key
                          ? `${accent.text} ${accent.borderStrong}`
                          : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-white/[0.1]'
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ====== Tab Content ====== */}
              <div className="px-5 py-4 min-h-[200px]">
                {/* About Tab */}
                {activeTab === 'about' && (
                  <div className="space-y-4">
                    {profile.bio ? (
                      <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed">
                        <ReactMarkdown>{profile.bio}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">
                          {isOwnProfile ? 'You haven\'t written a bio yet.' : `${profile.username} hasn't written a bio yet.`}
                        </p>
                      </div>
                    )}

                    {/* Member details */}
                    <div className="grid grid-cols-2 gap-2">
                      {profile.location && (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Location</p>
                          <p className="text-sm text-slate-300 flex items-center gap-1.5">
                            <MapPin className={`w-3.5 h-3.5 ${accent.text}`} />
                            {profile.location}
                          </p>
                        </div>
                      )}
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Member Since</p>
                        <p className="text-sm text-slate-300 flex items-center gap-1.5">
                          <Calendar className={`w-3.5 h-3.5 ${accent.text}`} />
                          {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: false })}
                        </p>
                      </div>
                      {isOwnProfile && profile.chronos !== undefined && (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Chronos</p>
                          <p className="text-sm text-amber-400 flex items-center gap-1.5 font-medium">
                            <Sparkles className="w-3.5 h-3.5" />
                            {profile.chronos}
                          </p>
                        </div>
                      )}
                      {profile.pronouns && (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Pronouns</p>
                          <p className="text-sm text-slate-300">{profile.pronouns}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Personas Tab */}
                {activeTab === 'personas' && (
                  <div>
                    {profile.personas.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {profile.personas.map((persona) => (
                          <div
                            key={persona.id}
                            className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 hover:bg-white/[0.05] transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="w-9 h-9 rounded-lg">
                                <AvatarImage src={persona.avatarUrl || undefined} />
                                <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-xs font-bold rounded-lg`}>
                                  {persona.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                                  {persona.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {persona.mbtiType && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${accent.bgSubtle} ${accent.text} font-medium`}>
                                  {persona.mbtiType}
                                </span>
                              )}
                              {persona.archetype && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 font-medium">
                                  {persona.archetype}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No public personas yet</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Scenarios Tab */}
                {activeTab === 'scenarios' && (
                  <div>
                    {profile.scenarios.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {profile.scenarios.map((scenario) => (
                          <div
                            key={scenario.id}
                            className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden hover:bg-white/[0.05] transition-colors cursor-pointer group"
                          >
                            {/* Thumbnail */}
                            <div className="aspect-video relative overflow-hidden">
                              {scenario.bannerUrl || scenario.imageUrl ? (
                                <img
                                  src={scenario.bannerUrl || scenario.imageUrl || undefined}
                                  alt={scenario.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${accent.fromSubtle} ${accent.toSubtle} flex items-center justify-center`}>
                                  <Layers className="w-5 h-5 text-slate-600" />
                                </div>
                              )}
                              {/* Category badge */}
                              <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-white/80 backdrop-blur-sm font-medium uppercase tracking-wider">
                                {scenario.category}
                              </span>
                            </div>
                            {/* Info */}
                            <div className="p-2.5">
                              <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                                {scenario.title}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <Heart className="w-3 h-3 text-slate-500" />
                                <span className="text-xs text-slate-500">{scenario.likeCount}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No public scenarios yet</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Social Links Tab */}
                {activeTab === 'social' && (
                  <div>
                    {profile.socialLinks && profile.socialLinks.length > 0 ? (
                      <div className="space-y-1.5">
                        {profile.socialLinks
                          .filter((link) => link.value && link.visible !== false)
                          .map((link, index) => {
                            const platform = SOCIAL_PLATFORMS[link.platform]
                            if (!platform) return null
                            const url = platform.getUrl(link.value)
                            return (
                              <a
                                key={`${link.platform}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.05] transition-colors group"
                              >
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${platform.color}20`, color: platform.color }}
                                >
                                  {platform.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                                    {platform.label}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">{link.value}</p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                              </a>
                            )
                          })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Link2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No social links yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
