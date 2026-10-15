'use client'

import { useState, useEffect, startTransition } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Settings, Palette, Users, Shield, Link2, Trash2, Plus, ChevronRight,
  X, Check, AlertTriangle, Copy, RefreshCw, ChevronDown, Hash, Lock,
  UserPlus, Ban, Crown, Edit2, Save, Image as ImageIcon, Zap, Rocket
} from 'lucide-react'
import { STORYLINE_CATEGORIES } from '@/lib/constants'
import { getTierInfo } from '@/lib/boost-tiers'
import { useVariantAccent } from '@/lib/ui-variant-styles'
import { formatSifyCode, formatSifyExpiry } from '@/lib/invites'

interface StorylineSettingsProps {
  storylineId: string
  onClose: () => void
  onUpdate: () => void
}

interface StorylineData {
  id: string
  name: string
  description: string | null
  lore: string | null
  iconUrl: string | null
  bannerUrl: string | null
  category: string
  isPublic: boolean
  accentColor: string
  welcomeMessage: string | null
  requireApproval: boolean
  memberCap: number | null
  boostChronos: number
  boostTier: number
  owner: { id: string; username: string }
  isMember: boolean
  role: string | null
  customRole: { id: string; name: string; color: string; canChangeSettings?: boolean; canManageRoles?: boolean; canManageChannels?: boolean; canKickMembers?: boolean; canBanMembers?: boolean; canInvite?: boolean } | null
  roles: Array<{
    id: string
    name: string
    color: string
    position: number
    canManageChannels: boolean
    canManageRoles: boolean
    canKickMembers: boolean
    canBanMembers: boolean
    canManageMessages: boolean
    canInvite: boolean
    canChangeSettings: boolean
    isAdmin: boolean
    members?: { id: string }[]
  }>
  categories: Array<{
    id: string
    name: string
    position: number
    collapsed: boolean
    channels: Array<{ id: string; name: string; type: string; position: number; topic: string | null; slowMode: number | null; locked: boolean }>
  }>
  channels: Array<{ id: string; name: string; type: string; categoryId: string | null }>
  invites: Array<{
    id: string
    code: string
    maxUses: number | null
    uses: number
    expiresAt: string | null
    createdAt: string
    displayCode?: string
    status?: 'active' | 'expired' | 'exhausted'
  }>
  members: Array<{
    id: string
    role: string
    joinedAt: string
    user: { id: string; username: string; avatarUrl: string | null }
    customRole: { id: string; name: string; color: string } | null
  }>
}

type SettingsTab = 'overview' | 'appearance' | 'channels' | 'roles' | 'invites' | 'members' | 'boosters'

interface InviteItem {
  id: string
  code: string
  displayCode: string
  maxUses: number | null
  uses: number
  expiresAt: string | null
  createdAt: string
  status: 'active' | 'expired' | 'exhausted'
}

