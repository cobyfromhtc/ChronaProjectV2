'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EditProfileModal } from '@/components/edit-profile-modal'
import { LegalModal } from '@/components/legal-modal'
import { CustomTag } from '@/components/custom-tag'
import { NotificationBell } from '@/components/notification-bell'
import { NewAccountModal } from '@/components/new-account-modal'
import { apiFetch } from '@/lib/api-client'

import { 
  Users, Compass, Plus, Crown, Sparkles, LogOut, Wand2, Check,
  ChevronRight, UserPlus, Settings, LogIn, X, Heart, Edit2, Wallet, Shield, ShoppingBag,
  FileText, Scale, BookOpen, Layers
} from 'lucide-react'

// Types
interface StorylineItem {
  id: string
  name: string
  iconUrl: string | null
  category: string
  role: string
  memberCount: number
  channels: { id: string; name: string }[]
}

interface SidebarProps {
  activeTab: 'home' | 'friends' | 'storylines' | 'chat' | 'wallet' | 'admin' | 'marketplace'
  activeStorylineId: string | null
  onSelectTab: (tab: 'home' | 'friends' | 'storylines' | 'chat' | 'wallet' | 'admin' | 'marketplace') => void
  onSelectStoryline: (storylineId: string) => void
  onCreatePersona: () => void
  onCreateScenario?: () => void
  onCreateStoryline?: () => void
}

// Custom event name for storyline refresh
export const STORYLINE_REFRESH_EVENT = 'chrona:storyline-refresh'

