'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { CustomTag } from '@/components/custom-tag'
import { parseMarkdown, renderMarkdownTokens } from '@/lib/markdown'
import { apiFetch } from '@/lib/api-client'
import { 
  User, Award, Star, Globe, Link as LinkIcon, Calendar, X, ExternalLink,
  Loader2, MapPin, Clock
} from 'lucide-react'

// Badge types
interface Badge {
  id: string
  name: string
  displayName: string
  description: string | null
  icon: string
  category: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  color: string | null
  priority?: number
}

interface UserBadge {
  id: string
  badgeId: string
  earnedAt: string
  isDisplayed: boolean
  badge: Badge
}

interface OocProfileData {
  id: string
  username: string
  avatarUrl: string | null
  oocDisplayName: string | null
  oocBio: string | null
  oocPronouns: string | null
  oocTimezone: string | null
  oocAge: number | null
  oocLinks: string | null
  oocShowProfile: boolean
  customTag: string | null
  role: string
  isOfficial: boolean
  createdAt: string
  badges: UserBadge[]
  personaCount: number
}

interface OocProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
}

// Rarity border colors
const rarityColors: Record<string, string> = {
  common: 'border-gray-500/50',
  uncommon: 'border-emerald-500/50',
  rare: 'border-blue-500/50',
  epic: 'border-purple-500/50',
  legendary: 'border-amber-500/50'
}

// Rarity glow effects
const rarityGlow: Record<string, string> = {
  common: '',
  uncommon: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  rare: 'shadow-[0_0_8px_rgba(59,130,246,0.3)]',
  epic: 'shadow-[0_0_8px_rgba(168,85,247,0.3)]',
  legendary: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]'
}

// Rarity background
const rarityBg: Record<string, string> = {
  common: 'bg-gray-500/10',
  uncommon: 'bg-emerald-500/10',
  rare: 'bg-blue-500/10',
  epic: 'bg-purple-500/10',
  legendary: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10'
}

// Social link icons mapping
const socialIcons: Record<string, string> = {
  discord: '🎮',
  twitter: '🐦',
  instagram: '📷',
  youtube: '▶️',
  twitch: '📺',
  tiktok: '🎵',
  reddit: '🤖',
  steam: '🎮',
  spotify: '🎧',
  website: '🌐',
  default: '🔗'
}

