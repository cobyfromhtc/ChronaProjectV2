'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Crown, Check, Edit2, Loader2 } from 'lucide-react'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onRevealSecurityKey: () => void
}

export function EditProfileModal({ isOpen, onClose, onRevealSecurityKey }: EditProfileModalProps) {
  const { user, setUser } = useAuth()
  const [newUsername, setNewUsername] = useState('')
  const [isChangingName, setIsChangingName] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

      // Update local user state
      setUser(data.user)
      setNewUsername('')
      setSuccess('Username changed successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change username')
    } finally {
      setIsChangingName(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-[#150a25] to-[#0a0510] rounded-2xl border border-purple-500/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-purple-500/15 bg-gradient-to-r from-purple-900/30 to-fuchsia-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Edit Profile</h2>
                <p className="text-sm text-purple-400/70">Manage your account settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-400/60 hover:text-purple-200 hover:bg-purple-500/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Current Profile */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Avatar className="w-12 h-12 border-2 border-purple-500/40">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white font-medium">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-purple-100">{user.username}</p>
              <p className="text-xs text-purple-400/60 capitalize">{user.role === 'user' ? 'Member' : user.role}</p>
            </div>
          </div>

          {/* Change Username */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-purple-200">Change Username</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={user.username}
                className="flex-1 px-3 py-2.5 rounded-lg bg-[#1e0f3a] border border-purple-500/30 text-white placeholder-purple-400/40 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                maxLength={20}
              />
              <button
                onClick={handleChangeUsername}
                disabled={isChangingName || !newUsername.trim()}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {isChangingName ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            {success && <p className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />{success}</p>}
            <p className="text-xs text-purple-400/50">Letters, numbers, and underscores. 3-20 characters.</p>
          </div>

          {/* Security Key Section */}
          <div className="pt-4 border-t border-purple-500/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-200">Security Key</p>
                <p className="text-xs text-purple-400/60">Required for every login</p>
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
      </div>
    </div>
  )
}