export function Sidebar({
  activeTab,
  activeStorylineId,
  onSelectTab,
  onSelectStoryline,
  onCreatePersona,
  onCreateScenario,
  onCreateStoryline
}: SidebarProps) {
  const { user, accounts, logout, setUser, switchAccount, removeAccount, login, signup, verifySecurityKey } = useAuth()
  const { personas, activePersona, activatePersona } = usePersonas()
  
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [legalModalTab, setLegalModalTab] = useState<'tos' | 'privacy' | 'tar' | null>(null)

  const [showAddAccountModal, setShowAddAccountModal] = useState(false)
  const [addAccountMode, setAddAccountMode] = useState<'login' | 'signup'>('login')
  const [addAccountForm, setAddAccountForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    birthDay: '',
    birthMonth: '',
    birthYear: ''
  })
  const [addAccountError, setAddAccountError] = useState('')
  const [isAddingAccount, setIsAddingAccount] = useState(false)
  
  // Security key modal state
  const [showSecurityKeyModal, setShowSecurityKeyModal] = useState(false)
  const [securityKey, setSecurityKey] = useState('')
  const [securityKeyInput, setSecurityKeyInput] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [isSecurityKeyFlow, setIsSecurityKeyFlow] = useState(false)
  const [hasCopiedKey, setHasCopiedKey] = useState(false)
  
  // Reveal security key state
  const [showRevealKeyConfirm, setShowRevealKeyConfirm] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  
  const [storylines, setStorylines] = useState<StorylineItem[]>([])
  
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const accountSwitcherRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
      if (accountSwitcherRef.current && !accountSwitcherRef.current.contains(event.target as Node)) {
        setIsAccountSwitcherOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch joined storylines - as a callback so it can be called on demand
  const fetchStorylines = useCallback(async () => {
    try {
      const response = await apiFetch('/api/storylines/joined')
      if (response.ok) {
        const data = await response.json()
        setStorylines(data.storylines)
      }
    } catch (error) {
      console.error('Failed to fetch storylines:', error)
    }
  }, [])
  
  // Initial fetch on mount
  useEffect(() => {
    fetchStorylines()
  }, [fetchStorylines])
  
  // Listen for storyline refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchStorylines()
    }
    
    window.addEventListener(STORYLINE_REFRESH_EVENT, handleRefresh)
    return () => window.removeEventListener(STORYLINE_REFRESH_EVENT, handleRefresh)
  }, [fetchStorylines])
  
  // Handle switching account
  const handleSwitchAccount = async (userId: string) => {
    try {
      setIsAccountSwitcherOpen(false)
      setIsProfileMenuOpen(false)
      
      await switchAccount(userId)
      
      // Reload the page to ensure the new account is fully loaded
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch account:', error)
    }
  }
  
  // Handle removing account
  const handleRemoveAccount = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Remove this account from the list?')) return
    
    try {
      await removeAccount(userId)
    } catch (error) {
      console.error('Failed to remove account:', error)
    }
  }
  
  // Handle add account (login or signup)
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddAccountError('')
    setIsAddingAccount(true)
    
    try {
      if (addAccountMode === 'login') {
        // Use the auth hook's login function
        const result = await login(addAccountForm.username, addAccountForm.password)
        
        // Login requires security key verification
        if ('userId' in result) {
          setPendingUserId(result.userId || null)
        } else if ('id' in result) {
          setPendingUserId(result.id || null)
        } else if (result.user?.id) {
          setPendingUserId(result.user.id)
        }
        setSecurityKeyInput('')
        setIsSecurityKeyFlow(true)
        setShowAddAccountModal(false)
        setShowSecurityKeyModal(true)
      } else {
        // Signup flow - use raw fetch for now since signup hook doesn't support DOB
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            username: addAccountForm.username, 
            password: addAccountForm.password, 
            confirmPassword: addAccountForm.confirmPassword,
            birthDay: parseInt(addAccountForm.birthDay) || undefined,
            birthMonth: parseInt(addAccountForm.birthMonth) || undefined,
            birthYear: parseInt(addAccountForm.birthYear) || undefined
          }),
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create account')
        }
        
        // Show the security key that was generated
        setSecurityKey(data.securityKey)
        setPendingUserId(data.user.id)
        setIsSecurityKeyFlow(false)
        setHasCopiedKey(false)
        setShowAddAccountModal(false)
        setShowSecurityKeyModal(true)
      }
      
    } catch (error) {
      setAddAccountError(error instanceof Error ? error.message : 'Failed to add account')
    } finally {
      setIsAddingAccount(false)
    }
  }
  
  // Copy security key to clipboard
  const copySecurityKey = () => {
    navigator.clipboard.writeText(securityKey)
    setHasCopiedKey(true)
    setTimeout(() => setHasCopiedKey(false), 2000)
  }
  
  // Handle security key confirmation (after showing key for signup)
  const handleConfirmSecurityKeySaved = () => {
    setIsSecurityKeyFlow(true)
    setSecurityKeyInput('')
    setAddAccountError('')
  }
  
  // Verify security key
  const handleVerifySecurityKey = async () => {
    if (!pendingUserId || !securityKeyInput.trim()) return
    
    setAddAccountError('')
    setIsAddingAccount(true)
    
    try {
      // Use the auth hook's verifySecurityKey function
      await verifySecurityKey(pendingUserId, securityKeyInput.trim().toUpperCase())
      
      // Success - refresh to update session
      window.location.reload()
      
    } catch (error) {
      setAddAccountError(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setIsAddingAccount(false)
    }
  }
  
  // Handle revealing/generating new security key
  const handleRevealSecurityKey = async () => {
    setIsGeneratingKey(true)
    
    try {
      const response = await apiFetch('/api/auth/security-key', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate security key')
      }
      
      // Show the new security key
      setSecurityKey(data.securityKey)
      setPendingUserId(user?.id || null) // Set current user as pending for verification
      setIsSecurityKeyFlow(false)
      setHasCopiedKey(false)
      setShowRevealKeyConfirm(false)
      setShowSecurityKeyModal(true)
      
    } catch (error) {
      console.error('Failed to generate security key:', error)
      alert('Failed to generate security key. Please try again.')
    } finally {
      setIsGeneratingKey(false)
    }
  }
  
  return (
    <div className="persona-sidebar flex flex-col h-full flex-shrink-0 relative bg-black">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none z-0" />
      
      {/* Header with Logo */}
      <div className="relative z-10 p-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src="/logo.svg" 
                alt="Chrona" 
                className="relative w-10 h-10 rounded-xl object-cover"
              />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Chrona</h1>
              <p className="text-[10px] text-white/40 tracking-wider font-medium">Roleplay Universe</p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
        {/* Create Buttons Section */}
        <div className="p-3 space-y-2 flex-shrink-0">
          <button
            onClick={onCreateScenario}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 text-white/70 hover:text-white transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Create Scenario</span>
          </button>
          
          <button
            onClick={onCreatePersona}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 text-white/70 hover:text-white transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
              <Wand2 className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Create Persona</span>
          </button>
          
          <button
            onClick={onCreateStoryline}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 text-white/70 hover:text-white transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Create Storyline</span>
          </button>
        </div>
        
        {/* Separator */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-shrink-0" />
        
        {/* Navigation */}
        <div className="p-3 space-y-1 flex-shrink-0">
          {/* Discover */}
          <button
            onClick={() => onSelectTab('home')}
            className={`persona-nav-item w-full ${activeTab === 'home' ? 'persona-nav-item-active' : ''}`}
          >
            <Compass className="w-5 h-5" />
            <span className="font-medium">Discover</span>
          </button>
          
          {/* Friends */}
          <button
            onClick={() => onSelectTab('friends')}
            className={`persona-nav-item w-full ${activeTab === 'friends' ? 'persona-nav-item-active' : ''}`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Friends</span>
          </button>
          
          {/* Storylines */}
          <button
            onClick={() => onSelectTab('storylines')}
            className={`persona-nav-item w-full ${activeTab === 'storylines' ? 'persona-nav-item-active' : ''}`}
          >
            <Crown className="w-5 h-5" />
            <span className="font-medium">Storylines</span>
          </button>
          
          {/* Marketplace */}
          <button
            onClick={() => onSelectTab('marketplace')}
            className={`persona-nav-item w-full ${activeTab === 'marketplace' ? 'persona-nav-item-active' : ''}`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">Marketplace</span>
          </button>
          
          {/* Admin - Only visible to staff */}
          {user && ['mod', 'admin', 'owner'].includes(user.role) && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`persona-nav-item w-full ${activeTab === 'admin' ? 'persona-nav-item-active' : ''}`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">Admin</span>
            </button>
          )}
          
          {/* Chronos */}
          <button
            onClick={() => onSelectTab('wallet')}
            className={`persona-nav-item w-full ${activeTab === 'wallet' ? 'persona-nav-item-active' : ''}`}
          >
            <Wallet className="w-5 h-5" />
            <span className="font-medium">Chronos</span>
          </button>
        </div>
        
        {/* Separator */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-shrink-0" />
        
        {/* My Personas Section */}
        <div className="flex-shrink-0 mt-2">
          <div className="px-4 flex items-center justify-between mb-1.5">
            <span className="persona-section-header">My Characters</span>
            <button 
              onClick={onCreatePersona}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
              title="Create new character"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="px-3 h-56">
            <ScrollArea className="h-full">
              <div className="space-y-1 pr-2">
                {personas.length === 0 ? (
                  <button
                    onClick={onCreatePersona}
                    className="w-full p-3 rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white/70 hover:border-white/20 hover:bg-white/[0.02] transition-all"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Create your first character</span>
                  </button>
                ) : (
                  <>
                    {personas.map((persona) => (
                      <button
                        key={persona.id}
                        onClick={() => activatePersona(persona.id)}
                        className={`persona-dm-item w-full ${persona.isActive ? 'persona-dm-item-active border-l-2 border-l-white' : ''}`}
                      >
                        <Avatar className="w-9 h-9 border border-white/10">
                          <AvatarImage src={persona.avatarUrl || undefined} />
                          <AvatarFallback className="bg-white/10 text-white text-xs font-medium">
                            {persona.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-white/90 truncate">{persona.name}</p>
                        </div>
                        {persona.isActive && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={onCreatePersona}
                      className="w-full p-2 rounded-xl border border-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white/70 hover:bg-white/[0.02] transition-all text-xs font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New character</span>
                    </button>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Storylines Section */}
        {storylines.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="px-4 flex items-center justify-between mb-1.5 flex-shrink-0">
              <span className="persona-section-header">My Storylines</span>
              <button
                onClick={() => onSelectTab('storylines')}
                className="text-xs text-white/40 hover:text-white/70 transition-colors font-medium"
              >
                View all
              </button>
            </div>
            <ScrollArea className="flex-1 min-h-0 px-3">
              <div className="space-y-1 pr-1">
                {storylines.map((sl) => (
                  <button
                    key={sl.id}
                    onClick={() => onSelectStoryline(sl.id)}
                    className={`persona-dm-item w-full ${activeStorylineId === sl.id ? 'persona-dm-item-active' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden border border-white/10 flex-shrink-0">
                      {sl.iconUrl ? (
                        <img src={sl.iconUrl} alt={sl.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-sm">{sl.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-white/90 truncate">{sl.name}</p>
                      <p className="text-xs text-white/40">{sl.role}</p>
                    </div>
                    {sl.role === 'owner' && (
                      <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {storylines.length === 0 && (
          <div className="px-3 mt-4 flex-shrink-0">
            <button
              onClick={() => onSelectTab('storylines')}
              className="w-full p-3 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-1.5 text-white/40 hover:text-white/70 hover:border-white/20 hover:bg-white/[0.02] transition-all"
            >
              <Crown className="w-5 h-5" />
              <span className="text-xs font-medium">Join or create a storyline</span>
            </button>
          </div>
        )}
      </div>
      
      {/* User Panel - Fixed at bottom */}
      <div className="persona-user-panel relative z-20 flex-shrink-0" ref={profileMenuRef}>
        <button 
          onClick={() => setIsProfileMenuOpen((prev) => !prev)} 
          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all duration-300"
        >
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-white/20">
              <AvatarImage src={user?.avatarUrl || activePersona?.avatarUrl || undefined} />
              <AvatarFallback className="bg-white/10 text-white font-semibold">
                {(user?.username || activePersona?.name || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-black" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white/90 truncate">{user?.username || activePersona?.name}</p>
              {user?.customTag && (
                <CustomTag tag={user.customTag} className="text-[10px] px-1.5 py-0.5" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-xs text-white/50 font-medium">Online</p>
            </div>
          </div>
        </button>

        {/* Profile Menu Dropdown */}
        {isProfileMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 rounded-xl bg-[#0a0a0a]/98 border border-white/10 shadow-2xl backdrop-blur-xl p-2 z-[100]">
            {/* Account Header */}
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Account</p>
            </div>
            
            {/* Edit Profile */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/80 transition-colors"
              onClick={() => { setIsEditProfileOpen(true); setIsProfileMenuOpen(false) }}
            >
              <Settings className="w-4 h-4 text-white/50" />
              <span className="text-sm">Edit Profile</span>
            </button>
            
            {/* Switch Accounts */}
            <button
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-white/80 transition-colors"
              onClick={() => { setIsAccountSwitcherOpen(true); setIsProfileMenuOpen(false) }}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-white/50" />
                <span className="text-sm">Switch Accounts</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
            
            {/* Add Account */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/80 transition-colors"
              onClick={() => { setShowAddAccountModal(true); setIsProfileMenuOpen(false) }}
            >
              <UserPlus className="w-4 h-4 text-white/50" />
              <span className="text-sm">Add Account</span>
            </button>
            
            {/* Legal Links */}
            <div className="px-3 py-2 border-t border-white/5 mt-1 pt-2">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1">Legal</p>
            </div>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/80 transition-colors"
              onClick={() => { setLegalModalTab('tos'); setIsProfileMenuOpen(false) }}
            >
              <FileText className="w-4 h-4 text-white/50" />
              <span className="text-sm">Terms of Service</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/80 transition-colors"
              onClick={() => { setLegalModalTab('privacy'); setIsProfileMenuOpen(false) }}
            >
              <Shield className="w-4 h-4 text-white/50" />
              <span className="text-sm">Privacy Policy</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/80 transition-colors"
              onClick={() => { setLegalModalTab('tar'); setIsProfileMenuOpen(false) }}
            >
              <Scale className="w-4 h-4 text-white/50" />
              <span className="text-sm">Terms & Rules</span>
            </button>
            
            {/* Logout */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-white/80 transition-colors mt-1 border-t border-white/5 pt-3"
              onClick={() => {
                logout();
                setIsProfileMenuOpen(false);
              }}
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Log Out</span>
            </button>
          </div>
        )}
        
        {/* Account Switcher Dropdown */}
        {isAccountSwitcherOpen && (
          <div 
            ref={accountSwitcherRef}
            className="absolute bottom-full left-0 right-0 mb-2 mx-2 rounded-xl bg-[#0a0a0a]/98 border border-white/10 shadow-2xl backdrop-blur-xl p-2 z-[100]"
          >
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Switch Accounts</p>
            </div>
            
            {/* Account List */}
            <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    account.isActive 
                      ? 'bg-white/10 text-white' 
                      : 'hover:bg-white/5 text-white/70'
                  }`}
                  onClick={() => handleSwitchAccount(account.id)}
                >
                  <Avatar className="w-8 h-8 border border-white/10">
                    <AvatarImage src={account.avatarUrl || undefined} />
                    <AvatarFallback className="bg-white/10 text-white text-sm font-medium">
                      {account.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{account.username}</p>
                  </div>
                  {account.isActive && (
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  )}
                  {!account.isActive && accounts.length > 1 && (
                    <button
                      onClick={(e) => handleRemoveAccount(account.id, e)}
                      className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove account"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Add Account Button */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/80 transition-colors mt-2 border-t border-white/5 pt-3"
              onClick={() => { setShowAddAccountModal(true); setIsAccountSwitcherOpen(false) }}
            >
              <UserPlus className="w-4 h-4 text-white/50" />
              <span className="text-sm">Add Account</span>
            </button>
          </div>
        )}

        {/* Edit Profile Modal */}
        <EditProfileModal 
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          onRevealSecurityKey={() => {
            setIsEditProfileOpen(false)
            setShowRevealKeyConfirm(true)
          }}
        />

        {/* Legal Modal */}
        <LegalModal 
          isOpen={legalModalTab !== null}
          onClose={() => setLegalModalTab(null)}
          defaultTab={legalModalTab || 'tos'}
        />

        {/* Reveal Security Key Confirmation Modal */}
        {showRevealKeyConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-[#0a0a0a] rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <span className="text-lg">⚠️</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Generate New Key?</h2>
                    <p className="text-sm text-white/50">This action cannot be undone</p>
                  </div>
                </div>
              </div>
              
              <div className="p-5">
                <p className="text-sm text-white/70 mb-4">
                  This will generate a <strong className="text-amber-300">new security key</strong> for your account. 
                  Your previous key will be invalidated immediately.
                </p>
                
                <div className="bg-white/5 rounded-lg p-3 mb-4">
                  <p className="text-xs text-white/40">
                    Make sure to save the new key somewhere safe - you&apos;ll need it every time you log in.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRevealKeyConfirm(false)}
                    className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRevealSecurityKey}
                    disabled={isGeneratingKey}
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGeneratingKey ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        Generate New Key
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Account Modal - New Design */}
        <NewAccountModal
          isOpen={showAddAccountModal}
          onClose={() => setShowAddAccountModal(false)}
          onAccountCreated={() => {
            setShowAddAccountModal(false)
            // Refresh to load the new account session
            window.location.reload()
          }}
        />
        
        {/* Security Key Modal */}
        {showSecurityKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {isSecurityKeyFlow ? 'Security Verification' : 'Save Your Security Key'}
                    </h2>
                    <p className="text-sm text-white/40">
                      {isSecurityKeyFlow ? 'Enter your security key to continue' : 'This key is required for every login'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-6">
                {!isSecurityKeyFlow ? (
                  /* Show Security Key (First Time - Signup) */
                  <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Heart className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-amber-300 font-medium text-sm">Important!</p>
                          <p className="text-amber-200/50 text-xs mt-1">
                            Save this key somewhere safe. You&apos;ll need it every time you log in. We won&apos;t show it again.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Security Key Display */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-xs text-white/40 mb-2 text-center">Your Security Key</p>
                      <div className="bg-black/50 rounded-lg p-3 font-mono text-xl text-center tracking-wider text-white select-all">
                        {securityKey}
                      </div>
                    </div>
                    
                    {/* Copy Button */}
                    <button 
                      onClick={copySecurityKey}
                      className="w-full py-2.5 rounded-lg border border-white/10 text-sm text-white/70 hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                    >
                      {hasCopiedKey ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          Copied to clipboard!
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-4 h-4" />
                          Copy to clipboard
                        </>
                      )}
                    </button>
                    
                    {/* Continue Button */}
                    <button
                      onClick={handleConfirmSecurityKeySaved}
                      className="w-full py-2.5 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                    >
                      I&apos;ve saved my key
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Enter Security Key (Login Flow) */
                  <div className="space-y-4">
                    {addAccountError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {addAccountError}
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <label className="block text-sm text-white/70">Enter your security key</label>
                      <input
                        type="text"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={securityKeyInput}
                        onChange={(e) => setSecurityKeyInput(e.target.value.toUpperCase())}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-xl text-center font-mono text-xl tracking-wider text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                        maxLength={19}
                        autoFocus
                      />
                      <p className="text-xs text-white/30 text-center">
                        Enter the 16-character key you saved during signup
                      </p>
                    </div>
                    
                    <button
                      onClick={handleVerifySecurityKey}
                      disabled={securityKeyInput.replace(/-/g, '').length < 16 || isAddingAccount}
                      className="w-full py-2.5 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isAddingAccount ? (
                        <>
                          <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify & Continue
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}