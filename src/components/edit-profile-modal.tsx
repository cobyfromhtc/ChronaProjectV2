'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  X, Crown, Check, Edit2, Loader2, Camera, User, Calendar,
  Coins, Users as UsersIcon, ArrowRightLeft, Sparkles,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface LinkedAccount {
  id: string
  email: string | null
  username: string
  avatarUrl: string | null
  role: string
  isActive: boolean
}

interface ProfileStats {
  totalPersonas: number
  chronos: number
  createdAt: string
}

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onRevealSecurityKey: () => void
}

export function EditProfileModal({ isOpen, onClose, onRevealSecurityKey }: EditProfileModalProps) {
  const { user, setUser, switchAccount } = useAuth()
  const [newUsername, setNewUsername] = useState('')
  const [isChangingName, setIsChangingName] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Bio state
  const [bio, setBio] = useState('')
  const [isSavingBio, setIsSavingBio] = useState(false)

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarFileRef = useRef<HTMLInputElement>(null)

  // Account stats
  const [stats, setStats] = useState<ProfileStats | null>(null)

  // Account switcher
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [isSwitching, setIsSwitching] = useState<string | null>(null)

  // Active section
  const [activeSection, setActiveSection] = useState<'profile' | 'accounts'>('profile')

  // Initialize form values when user changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      setBio(user.bio || '')
      fetchProfile()
      fetchAccounts()
    }
  }, [user, isOpen])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setStats({
          totalPersonas: data.profile.totalPersonas,
          chronos: data.profile.chronos,
          createdAt: data.profile.createdAt,
        })
      }
    } catch (err) {
      console.error('Failed to fetch profile stats:', err)
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/auth/accounts')
      if (response.ok) {
        const data = await response.json()
        setLinkedAccounts(data.accounts || [])
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
    }
  }

  if (!isOpen || !user) return null

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

  const handleSaveBio = async () => {
    setIsSavingBio(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update bio')
      }

      setUser(data.user)
      setSuccess('Bio updated!')

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bio')
    } finally {
      setIsSavingBio(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setIsUploadingAvatar(true)
    setError('')
    setSuccess('')

    try {
      // Upload the image first
      const formData = new FormData()
      formData.append('file', file)
      const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image')
      }

      const uploadData = await uploadResponse.json()
      const avatarUrl = uploadData.url

      // Update user profile with new avatar URL
      const profileResponse = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl }),
      })

      const profileData = await profileResponse.json()

      if (!profileResponse.ok) {
        throw new Error(profileData.error || 'Failed to update avatar')
      }

      setUser(profileData.user)
      setSuccess('Avatar updated!')

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
      if (avatarFileRef.current) avatarFileRef.current.value = ''
    }
  }

  const handleSwitchAccount = async (userId: string) => {
    setIsSwitching(userId)
    setError('')

    try {
      const result = await switchAccount(userId)
      if (result) {
        setSuccess(`Switched to ${result.username}!`)
        // Refresh data
        fetchAccounts()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch account')
    } finally {
      setIsSwitching(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col persona-modal overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] bg-gradient-to-r from-teal-900/30 to-cyan-900/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Edit Profile</h2>
                <p className="text-sm text-slate-400">Manage your account settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 mt-4 persona-tabs p-1">
            <button
              onClick={() => setActiveSection('profile')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                activeSection === 'profile'
                  ? 'persona-tab-active text-white'
                  : 'persona-tab text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4 inline mr-1.5" />
              Profile
            </button>
            <button
              onClick={() => setActiveSection('accounts')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                activeSection === 'accounts'
                  ? 'persona-tab-active text-white'
                  : 'persona-tab text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 inline mr-1.5" />
              Accounts
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {/* Status messages */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm persona-animate-in">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-1.5 persona-animate-in">
              <Check className="w-3.5 h-3.5" />
              {success}
            </div>
          )}

          {activeSection === 'profile' ? (
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <Avatar className="w-20 h-20 border-2 border-teal-500/25">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-400 text-white text-2xl font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-100 text-lg">{user.username}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {user.role === 'member' ? 'Member' : user.role === 'user' ? 'Member' : user.role}
                  </p>
                  <button
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="mt-2 text-xs text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    Change avatar
                  </button>
                </div>
              </div>

              {/* Bio Section */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">About Me</label>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) setBio(e.target.value)
                  }}
                  placeholder="Tell others about yourself..."
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0e1015] border border-teal-500/20 text-white placeholder-slate-500/40 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none h-20"
                  maxLength={200}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">A brief description about yourself</p>
                  <span className={`text-xs ${bio.length > 180 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {bio.length}/200
                  </span>
                </div>
                <button
                  onClick={handleSaveBio}
                  disabled={isSavingBio || bio === (user.bio || '')}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingBio ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Bio'
                  )}
                </button>
              </div>

              {/* Change Username */}
              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <label className="block text-sm font-medium text-slate-200">Change Username</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder={user.username}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-[#0e1015] border border-teal-500/20 text-white placeholder-slate-500/40 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    maxLength={20}
                  />
                  <button
                    onClick={handleChangeUsername}
                    disabled={isChangingName || !newUsername.trim()}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {isChangingName ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Letters, numbers, and underscores. 3-20 characters.</p>
              </div>

              {/* Account Stats */}
              {stats && (
                <div className="pt-4 border-t border-white/[0.08]">
                  <p className="text-sm font-medium text-slate-200 mb-3">Account Stats</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="persona-card p-3 text-center">
                      <Calendar className="w-4 h-4 text-teal-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Member Since</p>
                      <p className="text-sm font-medium text-slate-200 mt-0.5">
                        {formatDistanceToNow(new Date(stats.createdAt), { addSuffix: false })}
                      </p>
                    </div>
                    <div className="persona-card p-3 text-center">
                      <UsersIcon className="w-4 h-4 text-teal-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Personas</p>
                      <p className="text-sm font-medium text-slate-200 mt-0.5">{stats.totalPersonas}</p>
                    </div>
                    <div className="persona-card p-3 text-center">
                      <Coins className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Chronos</p>
                      <p className="text-sm font-medium text-amber-300 mt-0.5">{stats.chronos}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Key Section */}
              <div className="pt-4 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Security Key</p>
                    <p className="text-xs text-slate-500">Required for every login</p>
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
            </div>
          ) : (
            /* ==================== ACCOUNTS SECTION ==================== */
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Switch between your linked accounts without logging out.
              </p>

              {linkedAccounts.length === 0 ? (
                <div className="persona-card p-6 text-center">
                  <UsersIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No other linked accounts</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Sign up with another account to switch between them
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`persona-card p-3 flex items-center gap-3 transition-all ${
                        account.isActive
                          ? 'border-teal-500/30 bg-teal-500/[0.05]'
                          : 'hover:border-teal-500/20 cursor-pointer'
                      }`}
                    >
                      <Avatar className="w-10 h-10 border border-teal-500/15">
                        <AvatarImage src={account.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-400 text-white text-sm font-medium">
                          {account.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-100 truncate">
                            {account.username}
                          </p>
                          {account.isActive && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                              <span className="w-1 h-1 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 capitalize">
                          {account.role === 'member' || account.role === 'user' ? 'Member' : account.role}
                        </p>
                      </div>
                      {!account.isActive && (
                        <button
                          onClick={() => handleSwitchAccount(account.id)}
                          disabled={isSwitching === account.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-teal-400 border border-teal-500/20 hover:bg-teal-500/10 transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isSwitching === account.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ArrowRightLeft className="w-3 h-3" />
                          )}
                          Switch
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