export function OocProfileModal({ isOpen, onClose, userId }: OocProfileModalProps) {
  const [profile, setProfile] = useState<OocProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile()
    }
  }, [isOpen, userId])

  const fetchProfile = async () => {
    if (!userId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiFetch(`/api/user/${userId}/ooc`)
      
      if (!response.ok) {
        throw new Error('Failed to load profile')
      }
      
      const data = await response.json()
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  // Parse links
  const parseLinks = (linksJson: string | null): Array<{ name: string; url: string }> => {
    if (!linksJson) return []
    try {
      return JSON.parse(linksJson)
    } catch {
      return []
    }
  }

  // Sort badges by priority then rarity
  const sortBadges = (badges: UserBadge[]): UserBadge[] => {
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 }
    
    return [...badges].sort((a, b) => {
      // First sort by display order if set
      if (a.isDisplayed !== b.isDisplayed) {
        return a.isDisplayed ? -1 : 1
      }
      // Then by priority
      const priorityDiff = (a.badge.priority || 999) - (b.badge.priority || 999)
      if (priorityDiff !== 0) return priorityDiff
      // Then by rarity
      return rarityOrder[a.badge.rarity] - rarityOrder[b.badge.rarity]
    })
  }

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Format timezone
  const formatTimezone = (timezone: string | null): string => {
    if (!timezone) return 'Not set'
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'long'
      })
      const parts = formatter.formatToParts(new Date())
      const tzName = parts.find(p => p.type === 'timeZoneName')
      return tzName?.value || timezone
    } catch {
      return timezone
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-gradient-to-b from-[#150a25] to-[#0a0510] rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-gradient-to-r from-gray-900/30 to-gray-800/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-gray-300 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">OOC Profile</h2>
                <p className="text-sm text-gray-400/70">Out of Character Information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-red-400">{error}</p>
            </div>
          ) : profile ? (
            <ScrollArea className="h-full">
              <div className="p-5 space-y-6">
                {/* Header Section */}
                <div className="flex items-start gap-4">
                  <Avatar className="w-20 h-20 border-2 border-white/30 flex-shrink-0">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-white to-gray-300 text-white font-bold text-2xl">
                      {(profile.oocDisplayName || profile.username).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-white">
                        {profile.oocDisplayName || profile.username}
                      </h3>
                      {profile.isOfficial && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
                          OFFICIAL
                        </span>
                      )}
                      {profile.customTag && (
                        <CustomTag tag={profile.customTag} className="text-xs" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400">@{profile.username}</p>
                    
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {profile.oocPronouns && (
                        <span className="text-sm text-gray-300">{profile.oocPronouns}</span>
                      )}
                      {profile.oocAge && (
                        <span className="text-sm text-gray-300">{profile.oocAge} years old</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 capitalize">
                        {profile.role === 'member' ? 'Member' : profile.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badges Section */}
                {profile.badges.length > 0 && (
                  <>
                    <Separator className="bg-white/10" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-semibold text-white">Badges</h4>
                        <span className="text-xs text-gray-400">({profile.badges.length})</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {sortBadges(profile.badges).map((userBadge) => (
                          <div
                            key={userBadge.id}
                            className={`relative p-3 rounded-xl border ${rarityColors[userBadge.badge.rarity]} ${rarityBg[userBadge.badge.rarity]} ${rarityGlow[userBadge.badge.rarity]} transition-all hover:scale-105 cursor-pointer group`}
                            title={userBadge.badge.description || userBadge.badge.displayName}
                          >
                            <div className="flex flex-col items-center text-center">
                              <span className="text-2xl mb-1">{userBadge.badge.icon}</span>
                              <span className="text-xs font-medium text-white/90 truncate w-full">
                                {userBadge.badge.displayName}
                              </span>
                              {userBadge.badge.rarity === 'legendary' && (
                                <Star className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 fill-amber-400" />
                              )}
                            </div>
                            
                            {/* Tooltip on hover */}
                            <div className="absolute inset-x-0 -bottom-1 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                              <div className="bg-black/90 rounded-lg p-2 text-xs text-white/80 mx-2 border border-white/10">
                                <p className="font-medium text-white">{userBadge.badge.displayName}</p>
                                {userBadge.badge.description && (
                                  <p className="mt-0.5 text-gray-400">{userBadge.badge.description}</p>
                                )}
                                <p className="mt-1 text-gray-500">
                                  Earned {formatDate(userBadge.earnedAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Bio Section */}
                {profile.oocBio && (
                  <>
                    <Separator className="bg-white/10" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        About Me
                      </h4>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="text-sm text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                          {renderMarkdownTokens(parseMarkdown(profile.oocBio))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Links Section */}
                {parseLinks(profile.oocLinks).length > 0 && (
                  <>
                    <Separator className="bg-white/10" />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-gray-400" />
                        Links
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {parseLinks(profile.oocLinks).map((link, index) => (
                          <a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-gray-300 hover:text-white transition-all"
                          >
                            <span>{socialIcons[link.name.toLowerCase()] || socialIcons.default}</span>
                            <span>{link.name}</span>
                            <ExternalLink className="w-3 h-3 text-gray-500" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Stats & Timezone Section */}
                <Separator className="bg-white/10" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Stats */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Stats
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-sm text-gray-400">Member Since</span>
                        <span className="text-sm text-white font-medium">
                          {formatDate(profile.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-sm text-gray-400">Characters</span>
                        <span className="text-sm text-white font-medium">
                          {profile.personaCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-sm text-gray-400">Badges Earned</span>
                        <span className="text-sm text-white font-medium">
                          {profile.badges.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      Timezone
                    </h4>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">
                            {formatTimezone(profile.oocTimezone)}
                          </p>
                          {profile.oocTimezone && (
                            <p className="text-xs text-gray-500">{profile.oocTimezone}</p>
                          )}
                        </div>
                      </div>
                      {profile.oocTimezone && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-xs text-gray-400">
                            Current time:{' '}
                            <span className="text-white">
                              {new Date().toLocaleTimeString('en-US', {
                                timeZone: profile.oocTimezone,
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </div>
      </div>
    </div>
  )
}