const INVITE_STATUS_STYLES: Record<InviteItem['status'], { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  expired: { label: 'Expired', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  exhausted: { label: 'Maxed out', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
}

// Fetch all invites for a storyline (with SI.FY:// display codes + status)
async function fetchInvitesList(id: string): Promise<InviteItem[]> {
  try {
    const response = await fetch(`/api/storylines/${id}/invites`)
    if (response.ok) {
      const data = await response.json()
      return Array.isArray(data.invites) ? data.invites : []
    }
  } catch (error) {
    console.error('Failed to fetch invites:', error)
  }
  return []
}

export function StorylineSettings({ storylineId, onClose, onUpdate }: StorylineSettingsProps) {
  const { user } = useAuth()
  const accent = useVariantAccent()
  const [storyline, setStoryline] = useState<StorylineData | null>(null)
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lore, setLore] = useState('')
  const [category, setCategory] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [accentColor, setAccentColor] = useState('#8b5cf6')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [requireApproval, setRequireApproval] = useState(false)
  const [memberCap, setMemberCap] = useState('')
  
  // Category/Channel states
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  
  // Role states
  const [newRoleName, setNewRoleName] = useState('')
  const [editingRole, setEditingRole] = useState<string | null>(null)
  
  // Invite states
  const [invites, setInvites] = useState<InviteItem[]>([])
  const [newInviteMaxUses, setNewInviteMaxUses] = useState('')
  const [newInviteExpiresIn, setNewInviteExpiresIn] = useState('168') // hours; 168 = 7 days (default)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  
  // Boosters state
  const [boosters, setBoosters] = useState<Array<{
    id: string
    amount: number
    expiresAt: string
    createdAt: string
    persona: {
      id: string
      name: string
      avatarUrl: string | null
      username: string
    }
  }>>([])
  const [boostStats, setBoostStats] = useState<{
    boostChronos: number
    boostTier: number
    currentThreshold: number
    nextThreshold: number | null
    progress: number
    chronosToNext: number | null
  } | null>(null)
  const [isLoadingBoosters, setIsLoadingBoosters] = useState(false)
  
  // Check permissions
  const canChangeSettings = storyline?.role === 'owner' || 
    storyline?.role === 'admin' || 
    storyline?.customRole?.canChangeSettings
  const canManageRoles = storyline?.role === 'owner' || 
    storyline?.role === 'admin' || 
    storyline?.customRole?.canManageRoles
  const canManageChannels = storyline?.role === 'owner' || 
    storyline?.role === 'admin' || 
    storyline?.customRole?.canManageChannels
  const canKickMembers = storyline?.role === 'owner' || 
    storyline?.role === 'admin' || 
    storyline?.customRole?.canKickMembers
  const canBanMembers = storyline?.role === 'owner' || 
    storyline?.role === 'admin' || 
    storyline?.customRole?.canBanMembers
  const canInvite = storyline?.role === 'owner' || 
    storyline?.role === 'admin' || 
    storyline?.customRole?.canInvite
  
  // Fetch storyline data
  useEffect(() => {
    async function fetchStoryline() {
      try {
        const response = await fetch(`/api/storylines/${storylineId}`)
        if (response.ok) {
          const data = await response.json()
          setStoryline(data.storyline)
          setName(data.storyline.name)
          setDescription(data.storyline.description || '')
          setLore(data.storyline.lore || '')
          setCategory(data.storyline.category)
          setIsPublic(data.storyline.isPublic)
          setAccentColor(data.storyline.accentColor || '#8b5cf6')
          setWelcomeMessage(data.storyline.welcomeMessage || '')
          setRequireApproval(data.storyline.requireApproval || false)
          setMemberCap(data.storyline.memberCap || '')
        }
      } catch (error) {
        console.error('Failed to fetch storyline:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStoryline()
  }, [storylineId])
  
  // Fetch invites (all statuses, with SI.FY:// display codes)
  useEffect(() => {
    async function loadInvites() {
      setInvites(await fetchInvitesList(storylineId))
    }
    loadInvites()
  }, [storylineId])
  
  // Save basic settings
  const saveSettings = async () => {
    if (!canChangeSettings) return
    
    setIsSaving(true)
    try {
      const response = await fetch(`/api/storylines/${storylineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          lore: lore.trim() || null,
          category,
          isPublic,
          accentColor,
          welcomeMessage: welcomeMessage.trim() || null,
          requireApproval,
          memberCap: memberCap ? parseInt(memberCap) : null
        })
      })
      
      if (response.ok) {
        onUpdate()
        // Refresh data
        const data = await response.json()
        setStoryline(prev => prev ? { ...prev, ...data.storyline } : null)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Create category
  const createCategory = async () => {
    if (!newCategoryName.trim() || !canManageChannels) return
    
    try {
      const response = await fetch(`/api/storylines/${storylineId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      })
      
      if (response.ok) {
        setNewCategoryName('')
        onUpdate()
        // Refresh
        const res = await fetch(`/api/storylines/${storylineId}`)
        if (res.ok) {
          const data = await res.json()
          setStoryline(data.storyline)
        }
      }
    } catch (error) {
      console.error('Failed to create category:', error)
    }
  }
  
  // Create channel
  const createChannel = async () => {
    if (!newChannelName.trim() || !canManageChannels) return
    
    try {
      const response = await fetch(`/api/storylines/${storylineId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newChannelName.trim(),
          categoryId: selectedCategoryId
        })
      })
      
      if (response.ok) {
        setNewChannelName('')
        onUpdate()
        // Refresh
        const res = await fetch(`/api/storylines/${storylineId}`)
        if (res.ok) {
          const data = await res.json()
          setStoryline(data.storyline)
        }
      }
    } catch (error) {
      console.error('Failed to create channel:', error)
    }
  }
  
  // Create role
  const createRole = async () => {
    if (!newRoleName.trim() || !canManageRoles) return
    
    try {
      const response = await fetch(`/api/storylines/${storylineId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName.trim() })
      })
      
      if (response.ok) {
        setNewRoleName('')
        // Refresh
        const res = await fetch(`/api/storylines/${storylineId}`)
        if (res.ok) {
          const data = await res.json()
          setStoryline(data.storyline)
        }
      }
    } catch (error) {
      console.error('Failed to create role:', error)
    }
  }
  
  // Create invite (SI.FY:// code)
  const createInvite = async () => {
    if (!canInvite || isCreatingInvite) return
    
    setIsCreatingInvite(true)
    try {
      const response = await fetch(`/api/storylines/${storylineId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxUses: newInviteMaxUses ? parseInt(newInviteMaxUses) : 0,
          // hours until expiry; 0 = never, absent = server default (7 days)
          expiresIn: newInviteExpiresIn === 'never' ? 0 : parseInt(newInviteExpiresIn)
        })
      })
      
      if (response.ok) {
        setNewInviteMaxUses('')
        setInvites(await fetchInvitesList(storylineId))
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to create invite:', error)
    } finally {
      setIsCreatingInvite(false)
    }
  }
  
  // Copy SI.FY:// invite code
  const copyInviteCode = (code: string) => {
    const url = formatSifyCode(code)
    navigator.clipboard.writeText(url)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }
  
  // Delete invite
  const deleteInvite = async (inviteId: string) => {
    if (!canInvite) return
    
    try {
      await fetch(`/api/storylines/${storylineId}/invites/${inviteId}`, {
        method: 'DELETE'
      })
      setInvites(await fetchInvitesList(storylineId))
      onUpdate()
    } catch (error) {
      console.error('Failed to delete invite:', error)
    }
  }
  
  // Kick member
  const kickMember = async (memberId: string) => {
    if (!canKickMembers) return
    if (!confirm('Kick this member?')) return
    
    try {
      await fetch(`/api/storylines/${storylineId}/members/${memberId}`, {
        method: 'DELETE'
      })
      onUpdate()
      // Refresh
      const res = await fetch(`/api/storylines/${storylineId}`)
      if (res.ok) {
        const data = await res.json()
        setStoryline(data.storyline)
      }
    } catch (error) {
      console.error('Failed to kick member:', error)
    }
  }
  
  // Ban member
  const banMember = async (userId: string, username: string) => {
    if (!canBanMembers) return
    const reason = prompt(`Reason for banning ${username}:`)
    if (reason === null) return // Cancelled
    
    try {
      await fetch(`/api/storylines/${storylineId}/bans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason })
      })
      onUpdate()
      // Refresh
      const res = await fetch(`/api/storylines/${storylineId}`)
      if (res.ok) {
        const data = await res.json()
        setStoryline(data.storyline)
      }
    } catch (error) {
      console.error('Failed to ban member:', error)
    }
  }
  
  // Fetch boosters
  const fetchBoosters = async () => {
    if (!canChangeSettings) return
    setIsLoadingBoosters(true)
    try {
      const response = await fetch(`/api/storylines/${storylineId}/boosts`)
      if (response.ok) {
        const data = await response.json()
        setBoosters(data.boosts)
        setBoostStats(data.boostStats)
      }
    } catch (error) {
      console.error('Failed to fetch boosters:', error)
    } finally {
      setIsLoadingBoosters(false)
    }
  }
  
  // Fetch boosters when tab changes to boosters
  useEffect(() => {
    if (activeTab === 'boosters' && canChangeSettings) {
      startTransition(() => { fetchBoosters() })
    }
  }, [activeTab, canChangeSettings])
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-slate-300">Loading...</div>
      </div>
    )
  }
  
  if (!storyline) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-red-400">Failed to load storyline</div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-[#100e0d] rounded-xl border border-white/[0.08] shadow-2xl flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 border-r border-white/[0.08] bg-[#0c0a09] flex flex-col">
          <div className="p-4 border-b border-white/[0.08]">
            <h2 className="font-bold text-lg text-slate-100">Server Settings</h2>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeTab === 'overview' 
                    ? 'bg-orange-500/15 text-slate-100' 
                    : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'
                }`}
              >
                <Settings className="w-4 h-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeTab === 'appearance' 
                    ? 'bg-orange-500/15 text-slate-100' 
                    : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'
                }`}
              >
                <Palette className="w-4 h-4" />
                Appearance
              </button>
              <button
                onClick={() => setActiveTab('channels')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeTab === 'channels' 
                    ? 'bg-orange-500/15 text-slate-100' 
                    : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'
                }`}
              >
                <Hash className="w-4 h-4" />
                Channels
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeTab === 'roles' 
                    ? 'bg-orange-500/15 text-slate-100' 
                    : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'
                }`}
              >
                <Shield className="w-4 h-4" />
                Roles
              </button>
              <button
                onClick={() => setActiveTab('invites')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeTab === 'invites' 
                    ? 'bg-orange-500/15 text-slate-100' 
                    : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Invites
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeTab === 'members' 
                    ? 'bg-orange-500/15 text-slate-100' 
                    : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'
                }`}
              >
                <Users className="w-4 h-4" />
                Members
              </button>
              {canChangeSettings && (
                <button
                  onClick={() => setActiveTab('boosters')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'boosters' 
                      ? 'bg-orange-500/15 text-slate-100' 
                      : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'
                  }`}
                >
                  <Rocket className="w-4 h-4" />
                  Boosters
                </button>
              )}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-white/[0.08]">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05] transition-all"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-xl">
                <h3 className="text-xl font-bold text-slate-100">Server Overview</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Server Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!canChangeSettings}
                      className="bg-[#100e0d] border-orange-500/20 text-slate-100"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Short Description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="A brief description shown in server listings..."
                      rows={2}
                      disabled={!canChangeSettings}
                      className="bg-[#100e0d] border-orange-500/20 text-slate-100 resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Lore / Backstory</label>
                    <Textarea
                      value={lore}
                      onChange={(e) => setLore(e.target.value)}
                      placeholder="Detailed lore, backstory, world-building..."
                      rows={6}
                      disabled={!canChangeSettings}
                      className="bg-[#100e0d] border-orange-500/20 text-slate-100 resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={!canChangeSettings}
                      className="w-full px-3 py-2 rounded-lg bg-[#100e0d] border border-orange-500/20 text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {STORYLINE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#100e0d] border border-white/[0.08]">
                    <div>
                      <p className="font-medium text-slate-100">Public Server</p>
                      <p className="text-xs text-slate-500">Anyone can find and join</p>
                    </div>
                    <button
                      onClick={() => setIsPublic(!isPublic)}
                      disabled={!canChangeSettings}
                      className={`w-12 h-6 rounded-full transition-all ${
                        isPublic ? 'bg-orange-500' : 'bg-orange-500/15'
                      } ${canChangeSettings ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                        isPublic ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#100e0d] border border-white/[0.08]">
                    <div>
                      <p className="font-medium text-slate-100">Require Approval</p>
                      <p className="text-xs text-slate-500">New members need approval to join</p>
                    </div>
                    <button
                      onClick={() => setRequireApproval(!requireApproval)}
                      disabled={!canChangeSettings}
                      className={`w-12 h-6 rounded-full transition-all ${
                        requireApproval ? 'bg-orange-500' : 'bg-orange-500/15'
                      } ${canChangeSettings ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                        requireApproval ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Member Cap (optional)</label>
                    <Input
                      type="number"
                      value={memberCap}
                      onChange={(e) => setMemberCap(e.target.value)}
                      placeholder="No limit"
                      disabled={!canChangeSettings}
                      className="bg-[#100e0d] border-orange-500/20 text-slate-100"
                    />
                    <p className="text-xs text-slate-500 mt-1">Maximum number of members</p>
                  </div>
                  
                  {canChangeSettings && (
                    <Button
                      onClick={saveSettings}
                      disabled={isSaving}
                      className="btn-persona w-full"
                    >
                      {isSaving ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 max-w-xl">
                <h3 className="text-xl font-bold text-slate-100">Appearance</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Accent Color</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        disabled={!canChangeSettings}
                        className="w-12 h-10 rounded-lg cursor-pointer border border-orange-500/20"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        disabled={!canChangeSettings}
                        className="flex-1 bg-[#100e0d] border-orange-500/20 text-slate-100"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">This color appears on buttons and highlights</p>
                  </div>
                  
                  <div className="flex gap-4">
                    {['#8b5cf6', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1'].map(color => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        disabled={!canChangeSettings}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          accentColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Welcome Message</label>
                    <Textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="A message shown to new members when they join..."
                      rows={3}
                      disabled={!canChangeSettings}
                      className="bg-[#100e0d] border-orange-500/20 text-slate-100 resize-none"
                    />
                  </div>
                  
                  {canChangeSettings && (
                    <Button
                      onClick={saveSettings}
                      disabled={isSaving}
                      className="btn-persona w-full"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Channels Tab */}
            {activeTab === 'channels' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-100">Channels & Categories</h3>
                
                {/* Categories */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-300">Categories</h4>
                  
                  {(storyline.categories || []).map(cat => (
                    <div key={cat.id} className="p-3 rounded-lg bg-[#100e0d] border border-white/[0.08]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-100">{cat.name}</span>
                        <span className="text-xs text-slate-500">{(cat.channels || []).length} channels</span>
                      </div>
                      {(cat.channels || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {cat.channels.map(ch => (
                            <span key={ch.id} className="px-2 py-0.5 rounded text-xs bg-white/[0.05] text-slate-300">
                              # {ch.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {canManageChannels && (
                    <div className="flex gap-2">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New category name..."
                        className="flex-1 bg-[#100e0d] border-orange-500/20 text-slate-100"
                      />
                      <Button onClick={createCategory} className="btn-persona">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Create Channel */}
                {canManageChannels && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-300">Create Channel</h4>
                    <div className="flex gap-2">
                      <Input
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        placeholder="new-channel"
                        className="flex-1 bg-[#100e0d] border-orange-500/20 text-slate-100"
                      />
                      <select
                        value={selectedCategoryId || ''}
                        onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                        className="px-3 py-2 rounded-lg bg-[#100e0d] border border-orange-500/20 text-slate-100"
                      >
                        <option value="">No category</option>
                        {(storyline.categories || []).map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <Button onClick={createChannel} className="btn-persona">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Roles Tab */}
            {activeTab === 'roles' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-100">Roles</h3>
                
                <div className="space-y-2">
                  {(storyline.roles || []).sort((a, b) => b.position - a.position).map(role => (
                    <div key={role.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#100e0d] border border-white/[0.08]">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                      <span className="font-medium text-slate-100 flex-1">{role.name}</span>
                      {role.isAdmin && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">Admin</span>
                      )}
                      {storyline.role === 'owner' && role.name !== 'Owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRole(editingRole === role.id ? null : role.id)}
                          className="text-slate-400 hover:text-slate-200"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                {canManageRoles && (
                  <div className="flex gap-2">
                    <Input
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="New role name..."
                      className="flex-1 bg-[#100e0d] border-orange-500/20 text-slate-100"
                    />
                    <Button onClick={createRole} className="btn-persona">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Invites Tab */}
            {activeTab === 'invites' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">Invite Codes</h3>
                  <p className="text-xs text-slate-500 mt-1">SI.FY = “Server Invite For You” — share the SI.FY:// code and members enter it to join</p>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {invites.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No invites yet</p>
                      <p className="text-sm">Create one below to share with others</p>
                    </div>
                  ) : (
                    invites.map(invite => {
                      const status = invite.status || 'active'
                      const statusStyle = INVITE_STATUS_STYLES[status]
                      return (
                        <div key={invite.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#100e0d] border border-white/[0.08]">
                          <div className="flex-1 min-w-0">
                            <code className="block text-sm text-cyan-400 font-mono truncate">
                              {invite.displayCode || formatSifyCode(invite.code)}
                            </code>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className={`px-2 py-0.5 rounded text-[11px] border font-medium ${statusStyle.className}`}>
                                {statusStyle.label}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatSifyExpiry(invite.expiresAt)}
                              </span>
                              <span className="text-xs text-slate-500">
                                · {invite.maxUses ? `${invite.uses}/${invite.maxUses} uses` : `${invite.uses} ${invite.uses === 1 ? 'use' : 'uses'}`}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteCode(invite.code)}
                            className="text-slate-400 hover:text-slate-200 flex-shrink-0"
                            title="Copy SI.FY:// code"
                          >
                            {copiedCode === invite.code ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteInvite(invite.id)}
                            className="text-red-400 hover:text-red-300 flex-shrink-0"
                            title="Revoke invite"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    })
                  )}
                </div>
                
                {canInvite && (
                  <div className="p-4 rounded-lg bg-[#100e0d] border border-white/[0.08] space-y-3">
                    <h4 className="font-medium text-slate-100">Create New Invite</h4>
                    <div className="flex flex-wrap gap-3">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Max Uses</label>
                        <Input
                          type="number"
                          min={0}
                          value={newInviteMaxUses}
                          onChange={(e) => setNewInviteMaxUses(e.target.value)}
                          placeholder="Unlimited"
                          className="w-28 bg-[#0c0a09] border-orange-500/20 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Expires</label>
                        <select
                          value={newInviteExpiresIn}
                          onChange={(e) => setNewInviteExpiresIn(e.target.value)}
                          className="px-3 py-2 rounded-lg bg-[#0c0a09] border border-orange-500/20 text-slate-100"
                        >
                          <option value="24">1 day</option>
                          <option value="168">7 days</option>
                          <option value="720">30 days</option>
                          <option value="never">Never</option>
                        </select>
                      </div>
                    </div>
                    <Button onClick={createInvite} disabled={isCreatingInvite} className="btn-persona">
                      <Plus className="w-4 h-4 mr-2" />
                      {isCreatingInvite ? 'Creating…' : 'Create Invite'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-100">Members ({(storyline.members || []).length})</h3>
                
                <div className="space-y-1">
                  {(storyline.members || []).map(member => {
                    const isOwner = member.role === 'owner'
                    const canModerate = (canKickMembers || canBanMembers) && !isOwner && member.user.id !== user?.id
                    
                    return (
                      <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors">
                        <Avatar className="w-8 h-8 border border-orange-500/20">
                          <AvatarImage src={member.user.avatarUrl || undefined} />
                          <AvatarFallback className={`bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-white text-sm`}>
                            {member.user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-100 truncate">{member.user.username}</p>
                          <p className="text-xs text-slate-500">
                            {member.customRole?.name || (isOwner ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Member')}
                          </p>
                        </div>
                        {isOwner && (
                          <Crown className="w-4 h-4 text-amber-400" />
                        )}
                        {canModerate && (
                          <div className="flex gap-1">
                            {canKickMembers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => kickMember(member.id)}
                                className="text-slate-400 hover:text-red-400"
                                title="Kick"
                              >
                                <UserPlus className="w-4 h-4 rotate-180" />
                              </Button>
                            )}
                            {canBanMembers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => banMember(member.user.id, member.user.username)}
                                className="text-red-400 hover:text-red-300"
                                title="Ban"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Boosters Tab */}
            {activeTab === 'boosters' && canChangeSettings && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-100">Server Boosters</h3>
                
                {/* Tier Progress */}
                {boostStats && (
                  <div className="p-4 rounded-xl bg-[#100e0d] border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Current Tier</span>
                      <Badge 
                        variant="outline" 
                        className="px-3 py-1 text-sm border-amber-500/30 bg-amber-500/10 text-amber-400"
                      >
                        <Zap className="w-3.5 h-3.5 mr-1" />
                        Tier {boostStats.boostTier}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{boostStats.currentThreshold} Chronos</span>
                        {boostStats.nextThreshold ? (
                          <span>{boostStats.nextThreshold} Chronos</span>
                        ) : (
                          <span className="text-amber-400">Max Tier!</span>
                        )}
                      </div>
                      <Progress 
                        value={boostStats.progress * 100} 
                        className="h-2 bg-slate-900/25"
                      />
                      <p className="text-xs text-center text-slate-500">
                        {boostStats.boostChronos} total Chronos
                        {boostStats.chronosToNext && ` (${boostStats.chronosToNext} to Tier ${boostStats.boostTier + 1})`}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Boosters List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-300">Active Boosters ({boosters.length})</h4>
                  
                  {isLoadingBoosters ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  ) : boosters.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Rocket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No active boosters yet</p>
                      <p className="text-sm">Boost this server to unlock perks!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {boosters.map(booster => (
                        <div key={booster.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#100e0d] border border-white/[0.08]">
                          <Avatar className="w-8 h-8 border border-amber-500/30">
                            <AvatarImage src={booster.persona.avatarUrl || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-amber-500/50 to-orange-500/50 text-white text-sm">
                              {booster.persona.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-100 truncate">{booster.persona.name}</p>
                            <p className="text-xs text-slate-500">@{booster.persona.username}</p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="px-2 py-0.5 text-xs border-amber-500/30 bg-amber-500/10 text-amber-400"
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            {booster.amount}
                          </Badge>
                          <div className="text-xs text-slate-500 text-right">
                            <div>Expires</div>
                            <div>{new Date(booster.expiresAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
