'use client'

// Force rebuild - v3 (performance optimized)
import React, { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { isAdult } from '@/lib/age-utils'
import { usePersonas } from '@/hooks/use-personas'
import { useChat, ChatMessage } from '@/hooks/use-chat'
import { useRealtimeChat } from '@/hooks/use-realtime-chat'
import { parseMessageWithMarkdown, wrapSelection } from '@/lib/markdown'
import { setSessionToken, addStoredAccount, apiFetch } from '@/lib/api-client'
import { ALLOWED_ATTACHMENT_MIME_TYPES } from '@/lib/attachments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Loader2, UserPlus, LogIn, LogOut, Users, MessageCircle, 
  User, Bell, Search, Settings, ChevronRight, Plus, Check,
  Edit2, Trash2, Camera, X, Send, ArrowLeft, MessageSquare,
  Sparkles, Zap, Image as ImageIcon, Wand2, Heart, Crown,
  BookOpen, Compass, Star, Minus, Maximize2, Minimize2,
  Store, Flag, Download, Upload, Calendar, Shield,
  Paperclip, ChevronDown, CornerDownRight, Reply,
  Copy, Pin, Flag as FlagIcon, MoreHorizontal, Clock, Bookmark
} from 'lucide-react'

// Import lightweight/eagerly loaded components
import { Sidebar } from '@/components/sidebar'
import { NavigationTopbar } from '@/components/navigation-topbar'
import { DMSidebar, DM_REFRESH_EVENT } from '@/components/dm-sidebar'
import { FriendsPage } from '@/components/friends-page'
import { StorylinesPage } from '@/components/storylines-page'
import { Persona, PersonaConnection, PersonalitySpectrums } from '@/stores/persona-store'
import type { FormData as PersonaFormData } from '@/components/persona-form'
import { NotificationModal } from '@/components/notification-modal'
import { NotificationCenter } from '@/components/notification-center'
import { AchievementModal } from '@/components/achievement-modal'
import { EditProfileModal } from '@/components/edit-profile-modal'
import { SearchModal } from '@/components/search-modal'
import { SettingsPanel } from '@/components/settings-panel'
import { ForwardMessageDialog } from '@/components/forward-message-dialog'
import { MessageAttachments } from '@/components/message-attachments'
import { AttachmentChipsBar, usePendingAttachments } from '@/components/attachment-composer'
import { KeyboardShortcutsOverlay } from '@/components/keyboard-shortcuts-overlay'
import { PinnedMessagesBar } from '@/components/pinned-messages-bar'
import { ConversationSettingsDropdown } from '@/components/conversation-settings-dropdown'
import { PersonaHoverCard } from '@/components/ui/persona-hover-card'
import { LegalModal } from '@/components/legal-modal'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useContextMenu, type ContextMenuItem } from '@/components/context-menu-system'
import { useToast } from '@/hooks/use-toast'
import { BLORP_USER_ID } from '@/lib/blorp'
import { LoadingScreen } from '@/components/loading-screen'
import { Skeleton } from '@/components/ui/skeleton'
import { ChunkErrorBoundary } from '@/components/chunk-error-boundary'
import { useUIVariant } from '@/stores/ui-variant-store'

// Layout shells for different UI variants
const ChronaV2Shell = lazy(() => import('@/components/layouts/chrona-v2-shell').then(m => ({ default: m.ChronaV2Shell })))
const ChronaV3Shell = lazy(() => import('@/components/layouts/chrona-v3-shell').then(m => ({ default: m.ChronaV3Shell })))

// First-login onboarding flow (Task 2-a) — gated in Page() below
const OnboardingFlow = lazy(() => import('@/components/onboarding-flow').then(m => ({ default: m.OnboardingFlow })))

// Lazy-loaded heavy components (code-split for performance)
const StorylineInterior = lazy(() => import('@/components/storyline-interior').then(m => ({ default: m.StorylineInterior })))
const PersonaForm = lazy(() => import('@/components/persona-form').then(m => ({ default: m.PersonaForm })))
const WalletPage = lazy(() => import('@/components/wallet-page').then(m => ({ default: m.WalletPage })))
const AdminPanel = lazy(() => import('@/components/admin-panel').then(m => ({ default: m.AdminPanel })))
const MarketplacePage = lazy(() => import('@/components/marketplace-page').then(m => ({ default: m.MarketplacePage })))
const ListOnMarketplaceModal = lazy(() => import('@/components/list-on-marketplace-modal').then(m => ({ default: m.ListOnMarketplaceModal })))
const ReportModal = lazy(() => import('@/components/report-modal').then(m => ({ default: m.ReportModal })))
const ScenarioCreateModalLazy = lazy(() => import('@/components/scenario-create-modal').then(m => ({ default: m.ScenarioCreateModal })))
const UserProfileModal = lazy(() => import('@/components/user-profile-modal').then(m => ({ default: m.UserProfileModal })))

// Suspense fallback for lazy-loaded components
function ComponentSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  )
}

// Modal skeleton fallback (centered, smaller)
function ModalSkeleton() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="space-y-4 w-full max-w-md">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// ==================== TYPES ====================
interface PersonaConnectionData {
  id: string
  characterName: string
  relationshipType: string
  specificRole: string | null
  characterAge: number | null
  description: string | null
}

interface OnlinePersona {
  id: string
  name: string
  avatarUrl: string | null
  bannerUrl: string | null
  bio: string | null
  username: string
  userId: string
  isOnline: boolean
  // Extended profile fields
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
  discType: string | null
  disc: {
    dominance: number
    influence: number
    steadiness: number
    conscientiousness: number
  } | null
  enneagram: {
    type: number | null
    wing: number | null
    instinctualVariant: string | null
  } | null
  strengthsFinder: {
    top5: string[]
  } | null
  rpStyle: string | null
  connections: PersonaConnectionData[]
}

export interface Conversation {
  id: string
  otherPersona: {
    id: string
    name: string
    avatarUrl: string | null
    username: string
    isOnline: boolean
  }
  myPersona: {
    id: string
    name: string
  }
  lastMessage: {
    content: string
    createdAt: string
  } | null
  lastMessageAt: string
  createdAt: string
  messageCount?: number
  unreadCount?: number
}

