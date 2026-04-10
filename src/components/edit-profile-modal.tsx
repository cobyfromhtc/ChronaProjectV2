'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  X, Crown, Check, Edit2, Loader2, User, Globe, Bell, Calendar as CalendarIcon, 
  Link as LinkIcon, Save, Upload, Plus, Trash2, ChevronDown
} from 'lucide-react'
import { format } from 'date-fns'
import type { OocLink } from '@/stores/auth-store'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onRevealSecurityKey: () => void
}

const AVAILABILITY_OPTIONS = [
  { value: 'online', label: 'Online', color: 'bg-emerald-500' },
  { value: 'away', label: 'Away', color: 'bg-amber-500' },
  { value: 'busy', label: 'Busy', color: 'bg-red-500' },
  { value: 'hiatus', label: 'Hiatus', color: 'bg-purple-500' },
] as const

const TIMEZONES = [
  'UTC-12:00 (Baker Island)',
  'UTC-11:00 (American Samoa)',
  'UTC-10:00 (Hawaii)',
  'UTC-09:00 (Alaska)',
  'UTC-08:00 (Pacific Time)',
  'UTC-07:00 (Mountain Time)',
  'UTC-06:00 (Central Time)',
  'UTC-05:00 (Eastern Time)',
  'UTC-04:00 (Atlantic Time)',
  'UTC-03:00 (Brazil, Argentina)',
  'UTC-02:00 (Mid-Atlantic)',
  'UTC-01:00 (Azores)',
  'UTC+00:00 (London, Dublin)',
  'UTC+01:00 (Paris, Berlin)',
  'UTC+02:00 (Cairo, Athens)',
  'UTC+03:00 (Moscow, Istanbul)',
  'UTC+04:00 (Dubai)',
  'UTC+05:00 (Karachi)',
  'UTC+05:30 (Mumbai, Delhi)',
  'UTC+06:00 (Dhaka)',
  'UTC+07:00 (Bangkok, Jakarta)',
  'UTC+08:00 (Singapore, Hong Kong)',
  'UTC+09:00 (Tokyo, Seoul)',
  'UTC+10:00 (Sydney, Melbourne)',
  'UTC+11:00 (Solomon Islands)',
  'UTC+12:00 (Auckland, Fiji)',
]

const LINK_PRESETS = [
  { name: 'Discord', placeholder: 'https://discord.gg/...' },
  { name: 'Twitter', placeholder: 'https://twitter.com/...' },
  { name: 'Instagram', placeholder: 'https://instagram.com/...' },
  { name: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { name: 'YouTube', placeholder: 'https://youtube.com/@...' },
  { name: 'Twitch', placeholder: 'https://twitch.tv/...' },
  { name: 'Website', placeholder: 'https://...' },
]

export function EditProfileModal({ isOpen, onClose, onRevealSecurityKey }: EditProfileModalProps) {
  const { user, setUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Username state
  const [newUsername, setNewUsername] = useState('')
  const [isChangingName, setIsChangingName] = useState(false)
  
  // Avatar state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  
  // Availability state
  const [availabilityStatus, setAvailabilityStatus] = useState<'online' | 'away' | 'busy' | 'hiatus'>('online')
  const [statusMessage, setStatusMessage] = useState('')
  const [hiatusUntil, setHiatusUntil] = useState<Date | undefined>(undefined)
  
  // OOC Profile state
  const [oocShowProfile, setOocShowProfile] = useState(true)
  const [oocDisplayName, setOocDisplayName] = useState('')
  const [oocBio, setOocBio] = useState('')
  const [oocPronouns, setOocPronouns] = useState('')
  const [oocTimezone, setOocTimezone] = useState('')
  const [oocAge, setOocAge] = useState('')
  const [oocLinks, setOocLinks] = useState<OocLink[]>([])
  
  // Notification preferences state
  const [notifyDMs, setNotifyDMs] = useState(true)
  const [notifyMentions, setNotifyMentions] = useState(true)
  const [notifyFriendRequests, setNotifyFriendRequests] = useState(true)
  const [notifyStorylineMessages, setNotifyStorylineMessages] = useState(true)
  const [notifyMarketplace, setNotifyMarketplace] = useState(true)
  
  // UI state
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'avatar' | 'availability' | 'ooc' | 'notifications'>('avatar')

  // Initialize state from user data
  useEffect(() => {
    if (user) {
      setAvailabilityStatus((user.availabilityStatus as 'online' | 'away' | 'busy' | 'hiatus') || 'online')
      setStatusMessage(user.statusMessage || '')
      setHiatusUntil(user.hiatusUntil ? new Date(user.hiatusUntil) : undefined)
      setOocShowProfile(user.oocShowProfile ?? true)
      setOocDisplayName(user.oocDisplayName || '')
      setOocBio(user.oocBio || '')
      setOocPronouns(user.oocPronouns || '')
      setOocTimezone(user.oocTimezone || '')
      setOocAge(user.oocAge?.toString() || '')
      setOocLinks(user.oocLinks || [])
      setNotifyDMs(user.notifyDMs ?? true)
      setNotifyMentions(user.notifyMentions ?? true)
      setNotifyFriendRequests(user.notifyFriendRequests ?? true)
      setNotifyStorylineMessages(user.notifyStorylineMessages ?? true)
      setNotifyMarketplace(user.notifyMarketplace ?? true)
    }
  }, [user])

  if (!isOpen || !user) return null

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload avatar')
      }

      // Update the user's avatar URL
      const updateResponse = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: data.url }),
      })

      const updateData = await updateResponse.json()

      if (!updateResponse.ok) {
        throw new Error(updateData.error || 'Failed to update avatar')
      }

      setUser(updateData.user)
      setSuccess('Avatar updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) {
      setError('Please enter a new username')
      return
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      setError('Username must be 3-20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setError('Username can only contain letters, numbers, and underscores')
      return
    }

    setIsChangingName(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername: newUsername.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change username')
      }

      setUser(data.user)
      setNewUsername('')
      setSuccess('Username changed successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change username')
    } finally {
      setIsChangingName(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilityStatus,
          statusMessage: statusMessage.trim() || null,
          hiatusUntil: availabilityStatus === 'hiatus' && hiatusUntil ? hiatusUntil.toISOString() : null,
          oocShowProfile,
          oocDisplayName: oocDisplayName.trim() || null,
          oocBio: oocBio.trim() || null,
          oocPronouns: oocPronouns.trim() || null,
          oocTimezone: oocTimezone || null,
          oocAge: oocAge ? parseInt(oocAge) : null,
          oocLinks: oocLinks.length > 0 ? oocLinks : null,
          notifyDMs,
          notifyMentions,
          notifyFriendRequests,
          notifyStorylineMessages,
          notifyMarketplace,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      setUser(data.user)
      setSuccess('Profile saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const addOocLink = () => {
    setOocLinks([...oocLinks, { name: '', url: '' }])
  }

  const removeOocLink = (index: number) => {
    setOocLinks(oocLinks.filter((_, i) => i !== index))
  }

  const updateOocLink = (index: number, field: 'name' | 'url', value: string) => {
    const newLinks = [...oocLinks]
    newLinks[index] = { ...newLinks[index], [field]: value }
    setOocLinks(newLinks)
  }

  const getAvailabilityColor = (status: string) => {
    return AVAILABILITY_OPTIONS.find(o => o.value === status)?.color || 'bg-gray-500'
  }

  const sections = [
    { id: 'avatar' as const, label: 'Avatar', icon: User },
    { id: 'availability' as const, label: 'Availability', icon: Globe },
    { id: 'ooc' as const, label: 'OOC Profile', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-gradient-to-b from-[#150a25] to-[#0a0510] rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-gradient-to-r from-gray-900/30 to-gray-800/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-gray-300 flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Edit Profile</h2>
                <p className="text-sm text-gray-400/70">Manage your account settings</p>
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

        {/* Section Tabs */}
        <div className="border-b border-white/10 px-5 py-3 shrink-0">
          <div className="flex gap-2 overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Current Profile Card */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/15">
            <div className="relative">
              <Avatar className="w-12 h-12 border-2 border-white/30">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-white to-gray-300 text-white font-medium">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#150a25] ${getAvailabilityColor(availabilityStatus)}`} />
            </div>
            <div>
              <p className="font-semibold text-white">{user.username}</p>
              <p className="text-xs text-gray-400/60 capitalize">{user.role === 'user' ? 'Member' : user.role}</p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Avatar Section */}
          {activeSection === 'avatar' && (
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-200">Profile Avatar</label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-2 border-white/30">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-white to-gray-300 text-white font-medium text-2xl">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-gray-700 to-gray-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUploadingAvatar ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Image
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-400/50 mt-2">JPG, PNG, GIF, or WebP. Max 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Change Username */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-200">Change Username</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder={user.username}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-[#1e0f3a] border border-white/20 text-white placeholder-gray-500/40 focus:outline-none focus:ring-2 focus:ring-white text-sm"
                    maxLength={20}
                  />
                  <button
                    onClick={handleChangeUsername}
                    disabled={isChangingName || !newUsername.trim()}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-gray-700 to-gray-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {isChangingName ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400/50">Letters, numbers, and underscores. 3-20 characters.</p>
              </div>
            </div>
          )}

          {/* Availability Status Section */}
          {activeSection === 'availability' && (
            <div className="space-y-6">
              {/* Status Dropdown */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-200">Availability Status</label>
                <div className="relative">
                  <select
                    value={availabilityStatus}
                    onChange={(e) => setAvailabilityStatus(e.target.value as 'online' | 'away' | 'busy' | 'hiatus')}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#1e0f3a] border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white text-sm appearance-none cursor-pointer"
                  >
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Status Message */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-200">Custom Status Message</label>
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value.slice(0, 100))}
                  placeholder="What are you up to?"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1e0f3a] border border-white/20 text-white placeholder-gray-500/40 focus:outline-none focus:ring-2 focus:ring-white text-sm"
                  maxLength={100}
                />
                <p className="text-xs text-gray-400/50">{statusMessage.length}/100 characters</p>
              </div>

              {/* Hiatus Date Picker */}
              {availabilityStatus === 'hiatus' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-200 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Return Date (Optional)
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full px-3 py-2.5 rounded-lg bg-[#1e0f3a] border border-white/20 text-white text-sm text-left flex items-center justify-between hover:bg-[#251545] transition-colors">
                        {hiatusUntil ? format(hiatusUntil, 'PPP') : 'Select return date'}
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#1e0f3a] border border-white/20" align="start">
                      <Calendar
                        mode="single"
                        selected={hiatusUntil}
                        onSelect={setHiatusUntil}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-400/50">Let others know when you'll be back.</p>
                </div>
              )}
            </div>
          )}

          {/* OOC Profile Section */}
          {activeSection === 'ooc' && (
            <div className="space-y-6">
              {/* OOC Profile Visibility Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-medium text-gray-200">Show OOC Profile</p>
                  <p className="text-xs text-gray-400/60">Allow others to see your OOC information</p>
                </div>
                <Switch
                  checked={oocShowProfile}
                  onCheckedChange={setOocShowProfile}
                />
              </div>

              {/* Display Name */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-200">Display Name</label>
                <input
                  type="text"
                  value={oocDisplayName}
                  onChange={(e) => setOocDisplayName(e.target.value)}
                  placeholder="Your real name or nickname"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1e0f3a] border border-white/20 text-white placeholder-gray-500/40 focus:outline-none focus:ring-2 focus:ring-white text-sm"
                />
                <p className="text-xs text-gray-400/50">This is separate from your username.</p>
              </div>

              {/* Pronouns */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-200">Pronouns</label>
                <input
                  type="text"
                  value={oocPronouns}
                  onChange={(e) => setOocPronouns(e.target.value)}
                  placeholder="e.g., he/him, she/her, they/them"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1e0f3a] border border-white/20 text-white placeholder-gray-500/40 focus:outline-none focus:ring-2 focus:ring-white text-sm"
                />
              </div>

              {/* Age */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-200">Age (Optional)</label>
                <input
                  type="number"
                  value={oocAge}
                  onChange={(e) => setOocAge(e.target.value)}
                  placeholder="Your age"
                  min="13"
                  max="120"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1e0f3a] border border-white/20 text-white placeholder-gray-500/40 focus:outline-none focus:ring-2 focus:ring-white text-sm"
                />
              </div>

              {/* Timezone */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-200">Timezone</label>
                <div className="relative">
                  <select
                    value={oocTimezone}
                    onChange={(e) => setOocTimezone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#1e0f3a] border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white text-sm appearance-none cursor-pointer"
                  >
                    <option value="">Select timezone</option>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-200">About Me (OOC)</label>
                <textarea
                  value={oocBio}
                  onChange={(e) => setOocBio(e.target.value)}
                  placeholder="Tell others a bit about yourself..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1e0f3a] border border-white/20 text-white placeholder-gray-500/40 focus:outline-none focus:ring-2 focus:ring-white text-sm resize-none"
                />
              </div>

              {/* Links */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-200">Links</label>
                  <button
                    onClick={addOocLink}
                    className="text-xs text-white/70 hover:text-white flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Link
                  </button>
                </div>
                <div className="space-y-2">
                  {oocLinks.map((link, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <div className="relative">
                          <select
                            value={link.name}
                            onChange={(e) => updateOocLink(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#1e0f3a] border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white text-sm appearance-none cursor-pointer"
                          >
                            <option value="">Select type</option>
                            {LINK_PRESETS.map((preset) => (
                              <option key={preset.name} value={preset.name}>
                                {preset.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => updateOocLink(index, 'url', e.target.value)}
                          placeholder={LINK_PRESETS.find(p => p.name === link.name)?.placeholder || 'https://...'}
                          className="w-full px-3 py-2 rounded-lg bg-[#1e0f3a] border border-white/20 text-white placeholder-gray-500/40 focus:outline-none focus:ring-2 focus:ring-white text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeOocLink(index)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {oocLinks.length === 0 && (
                    <p className="text-xs text-gray-400/50 text-center py-3">No links added yet. Click "Add Link" to add one.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notification Preferences Section */}
          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400/70 mb-4">Choose what notifications you'd like to receive.</p>
              
              {/* DM Notifications */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-medium text-gray-200">Direct Messages</p>
                  <p className="text-xs text-gray-400/60">Get notified when you receive a new DM request</p>
                </div>
                <Switch
                  checked={notifyDMs}
                  onCheckedChange={setNotifyDMs}
                />
              </div>

              {/* Mention Notifications */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-medium text-gray-200">@Mentions</p>
                  <p className="text-xs text-gray-400/60">Get notified when someone mentions you</p>
                </div>
                <Switch
                  checked={notifyMentions}
                  onCheckedChange={setNotifyMentions}
                />
              </div>

              {/* Friend Request Notifications */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-medium text-gray-200">Friend Requests</p>
                  <p className="text-xs text-gray-400/60">Get notified when you receive a friend request</p>
                </div>
                <Switch
                  checked={notifyFriendRequests}
                  onCheckedChange={setNotifyFriendRequests}
                />
              </div>

              {/* Storyline Message Notifications */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-medium text-gray-200">Storyline Messages</p>
                  <p className="text-xs text-gray-400/60">Get notified about new messages in your storylines</p>
                </div>
                <Switch
                  checked={notifyStorylineMessages}
                  onCheckedChange={setNotifyStorylineMessages}
                />
              </div>

              {/* Marketplace Notifications */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-medium text-gray-200">Marketplace</p>
                  <p className="text-xs text-gray-400/60">Get notified about marketplace activity and purchases</p>
                </div>
                <Switch
                  checked={notifyMarketplace}
                  onCheckedChange={setNotifyMarketplace}
                />
              </div>
            </div>
          )}

          {/* Security Key Section - Always visible */}
          {activeSection === 'avatar' && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">Security Key</p>
                  <p className="text-xs text-gray-400/60">Required for every login</p>
                </div>
                <button
                  onClick={() => {
                    onClose()
                    onRevealSecurityKey()
                  }}
                  className="px-3 py-2 rounded-lg border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/10 transition-colors flex items-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Generate New Key
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Save Button */}
        <div className="p-5 border-t border-white/10 bg-gradient-to-r from-gray-900/30 to-gray-800/20 shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-white/20 text-gray-300 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