// ==================== AUTH PAGE ====================
function AuthPage() {
  const { login, signup, setUser, verifySecurityKey: authVerifySecurityKey } = useAuth()
  
  const [signupForm, setSignupForm] = useState({ username: '', password: '', confirmPassword: '' })
  const [dob, setDob] = useState({ day: '', month: '', year: '' })
  const [dobError, setDobError] = useState('')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  
  // Security Key Modal State
  const [showSecurityKeyModal, setShowSecurityKeyModal] = useState(false)
  const [securityKey, setSecurityKey] = useState('')
  const [securityKeyInput, setSecurityKeyInput] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [isLoginFlow, setIsLoginFlow] = useState(false)
  const [hasCopiedKey, setHasCopiedKey] = useState(false)
  
  // Legal modal state (Terms of Service / Privacy Policy)
  const [legalModalOpen, setLegalModalOpen] = useState(false)
  const [legalModalTab, setLegalModalTab] = useState<'tos' | 'privacy' | 'tar'>('tos')
  
  // Listen for the chrona:open-legal event (dispatched by the footer links)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string }>).detail
      const tab = detail?.tab === 'privacy' ? 'privacy' : 'tos'
      setLegalModalTab(tab as any)
      setLegalModalOpen(true)
    }
    window.addEventListener('chrona:open-legal', handler)
    return () => window.removeEventListener('chrona:open-legal', handler)
  }, [])
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setDobError('')
    
    // Validate date of birth
    if (!dob.day || !dob.month || !dob.year) {
      setDobError('Date of birth is required')
      return
    }
    const dayNum = parseInt(dob.day)
    const monthNum = parseInt(dob.month)
    const yearNum = parseInt(dob.year)
    const dobDate = new Date(yearNum, monthNum - 1, dayNum, 12, 0, 0)
    const today = new Date()
    let age = today.getFullYear() - dobDate.getFullYear()
    const monthDiff = today.getMonth() - dobDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--
    }
    if (dobDate.getFullYear() !== yearNum || dobDate.getMonth() !== monthNum - 1 || dobDate.getDate() !== dayNum) {
      setDobError('Invalid date of birth')
      return
    }
    if (dobDate > today) {
      setDobError('Date of birth cannot be in the future')
      return
    }
    if (age < 16) {
      setDobError('You must be at least 16 years old to use Chrona')
      return
    }
    if (age > 120) {
      setDobError('Please enter a valid date of birth')
      return
    }
    
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...signupForm,
          dateOfBirth: dobDate.toISOString(),
        }),
      })
      // Safely parse JSON — handle empty/non-JSON responses gracefully
      let data: any
      try {
        data = await response.json()
      } catch {
        throw new Error(response.statusText || 'Server error. Please try again.')
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }
      
      // Show security key modal
      setSecurityKey(data.securityKey)
      setPendingUserId(data.user.id)
      setIsLoginFlow(false)
      setHasCopiedKey(false)
      setShowSecurityKeyModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      // Safely parse JSON — handle empty/non-JSON responses gracefully
      let data: any
      try {
        data = await response.json()
      } catch {
        throw new Error(response.statusText || 'Server error. Please try again.')
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }
      
      // Show security key input modal
      setPendingUserId(data.user.id)
      setSecurityKeyInput('')
      setIsLoginFlow(true)
      setShowSecurityKeyModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleVerifySecurityKey = async () => {
    if (!pendingUserId || !securityKeyInput.trim()) return
    
    setError('')
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: pendingUserId, 
          securityKey: securityKeyInput.trim().toUpperCase() 
        }),
      })
      // Safely parse JSON — handle empty/non-JSON responses gracefully
      let data: any
      try {
        data = await response.json()
      } catch {
        throw new Error(response.statusText || 'Server error. Please try again.')
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid security key')
      }
      
      // Store the session token
      if (data.token) {
        setSessionToken(data.token)
        addStoredAccount(data.user, data.token)
      }
      
      // Success - set user and close modal
      setUser(data.user)
      setShowSecurityKeyModal(false)
      setPendingUserId(null)
      setSecurityKeyInput('')
      setSecurityKey('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleConfirmSecurityKeySaved = () => {
    // User confirmed they saved the key - now verify it
    setIsLoginFlow(true)
    setSecurityKeyInput('')
    setError('')
  }
  
  const copySecurityKey = () => {
    navigator.clipboard.writeText(securityKey)
    setHasCopiedKey(true)
    setTimeout(() => setHasCopiedKey(false), 2000)
  }
  
  return (
    <div className="min-h-screen persona-bg flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 persona-gradient-animated opacity-70" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>
      
      {/* Auth Card */}
      <div className="w-full max-w-md relative persona-glass rounded-2xl shadow-2xl persona-animate-scale">
        <div className="text-center space-y-4 p-6 pb-2">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img 
                src="/logo.png" 
                alt="Chrona" 
                width={64}
                height={64}
                className="w-16 h-16 rounded-2xl shadow-lg shadow-teal-500/25 object-cover transform hover:scale-105 transition-transform"
                decoding="async"
              />
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-bold persona-gradient-text">Chrona</h1>
              <p className="text-slate-500 text-sm mt-1">Roleplay Universe</p>
            </div>
          </div>
          <p className="text-slate-300/50 text-sm">
            Create your identity. Meet real people. Roleplay your story.
          </p>
        </div>
        
        <div className="p-6 pt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 persona-tabs mb-6 h-11">
              <TabsTrigger value="login" className="persona-tab data-[state=active]:persona-tab-active h-9 rounded-md transition-all">
                <LogIn className="w-4 h-4 mr-2" />Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="persona-tab data-[state=active]:persona-tab-active h-9 rounded-md transition-all">
                <UserPlus className="w-4 h-4 mr-2" />Sign Up
              </TabsTrigger>
            </TabsList>
            
            {error && !showSecurityKeyModal && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm persona-animate-in">{error}</div>}
            
            <TabsContent value="login" className="persona-animate-in">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username" className="text-slate-200">Username</Label>
                  <Input id="login-username" type="text" placeholder="cooluser123" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} required className="persona-input h-11" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-slate-200">Password</Label>
                    <button type="button" className="text-[11px] text-primary/80 hover:text-primary transition-colors">Forgot password?</button>
                  </div>
                  <Input id="login-password" type="password" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required className="persona-input h-11" />
                </div>
                <button type="submit" className="btn-persona w-full h-11 text-base font-medium flex items-center justify-center" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging in...</> : <><LogIn className="w-4 h-4 mr-2" />Login</>}
                </button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="persona-animate-in">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-slate-200">Username</Label>
                  <Input id="signup-username" type="text" placeholder="cooluser123" value={signupForm.username} onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })} required className="persona-input h-11" />
                  <p className="text-xs text-slate-500">Letters, numbers, and underscores only. 3-20 characters.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-200">Password</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} required className="persona-input h-11" />
                  <p className="text-xs text-slate-500">At least 6 characters.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm" className="text-slate-200">Confirm Password</Label>
                  <Input id="signup-confirm" type="password" placeholder="••••••••" value={signupForm.confirmPassword} onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} required className="persona-input h-11" />
                </div>
                
                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label className="text-slate-200/80 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    Date of Birth
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <select
                        value={dob.day}
                        onChange={(e) => setDob({ ...dob, day: e.target.value })}
                        required
                        className="w-full h-11 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-100 text-sm appearance-none cursor-pointer focus:outline-none focus:border-teal-500/30 focus:bg-white/[0.04] transition-all hover:border-white/[0.12]"
                      >
                        <option value="" className="bg-[#0f1117] text-slate-400">Day</option>
                        {Array.from({ length: 31 }, (_, i) => (
                          <option key={i + 1} value={i + 1} className="bg-[#0f1117] text-slate-100">{i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={dob.month}
                        onChange={(e) => setDob({ ...dob, month: e.target.value })}
                        required
                        className="w-full h-11 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-100 text-sm appearance-none cursor-pointer focus:outline-none focus:border-teal-500/30 focus:bg-white/[0.04] transition-all hover:border-white/[0.12]"
                      >
                        <option value="" className="bg-[#0f1117] text-slate-400">Month</option>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                          <option key={i + 1} value={i + 1} className="bg-[#0f1117] text-slate-100">{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={dob.year}
                        onChange={(e) => setDob({ ...dob, year: e.target.value })}
                        required
                        className="w-full h-11 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-100 text-sm appearance-none cursor-pointer focus:outline-none focus:border-teal-500/30 focus:bg-white/[0.04] transition-all hover:border-white/[0.12]"
                      >
                        <option value="" className="bg-[#0f1117] text-slate-400">Year</option>
                        {Array.from({ length: 100 }, (_, i) => {
                          const year = new Date().getFullYear() - 16 - i
                          return (
                            <option key={year} value={year} className="bg-[#0f1117] text-slate-100">{year}</option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                  {dobError && <p className="text-xs text-red-400 mt-1">{dobError}</p>}
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    You must be 16 or older. Your age helps keep the community safe.
                  </p>
                </div>
                
                <button type="submit" className="btn-persona w-full h-11 text-base font-medium flex items-center justify-center" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : <><Zap className="w-4 h-4 mr-2" />Create Account</>}
                </button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Auth footer — Terms & Privacy */}
          <div className="mt-5 pt-4 border-t border-border text-center">
            <p className="text-[11px] text-muted-foreground">
              By continuing, you agree to Chrona's{' '}
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('chrona:open-legal', { detail: { tab: 'terms' } }))} className="text-primary/80 hover:text-primary underline underline-offset-2 transition-colors">Terms of Service</button>
              {' '}and{' '}
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('chrona:open-legal', { detail: { tab: 'privacy' } }))} className="text-primary/80 hover:text-primary underline underline-offset-2 transition-colors">Privacy Policy</button>
              .
            </p>
          </div>
        </div>
      </div>
      
      {/* Security Key Modal */}
      {showSecurityKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-[#0f1117] to-[#0b0d11] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-teal-900/30 to-cyan-900/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {isLoginFlow ? 'Security Verification' : 'Save Your Security Key'}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {isLoginFlow ? 'Enter your security key to continue' : 'This key is required for every login'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              {!isLoginFlow ? (
                /* Show Security Key (First Time) */
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Heart className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-amber-300 font-medium text-sm">Important!</p>
                        <p className="text-amber-200/70 text-xs mt-1">
                          Save this key somewhere safe. You&apos;ll need it every time you log in. We won&apos;t show it again.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Security Key Display */}
                  <div className="bg-teal-900/30 rounded-xl p-4 border border-white/[0.08]">
                    <p className="text-xs text-slate-500 mb-2 text-center">Your Security Key</p>
                    <div className="bg-black/30 rounded-lg p-3 font-mono text-xl text-center tracking-wider text-slate-100 select-all">
                      {securityKey}
                    </div>
                  </div>
                  
                  {/* Copy Button */}
                  <button 
                    onClick={copySecurityKey}
                    className="w-full py-2.5 rounded-lg border border-white/[0.08] text-sm text-slate-300 hover:bg-white/[0.05] transition-colors flex items-center justify-center gap-2"
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
                    className="btn-persona w-full h-11 text-base font-medium flex items-center justify-center gap-2"
                  >
                    I&apos;ve saved my key
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Enter Security Key */
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-slate-200/80">Enter your security key</Label>
                    <Input 
                      type="text" 
                      placeholder="XXXX-XXXX-XXXX-XXXX" 
                      value={securityKeyInput}
                      onChange={(e) => setSecurityKeyInput(e.target.value.toUpperCase())}
                      className="persona-input h-12 text-center font-mono text-lg tracking-wider"
                      maxLength={19}
                    />
                    <p className="text-xs text-slate-500 text-center">
                      Enter the security key you saved during signup
                    </p>
                  </div>
                  
                  <button 
                    onClick={handleVerifySecurityKey}
                    disabled={securityKeyInput.length < 16 || isSubmitting}
                    className="btn-persona w-full h-11 text-base font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
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

      {/* Legal Modal (Terms of Service / Privacy Policy) */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />
    </div>
  )
}

// ==================== MY PERSONAS MODAL ====================
function MyPersonasModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const userIsAdult = user?.dateOfBirth ? isAdult(new Date(user.dateOfBirth)) : false
  const { personas, activePersona, isLoading, activatePersona, deletePersona, createPersona, updatePersona } = usePersonas()
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [listingPersona, setListingPersona] = useState<Persona | null>(null)
  const [importedPersona, setImportedPersona] = useState<any | null>(null)
  const [showScenarioModal, setShowScenarioModal] = useState(false)
  const [selectedPersonaForScenario, setSelectedPersonaForScenario] = useState<string | null>(null)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)
  
  const handleActivate = async (id: string) => { try { await activatePersona(id) } catch (err) { console.error('Failed to activate:', err) } }
  const handleDelete = async (id: string) => { if (!confirm('Are you sure you want to delete this persona?')) return; setDeletingId(id); try { await deletePersona(id) } catch (err) { console.error('Failed to delete:', err) } finally { setDeletingId(null) } }

  // Export persona as JSON file
  const handleExport = (persona: Persona) => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      persona: {
        name: persona.name,
        avatarUrl: persona.avatarUrl,
        description: persona.description,
        archetype: persona.archetype,
        gender: persona.gender,
        pronouns: persona.pronouns,
        age: persona.age,
        tags: persona.tags || [],
        personalityDescription: persona.personalityDescription,
        personalitySpectrums: persona.personalitySpectrums || null,
        bigFive: persona.bigFive || null,
        hexaco: persona.hexaco || null,
        strengths: persona.strengths || [],
        flaws: persona.flaws || [],
        values: persona.values || [],
        fears: persona.fears || [],
        species: persona.species,
        likes: persona.likes || [],
        dislikes: persona.dislikes || [],
        hobbies: persona.hobbies || [],
        skills: persona.skills || [],
        languages: persona.languages || [],
        habits: persona.habits || [],
        speechPatterns: persona.speechPatterns || [],
        backstory: persona.backstory,
        appearance: persona.appearance,
        mbtiType: persona.mbtiType,
        themeEnabled: persona.themeEnabled ?? false,
        rpStyle: persona.rpStyle,
        rpPreferredGenders: persona.rpPreferredGenders || [],
        rpGenres: persona.rpGenres || [],
        rpLimits: persona.rpLimits || [],
        rpThemes: persona.rpThemes || [],
        rpExperienceLevel: persona.rpExperienceLevel,
        rpResponseTime: persona.rpResponseTime,
        nsfwEnabled: persona.nsfwEnabled ?? false,
        nsfwBodyType: persona.nsfwBodyType,
        nsfwKinks: persona.nsfwKinks || [],
        nsfwContentWarnings: persona.nsfwContentWarnings || [],
        nsfwOrientation: persona.nsfwOrientation,
        nsfwRolePreference: persona.nsfwRolePreference,
        connections: (persona.connections || []).map(c => ({
          characterName: c.characterName,
          relationshipType: c.relationshipType,
          specificRole: c.specificRole || null,
          characterAge: c.characterAge || null,
          description: c.description || null,
        })),
      }
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${persona.name.replace(/\s+/g, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import persona from JSON file
  const handleImport = () => {
    importFileRef.current?.click()
  }

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        // Support both { persona: {...} } wrapper and bare persona objects
        const imported = json.persona || json
        setImportedPersona(imported)
        setShowCreateModal(true)
      } catch (err) {
        alert('Invalid persona file. Please make sure it\'s a valid JSON file.')
      }
    }
    reader.readAsText(file)
    // Reset file input so the same file can be re-imported
    e.target.value = ''
  }
  
  const handleSavePersona = async (data: PersonaFormData) => {
    if (editingPersona) {
      await updatePersona(editingPersona.id, data)
      setEditingPersona(null)
    } else {
      await createPersona(data)
      setShowCreateModal(false)
    }
  }
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="persona-modal max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="persona-modal-header flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold persona-gradient-text flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" />
                My Characters
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Manage your character identities. Switch between characters to roleplay as different personas.
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>
            ) : personas.length === 0 ? (
              <div className="persona-empty-state persona-card py-12">
                <div className="persona-empty-state-icon">
                  <User className="w-8 h-8" />
                </div>
                <p className="text-slate-200">You haven&apos;t created any characters yet.</p>
                <p className="text-slate-500 text-sm mt-1 mb-4">Create your first character or import one to start roleplaying!</p>
                <div className="flex items-center gap-3 justify-center">
                  <button onClick={() => setShowCreateModal(true)} className="btn-persona flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Create Character
                  </button>
                  <button onClick={handleImport} className="flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.02] border border-white/[0.06] hover:text-slate-200 hover:bg-white/[0.04] hover:border-white/[0.10] transition-all">
                    <Upload className="w-4 h-4" /> Import
                  </button>
                  <input ref={importFileRef} type="file" accept=".json" onChange={handleImportFileChange} className="hidden" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {personas.map((persona) => (
                  <div key={persona.id} className={`persona-card persona-card-hover p-4 ${persona.isActive ? 'border-teal-500/25 bg-white/[0.03]' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Avatar className="w-14 h-14 border-2 border-teal-500/20">
                          <AvatarImage src={persona.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-400 text-white text-lg font-semibold">{persona.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {persona.isActive && (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#0f1117] flex items-center justify-center"><Check className="w-3 h-3 text-white" /></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-100 truncate flex items-center gap-1.5" style={persona.themeEnabled && persona.theme ? { color: persona.theme.textColor || undefined } : undefined}>
                            {persona.name}
                            {persona.themeEnabled && persona.theme && (
                              <span
                                className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border"
                                style={{
                                  color: persona.theme.accentColor || '#a78bfa',
                                  borderColor: `${persona.theme.borderColor || '#a78bfa'}55`,
                                  background: `${persona.theme.borderColor || '#a78bfa'}14`,
                                }}
                                title={`${persona.theme.name} profile theme`}
                              >
                                <Sparkles className="w-2.5 h-2.5" style={{ color: persona.theme.accentColor || '#a78bfa' }} />
                                {persona.theme.name}
                              </span>
                            )}
                          </h3>
                          {persona.isActive && <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Active</span>}
                        </div>
                        {persona.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{persona.description}</p>}
                        <div className="flex items-center gap-1.5 mt-1">
                          {persona.archetype && <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-teal-500/15 text-slate-300">{persona.archetype}</span>}
                          {persona.themeEnabled && persona.theme && (
                            <span className="sm:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border" style={{ color: persona.theme.accentColor || '#a78bfa', borderColor: `${persona.theme.borderColor || '#a78bfa'}55` }}>
                              <Sparkles className="w-2.5 h-2.5" /> {persona.theme.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!persona.isActive && (
                          <button onClick={() => handleActivate(persona.id)} className="btn-persona-ghost text-xs py-1.5 px-3 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Set Active
                          </button>
                        )}
                        <button onClick={() => setListingPersona(persona)} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all" title="List on Marketplace">
                          <Store className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleExport(persona)} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all" title="Export Character">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setSelectedPersonaForScenario(persona.id); setShowScenarioModal(true) }} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-teal-400 hover:bg-teal-500/10 transition-all" title="Upload as Scenario">
                          <Sparkles className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingPersona(persona)} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-all" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(persona.id)} disabled={deletingId === persona.id} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50" title="Delete">
                          {deletingId === persona.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {personas.length > 0 && (
            <div className="pt-4 border-t border-white/[0.08] space-y-2">
              <button onClick={() => setShowCreateModal(true)} className="btn-persona w-full flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Create New Character
              </button>
              <button onClick={handleImport} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.02] border border-white/[0.06] hover:text-slate-200 hover:bg-white/[0.04] hover:border-white/[0.10] transition-all">
                <Upload className="w-4 h-4" /> Import Character
              </button>
              <input ref={importFileRef} type="file" accept=".json" onChange={handleImportFileChange} className="hidden" />
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <ChunkErrorBoundary>
        <Suspense fallback={<ModalSkeleton />}>
          <PersonaForm 
            isOpen={showCreateModal || !!editingPersona} 
            onClose={() => { setShowCreateModal(false); setEditingPersona(null); setImportedPersona(null) }} 
            persona={editingPersona} 
            importedData={importedPersona}
            onSave={handleSavePersona}
            isUserAdult={userIsAdult}
          />
        </Suspense>
      </ChunkErrorBoundary>
      
      <Suspense fallback={null}>
        <ListOnMarketplaceModal
          isOpen={!!listingPersona}
          onClose={() => setListingPersona(null)}
          persona={listingPersona}
          onSuccess={() => setListingPersona(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ScenarioCreateModalLazy
          isOpen={showScenarioModal}
          onClose={() => { setShowScenarioModal(false); setSelectedPersonaForScenario(null) }}
          onCreated={() => { setShowScenarioModal(false); setSelectedPersonaForScenario(null) }}
          personas={personas.map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl || null, mbtiType: p.mbtiType || null, archetype: p.archetype || null }))}
          preselectedPersonaId={selectedPersonaForScenario}
        />
      </Suspense>

      <Suspense fallback={null}>
        {viewingUserId && (
          <UserProfileModal
            isOpen={showUserProfile}
            onClose={() => { setShowUserProfile(false); setViewingUserId(null) }}
            userId={viewingUserId}
          />
        )}
      </Suspense>
    </>
  )
}

function TopBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  const doAction = (action: 'minimize' | 'maximize' | 'close') => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      if (action === 'minimize') (window as any).electronAPI.minimizeWindow()
      if (action === 'maximize') {
        (window as any).electronAPI.maximizeWindow()
        setIsMaximized(prev => !prev)
      }
      if (action === 'close') (window as any).electronAPI.closeWindow()
    }
  }

  return (
    <div className="topbar h-9 w-full flex items-center justify-between px-3 bg-[#0f1117]/95 border-b border-white/[0.10] text-slate-100 backdrop-blur-lg -webkit-app-region-drag">
      <div className="flex items-center gap-3 text-sm font-semibold select-none">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)]">
          <span className="text-xs font-black">C</span>
        </div>
        <div className="flex flex-col leading-3">
          <span className="text-sm text-slate-100">Chrona</span>
          <span className="text-[10px] text-slate-300">Roleplay Universe</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => doAction('minimize')} className="window-btn -webkit-app-region-no-drag" title="Minimize"><Minus className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => doAction('maximize')} className="window-btn -webkit-app-region-no-drag" title="Maximize">{isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</button>
        <button type="button" onClick={() => doAction('close')} className="window-btn-red -webkit-app-region-no-drag" title="Close"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

// ==================== CHAT VIEW ====================

// Highlight search match within a string — wraps matches in <mark> tags
function highlightSearchMatch(text: string, query: string): React.ReactNode {
  if (!query || !query.trim()) return text
  const q = query.trim()
  // Escape regex special chars
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  const lowerQ = q.toLowerCase()
  return parts.map((part, i) =>
    part.toLowerCase() === lowerQ
      ? <mark key={i} className="bg-primary/30 text-primary-foreground rounded px-0.5">{part}</mark>
      : <span key={i}>{part}</span>
  )
}

// Memoized individual chat message component to prevent re-rendering all messages on hover
const ChatMessageItem = React.memo(function ChatMessageItem({
  message,
  showHeader,
  isMine,
  isHovered,
  otherUsername,
  onHoverEnter,
  onHoverLeave,
  onContextMenu,
  onMoreActions,
  onReply,
  onEdit,
  isEditing,
  editValue,
  onEditChange,
  onEditSave,
  onEditCancel,
  onQuickReaction,
  searchHighlight,
  isBookmarked,
  onViewEditHistory,
}: {
  message: ChatMessage
  showHeader: boolean
  isMine: boolean
  isHovered: boolean
  otherUsername: string
  onHoverEnter: () => void
  onHoverLeave: () => void
  onContextMenu: (e: React.MouseEvent, message: ChatMessage) => void
  onMoreActions: (e: React.MouseEvent, message: ChatMessage) => void
  onReply?: (message: ChatMessage) => void
  onEdit?: (message: ChatMessage) => void
  isEditing?: boolean
  editValue?: string
  onEditChange?: (value: string) => void
  onEditSave?: () => void
  onEditCancel?: () => void
  onQuickReaction?: (message: ChatMessage, emoji: string) => void
  searchHighlight?: string
  isBookmarked?: boolean
  onViewEditHistory?: (message: ChatMessage) => void
}) {
  const hasText = Boolean(message.content && message.content.trim())

  return (
    <div
      data-message-id={message.id}
      className={`group relative flex gap-3 ${showHeader ? 'mt-4' : 'mt-0.5'} persona-message transition-shadow duration-300`}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {/* Avatar column */}
      <div className="w-10 flex-shrink-0">
        {showHeader ? (
          <PersonaHoverCard persona={{ name: message.sender.name, avatarUrl: message.sender.avatarUrl }} side="right" delay={300}>
            <Avatar className="w-10 h-10 border border-teal-500/20 cursor-pointer">
              <AvatarImage src={message.sender.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-teal-500/50 to-cyan-500/50 text-white text-sm font-medium">
                {message.sender.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </PersonaHoverCard>
        ) : (
          <div className="w-10 flex items-center justify-center">
            {isHovered && (
              <span className="text-[9px] text-slate-500">
                {new Date(message.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Message content */}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={`font-semibold text-sm ${isMine ? 'text-teal-300' : 'text-slate-100'}`}>
              {message.sender.name}
            </span>
            {message.sender.isOfficial && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">OFFICIAL</span>
            )}
            <span className="text-[10px] text-slate-500">
              {new Date(message.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
            {isBookmarked && (
              <Bookmark className="w-2.5 h-2.5 text-violet-400 fill-current ml-0.5" aria-label="Bookmarked" />
            )}
          </div>
        )}
        
        {/* Reply preview (if this message is a reply) */}
        {message.replyTo && (
          <div className="mb-1.5 flex items-center gap-2 pl-2 border-l-2 border-teal-500/40 text-xs text-slate-500">
            <CornerDownRight className="w-3 h-3 text-teal-400 flex-shrink-0" />
            <span className="font-medium text-teal-300">{message.replyTo.senderName}</span>
            <span className="truncate max-w-[200px]">
              {message.replyTo.imageUrl && !message.replyTo.content ? '📷 Image' : message.replyTo.content}
            </span>
          </div>
        )}

        {/* Forwarded-from indicator */}
        {message.forwardedFromPersonaName && (
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground italic" title={`Forwarded from ${message.forwardedFromPersonaName}${message.forwardedFromName ? ` (@${message.forwardedFromName})` : ''}`}>
            <CornerDownRight className="w-3 h-3 text-violet-400 flex-shrink-0" />
            <span>Forwarded from <span className="font-medium text-violet-300 not-italic">{message.forwardedFromPersonaName}</span></span>
          </div>
        )}

        {/* Message body */}
        <div 
          className={`relative inline-block max-w-full ${!isMine ? 'cursor-pointer' : ''}`}
          onContextMenu={(e) => onContextMenu(e, message)}
        >
          {/* Text content — or edit mode */}
          {hasText && (
            isEditing ? (
              <div className="flex flex-col gap-2 min-w-[280px]">
                <Textarea
                  autoFocus
                  value={editValue ?? message.content}
                  onChange={(e) => onEditChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSave?.() }
                    if (e.key === 'Escape') { e.preventDefault(); onEditCancel?.() }
                  }}
                  className="w-full persona-input resize-none min-h-[60px] max-h-[160px] rounded-lg py-2 px-3 text-sm"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Enter to save · Esc to cancel</span>
                  <div className="flex gap-1.5">
                    <button onClick={onEditCancel} className="px-2.5 py-1 rounded-md text-xs text-slate-300 bg-white/[0.06] hover:bg-white/[0.1] transition-colors">Cancel</button>
                    <button onClick={onEditSave} className="px-2.5 py-1 rounded-md text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors">Save</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {searchHighlight && searchHighlight.trim()
                  ? highlightSearchMatch(message.content, searchHighlight)
                  : parseMessageWithMarkdown(message.content, [otherUsername])}
                {message.editedAt && (
                  <button
                    onClick={(e) => { e.stopPropagation(); if (message.editHistory && message.editHistory.length > 0) onViewEditHistory?.(message) }}
                    className={`ml-1.5 text-[10px] text-slate-500 italic ${message.editHistory && message.editHistory.length > 0 ? 'hover:text-primary cursor-pointer transition-colors' : 'cursor-default'}`}
                    title={message.editHistory && message.editHistory.length > 0 ? 'Click to view edit history' : 'Edited'}
                  >
                    (edited)
                  </button>
                )}
                {/* Read receipt — double checkmark for own messages that have been read */}
                {isMine && message.readAt && (
                  <span className="ml-1.5 inline-flex items-center text-primary/70" title={`Read at ${new Date(message.readAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L7 17l-5-5" />
                      <path d="M22 10l-7.5 7.5" />
                    </svg>
                  </span>
                )}
              </div>
            )
          )}

          {/* Attachments — collapsible dropdown (collapsed by default) */}
          <MessageAttachments attachments={message.attachments} />
        </div>

        {/* Reactions display — below the message body */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={(e) => { e.stopPropagation(); onQuickReaction?.(message, reaction.emoji) }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all hover:scale-110 ${
                  reaction.reactedByMe
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]'
                }`}
                style={{ animation: 'reaction-pop 0.2s ease-out' }}
                title={reaction.personas.map((p) => p.name).join(', ')}
              >
                <span className="text-sm leading-none">{reaction.emoji}</span>
                <span className="text-[10px] font-medium tabular-nums">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions - quick reactions + reply + more */}
      {isHovered && (
        <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
          {/* Quick emoji reactions */}
          {['👍', '❤️', '😂', '🔥'].map((emoji) => (
            <button
              key={emoji}
              className="w-7 h-7 flex items-center justify-center hover:bg-primary/10 rounded-md transition-colors text-sm hover:scale-110"
              onClick={(e) => { e.stopPropagation(); onQuickReaction?.(message, emoji) }}
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-0.5" />
          {onReply && (
            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-primary/10 rounded-md transition-colors text-slate-400 hover:text-primary"
              onClick={(e) => { e.stopPropagation(); onReply(message) }}
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}
          {onEdit && isMine && (
            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-primary/10 rounded-md transition-colors text-slate-400 hover:text-primary"
              onClick={(e) => { e.stopPropagation(); onEdit(message) }}
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            className="w-7 h-7 flex items-center justify-center hover:bg-primary/10 rounded-md transition-colors text-slate-400 hover:text-slate-200"
            onClick={(e) => onMoreActions(e, message)}
            title="More"
          >
            <span className="text-[10px]">•••</span>
          </button>
        </div>
      )}
    </div>
  )
})

// Maximum messages to render in the DOM at once (virtual scrolling limit)
const MAX_VISIBLE_MESSAGES = 150

function ChatView({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const { user } = useAuth()
  const { activePersona, uploadAvatar } = usePersonas()

  // Whether the conversation data is valid (has otherPersona). Used to render
  // a graceful fallback without breaking the rules of hooks (no early return).
  const hasOtherPersona = Boolean(conversation?.otherPersona)

  // Check if this is a conversation with Blorp (read-only) — safe access
  const isBlorpConversation = hasOtherPersona && conversation.otherPersona.name === 'Blorp'
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingPersona, setTypingPersona] = useState<string | null>(null)
  // Pending image attachments for the composer (multi-file picker)
  const pendingAttachments = usePendingAttachments()
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [showAllMessages, setShowAllMessages] = useState(false) // Virtual scrolling toggle
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportMessage, setReportMessage] = useState<ChatMessage | null>(null)
  
  // Context menu state (legacy — now using global context menu system)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  // Message editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  // In-conversation search state
  const [searchInChatOpen, setSearchInChatOpen] = useState(false)
  const [searchInChatQuery, setSearchInChatQuery] = useState('')
  // Scroll-to-bottom button visibility
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Forward message dialog state
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null)
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false)
  // Pinned messages refresh key (increment to trigger refetch of pinned bar)
  const [pinsRefreshKey, setPinsRefreshKey] = useState(0)
  // Edit history viewer state
  const [viewingEditHistory, setViewingEditHistory] = useState<ChatMessage | null>(null)
  // Bookmarked message IDs (for showing bookmark indicator on messages)
  const [bookmarkedMsgIds, setBookmarkedMsgIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const { showContextMenu } = useContextMenu()
  
  // Virtual scrolling: only render recent messages to prevent DOM bloat
  const visibleMessages = useMemo(() => {
    let list = messages
    // Filter by in-conversation search query when active
    if (searchInChatOpen && searchInChatQuery.trim()) {
      const q = searchInChatQuery.toLowerCase()
      list = list.filter((m) => m.content?.toLowerCase().includes(q))
    }
    if (showAllMessages || list.length <= MAX_VISIBLE_MESSAGES) return list
    return list.slice(-MAX_VISIBLE_MESSAGES)
  }, [messages, showAllMessages, searchInChatOpen, searchInChatQuery])
  
  const hasMoreMessages = messages.length > MAX_VISIBLE_MESSAGES && !showAllMessages
  const hiddenMessageCount = messages.length - MAX_VISIBLE_MESSAGES
  
  // Message editing handlers (declared before handleContextMenu which uses startEditing)
  const startEditing = useCallback((message: ChatMessage) => {
    setEditingMessageId(message.id)
    setEditValue(message.content)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null)
    setEditValue('')
  }, [])

  const saveEditing = useCallback(async () => {
    if (!editingMessageId || !editValue.trim()) return
    try {
      const resp = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: editingMessageId, content: editValue.trim() }),
      })
      if (resp.ok) {
        const data = await resp.json()
        setMessages((prev) => prev.map((m) => m.id === editingMessageId ? { ...m, ...data.message, editedAt: data.message.editedAt } : m))
        toast({ title: 'Message edited', variant: 'default' })
      } else {
        toast({ title: 'Failed to edit message', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Network error', variant: 'destructive' })
    } finally {
      setEditingMessageId(null)
      setEditValue('')
    }
  }, [editingMessageId, editValue, conversation.id, toast])

  // Memoized callbacks for ChatMessageItem
  const handleContextMenu = useCallback((e: React.MouseEvent, message: ChatMessage) => {
    const isMine = message.senderId === activePersona?.id
    const items: ContextMenuItem[] = [
      {
        label: 'Reply',
        icon: <Reply className="w-4 h-4" />,
        accent: 'teal',
        onClick: () => setReplyingTo(message),
      },
      {
        label: 'Copy Text',
        icon: <Copy className="w-4 h-4" />,
        disabled: !message.content,
        onClick: () => {
          if (message.content) {
            navigator.clipboard.writeText(message.content)
            toast({ title: 'Copied to clipboard', variant: 'default' })
          }
        },
      },
      {
        label: 'Copy Message Link',
        icon: <Copy className="w-4 h-4" />,
        onClick: () => {
          const link = `${window.location.origin}/?msg=${message.id}`
          navigator.clipboard.writeText(link)
          toast({ title: 'Message link copied', variant: 'default' })
        },
      },
      {
        label: 'Forward Message',
        icon: <CornerDownRight className="w-4 h-4" />,
        accent: 'cyan',
        onClick: () => {
          setForwardingMessage(message)
          setForwardDialogOpen(true)
        },
      },
      { type: 'separator' },
      {
        label: 'Pin Message',
        icon: <Pin className="w-4 h-4" />,
        accent: 'amber',
        onClick: async () => {
          if (!activePersona) {
            toast({ title: 'No active character', variant: 'destructive' })
            return
          }
          try {
            const resp = await fetch(`/api/conversations/${conversation.id}/messages/${message.id}/pin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ personaId: activePersona.id }),
            })
            if (resp.ok) {
              const data = await resp.json()
              toast({ title: data.pinned ? 'Message pinned' : 'Message unpinned', variant: 'default' })
              setPinsRefreshKey(k => k + 1)
            } else {
              toast({ title: 'Failed to pin message', variant: 'destructive' })
            }
          } catch (err) {
            toast({ title: 'Network error', variant: 'destructive' })
          }
        },
      },
      {
        label: 'Mark as Read',
        icon: <Check className="w-4 h-4" />,
        onClick: () => {},
      },
      {
        label: 'Bookmark Message',
        icon: <Bookmark className="w-4 h-4" />,
        accent: 'violet',
        onClick: async () => {
          if (!activePersona) {
            toast({ title: 'No active character', variant: 'destructive' })
            return
          }
          try {
            const resp = await fetch(`/api/conversations/${conversation.id}/messages/${message.id}/bookmark`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ personaId: activePersona.id }),
            })
            if (resp.ok) {
              const data = await resp.json()
              toast({ title: data.bookmarked ? 'Message bookmarked' : 'Bookmark removed', variant: 'default' })
              setBookmarkedMsgIds(prev => data.bookmarked ? new Set(prev).add(message.id) : new Set([...prev].filter(id => id !== message.id)))
            } else {
              toast({ title: 'Failed to bookmark', variant: 'destructive' })
            }
          } catch (err) {
            toast({ title: 'Network error', variant: 'destructive' })
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Report Message',
        icon: <FlagIcon className="w-4 h-4" />,
        type: 'danger',
        onClick: () => {
          setReportMessage(message)
          setShowReportModal(true)
        },
      },
    ]
    if (isMine) {
      items.push({
        label: 'Edit Message',
        icon: <Edit2 className="w-4 h-4" />,
        accent: 'teal',
        disabled: !message.content,
        onClick: () => startEditing(message),
      })
      // Show "View edit history" only if the message has been edited
      if (message.editHistory && message.editHistory.length > 0) {
        items.push({
          label: `View edit history (${message.editHistory.length})`,
          icon: <Clock className="w-4 h-4" />,
          accent: 'slate',
          onClick: () => setViewingEditHistory(message),
        })
      }
      items.push({
        label: 'Delete Message',
        icon: <Trash2 className="w-4 h-4" />,
        type: 'danger',
        onClick: async () => {
          try {
            const resp = await apiFetch(`/api/conversations/${conversation.id}/messages?messageId=${encodeURIComponent(message.id)}`, {
              method: 'DELETE',
            })
            if (resp.ok) {
              setMessages((prev) => prev.filter((m) => m.id !== message.id))
              toast({ title: 'Message deleted', variant: 'default' })
            } else {
              toast({ title: 'Failed to delete message', variant: 'destructive' })
            }
          } catch (err) {
            toast({ title: 'Failed to delete message', variant: 'destructive' })
          }
        },
      })
    }
    showContextMenu(e, items, `Message from ${message.sender.name}`)
  }, [activePersona?.id, conversation.id, showContextMenu, toast])

  const handleMoreActions = useCallback((e: React.MouseEvent, message: ChatMessage) => {
    e.stopPropagation()
    handleContextMenu(e, message)
  }, [handleContextMenu])

  const handleReply = useCallback((message: ChatMessage) => {
    setReplyingTo(message)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // Toggle a message reaction — persists to DB and updates local state optimistically
  const handleQuickReaction = useCallback(async (message: ChatMessage, emoji: string) => {
    if (!activePersona) {
      toast({ title: 'No active character', description: 'Activate a character to react.', variant: 'destructive' })
      return
    }
    // Optimistic update
    setMessages((prev) => prev.map((m) => {
      if (m.id !== message.id) return m
      const existing = (m.reactions || []).find((r) => r.emoji === emoji)
      let newReactions: ChatMessage['reactions']
      if (existing && existing.reactedByMe) {
        // Remove my reaction optimistically
        newReactions = (m.reactions || []).map((r) =>
          r.emoji === emoji
            ? { ...r, count: r.count - 1, reactedByMe: false, personas: r.personas.filter((p) => p.id !== activePersona.id) }
            : r
        ).filter((r) => r.count > 0)
      } else if (existing) {
        // Add my reaction to existing emoji group
        newReactions = (m.reactions || []).map((r) =>
          r.emoji === emoji
            ? { ...r, count: r.count + 1, reactedByMe: true, personas: [...r.personas, { id: activePersona.id, name: activePersona.name }] }
            : r
        )
      } else {
        // New emoji group
        newReactions = [...(m.reactions || []), { emoji, count: 1, personas: [{ id: activePersona.id, name: activePersona.name }], reactedByMe: true }]
      }
      return { ...m, reactions: newReactions }
    }))
    // Persist to API
    try {
      const resp = await fetch(`/api/conversations/${conversation.id}/messages/${message.id}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, personaId: activePersona.id }),
      })
      if (!resp.ok) {
        toast({ title: 'Failed to react', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Reaction error:', err)
    }
  }, [activePersona, conversation.id, toast])

  const { sendTyping, sendMessage: sendChatMessage } = useChat({
    conversationId: conversation.id,
    onNewMessage: (message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev
        return [...prev, message]
      })
      // If the new message is from the other persona, mark it as read (we're viewing the conversation)
      if (activePersona && message.senderId !== activePersona.id && !message.readAt) {
        fetch(`/api/conversations/${conversation.id}/messages/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds: [message.id] }),
        }).catch(() => {})
      }
    },
    onTyping: (data) => {
      setIsTyping(data.isTyping)
      setTypingPersona(data.isTyping ? data.personaName : null)
      // Broadcast typing status so the DM sidebar can show a typing badge
      window.dispatchEvent(new CustomEvent('chrona:typing-status', {
        detail: { conversationId: conversation.id, isTyping: data.isTyping, personaName: data.personaName }
      }))
    }
  })

  // ── PocketBase SSE realtime sync ───────────────────────────────────────────
  // This is a SUPPLEMENTARY realtime layer on top of the socket.io-based
  // `useChat` hook above. Both can coexist; dedup by `message.id` ensures
  // no duplicate renders. PocketBase SSE fires for every record change
  // in the `messages` collection, so this catches messages that socket.io
  // misses (e.g., messages sent from another device/session, or when the
  // chat-service is down).
  //
  // Strategy: when a `create` or `update` event arrives, refetch the full
  // conversation messages via the API (which expands `sender` + the
  // `user.isOfficial` flag) and merge by id. The raw SSE record only
  // carries `senderId`, so a refetch is the simplest way to hydrate the
  // sender object without an extra `/api/personas/[id]/public` round-trip.
  // On `delete`, just remove the matching id from local state.
  const refreshMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`)
      if (!response.ok) return
      const data = await response.json() as { messages: ChatMessage[] }
      setMessages(prev => {
        const byId = new Map<string, ChatMessage>()
        // Keep existing (possibly optimistic) entries first so we don't
        // clobber a freshly-sent message whose PB record hasn't landed
        // on the SSE-list yet — but overwrite with the API version when
        // the same id comes back (the API has the canonical sender info).
        for (const m of prev) byId.set(m.id, m)
        for (const m of (data.messages || [])) {
          byId.set(m.id, m)
        }
        // Preserve chronological order
        return Array.from(byId.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      })
    } catch (err) {
      console.error('[Realtime] Failed to refetch messages:', err)
    }
  }, [conversation.id])

  useRealtimeChat({
    conversationId: conversation.id,
    onNewMessage: () => {
      // Refetch to hydrate sender info — dedup by id is handled inside
      // refreshMessages via the Map merge.
      void refreshMessages()
    },
    onUpdateMessage: () => {
      // Edits: refetch the canonical version of the conversation.
      void refreshMessages()
    },
    onDeleteMessage: (messageId) => {
      setMessages(prev => prev.filter(m => m.id !== messageId))
    },
    onReactionChange: (messageId) => {
      // A reaction was added/removed — fetch the updated reactions for that message
      fetch(`/api/conversations/${conversation.id}/messages/${messageId}/reactions`)
        .then(async (res) => {
          if (!res.ok) return
          const data = await res.json()
          if (data.reactions) {
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.reactions } : m))
          }
        })
        .catch(() => {})
    },
  })

  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch(`/api/conversations/${conversation.id}/messages`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages)
          // Mark messages from the other persona as read (for read receipts)
          if (activePersona) {
            const otherMsgs = data.messages.filter((m: ChatMessage) => m.senderId !== activePersona.id && !m.readAt)
            if (otherMsgs.length > 0) {
              fetch(`/api/conversations/${conversation.id}/messages/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: otherMsgs.map((m: ChatMessage) => m.id) }),
              }).catch(() => {})
            }
            // Fetch bookmarks for the active persona to show bookmark indicators
            fetch(`/api/bookmarks?personaId=${activePersona.id}`)
              .then(async (res) => {
                if (res.ok) {
                  const bdata = await res.json()
                  const ids = new Set((bdata.bookmarks || []).map((b: any) => b.messageId))
                  setBookmarkedMsgIds(ids)
                }
              })
              .catch(() => {})
          }
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMessages()
  }, [conversation.id, activePersona])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Track scroll position to show/hide the scroll-to-bottom button
  useEffect(() => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]')
    if (!viewport) return
    const handleScroll = () => {
      const el = viewport as HTMLElement
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollToBottom(distFromBottom > 200)
    }
    viewport.addEventListener('scroll', handleScroll)
    return () => viewport.removeEventListener('scroll', handleScroll)
  }, [isLoading])
  
  const handleTyping = useCallback(() => {
    sendTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 3000)
  }, [sendTyping])
  
  // Send a message — uploads any pending attachments first (per-file
  // progress on the chips), then posts the message with the attachments
  // metadata + text. Works with text-only, attachments-only, or both.
  const sendMessage = async () => {
    if ((!newMessage.trim() && pendingAttachments.count === 0) || !activePersona || isSending) return

    setIsSending(true)
    try {
      let uploaded: Awaited<ReturnType<typeof pendingAttachments.uploadAll>> = []
      if (pendingAttachments.count > 0) {
        // Failed uploads are toasted and their chips removed inside uploadAll
        uploaded = await pendingAttachments.uploadAll()
        if (uploaded.length === 0 && !newMessage.trim()) return
      }

      const sent = await sendChatMessage({
        content: newMessage.trim(),
        senderPersonaId: activePersona.id,
        attachments: uploaded.length > 0 ? uploaded : null,
        replyToId: replyingTo?.id || null,
      })

      if (sent) {
        setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]))
        setNewMessage('')
        pendingAttachments.clearAll()
        setReplyingTo(null)
        sendTyping(false)
      } else {
        toast({ title: 'Failed to send message', description: 'Please try again.', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast({ title: 'Failed to send message', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }
  
  // Generate AI response
  const generateAIResponse = async () => {
    if (!activePersona || isGenerating) return
    
    setIsGenerating(true)
    try {
      // Find messages that mention the current user
      const myUsername = activePersona.name
      const mentionRegex = new RegExp(`@${myUsername}\\b`, 'i')
      const mentionedIn = messages
        .filter(m => mentionRegex.test(m.content))
        .map(m => m.content)
        .pop() || null
      
      // Fetch the other persona's full data for better AI context
      let otherPersonaData = {
        name: conversation.otherPersona.name,
        description: conversation.otherPersona.isOnline ? 'Online' : 'Offline',
      }
      
      try {
        const personaResponse = await fetch(`/api/personas/${conversation.otherPersona.id}/public`)
        if (personaResponse.ok) {
          const personaResult = await personaResponse.json()
          if (personaResult.persona) {
            otherPersonaData = {
              name: personaResult.persona.name,
              description: personaResult.persona.description,
              backstory: personaResult.persona.backstory,
              personalityDescription: personaResult.persona.personalityDescription,
              personalitySpectrums: personaResult.persona.personalitySpectrums,
              bigFive: personaResult.persona.bigFive,
              hexaco: personaResult.persona.hexaco,
              strengths: personaResult.persona.strengths,
              flaws: personaResult.persona.flaws,
              values: personaResult.persona.values,
              fears: personaResult.persona.fears,
              likes: personaResult.persona.likes,
              dislikes: personaResult.persona.dislikes,
              hobbies: personaResult.persona.hobbies,
              speechPatterns: personaResult.persona.speechPatterns,
              mbtiType: personaResult.persona.mbtiType,
              gender: personaResult.persona.gender,
              age: personaResult.persona.age,
              species: personaResult.persona.species,
            }
          }
        }
      } catch (fetchError) {
        console.warn('Could not fetch other persona data, using basic info:', fetchError)
      }
      
      const response = await fetch('/api/ai/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(-15), // Last 15 messages for context
          myPersona: {
            name: activePersona.name,
            description: activePersona.description,
            backstory: activePersona.backstory,
            personalityDescription: activePersona.personalityDescription,
            personalitySpectrums: activePersona.personalitySpectrums,
            bigFive: activePersona.bigFive,
            hexaco: activePersona.hexaco,
            strengths: activePersona.strengths,
            flaws: activePersona.flaws,
            values: activePersona.values,
            fears: activePersona.fears,
            likes: activePersona.likes,
            dislikes: activePersona.dislikes,
            hobbies: activePersona.hobbies,
            speechPatterns: activePersona.speechPatterns,
            mbtiType: activePersona.mbtiType,
            gender: activePersona.gender,
            age: activePersona.age,
            species: activePersona.species,
          },
          otherPersona: otherPersonaData,
          mentionedIn,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.response) {
        setNewMessage(data.response)
        // Focus the textarea after generating
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 0)
      } else {
        toast({ 
          title: 'Generation Failed', 
          description: data.error || 'Failed to generate response. Please try again.',
          variant: 'destructive' 
        })
      }
    } catch (error) {
      console.error('AI generation error:', error)
      toast({ 
        title: 'Generation Failed', 
        description: 'Network error. Please try again.',
        variant: 'destructive' 
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Handle keyboard shortcuts for markdown formatting
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
      return
    }
    
    // Markdown shortcuts
    if (e.ctrlKey || e.metaKey) {
      const textarea = textareaRef.current
      if (!textarea) return
      
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const hasSelection = start !== end
      
      switch (e.key.toLowerCase()) {
        case 'b': // Bold
          e.preventDefault()
          if (hasSelection) {
            const result = wrapSelection(newMessage, start, end, '**')
            setNewMessage(result.text)
            setTimeout(() => {
              textarea.setSelectionRange(result.cursorOffset - 2, result.cursorOffset - 2)
            }, 0)
          } else {
            setNewMessage(prev => prev + '****')
            setTimeout(() => {
              textarea.setSelectionRange(newMessage.length + 2, newMessage.length + 2)
            }, 0)
          }
          break
          
        case 'i': // Italic
          e.preventDefault()
          if (hasSelection) {
            const result = wrapSelection(newMessage, start, end, '*')
            setNewMessage(result.text)
            setTimeout(() => {
              textarea.setSelectionRange(result.cursorOffset - 1, result.cursorOffset - 1)
            }, 0)
          } else {
            setNewMessage(prev => prev + '**')
            setTimeout(() => {
              textarea.setSelectionRange(newMessage.length + 1, newMessage.length + 1)
            }, 0)
          }
          break
          
        case 'u': // Underline
          e.preventDefault()
          if (hasSelection) {
            const result = wrapSelection(newMessage, start, end, '__')
            setNewMessage(result.text)
            setTimeout(() => {
              textarea.setSelectionRange(result.cursorOffset - 2, result.cursorOffset - 2)
            }, 0)
          } else {
            setNewMessage(prev => prev + '____')
            setTimeout(() => {
              textarea.setSelectionRange(newMessage.length + 2, newMessage.length + 2)
            }, 0)
          }
          break
          
        case 's': // Strikethrough
          e.preventDefault()
          if (hasSelection) {
            const result = wrapSelection(newMessage, start, end, '~~')
            setNewMessage(result.text)
            setTimeout(() => {
              textarea.setSelectionRange(result.cursorOffset - 2, result.cursorOffset - 2)
            }, 0)
          } else {
            setNewMessage(prev => prev + '~~~~')
            setTimeout(() => {
              textarea.setSelectionRange(newMessage.length + 2, newMessage.length + 2)
            }, 0)
          }
          break
          
        case 'e': // Inline code
          e.preventDefault()
          if (hasSelection) {
            const result = wrapSelection(newMessage, start, end, '`')
            setNewMessage(result.text)
            setTimeout(() => {
              textarea.setSelectionRange(result.cursorOffset - 1, result.cursorOffset - 1)
            }, 0)
          } else {
            setNewMessage(prev => prev + '``')
            setTimeout(() => {
              textarea.setSelectionRange(newMessage.length + 1, newMessage.length + 1)
            }, 0)
          }
          break
      }
    }
  }
  
  // Defensive fallback: if otherPersona is missing, show a graceful message
  // instead of crashing the chat view. This is rendered AFTER all hooks.
  if (!hasOtherPersona) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center bg-[#0b0d11]">
        <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
          <MessageCircle className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-200">Conversation unavailable</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">This conversation could not be loaded. It may have been removed or is restricted by age settings.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 transition-colors"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-gradient-to-b from-[#0b0d11] via-[#0f1117] to-[#0e1015]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/[0.08] bg-[#0e1015]/50 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" onClick={onBack} className="text-slate-300 hover:text-slate-100 hover:bg-white/[0.05] gap-2 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="w-px h-8 bg-teal-500/15" />
        <div className="relative persona-status" style={conversation.otherPersona.isOnline ? {} : {}}>
          <Avatar className="w-10 h-10 border-2 border-teal-500/20">
            <AvatarImage src={conversation.otherPersona.avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-teal-500/50 to-cyan-500/50 text-white font-semibold">{conversation.otherPersona.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0e1015] ${conversation.otherPersona.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-slate-100">{conversation.otherPersona.name}</h3>
          {isTyping ? (
            <p className="text-xs text-primary flex items-center gap-1" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0.2s' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0.4s' }} />
              </span>
              typing…
            </p>
          ) : (
            <p className="text-xs text-slate-500">@{conversation.otherPersona.username}</p>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
          <span className={`w-2 h-2 rounded-full ${conversation.otherPersona.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className={`text-xs font-medium ${conversation.otherPersona.isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>{conversation.otherPersona.isOnline ? 'Online' : 'Offline'}</span>
        </div>
        {/* Search within conversation */}
        <button
          onClick={() => setSearchInChatOpen((v) => !v)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${searchInChatOpen ? 'bg-primary/15 text-primary' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'}`}
          title="Search in conversation"
        >
          <Search className="w-4 h-4" />
        </button>
        {/* Conversation settings dropdown */}
        {!isBlorpConversation && (
          <ConversationSettingsDropdown conversation={conversation} onCleared={onBack} />
        )}
      </div>

      {/* In-conversation search bar */}
      {searchInChatOpen && (
        <div className="px-4 py-2.5 border-b border-border bg-popover/50 backdrop-blur-sm flex items-center gap-2" style={{ animation: 'fadeIn 0.15s ease-out' }}>
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search messages in this conversation…"
            value={searchInChatQuery}
            onChange={(e) => setSearchInChatQuery(e.target.value)}
            autoFocus
            className="flex-1 h-8 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {searchInChatQuery && (
            <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-white/[0.04]">
              {messages.filter((m) => m.content?.toLowerCase().includes(searchInChatQuery.toLowerCase())).length} found
            </span>
          )}
          <button
            onClick={() => { setSearchInChatOpen(false); setSearchInChatQuery('') }}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pinned Messages Bar */}
      <PinnedMessagesBar
        conversationId={conversation.id}
        refreshKey={pinsRefreshKey}
        onUnpin={async (messageId) => {
          if (!activePersona) return
          try {
            const resp = await fetch(`/api/conversations/${conversation.id}/messages/${messageId}/pin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ personaId: activePersona.id }),
            })
            if (resp.ok) {
              toast({ title: 'Message unpinned', variant: 'default' })
              setPinsRefreshKey(k => k + 1)
            }
          } catch {}
        }}
        onJumpToMessage={(messageId) => {
          // Scroll to the message element by its data-message-id attribute
          const el = document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement | null
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Briefly highlight the message
            el.classList.add('ring-2', 'ring-primary/60', 'rounded-lg')
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-primary/60', 'rounded-lg')
            }, 2000)
          } else {
            toast({ title: 'Message not in view', description: 'Load earlier messages to see it', variant: 'default' })
          }
        }}
      />

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          // Skeleton loading state — mimics message layout
          <div className="space-y-4 max-w-[1100px] mx-auto w-full">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3" style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }}>
                <div className="w-10 h-10 rounded-full bg-white/[0.06] flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-white/[0.06]" />
                  <div className="h-4 rounded bg-white/[0.04]" style={{ width: `${50 + (i % 3) * 20}%` }} />
                  {i % 2 === 0 && <div className="h-4 w-32 rounded bg-white/[0.04]" />}
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          // Empty state — welcoming and actionable
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <MessageCircle className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
            </div>
            <p className="text-lg font-semibold text-slate-100">Start the conversation</p>
            <p className="text-sm mt-1.5 text-slate-400 max-w-sm">Say hello to <span className="font-medium text-primary">{conversation.otherPersona.name}</span> and begin your story together.</p>
            {!isBlorpConversation && (
              <button
                onClick={() => { setNewMessage(`Hi ${conversation.otherPersona.name}! `); setTimeout(() => textareaRef.current?.focus(), 50) }}
                className="mt-5 px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Say hello
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0 pb-4 max-w-[1100px] mx-auto w-full">
            {/* Load earlier messages button (virtual scrolling) */}
            {hasMoreMessages && (
              <div className="flex justify-center my-4">
                <button
                  onClick={() => setShowAllMessages(true)}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] hover:border-teal-500/25 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Load {hiddenMessageCount} earlier message{hiddenMessageCount !== 1 ? 's' : ''}
                </button>
              </div>
            )}
            {(() => {
              // Helper to format date separator
              const formatDateSeparator = (date: Date) => {
                const now = new Date()
                const yesterday = new Date(now)
                yesterday.setDate(yesterday.getDate() - 1)
                
                if (date.toDateString() === now.toDateString()) return 'Today'
                if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
                return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              }
              
              // Check if two dates are on different days
              const isDifferentDay = (d1: Date, d2: Date) => {
                return d1.getFullYear() !== d2.getFullYear() || d1.getMonth() !== d2.getMonth() || d1.getDate() !== d2.getDate()
              }
              
              // Check if two timestamps are more than 7 minutes apart
              const isFarApart = (d1: Date, d2: Date) => {
                return Math.abs(d1.getTime() - d2.getTime()) > 7 * 60 * 1000
              }
              
              // Build message list with date separators and grouping (using visibleMessages for virtual scrolling)
              type MessageItem = 
                | { type: 'date'; date: Date; key: string }
                | { type: 'unread'; count: number; key: string }
                | { type: 'message'; message: ChatMessage; showHeader: boolean; key: string }
              
              const items: MessageItem[] = []
              
              // Unread divider: placed before the FIRST unread message from the other
              // persona (messages get marked read on open, so the divider naturally
              // disappears on the next fetch after reading).
              let firstUnreadIndex = -1
              let unreadTotal = 0
              visibleMessages.forEach((m, i) => {
                if (m.senderId !== activePersona?.id && !m.readAt) {
                  unreadTotal++
                  if (firstUnreadIndex === -1) firstUnreadIndex = i
                }
              })
              
              visibleMessages.forEach((message, index) => {
                const messageDate = new Date(message.createdAt)
                const prevMessage = index > 0 ? visibleMessages[index - 1] : null
                const prevDate = prevMessage ? new Date(prevMessage.createdAt) : null
                
                // Insert the unread divider before the first unread message
                if (index === firstUnreadIndex && unreadTotal > 0) {
                  items.push({ type: 'unread', count: unreadTotal, key: `unread-${message.id}` })
                }
                
                // Add date separator if needed
                if (!prevDate || isDifferentDay(prevDate, messageDate)) {
                  items.push({ type: 'date', date: messageDate, key: `date-${message.id}` })
                }
                
                // Determine if we should show the header (avatar + name + timestamp)
                const sameSender = prevMessage && prevMessage.senderId === message.senderId
                const farApart = !prevDate || isFarApart(prevDate, messageDate)
                const showHeader = !sameSender || farApart
                
                items.push({ type: 'message', message, showHeader, key: message.id })
              })
              
              return items.map((item) => {
                if (item.type === 'date') {
                  return (
                    <div key={item.key} className="flex items-center my-4">
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {formatDateSeparator(item.date)}
                      </span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                  )
                }
                
                if (item.type === 'unread') {
                  return (
                    <div key={item.key} className="flex items-center gap-3 my-3" role="separator" aria-label={`${item.count} unread messages`}>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/60" />
                      <span className="flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/40 px-3 py-1 text-[10px] font-bold text-primary uppercase tracking-wider shadow-sm shadow-primary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        New
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary/60" />
                    </div>
                  )
                }
                
                const { message, showHeader } = item
                const isMine = message.senderId === activePersona?.id
                const isHovered = hoveredMessageId === message.id
                
                return (
                  <ChatMessageItem
                    key={item.key}
                    message={message}
                    showHeader={showHeader}
                    isMine={isMine}
                    isHovered={isHovered}
                    otherUsername={conversation.otherPersona.username}
                    onHoverEnter={() => setHoveredMessageId(message.id)}
                    onHoverLeave={() => setHoveredMessageId(null)}
                    onContextMenu={handleContextMenu}
                    onMoreActions={handleMoreActions}
                    onReply={handleReply}
                    onEdit={startEditing}
                    isEditing={editingMessageId === message.id}
                    editValue={editValue}
                    onEditChange={setEditValue}
                    onEditSave={saveEditing}
                    onEditCancel={cancelEditing}
                    onQuickReaction={handleQuickReaction}
                    searchHighlight={searchInChatOpen && searchInChatQuery.trim() ? searchInChatQuery : undefined}
                    isBookmarked={bookmarkedMsgIds.has(message.id)}
                    onViewEditHistory={setViewingEditHistory}
                  />
                )
              })
            })()}
            {isTyping && (
              <div className="flex items-center gap-3 mt-4 persona-message">
                <Avatar className="w-10 h-10 border border-teal-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-teal-500/50 to-cyan-500/50 text-white text-sm font-medium">
                    {typingPersona?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-slate-100 mb-0.5">{typingPersona}</span>
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a1c22] border border-white/[0.06]">
                    <div className="flex gap-1 items-center">
                      <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.15s' }} />
                      <span className="w-2 h-2 bg-teal-300 rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.3s' }} />
                    </div>
                    <span className="text-[10px] text-slate-500 ml-1.5">typing</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Scroll to bottom button — appears when scrolled up */}
      {showScrollToBottom && messages.length > 0 && (
        <div className="relative">
          <button
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute -top-12 right-4 w-10 h-10 rounded-full bg-popover border border-border shadow-lg flex items-center justify-center text-slate-300 hover:text-primary hover:border-primary/40 transition-all hover:-translate-y-0.5"
            title="Scroll to latest"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          >
            <ChevronDown className="w-5 h-5" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {Math.min(messages.length, 99)}
              </span>
            )}
          </button>
        </div>
      )}
      
      {/* Message Input */}
      <div className="sticky bottom-0 p-4 border-t border-white/[0.08] bg-[#0e1015]/80 backdrop-blur-sm">
        {isBlorpConversation ? (
          /* Read-only message for Blorp conversations */
          <div className="max-w-3xl mx-auto">
            <div className="text-center py-4 px-6 persona-card rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-amber-300 font-medium">Official Notification Channel</p>
              </div>
              <p className="text-sm text-slate-400">This is a read-only conversation. You can only view messages from Blorp, not reply.</p>
            </div>
          </div>
        ) : !activePersona ? (
          <div className="text-center py-3 persona-card rounded-xl"><p className="text-slate-500 text-sm">Create and activate a persona to send messages</p></div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Reply preview */}
            {replyingTo && (
              <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-teal-500/[0.06] border border-teal-500/20">
                <CornerDownRight className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-teal-300">Replying to {replyingTo.sender.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {replyingTo.imageUrl && !replyingTo.content ? '📷 Image attachment' : replyingTo.content || '📷 Image'}
                  </p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {/* Pending attachment chips (multi-file picker) */}
            <AttachmentChipsBar picker={pendingAttachments} />
            {/* Markdown Toolbar */}
            <div className="flex items-center gap-1 mb-2 px-1">
              {[
                { syntax: '**', label: 'B', title: 'Bold (Ctrl+B)', className: 'font-bold text-xs' },
                { syntax: '*', label: 'I', title: 'Italic (Ctrl+I)', className: 'italic text-xs' },
                { syntax: '__', label: 'U', title: 'Underline (Ctrl+U)', className: 'underline text-xs' },
                { syntax: '~~', label: 'S', title: 'Strikethrough', className: 'line-through text-xs' },
                { syntax: '`', label: '</>', title: 'Inline Code', className: 'font-mono text-[10px]' },
              ].map((btn) => (
                <button
                  key={btn.syntax}
                  onClick={() => {
                    const textarea = textareaRef.current
                    if (!textarea) return
                    const start = textarea.selectionStart
                    const end = textarea.selectionEnd
                    const result = wrapSelection(newMessage, start, end, btn.syntax)
                    setNewMessage(result.text)
                    setTimeout(() => {
                      textarea.focus()
                      textarea.setSelectionRange(result.cursorOffset - btn.syntax.length, result.cursorOffset - btn.syntax.length)
                    }, 0)
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
                  title={btn.title}
                >
                  <span className={btn.className}>{btn.label}</span>
                </button>
              ))}
              <div className="w-px h-4 bg-white/[0.08] mx-1" />
              {[
                { syntax: '||', label: '⬛', title: 'Spoiler' },
                { syntax: '```', label: '{ }', title: 'Code Block' },
              ].map((btn) => (
                <button
                  key={btn.syntax}
                  onClick={() => {
                    const textarea = textareaRef.current
                    if (!textarea) return
                    const start = textarea.selectionStart
                    const end = textarea.selectionEnd
                    const result = wrapSelection(newMessage, start, end, btn.syntax)
                    setNewMessage(result.text)
                    setTimeout(() => {
                      textarea.focus()
                      textarea.setSelectionRange(result.cursorOffset - 2, result.cursorOffset - 2)
                    }, 0)
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors text-[10px]"
                  title={btn.title}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 items-center">
              {/* Hidden multi-file attachment picker input */}
              <input
                id="chrona-attachment-input"
                type="file"
                multiple
                accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(',')}
                onChange={(e) => {
                  pendingAttachments.addFiles(e.target.files)
                  e.target.value = ''
                }}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex flex-shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={pendingAttachments.openPicker}
                      disabled={pendingAttachments.isAtMax || isSending}
                      aria-label={pendingAttachments.isAtMax ? 'Maximum attachments reached' : 'Attach images'}
                      title={pendingAttachments.isAtMax ? undefined : 'Attach images'}
                      className="text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-xl h-11 w-11 flex-shrink-0 border border-white/[0.08] disabled:opacity-50"
                    >
                      {pendingAttachments.anyUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </Button>
                  </span>
                </TooltipTrigger>
                {pendingAttachments.isAtMax && <TooltipContent>Max 5 attachments</TooltipContent>}
              </Tooltip>
              <div className="flex-1 relative">
                <Textarea 
                  ref={textareaRef}
                  placeholder="Type a message..." 
                  value={newMessage} 
                  onChange={(e) => { setNewMessage(e.target.value); handleTyping() }} 
                  onKeyDown={handleKeyDown} 
                  className="w-full persona-input resize-none h-11 min-h-[44px] max-h-[120px] rounded-xl py-2.5 px-4" 
                  disabled={isSending} 
                />
              </div>
              {/* AI Generate Button */}
              <Button 
                onClick={generateAIResponse} 
                disabled={!activePersona || isGenerating || isSending} 
                className="btn-persona h-11 w-11 rounded-xl flex-shrink-0 px-0"
                title="Generate AI response based on your persona"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </Button>
              <Button onClick={sendMessage} disabled={(!newMessage.trim() && pendingAttachments.count === 0) || isSending} className="btn-persona h-11 w-11 rounded-xl flex-shrink-0 px-0">
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu for Messages */}
      {contextMenu && null}

      {/* Forward Message Dialog */}
      <ForwardMessageDialog
        open={forwardDialogOpen}
        onClose={() => { setForwardDialogOpen(false); setForwardingMessage(null) }}
        message={forwardingMessage}
        sourceConversationId={conversation.id}
        onForwarded={(targetConvId) => {
          // Refresh conversations so the target shows the new message
          window.dispatchEvent(new CustomEvent('chrona:dm-refresh'))
          toast({ title: 'Message forwarded successfully', variant: 'default' })
        }}
      />

      {/* Edit History Viewer */}
      {viewingEditHistory && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setViewingEditHistory(null)} />
          <div className="relative w-full max-w-md max-h-[70vh] rounded-2xl bg-popover border border-border shadow-2xl shadow-black/50 overflow-hidden flex flex-col" style={{ animation: 'fadeInScale 0.18s ease-out' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Edit History</h2>
                  <p className="text-[11px] text-muted-foreground">{viewingEditHistory.editHistory?.length || 0} previous version{(viewingEditHistory.editHistory?.length || 0) !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setViewingEditHistory(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* History list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {(viewingEditHistory.editHistory || []).map((edit, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Version {idx + 1}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(edit.editedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap line-through opacity-70">{edit.content || '(empty)'}</p>
                </div>
              ))}
              {/* Current version */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Current</span>
                  <span className="text-[10px] text-muted-foreground">{viewingEditHistory.editedAt ? new Date(viewingEditHistory.editedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{viewingEditHistory.content}</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Report Modal */}
      <Suspense fallback={null}>
        <ReportModal
          isOpen={showReportModal}
          onClose={() => { setShowReportModal(false); setReportMessage(null) }}
          type="dm_message"
          reportedId={conversation.otherPersona.id}
          referenceId={reportMessage?.id}
          reportedName={conversation.otherPersona.name}
          messagePreview={reportMessage?.content || undefined}
        />
      </Suspense>
    </div>
  )
}

// ==================== DM REQUEST DIALOG ====================
export function DmRequestDialog({
  isOpen,
  onClose,
  targetPersona,
  myPersona,
  onSuccess
}: {
  isOpen: boolean
  onClose: () => void
  targetPersona: { id: string; name: string; username: string } | null
  myPersona: Persona | null
  onSuccess: (conversationId: string) => void
}) {
  const [firstMessage, setFirstMessage] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' }); return }
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'File too large', description: 'Image must be less than 5MB', variant: 'destructive' }); return }
    
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (response.ok) {
        const data = await response.json()
        setImageUrl(data.avatarUrl || data.url)
      } else { toast({ title: 'Upload failed', description: 'Failed to upload image', variant: 'destructive' }) }
    } catch (error) {
      console.error('Image upload error:', error)
      toast({ title: 'Upload failed', description: 'Failed to upload image', variant: 'destructive' })
    } finally {
      setIsUploadingImage(false)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSendRequest = async () => {
    if (!targetPersona || !myPersona) return
    if (!firstMessage.trim() && !imageUrl) {
      toast({ title: 'Message required', description: 'Please enter a message or add an image', variant: 'destructive' })
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPersonaId: targetPersona.id,
          myPersonaId: myPersona.id,
          firstMessage: firstMessage.trim(),
          imageUrl
        })
      })
      const data = await response.json()

      if (response.ok) {
        if (data.conversation) {
          // Conversation was created (reverse DM request accepted or existing)
          onSuccess(data.conversation.id)
        } else if (data.dmRequest) {
          // DM request was sent
          toast({ title: 'Request sent!', description: `Your message request has been sent to ${targetPersona.name}`, variant: 'default' })
          onClose()
        }
        setFirstMessage('')
        setImageUrl(null)
      } else {
        toast({ title: 'Failed to send request', description: data.error || 'Something went wrong', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to send DM request:', error)
      toast({ title: 'Failed to send request', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen || !targetPersona) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="persona-modal max-w-md">
        <DialogHeader className="persona-modal-header">
          <DialogTitle className="text-lg font-bold persona-gradient-text flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-slate-400" />
            Send Message Request
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Start a conversation with {targetPersona.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.05] border border-white/[0.08]">
            <Avatar className="w-10 h-10 border-2 border-teal-500/20">
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-400 text-white font-semibold">
                {targetPersona.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-slate-100">{targetPersona.name}</p>
              <p className="text-xs text-slate-500">@{targetPersona.username}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200/80">Your message</Label>
            <Textarea
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="Write a message to start the conversation..."
              className="persona-input min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-slate-500 text-right">{firstMessage.length}/500</p>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label className="text-slate-200/80">Add image (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-white/[0.08]">
                <img src={imageUrl} alt="Preview" className="w-full max-h-40 object-cover" />
                <button
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="w-full py-3 rounded-lg border border-dashed border-teal-500/20 text-slate-400 hover:border-teal-500/30 hover:text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                {isUploadingImage ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <><ImageIcon className="w-4 h-4" /> Click to add image</>
                )}
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-slate-300 hover:bg-white/[0.05] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSendRequest}
              disabled={isSending || (!firstMessage.trim() && !imageUrl)}
              className="btn-persona flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4" /> Send Request</>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== MAIN APP ====================
function MainApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'friends' | 'storylines' | 'chat' | 'wallet' | 'admin' | 'marketplace'>('home')
  const [activeChat, setActiveChat] = useState<Conversation | null>(null)
  const [activeStorylineId, setActiveStorylineId] = useState<string | null>(null)
  const [showCreatePersonaModal, setShowCreatePersonaModal] = useState(false)
  const [showAchievementModal, setShowAchievementModal] = useState(false)
  const [showMyPersonasModal, setShowMyPersonasModal] = useState(false)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // UI variant determines the entire layout structure
  const { variant: uiVariant } = useUIVariant()

  // Navigation mode: 'static' (sidebar) or 'linear' (topbar + DM sidebar) — only used for Chrona layout
  const [navigationMode, setNavigationMode] = useState<'static' | 'linear'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('chrona-navigation-mode')
        if (stored === 'linear' || stored === 'static') return stored
      } catch {}
    }
    return 'static'
  })
  
  // Single global DM sidebar collapse state (persists across tabs)
  const [isDMSidebarCollapsed, setIsDMSidebarCollapsed] = useState(false)
  // Track if sidebar was auto-collapsed by marketplace (vs user manually collapsed)
  const wasAutoCollapsedByMarketplaceRef = useRef(false)
  
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!(window as any).electronAPI)
  const { createPersona, activePersona } = usePersonas()
  const { user: authUser, logout } = useAuth()
  const { toast } = useToast()
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  // Sync navigation mode from user preferences via a ref-based comparison
  const prevUserNavModeRef = useRef<string | undefined>(undefined)
  const userNavMode = authUser?.navigationMode
  if (userNavMode !== prevUserNavModeRef.current) {
    prevUserNavModeRef.current = userNavMode
    if (userNavMode === 'linear' || userNavMode === 'static') {
      // Use a microtask to avoid calling setState during render
      queueMicrotask(() => {
        setNavigationMode(userNavMode as 'static' | 'linear')
        try { localStorage.setItem('chrona-navigation-mode', userNavMode) } catch {}
      })
    }
  }

  // Listen for navigation mode changes from topbar dropdown
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: string }>
      const mode = customEvent.detail?.mode
      if (mode === 'linear' || mode === 'static') {
        setNavigationMode(mode)
      }
    }
    window.addEventListener('chrona:navigation-mode-changed', handler)
    return () => window.removeEventListener('chrona:navigation-mode-changed', handler)
  }, [])

  // Listen for achievement modal open event
  useEffect(() => {
    const handler = () => setShowAchievementModal(true)
    window.addEventListener('chrona:open-achievements', handler)
    return () => window.removeEventListener('chrona:open-achievements', handler)
  }, [])

  // Listen for edit profile modal open event
  useEffect(() => {
    const handler = () => setShowEditProfileModal(true)
    window.addEventListener('chrona:open-edit-profile', handler)
    return () => window.removeEventListener('chrona:open-edit-profile', handler)
  }, [])

  // Listen for search modal open event (Find Users / Search)
  useEffect(() => {
    const handler = () => setSearchModalOpen(true)
    window.addEventListener('chrona:open-find-users', handler)
    return () => window.removeEventListener('chrona:open-find-users', handler)
  }, [])

  // Listen for settings panel open event
  useEffect(() => {
    const handler = () => setSettingsOpen(true)
    window.addEventListener('chrona:open-settings', handler)
    return () => window.removeEventListener('chrona:open-settings', handler)
  }, [])

  // Listen for user profile modal open event
  useEffect(() => {
    const handler = (e: Event) => {
      const { userId } = (e as CustomEvent<{ userId: string }>).detail
      if (userId) {
        setViewingUserId(userId)
        setShowUserProfile(true)
      }
    }
    window.addEventListener('chrona:open-user-profile', handler)
    return () => window.removeEventListener('chrona:open-user-profile', handler)
  }, [])

  // Listen for my personas modal open event
  useEffect(() => {
    const handler = () => setShowMyPersonasModal(true)
    window.addEventListener('chrona:open-my-personas', handler)
    return () => window.removeEventListener('chrona:open-my-personas', handler)
  }, [])

  // Listen for create-persona modal open event (fired from the Discover page's
  // "Create Your First Character" prompts)
  useEffect(() => {
    const handler = () => setShowCreatePersonaModal(true)
    window.addEventListener('chrona:open-create-persona', handler)
    return () => window.removeEventListener('chrona:open-create-persona', handler)
  }, [])

  // Custom setActiveTab that handles marketplace sidebar behavior
  const handleSetActiveTab = useCallback((newTab: typeof activeTab) => {
    // If entering marketplace, force collapse and remember if it was already collapsed
    if (newTab === 'marketplace' && activeTab !== 'marketplace') {
      if (!isDMSidebarCollapsed) {
        wasAutoCollapsedByMarketplaceRef.current = true
      }
      setIsDMSidebarCollapsed(true)
    }
    // If leaving marketplace, only expand if we auto-collapsed it
    else if (activeTab === 'marketplace' && newTab !== 'marketplace' && wasAutoCollapsedByMarketplaceRef.current) {
      setIsDMSidebarCollapsed(false)
      wasAutoCollapsedByMarketplaceRef.current = false
    }
    setActiveTab(newTab)
  }, [activeTab, isDMSidebarCollapsed])
  
  // Handle toggling sidebar collapse (not allowed on marketplace)
  const handleToggleDMSidebar = useCallback(() => {
    // Don't allow toggling on marketplace tab
    if (activeTab === 'marketplace') return
    setIsDMSidebarCollapsed(prev => !prev)
    // If user manually toggles, it's no longer auto-collapsed
    wasAutoCollapsedByMarketplaceRef.current = false
  }, [activeTab])
  
  // Normalize a conversation object to ensure it always has the transformed shape
  // (with `otherPersona`). Some callers pass the raw Prisma shape (personaA/personaB)
  // from the POST /api/conversations response — this converts it.
  const normalizeConversation = useCallback((conv: any): Conversation | null => {
    if (!conv) return null
    // Already transformed shape
    if (conv.otherPersona && conv.otherPersona.name) return conv as Conversation
    // Raw Prisma shape — transform it
    if (conv.personaA && conv.personaB && (conv.personaAId || conv.personaBId)) {
      const myPersonaId = activePersona?.id
      const isPersonaA = myPersonaId ? conv.personaAId === myPersonaId : true
      const other = isPersonaA ? conv.personaB : conv.personaA
      const mine = isPersonaA ? conv.personaA : conv.personaB
      if (!other) return null
      return {
        id: conv.id,
        otherPersona: {
          id: other.id,
          name: other.name,
          avatarUrl: other.avatarUrl ?? null,
          username: other.user?.username ?? 'unknown',
          isOnline: other.isOnline ?? false,
        },
        myPersona: {
          id: mine?.id ?? myPersonaId ?? '',
          name: mine?.name ?? activePersona?.name ?? 'Me',
        },
        lastMessage: (conv.messages && conv.messages[0]) ? {
          content: conv.messages[0].content,
          createdAt: conv.messages[0].createdAt,
        } : null,
        lastMessageAt: conv.lastMessageAt ?? conv.createdAt,
        createdAt: conv.createdAt,
      }
    }
    return null
  }, [activePersona])

  // Handle selecting a chat from sidebar
  const handleSelectChat = useCallback(async (conversationId: string) => {
    try {
      const response = await apiFetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        const conv = data.conversations.find((c: Conversation) => c.id === conversationId)
        const normalized = conv ? normalizeConversation(conv) : null
        if (normalized) {
          setActiveChat(normalized)
          handleSetActiveTab('chat')
        } else {
          toast({ title: 'Conversation unavailable', description: 'This conversation may have been removed or is restricted.', variant: 'destructive' })
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error)
    }
  }, [handleSetActiveTab, normalizeConversation, toast])
  
  // Handle selecting a storyline (from the sidebar's My Storylines list —
  // enters the storyline interior directly; the Storylines PAGE no longer
  // exists, storylines live inside Discover's Storylines tab now)
  const handleSelectStoryline = useCallback((storylineId: string) => {
    setActiveStorylineId(storylineId)
    handleSetActiveTab('home')
  }, [handleSetActiveTab])
  
  // Handle starting a chat from discovery
  const handleStartChat = useCallback((conv: Conversation) => {
    const normalized = normalizeConversation(conv)
    if (!normalized) {
      // Fallback: try to re-fetch the conversation by id to get the transformed shape
      if (conv?.id) {
        apiFetch('/api/conversations').then(async (res) => {
          if (res.ok) {
            const data = await res.json()
            const found = data.conversations.find((c: Conversation) => c.id === conv.id)
            if (found) {
              setActiveChat(found)
              handleSetActiveTab('chat')
            }
          }
        }).catch(() => {})
      }
      return
    }
    setActiveChat(normalized)
    handleSetActiveTab('chat')
  }, [handleSetActiveTab, normalizeConversation])
  
  // Handle creating persona
  const handleSavePersona = useCallback(async (data: PersonaFormData) => {
    await createPersona(data)
    setShowCreatePersonaModal(false)
  }, [createPersona])
  
  // Navigation handler shared across all layouts
  const handleNavigate = useCallback((item: string) => {
    if (item === 'discover') { handleSetActiveTab('home'); return }
    if (item === 'achievements') {
      window.dispatchEvent(new CustomEvent('chrona:open-achievements'))
      return
    }
    if (item === 'storylines') {
      // The Storylines page is gone — storylines live in Discover now.
      // Go home and ask the Discover page to open its Storylines tab.
      handleSetActiveTab('home')
      window.dispatchEvent(new CustomEvent('chrona:open-discover-tab', { detail: { tab: 'storylines' } }))
      return
    }
    const tabMap: Record<string, string> = {
      'friends': 'friends',
      'marketplace': 'marketplace',
      'chronos': 'wallet',
      'chat': 'chat',
      'admin': 'admin',
    }
    handleSetActiveTab(tabMap[item] as any || 'home')
    setActiveStorylineId(null)
    if (item !== 'chat') setActiveChat(null)
  }, [handleSetActiveTab])

  // Wire up global keyboard shortcuts (/, comma, G+H/F/S/C/M)
  useKeyboardShortcuts({ onNavigate: handleNavigate })

  // Security key reveal handler for EditProfileModal
  const handleRevealSecurityKey = useCallback(async () => {
    try {
      const response = await apiFetch('/api/auth/security-key', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        // For now, just alert the key - could be enhanced with a dedicated modal
        alert(`Your new security key: ${data.securityKey}\n\nPlease save this key securely!`)
      }
    } catch (error) {
      console.error('Failed to generate security key:', error)
    }
  }, [])

  // Start a conversation from the Search Modal (by target persona id)
  const searchStartConversation = useCallback(async (targetPersonaId: string) => {
    if (!activePersona) {
      toast({ title: 'No Active Character', description: 'Please activate a character first.', variant: 'destructive' })
      return
    }
    try {
      const response = await apiFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPersonaId, myPersonaId: activePersona.id })
      })
      const data = await response.json()
      if (response.ok) {
        if (data.needsDmRequest && data.targetPersona) {
          toast({ title: 'Message request needed', description: 'You need to send a message request to start chatting with this user.', variant: 'default' })
          return
        }
        if (data.conversation) {
          const convResponse = await apiFetch('/api/conversations')
          if (convResponse.ok) {
            const convData = await convResponse.json()
            const newConv = convData.conversations.find((c: Conversation) => c.id === data.conversation.id)
            const normalized = newConv ? normalizeConversation(newConv) : null
            if (normalized) {
              setActiveChat(normalized)
              handleSetActiveTab('chat')
              window.dispatchEvent(new CustomEvent(DM_REFRESH_EVENT))
            }
          }
        } else if (data.dmRequest) {
          toast({ title: 'Request sent!', description: 'Your message request has been sent.', variant: 'default' })
        }
      } else {
        toast({ title: 'Failed to Start Conversation', description: data.error || 'Something went wrong', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to start conversation from search:', error)
      toast({ title: 'Network error', description: 'Please try again.', variant: 'destructive' })
    }
  }, [activePersona, toast, normalizeConversation, handleSetActiveTab])

  // Render main content based on active tab (shared by all layouts)
  const mainContent = activeStorylineId ? (
    <Suspense fallback={<ComponentSkeleton className="h-full" />}>
      <StorylineInterior 
        storylineId={activeStorylineId} 
        onBack={() => setActiveStorylineId(null)} 
      />
    </Suspense>
  ) : activeTab === 'chat' && activeChat ? (
    <ChatView conversation={activeChat} onBack={() => { setActiveChat(null); handleSetActiveTab('home') }} />
  ) : activeTab === 'friends' ? (
    <FriendsPage onStartChat={handleStartChat} />
  ) : activeTab === 'wallet' ? (
    <Suspense fallback={<ComponentSkeleton className="h-full" />}>
      <WalletPage />
    </Suspense>
  ) : activeTab === 'marketplace' ? (
    <Suspense fallback={<ComponentSkeleton className="h-full" />}>
      <MarketplacePage />
    </Suspense>
  ) : activeTab === 'admin' ? (
    <Suspense fallback={<ComponentSkeleton className="h-full" />}>
      <AdminPanel />
    </Suspense>
  ) : (
    <StorylinesPage
      key="discover-home"
      initialTab="personas"
      onViewStoryline={handleSelectStoryline}
      onStartChat={handleStartChat}
      onNavigate={handleNavigate}
      navigationMode={navigationMode}
      onOpenEditProfile={() => window.dispatchEvent(new CustomEvent('chrona:open-edit-profile'))}
      onOpenMyPersonas={() => window.dispatchEvent(new CustomEvent('chrona:open-my-personas'))}
    />
  )

  // ===== CHRONA LAYOUT (Default - Sidebar + DM Panel) =====
  if (uiVariant === 'chrona') {
    return (
      <div className="h-screen w-full overflow-hidden persona-bg text-slate-100">
        <div className="flex h-full">
          {navigationMode === 'static' ? (
            <Sidebar
              activeTab={activeTab}
              activeStorylineId={activeStorylineId}
              onSelectTab={(tab) => {
                handleSetActiveTab(tab)
                setActiveStorylineId(null)
                if (tab !== 'chat') setActiveChat(null)
              }}
              onSelectStoryline={handleSelectStoryline}
              onCreatePersona={() => setShowCreatePersonaModal(true)}
            />
          ) : (
            <DMSidebar
              activeChatId={activeChat?.id || null}
              onSelectChat={handleSelectChat}
              isCollapsed={isDMSidebarCollapsed}
              onToggleCollapse={handleToggleDMSidebar}
            />
          )}
          {navigationMode === 'static' && (
            <DMSidebar
              activeChatId={activeChat?.id || null}
              onSelectChat={handleSelectChat}
              isCollapsed={isDMSidebarCollapsed}
              onToggleCollapse={handleToggleDMSidebar}
            />
          )}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {navigationMode === 'linear' && (
              <NavigationTopbar
                variant="default"
                activeItem={activeTab === 'wallet' ? 'chronos' : activeTab === 'home' ? 'discover' : activeTab}
                onNavigate={handleNavigate}
                onOpenEditProfile={() => window.dispatchEvent(new CustomEvent('chrona:open-edit-profile'))}
                onOpenMyPersonas={() => { handleSetActiveTab('home'); window.dispatchEvent(new CustomEvent('chrona:open-my-personas')) }}
                onOpenFindUsers={() => window.dispatchEvent(new CustomEvent('chrona:open-find-users'))}
              />
            )}
            {mainContent}
          </div>
        </div>
        
        <ChunkErrorBoundary>
          <Suspense fallback={<ModalSkeleton />}>
            <PersonaForm 
              isOpen={showCreatePersonaModal} 
              onClose={() => setShowCreatePersonaModal(false)} 
              onSave={handleSavePersona} 
              isUserAdult={authUser?.dateOfBirth ? isAdult(new Date(authUser.dateOfBirth)) : false}
            />
          </Suspense>
        </ChunkErrorBoundary>
        <NotificationModal />
        <NotificationCenter />
        <AchievementModal isOpen={showAchievementModal} onClose={() => setShowAchievementModal(false)} />
        <MyPersonasModal isOpen={showMyPersonasModal} onClose={() => setShowMyPersonasModal(false)} />
        <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} onRevealSecurityKey={handleRevealSecurityKey} />
        <SearchModal
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onNavigate={handleNavigate}
          onStartChat={searchStartConversation}
          onOpenStoryline={(storylineId) => { handleSelectStoryline(storylineId) }}
          onOpenConversation={(conversationId) => { handleSelectChat(conversationId) }}
        />
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onLogout={() => { logout(); }}
          onRevealSecurityKey={handleRevealSecurityKey}
        />
        <KeyboardShortcutsOverlay />
        {/* User profile modal — renders in EVERY variant branch so the
            chrona:open-user-profile event (scenario/persona cards, friends
            page, showcase) always has a listener-backed surface */}
        <Suspense fallback={null}>
          {viewingUserId && (
            <UserProfileModal
              isOpen={showUserProfile}
              onClose={() => { setShowUserProfile(false); setViewingUserId(null) }}
              userId={viewingUserId}
            />
          )}
        </Suspense>
      </div>
    )
  }

  // ===== CHRONA V2 LAYOUT (Floating Dock with Violet Accent) =====
  if (uiVariant === 'chrona-v2') {
    return (
      <div className="h-screen w-full overflow-hidden text-slate-100">
        <Suspense fallback={<ComponentSkeleton className="h-full" />}>
          <ChronaV2Shell
            activeTab={activeTab}
            activeStorylineId={activeStorylineId}
            activeChat={activeChat}
            onSelectTab={(tab) => { handleSetActiveTab(tab); setActiveStorylineId(null); if (tab !== 'chat') setActiveChat(null) }}
            onSelectStoryline={handleSelectStoryline}
            onSelectChat={handleSelectChat}
            onStartChat={handleStartChat}
            onNavigate={handleNavigate}
            onOpenEditProfile={() => window.dispatchEvent(new CustomEvent('chrona:open-edit-profile'))}
            onOpenMyPersonas={() => { handleSetActiveTab('home'); window.dispatchEvent(new CustomEvent('chrona:open-my-personas')) }}
            onCreatePersona={() => setShowCreatePersonaModal(true)}
          >
            {mainContent}
          </ChronaV2Shell>
        </Suspense>
        
        <ChunkErrorBoundary>
          <Suspense fallback={<ModalSkeleton />}>
            <PersonaForm 
              isOpen={showCreatePersonaModal} 
              onClose={() => setShowCreatePersonaModal(false)} 
              onSave={handleSavePersona} 
              isUserAdult={authUser?.dateOfBirth ? isAdult(new Date(authUser.dateOfBirth)) : false}
            />
          </Suspense>
        </ChunkErrorBoundary>
        <NotificationModal />
        <NotificationCenter />
        <AchievementModal isOpen={showAchievementModal} onClose={() => setShowAchievementModal(false)} />
        <MyPersonasModal isOpen={showMyPersonasModal} onClose={() => setShowMyPersonasModal(false)} />
        <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} onRevealSecurityKey={handleRevealSecurityKey} />
        <SearchModal
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onNavigate={handleNavigate}
          onStartChat={searchStartConversation}
          onOpenStoryline={(storylineId) => { handleSelectStoryline(storylineId) }}
          onOpenConversation={(conversationId) => { handleSelectChat(conversationId) }}
        />
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onLogout={() => { logout(); }}
          onRevealSecurityKey={handleRevealSecurityKey}
        />
        <KeyboardShortcutsOverlay />
        {/* User profile modal — renders in EVERY variant branch so the
            chrona:open-user-profile event (scenario/persona cards, friends
            page, showcase) always has a listener-backed surface */}
        <Suspense fallback={null}>
          {viewingUserId && (
            <UserProfileModal
              isOpen={showUserProfile}
              onClose={() => { setShowUserProfile(false); setViewingUserId(null) }}
              userId={viewingUserId}
            />
          )}
        </Suspense>
      </div>
    )
  }

  // ===== CHRONA V3 LAYOUT (Zen Centered with Rose Accent) =====
  if (uiVariant === 'chrona-v3') {
    return (
      <div className="h-screen w-full overflow-hidden text-slate-100">
        <Suspense fallback={<ComponentSkeleton className="h-full" />}>
          <ChronaV3Shell
            activeTab={activeTab}
            activeStorylineId={activeStorylineId}
            activeChat={activeChat}
            onSelectTab={(tab) => { handleSetActiveTab(tab); setActiveStorylineId(null); if (tab !== 'chat') setActiveChat(null) }}
            onSelectStoryline={handleSelectStoryline}
            onSelectChat={handleSelectChat}
            onStartChat={handleStartChat}
            onNavigate={handleNavigate}
            onOpenEditProfile={() => window.dispatchEvent(new CustomEvent('chrona:open-edit-profile'))}
            onOpenMyPersonas={() => { handleSetActiveTab('home'); window.dispatchEvent(new CustomEvent('chrona:open-my-personas')) }}
            onCreatePersona={() => setShowCreatePersonaModal(true)}
          >
            {mainContent}
          </ChronaV3Shell>
        </Suspense>
        
        <ChunkErrorBoundary>
          <Suspense fallback={<ModalSkeleton />}>
            <PersonaForm 
              isOpen={showCreatePersonaModal} 
              onClose={() => setShowCreatePersonaModal(false)} 
              onSave={handleSavePersona} 
              isUserAdult={authUser?.dateOfBirth ? isAdult(new Date(authUser.dateOfBirth)) : false}
            />
          </Suspense>
        </ChunkErrorBoundary>
        <NotificationModal />
        <NotificationCenter />
        <AchievementModal isOpen={showAchievementModal} onClose={() => setShowAchievementModal(false)} />
        <MyPersonasModal isOpen={showMyPersonasModal} onClose={() => setShowMyPersonasModal(false)} />
        <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} onRevealSecurityKey={handleRevealSecurityKey} />
        <SearchModal
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onNavigate={handleNavigate}
          onStartChat={searchStartConversation}
          onOpenStoryline={(storylineId) => { handleSelectStoryline(storylineId) }}
          onOpenConversation={(conversationId) => { handleSelectChat(conversationId) }}
        />
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onLogout={() => { logout(); }}
          onRevealSecurityKey={handleRevealSecurityKey}
        />
        <KeyboardShortcutsOverlay />
        {/* User profile modal — renders in EVERY variant branch so the
            chrona:open-user-profile event (scenario/persona cards, friends
            page, showcase) always has a listener-backed surface */}
        <Suspense fallback={null}>
          {viewingUserId && (
            <UserProfileModal
              isOpen={showUserProfile}
              onClose={() => { setShowUserProfile(false); setViewingUserId(null) }}
              userId={viewingUserId}
            />
          )}
        </Suspense>
      </div>
    )
  }
}

// ==================== MAIN PAGE ====================
export default function Page() {
  const { isLoading, isAuthenticated, user, setUser } = useAuth()
  const [showLoadingScreen, setShowLoadingScreen] = useState(true)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)

  const handleLoadingFinished = useCallback(() => {
    setShowLoadingScreen(false)
  }, [])

  // Show loading screen on initial load
  if (showLoadingScreen) {
    return <LoadingScreen onFinished={handleLoadingFinished} />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen persona-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }
  
  if (!isAuthenticated) return <AuthPage />

  // First-login onboarding gate (Task 2-a): users who haven't completed onboarding
  // see the onboarding flow instead of the app shell. Once finished (or dismissed
  // for this session), the app renders and the session user is refreshed so
  // user.onboarded is up to date.
  if (user && !user.onboarded && !onboardingDismissed) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>}>
        <OnboardingFlow
          onFinished={() => {
            // Reveal the app immediately…
            setOnboardingDismissed(true)
            // …then refresh the session user so user.onboarded is true
            apiFetch('/api/auth/me')
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (data?.user) setUser(data.user)
              })
              .catch(() => {})
          }}
        />
      </Suspense>
    )
  }
  return <MainApp />
}