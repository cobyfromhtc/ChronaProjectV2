'use client'

// Force rebuild - v2
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { useChat, ChatMessage } from '@/hooks/use-chat'
import { extractMentions, parseMessageContent } from '@/lib/mentions'
import { parseMessageWithMarkdown, wrapSelection } from '@/lib/markdown'
import { setSessionToken, addStoredAccount, apiFetch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, VisuallyHidden } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Loader2, UserPlus, LogIn, LogOut, Users, MessageCircle, 
  User, Bell, Search, Settings, ChevronRight, Plus, Check,
  Edit2, Trash2, Camera, X, Send, ArrowLeft, MessageSquare,
  Sparkles, Zap, Image as ImageIcon, Wand2, Heart, Crown,
  BookOpen, Compass, Star, Minus, Maximize2, Minimize2,
  Store, Coins, Flag, LayoutGrid, List, SlidersHorizontal,
  Eye, EyeOff
} from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { cn } from '@/lib/utils'

// Import components
import { Sidebar } from '@/components/sidebar'
import { DMSidebar, DM_REFRESH_EVENT } from '@/components/dm-sidebar'
import { FriendsPage } from '@/components/friends-page'
import { StorylinesPage } from '@/components/storylines-page'
import { StorylineInterior } from '@/components/storyline-interior'
import { PersonaForm } from '@/components/persona-form'
import { Persona, PersonaConnection, PersonalitySpectrums, BigFiveTraits, HexacoTraits } from '@/stores/persona-store'
import { CharacterProfileModal } from '@/components/character-profile-modal'
import { WalletPage } from '@/components/wallet-page'
import { AdminPanel } from '@/components/admin-panel'
import { NotificationModal } from '@/components/notification-modal'
import { MarketplacePage } from '@/components/marketplace-page'
import { ListOnMarketplaceModal } from '@/components/list-on-marketplace-modal'
import { PersonaCard } from '@/components/persona-card'
import { ReportModal } from '@/components/report-modal'
import { useToast } from '@/hooks/use-toast'
import { BLORP_USER_ID } from '@/lib/blorp'
import { DiscoverPage } from '@/components/discover-page'
import { ScenarioModal } from '@/components/scenario-modal'

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
  title: string[]
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
}

// ==================== UTILITY FUNCTIONS ====================
function formatMessageTime(dateString: string) {
  const date = new Date(dateString)
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`
  }
  return format(date, 'MMM d, yyyy h:mm a')
}

// ==================== AUTH PAGE - NEW DESIGN ====================
function AuthPage() {
  const { login, signup, setUser, verifySecurityKey: authVerifySecurityKey } = useAuth()
  
  const [signupForm, setSignupForm] = useState({ username: '', password: '', confirmPassword: '', birthDay: 0, birthMonth: 0, birthYear: 0 })
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // DOB options
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dec' },
  ]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1900 - 15 }, (_, i) => currentYear - 16 - i)
  
  // Security Key Modal State
  const [showSecurityKeyModal, setShowSecurityKeyModal] = useState(false)
  const [securityKey, setSecurityKey] = useState('')
  const [securityKeyInput, setSecurityKeyInput] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [isLoginFlow, setIsLoginFlow] = useState(false)
  const [hasCopiedKey, setHasCopiedKey] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!signupForm.birthDay || !signupForm.birthMonth || !signupForm.birthYear) {
      setError('Please select your date of birth')
      return
    }
    
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
        credentials: 'include',
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }
      
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
        credentials: 'include',
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }
      
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
        credentials: 'include',
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid security key')
      }
      
      if (data.token) {
        setSessionToken(data.token)
        addStoredAccount(data.user, data.token)
      }
      
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
    setIsLoginFlow(true)
    setSecurityKeyInput('')
    setError('')
  }
  
  const copySecurityKey = () => {
    navigator.clipboard.writeText(securityKey)
    setHasCopiedKey(true)
    setTimeout(() => setHasCopiedKey(false), 2000)
  }
  
  // Animated background particles
  const particles = useMemo(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
    })), []
  )
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Large gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-white/[0.02] rounded-full blur-[80px]" />
        
        {/* Floating particles */}
        {mounted && particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-white/[0.08]"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              animation: `float ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
        
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      
      {/* Main Content */}
      <div className={`relative z-10 w-full max-w-sm mx-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl" />
            <img 
              src="/logo.svg" 
              alt="Chrona" 
              className="relative w-16 h-16 rounded-2xl object-cover shadow-2xl"
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Chrona</h1>
          <p className="text-sm text-gray-500 mt-1">Roleplay Universe</p>
        </div>
        
        {/* Auth Card */}
        <div className="relative">
          {/* Card glow */}
          <div className="absolute -inset-px bg-gradient-to-b from-white/20 to-white/5 rounded-2xl blur-sm" />
          
          <div className="relative bg-[#0c0c0c] rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-lg font-semibold text-white text-center">
                {activeTab === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
            </div>
            
            {/* Tab Switcher */}
            <div className="px-6 pb-4">
              <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                <button
                  onClick={() => { setActiveTab('login'); setError('') }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'login'
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setActiveTab('signup'); setError('') }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'signup'
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>
            
            {/* Form */}
            <div className="px-6 pb-6">
              {error && !showSecurityKeyModal && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Login Form */}
              {activeTab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Username</label>
                    <input
                      type="text"
                      placeholder="Enter your username"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      required
                      className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                        className="w-full h-11 px-4 pr-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-white hover:bg-gray-100 text-black font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              )}
              
              {/* Signup Form */}
              {activeTab === 'signup' && (
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Username</label>
                    <input
                      type="text"
                      placeholder="Choose a username"
                      value={signupForm.username}
                      onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                      required
                      className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
                    />
                    <p className="text-[10px] text-gray-600">3-20 characters, letters, numbers, underscores</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        required
                        className="w-full h-11 px-4 pr-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-600">At least 6 characters</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Confirm Password</label>
                    <input
                      type="password"
                      placeholder="Confirm your password"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                      className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
                    />
                  </div>
                  
                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Date of Birth</label>
                    <p className="text-[10px] text-gray-600 -mt-0.5">You must be 16+ to use Chrona</p>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={signupForm.birthDay || ''}
                        onChange={(e) => setSignupForm({ ...signupForm, birthDay: parseInt(e.target.value) })}
                        required
                        className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-white/30 transition-all"
                      >
                        <option value="" disabled className="bg-[#0c0c0c] text-gray-500">Day</option>
                        {days.map(day => (
                          <option key={day} value={day} className="bg-[#0c0c0c]">{day}</option>
                        ))}
                      </select>
                      
                      <select
                        value={signupForm.birthMonth || ''}
                        onChange={(e) => setSignupForm({ ...signupForm, birthMonth: parseInt(e.target.value) })}
                        required
                        className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-white/30 transition-all"
                      >
                        <option value="" disabled className="bg-[#0c0c0c] text-gray-500">Month</option>
                        {months.map(month => (
                          <option key={month.value} value={month.value} className="bg-[#0c0c0c]">{month.label}</option>
                        ))}
                      </select>
                      
                      <select
                        value={signupForm.birthYear || ''}
                        onChange={(e) => setSignupForm({ ...signupForm, birthYear: parseInt(e.target.value) })}
                        required
                        className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-white/30 transition-all"
                      >
                        <option value="" disabled className="bg-[#0c0c0c] text-gray-500">Year</option>
                        {years.map(year => (
                          <option key={year} value={year} className="bg-[#0c0c0c]">{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-white hover:bg-gray-100 text-black font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01]">
              <p className="text-[10px] text-gray-600 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Security Key Modal */}
      {showSecurityKeyModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm animate-in zoom-in-95 fade-in duration-200">
            <div className="bg-[#0c0c0c] rounded-2xl border border-white/10 overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                    <Crown className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {isLoginFlow ? 'Security Key' : 'Save Your Key'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isLoginFlow ? 'Enter your key to continue' : 'Required for all future logins'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-5">
                {!isLoginFlow ? (
                  <div className="space-y-4">
                    {/* Warning */}
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-300">
                        <strong>Important:</strong> Save this key securely. It cannot be recovered.
                      </p>
                    </div>
                    
                    {/* Security Key */}
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-[10px] text-gray-500 mb-2 text-center uppercase tracking-wider">Your Security Key</p>
                      <div className="bg-black/40 rounded-lg p-3 font-mono text-lg text-center tracking-wider text-white select-all">
                        {securityKey}
                      </div>
                    </div>
                    
                    {/* Copy Button */}
                    <button
                      onClick={copySecurityKey}
                      className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        hasCopiedKey
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
                      }`}
                    >
                      {hasCopiedKey ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-4 h-4" />
                          Copy to clipboard
                        </>
                      )}
                    </button>
                    
                    {/* Continue */}
                    <button
                      onClick={handleConfirmSecurityKeySaved}
                      className="w-full h-10 bg-white hover:bg-gray-100 text-black font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      I&apos;ve saved my key
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Enter Security Key</label>
                      <input
                        type="text"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={securityKeyInput}
                        onChange={(e) => setSecurityKeyInput(e.target.value.toUpperCase())}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-lg text-center font-mono text-lg tracking-wider text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-all"
                        maxLength={19}
                        autoFocus
                      />
                    </div>
                    
                    <button
                      onClick={handleVerifySecurityKey}
                      disabled={securityKeyInput.replace(/-/g, '').length < 16 || isSubmitting}
                      className="w-full h-10 bg-white hover:bg-gray-100 text-black font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      )}
    </div>
  )
}

// ==================== MY PERSONAS MODAL - REVAMPED ====================
type ViewMode = 'grid' | 'list'
type SortOption = 'name' | 'created' | 'active'

function MyPersonasModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { personas, activePersona, isLoading, activatePersona, deletePersona, createPersona, updatePersona } = usePersonas()
  const { user } = useAuth()
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [listingPersona, setListingPersona] = useState<Persona | null>(null)
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('active')
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null)
  const [hoveredPersona, setHoveredPersona] = useState<string | null>(null)
  
  // Get unique archetypes for filtering
  const archetypes = useMemo(() => {
    const unique = new Set(personas.map(p => p.archetype).filter(Boolean))
    return Array.from(unique) as string[]
  }, [personas])
  
  // Filter and sort personas
  const filteredPersonas = useMemo(() => {
    let filtered = [...personas]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.archetype?.toLowerCase().includes(query) ||
        p.title?.some(t => t.toLowerCase().includes(query)) ||
        p.description?.toLowerCase().includes(query) ||
        p.mbtiType?.toLowerCase().includes(query)
      )
    }
    
    if (selectedArchetype) {
      filtered = filtered.filter(p => p.archetype === selectedArchetype)
    }
    
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'created':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'active':
        filtered.sort((a, b) => {
          if (a.isActive) return -1
          if (b.isActive) return 1
          return 0
        })
        break
    }
    
    return filtered
  }, [personas, searchQuery, sortBy, selectedArchetype])
  
  const handleActivate = async (id: string) => { 
    try { 
      await activatePersona(id) 
    } catch (err) { 
      console.error('Failed to activate:', err) 
    } 
  }
  
  const handleDelete = async (id: string) => { 
    setDeleteConfirmId(id); return
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    setDeletingId(id)
    try {
      await deletePersona(id)
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeletingId(null)
    }
  }
  
  const handleSavePersona = async (data: {
    name: string
    title: string[]
    avatarUrl: string | null
    bannerUrl: string | null
    description: string | null
    archetype: string | null
    gender: string | null
    pronouns: string | null
    age: number | null
    tags: string[]
    personalityDescription: string | null
    personalitySpectrums: PersonalitySpectrums
    bigFive: BigFiveTraits
    hexaco: HexacoTraits
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
    themeEnabled: boolean
    rpStyle: string | null
    rpPreferredGenders: string[]
    rpGenres: string[]
    rpLimits: string[]
    rpThemes: string[]
    rpExperienceLevel: string | null
    rpResponseTime: string | null
    nsfwEnabled: boolean
    nsfwBodyType: string | null
    nsfwKinks: string[]
    nsfwContentWarnings: string[]
    nsfwOrientation: string | null
    nsfwRolePreference: string | null
    characterQuote: string | null
    psychologySurface: string | null
    psychologyBeneath: string | null
    occupation: string | null
    status: string | null
    orientation: string | null
    height: string | null
    dialogueLog: { type: string; content: string; mood?: string }[]
    characterScenarios: { title: string; description: string }[]
    galleryUrls: string[]
    alternateImageUrl: string | null
    connections?: { characterName: string; relationshipType: string; specificRole: string | null; characterAge: number | null; description: string | null }[]
  }) => {
    if (editingPersona) {
      await updatePersona(editingPersona.id, data)
      setEditingPersona(null)
    } else {
      await createPersona(data)
      setShowCreateModal(false)
    }
  }
  
  // MBTI color mapping
  const getMbtiColor = (mbti: string | null) => {
    if (!mbti) return 'bg-white/10 text-gray-300'
    const type = mbti.slice(0, 2)
    const colors: Record<string, string> = {
      'IN': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      'EN': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'IS': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'ES': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    }
    return colors[type] || 'bg-white/10 text-gray-300 border-white/20'
  }

  // Archetype colors
  const getArchetypeGradient = (archetype: string | null) => {
    const gradients: Record<string, string> = {
      'Hero': 'from-amber-500/30 via-orange-500/20 to-red-500/30',
      'Villain': 'from-red-500/30 via-rose-500/20 to-pink-500/30',
      'Mentor': 'from-blue-500/30 via-cyan-500/20 to-teal-500/30',
      'Lover': 'from-pink-500/30 via-rose-500/20 to-red-500/30',
      'Explorer': 'from-emerald-500/30 via-teal-500/20 to-cyan-500/30',
      'Creator': 'from-white/10 via-gray-300/10 to-gray-400/10',
      'Outlaw': 'from-gray-500/30 via-slate-500/20 to-zinc-500/30',
      'Magician': 'from-gray-400/10 via-gray-300/10 to-white/10',
      'Everyman': 'from-amber-500/30 via-yellow-500/20 to-orange-500/30',
      'Jester': 'from-yellow-500/30 via-amber-500/20 to-orange-500/30',
      'Ruler': 'from-amber-500/30 via-orange-500/20 to-red-500/30',
      'Caregiver': 'from-rose-500/30 via-pink-500/20 to-gray-400/10',
      'Innocent': 'from-sky-500/30 via-cyan-500/20 to-teal-500/30',
      'Sage': 'from-indigo-500/30 via-blue-500/20 to-cyan-500/30',
    }
    return gradients[archetype || ''] || 'from-white/10 via-gray-300/10 to-gray-400/10'
  }

  // Character Card - Modern horizontal design with enhanced styling
  const CharacterCard = ({ persona }: { persona: Persona }) => {
    const isHovered = hoveredPersona === persona.id
    const isDeleting = deletingId === persona.id
    
    return (
      <div 
        className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer backdrop-blur-sm ${
          persona.isActive 
            ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 shadow-lg shadow-emerald-500/10' 
            : 'border-white/20 bg-gradient-to-r from-white/5 to-gray-300/5 hover:border-white/40 hover:bg-white/10'
        }`}
        onMouseEnter={() => setHoveredPersona(persona.id)}
        onMouseLeave={() => setHoveredPersona(null)}
        onClick={() => !persona.isActive && handleActivate(persona.id)}
      >
        {/* Animated border glow on hover */}
        <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-gray-300/10 to-white/10 blur-sm" />
        </div>
        
        {/* Content - Horizontal layout */}
        <div className="relative flex items-center gap-4 p-4">
          {/* Avatar section with gradient background */}
          <div className="relative flex-shrink-0">
            <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${getArchetypeGradient(persona.archetype)} opacity-50 blur-sm transition-opacity ${isHovered ? 'opacity-80' : ''}`} />
            <Avatar className={`relative w-16 h-16 border-2 ${persona.isActive ? 'border-emerald-500/50' : 'border-white/20'}`}>
              <AvatarImage src={persona.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-xl font-bold">
                {persona.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Active indicator */}
            {persona.isActive && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-black flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Zap className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          {/* Info section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-white text-base truncate group-hover:text-white transition-colors">{persona.name}</h3>
              {persona.isActive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              )}
            </div>
            
            {/* Custom Archetypes */}
            {persona.title && persona.title.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {persona.title.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-white/10 to-gray-300/10 text-gray-200 border border-white/20">
                    {t}
                  </span>
                ))}
              </div>
            )}
            
            
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {persona.archetype && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-400/20 text-gray-300 border border-gray-400/30">
                  {persona.archetype}
                </span>
              )}
              {persona.mbtiType && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getMbtiColor(persona.mbtiType)}`}>
                  {persona.mbtiType}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-400/70 flex-wrap">
              {persona.age && <span>{persona.age}y</span>}
              {persona.gender && <span>• {persona.gender}</span>}
              {persona.species && <span>• {persona.species}</span>}
            </div>
            
            {persona.description && (
              <p className="text-xs text-gray-500 line-clamp-1 mt-1.5">{persona.description}</p>
            )}
          </div>
          
          {/* Actions - Show on hover with smooth transition */}
          <div className={`flex items-center gap-1.5 transition-all duration-300 sm:opacity-0 sm:translate-x-2 sm:group-hover:opacity-100 sm:group-hover:translate-x-0 opacity-100 translate-x-0`}>
            {!persona.isActive && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleActivate(persona.id) }}
                className="w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 flex items-center justify-center text-emerald-300 transition-all border border-emerald-500/20 hover:scale-110"
                title="Activate"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); setEditingPersona(persona) }}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 transition-all border border-white/20 hover:scale-110"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setListingPersona(persona) }}
              className="w-9 h-9 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 flex items-center justify-center text-amber-300 transition-all border border-amber-500/20 hover:scale-110"
              title="List on Marketplace"
            >
              <Store className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(persona.id) }}
              disabled={isDeleting}
              className="w-9 h-9 rounded-xl bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-300 transition-all border border-red-500/20 disabled:opacity-50 hover:scale-110"
              title="Delete"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // List Card Component
  const ListCard = ({ persona }: { persona: Persona }) => {
    const isHovered = hoveredPersona === persona.id
    const isDeleting = deletingId === persona.id
    
    return (
      <div 
        className={`group flex items-center gap-6 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer bg-white/[0.03] ${
          persona.isActive 
            ? 'border-emerald-500/60 bg-emerald-500/5' 
            : 'border-white/20 hover:border-white/50 hover:bg-white/5'
        }`}
        onMouseEnter={() => setHoveredPersona(persona.id)}
        onMouseLeave={() => setHoveredPersona(null)}
        onClick={() => !persona.isActive && handleActivate(persona.id)}
      >
        <Avatar className={`w-16 h-16 border-2 ${persona.isActive ? 'border-emerald-500/50' : 'border-white/20'}`}>
          <AvatarImage src={persona.avatarUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-xl font-semibold">
            {persona.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white text-lg truncate">{persona.name}</h3>
            {persona.isActive && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {persona.archetype && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-400/20 text-gray-300 border border-gray-400/30">
                {persona.archetype}
              </span>
            )}
            {persona.mbtiType && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getMbtiColor(persona.mbtiType)}`}>
                {persona.mbtiType}
              </span>
            )}
            {persona.age && <span className="text-sm text-gray-400/70">{persona.age} years</span>}
            {persona.gender && <span className="text-sm text-gray-400/70">• {persona.gender}</span>}
            {persona.species && <span className="text-sm text-gray-400/70">• {persona.species}</span>}
          </div>
          
          {persona.description && (
            <p className="text-sm text-gray-500 truncate mt-2">{persona.description}</p>
          )}
        </div>
        
        <div className={`flex items-center gap-2 transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 opacity-100`}>
          {!persona.isActive && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleActivate(persona.id) }}
              className="btn-persona text-sm py-2 px-4 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> Activate
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setEditingPersona(persona) }} className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400/60 hover:text-white hover:bg-white/10 transition-all border border-white/20">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setListingPersona(persona) }} className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-all border border-white/20">
            <Store className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(persona.id) }} disabled={isDeleting} className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 border border-white/20">
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent showCloseButton={false} className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col bg-gradient-to-br from-black via-[#0a0a0a] to-[#050505] border border-white/20 rounded-2xl shadow-2xl shadow-white/5">
          {/* Accessibility: Hidden title for screen readers */}
          <VisuallyHidden>
            <DialogTitle>My Characters</DialogTitle>
          </VisuallyHidden>
          
          {/* Animated Background Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gray-400/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
            {/* Animated top line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            {/* Decorative corner glows */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-400/5 rounded-full blur-3xl" />
          </div>
          
          <div className="relative h-full flex flex-col min-h-0">
            {/* Header Bar - Enhanced with gradient and glow */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 bg-gradient-to-r from-white/5 via-gray-300/5 to-white/5 backdrop-blur-xl flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/10 rounded-xl blur-lg opacity-50 animate-pulse" style={{ animationDuration: '3s' }} />
                  <div className="relative w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-white/20">
                    <Users className="w-5 h-5 text-black" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">My Characters</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{personas.length} character{personas.length !== 1 ? 's' : ''} in your collection</p>
                </div>
              </div>
              
              {/* Search - Enhanced */}
              <div className="flex-1 max-w-md mx-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-white/10 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400/60 group-focus-within:text-white transition-colors" />
                  <input
                    type="text"
                    placeholder="Search characters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="relative w-full bg-white/5 border border-white/20 rounded-xl pl-11 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/50 focus:bg-white/10 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Controls - Enhanced */}
              <div className="flex items-center gap-2">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/40 transition-all appearance-none cursor-pointer pr-8 hover:bg-white/10"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23c084fc' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
                >
                  <option value="active">Active First</option>
                  <option value="created">Newest</option>
                  <option value="name">By Name</option>
                </select>
                
                {/* Archetype Filter */}
                {archetypes.length > 1 && (
                  <select
                    value={selectedArchetype || ''}
                    onChange={(e) => setSelectedArchetype(e.target.value || null)}
                    className="bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/40 transition-all appearance-none cursor-pointer pr-8 hover:bg-white/10"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23c084fc' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
                  >
                    <option value="">All</option>
                    {archetypes.map(arch => (
                      <option key={arch} value={arch}>{arch}</option>
                    ))}
                  </select>
                )}
                
                {/* View Mode - Enhanced */}
                <div className="flex items-center gap-0.5 p-1 rounded-xl bg-white/5 border border-white/20">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-black shadow-lg shadow-white/20' : 'text-gray-400/60 hover:text-white hover:bg-white/10'}`} title="Grid View">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-black shadow-lg shadow-white/20' : 'text-gray-400/60 hover:text-white hover:bg-white/10'}`} title="List View">
                    <List className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Create Button - Enhanced */}
                <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 py-2.5 px-5 text-sm font-medium rounded-xl bg-white hover:bg-gray-100 text-black shadow-lg shadow-white/25 hover:shadow-white/40 transition-all">
                  <Plus className="w-4 h-4" /> Create New
                </button>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 overflow-hidden min-h-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl animate-pulse" />
                    <Loader2 className="relative w-16 h-16 animate-spin text-white" />
                  </div>
                  <p className="text-gray-300/80 font-medium text-lg mt-6">Loading characters...</p>
                  <p className="text-gray-500 text-sm mt-1">Please wait while we fetch your collection</p>
                </div>
              ) : personas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
                    <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-white/10 to-gray-300/10 flex items-center justify-center animate-float shadow-lg shadow-white/5">
                      <Sparkles className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent mt-8">No characters yet</h3>
                  <p className="text-gray-500 text-lg mt-2 max-w-md text-center">Create your first character to start your roleplay journey!</p>
                  <button onClick={() => setShowCreateModal(true)} className="mt-8 flex items-center gap-2 py-3 px-8 text-base font-medium rounded-xl bg-white hover:bg-gray-100 text-black shadow-lg shadow-white/25 hover:shadow-white/40 transition-all">
                    <Plus className="w-5 h-5" /> Create Your First Character
                  </button>
                </div>
              ) : filteredPersonas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/5 to-gray-300/5 flex items-center justify-center mb-4">
                    <Search className="w-10 h-10 text-gray-400/50" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No matches found</h3>
                  <p className="text-gray-500 text-lg mb-6">Try adjusting your search or filters</p>
                  <button onClick={() => { setSearchQuery(''); setSelectedArchetype(null) }} className="flex items-center gap-2 py-2.5 px-6 text-sm font-medium rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20 hover:border-white/30 transition-all">
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View - Wider horizontal cards */
                <div className="h-full overflow-y-auto p-6 custom-scrollbar min-h-0">
                  <div className="max-w-6xl mx-auto space-y-3">
                    {filteredPersonas.map((persona, index) => (
                      <div key={persona.id} className="animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                        <CharacterCard persona={persona} />
                      </div>
                    ))}
                    
                    {/* Add New Card - Enhanced horizontal style */}
                    <div 
                      className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-white/30 hover:border-white/50 transition-all flex items-center justify-center gap-4 bg-gradient-to-r from-white/5 to-gray-300/5 hover:from-white/10 hover:to-gray-300/10 p-6 overflow-hidden"
                      onClick={() => setShowCreateModal(true)}
                      style={{ animationDelay: `${filteredPersonas.length * 30}ms` }}
                    >
                      {/* Animated background on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-gray-300/5 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-gray-300/10 group-hover:from-white/20 group-hover:to-gray-300/20 flex items-center justify-center transition-all shadow-lg">
                        <Plus className="w-7 h-7 text-gray-400/60 group-hover:text-white transition-colors" />
                      </div>
                      <p className="relative text-base font-medium text-gray-400/60 group-hover:text-white transition-colors">Create New Character</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* List View */
                <div className="h-full overflow-y-auto p-6 custom-scrollbar min-h-0">
                  <div className="max-w-6xl mx-auto space-y-3">
                    {filteredPersonas.map((persona, index) => (
                      <div key={persona.id} className="animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                        <ListCard persona={persona} />
                      </div>
                    ))}
                    
                    {/* Add New Card - List View */}
                    <div 
                      className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-white/30 hover:border-white/50 transition-all flex items-center justify-center gap-4 bg-gradient-to-r from-white/5 to-gray-300/5 hover:from-white/10 hover:to-gray-300/10 p-6 overflow-hidden"
                      onClick={() => setShowCreateModal(true)}
                      style={{ animationDelay: `${filteredPersonas.length * 30}ms` }}
                    >
                      {/* Animated background on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-gray-300/5 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-gray-300/10 group-hover:from-white/20 group-hover:to-gray-300/20 flex items-center justify-center transition-all">
                        <Plus className="w-6 h-6 text-gray-400/60 group-hover:text-white transition-colors" />
                      </div>
                      <p className="relative text-base font-medium text-gray-400/60 group-hover:text-white transition-colors">Create New Character</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer - Enhanced */}
            {personas.length > 0 && (
              <div className="relative flex-shrink-0 px-6 py-4 border-t border-white/20 bg-gradient-to-r from-black/30 via-white/5 to-black/30 backdrop-blur-xl flex items-center justify-between text-sm">
                {/* Decorative top line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                
                <div className="flex items-center gap-3 text-gray-400/60">
                  <span>Showing <span className="text-gray-300 font-medium">{filteredPersonas.length}</span> of <span className="text-gray-300 font-medium">{personas.length}</span> characters</span>
                </div>
                
                <div className="flex items-center gap-3">
                  {activePersona && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-emerald-300 text-xs font-medium">Active: {activePersona.name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent className="bg-[#0c0c0c] border border-white/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Character</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete this persona? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </DialogContent>
      </Dialog>
      
      <PersonaForm 
        isOpen={showCreateModal || !!editingPersona} 
        onClose={() => { setShowCreateModal(false); setEditingPersona(null) }} 
        persona={editingPersona} 
        onSave={handleSavePersona} 
        isAdult={user?.isAdult ?? false}
      />
      
      <ListOnMarketplaceModal
        isOpen={!!listingPersona}
        onClose={() => setListingPersona(null)}
        persona={listingPersona}
        onSuccess={() => setListingPersona(null)}
      />
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
    <div className="topbar h-9 w-full flex items-center justify-between px-3 bg-black/95 border-b border-white/20 text-white backdrop-blur-lg -webkit-app-region-drag">
      <div className="flex items-center gap-3 text-sm font-semibold select-none">
        <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          <span className="text-xs font-black text-black">C</span>
        </div>
        <div className="flex flex-col leading-3">
          <span className="text-sm text-white">Chrona</span>
          <span className="text-[10px] text-gray-400">Roleplay Universe</span>
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
function ChatView({ conversation, onBack, onViewProfile }: { conversation: Conversation; onBack: () => void; onViewProfile: (persona: OnlinePersona | null) => void }) {
  const { user } = useAuth()
  const { activePersona, uploadAvatar } = usePersonas()
  
  // Check if this is a conversation with Blorp (read-only)
  const isBlorpConversation = conversation.otherPersona.name === 'Blorp'
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingPersona, setTypingPersona] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null) // Modal image viewer
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportMessage, setReportMessage] = useState<ChatMessage | null>(null)
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  
  const { isConnected, sendTyping } = useChat({
    conversationId: conversation.id,
    onNewMessage: (message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev
        return [...prev, message]
      })
    },
    onTyping: (data) => {
      setIsTyping(data.isTyping)
      setTypingPersona(data.isTyping ? data.personaName : null)
    }
  })
  
  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch(`/api/conversations/${conversation.id}/messages`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages)
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMessages()
  }, [conversation.id])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleTyping = useCallback(() => {
    sendTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 3000)
  }, [sendTyping])
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' }); return }
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' }); return }
    
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (response.ok) {
        const data = await response.json()
        setImagePreview(data.avatarUrl || data.url)
      } else { toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' }) }
    } catch (error) {
      console.error('Image upload error:', error)
      toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' })
    } finally {
      setIsUploadingImage(false)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  
  const sendMessage = async () => {
    if ((!newMessage.trim() && !imagePreview) || !activePersona || isSending) return

    const validMentions = extractMentions(newMessage.trim()).filter((username) => username === conversation.otherPersona.username)

    setIsSending(true)
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim(), imageUrl: imagePreview, senderPersonaId: activePersona.id, mentions: validMentions })
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        setImagePreview(null)
        sendTyping(false)
        // Refresh DM sidebar to update recent list
        window.dispatchEvent(new CustomEvent(DM_REFRESH_EVENT))
      }
    } catch (error) {
      console.error('Failed to send message:', error)
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
      let otherPersonaData: {
        name: string
        description: string | null
        backstory?: string | null
        personalityDescription?: string | null
        personalitySpectrums?: PersonalitySpectrums | null
        bigFive?: BigFiveTraits | null
        hexaco?: HexacoTraits | null
        strengths?: string[]
        flaws?: string[]
        values?: string[]
        fears?: string[]
        likes?: string[]
        dislikes?: string[]
        hobbies?: string[]
        speechPatterns?: string[]
        mbtiType?: string | null
        gender?: string | null
        age?: number | null
        species?: string | null
      } = {
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
  
  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-gradient-to-b from-black via-[#0a0a0a] to-[#050505]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/15 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" onClick={onBack} className="text-gray-300 hover:text-white hover:bg-white/10 gap-2 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="w-px h-8 bg-white/20" />
        <div className="relative persona-status" style={conversation.otherPersona.isOnline ? {} : {}}>
          <Avatar className="w-10 h-10 border-2 border-white/20">
            <AvatarImage src={conversation.otherPersona.avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white font-semibold">{conversation.otherPersona.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${conversation.otherPersona.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-white">{conversation.otherPersona.name}</h3>
          <p className="text-xs text-gray-400/60">@{conversation.otherPersona.username}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
          <span className={`w-2 h-2 rounded-full ${conversation.otherPersona.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className={`text-xs font-medium ${conversation.otherPersona.isOnline ? 'text-emerald-400' : 'text-gray-500'}`}>{conversation.otherPersona.isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400/60">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/20"><MessageCircle className="w-10 h-10" /></div>
            <p className="text-lg font-medium text-gray-200">Start the conversation!</p>
            <p className="text-sm mt-1 text-gray-400/60">Say hello to {conversation.otherPersona.name}</p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-4 max-w-[1100px] mx-auto w-full py-2">
            {(() => {
              // Render messages in Discord-style format
              return messages.map((message, index) => {
                const prevMessage = messages[index - 1]
                const showAvatar = index === 0 || prevMessage?.senderId !== message.senderId
                const isMine = message.sender.id === activePersona?.id
                
                return (
                  <div 
                    key={message.id} 
                    className={cn(
                      "group flex gap-3 hover:bg-white/5 -mx-2 px-2 py-0.5 rounded-lg transition-colors relative",
                      showAvatar && "mt-4 pt-1"
                    )}
                  >
                    {/* Avatar */}
                    {showAvatar ? (
                      <button
                        onClick={() => {
                          // Show the other persona's profile
                          if (message.senderId === conversation.otherPersona.id) {
                            onViewProfile({
                              id: conversation.otherPersona.id,
                              name: conversation.otherPersona.name,
                              avatarUrl: conversation.otherPersona.avatarUrl,
                              username: conversation.otherPersona.username,
                              userId: conversation.otherPersona.id,
                              isOnline: conversation.otherPersona.isOnline,
                              bio: null,
                              title: [],
                              bannerUrl: null,
                              archetype: null,
                              gender: null,
                              age: null,
                              tags: [],
                              personalityDescription: null,
                              personalitySpectrums: null,
                              bigFive: null,
                              hexaco: null,
                              strengths: [],
                              flaws: [],
                              values: [],
                              fears: [],
                              species: null,
                              likes: [],
                              dislikes: [],
                              hobbies: [],
                              skills: [],
                              languages: [],
                              habits: [],
                              speechPatterns: [],
                              backstory: null,
                              appearance: null,
                              mbtiType: null,
                              connections: []
                            })
                          }
                        }}
                        className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="w-10 h-10 border-2 border-rose-500/60 hover:border-rose-400 transition-colors">
                          <AvatarImage src={message.sender.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-sm font-medium">
                            {message.sender.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    ) : (
                      <div className="w-10 flex-shrink-0" />
                    )}
                    
                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <button
                            onClick={() => {
                              if (message.senderId === conversation.otherPersona.id) {
                                onViewProfile({
                                  id: conversation.otherPersona.id,
                                  name: conversation.otherPersona.name,
                                  avatarUrl: conversation.otherPersona.avatarUrl,
                                  username: conversation.otherPersona.username,
                                  userId: conversation.otherPersona.id,
                                  isOnline: conversation.otherPersona.isOnline,
                                  bio: null,
                                  title: [],
                                  bannerUrl: null,
                                  archetype: null,
                                  gender: null,
                                  age: null,
                                  tags: [],
                                  personalityDescription: null,
                                  personalitySpectrums: null,
                                  bigFive: null,
                                  hexaco: null,
                                  strengths: [],
                                  flaws: [],
                                  values: [],
                                  fears: [],
                                  species: null,
                                  likes: [],
                                  dislikes: [],
                                  hobbies: [],
                                  skills: [],
                                  languages: [],
                                  habits: [],
                                  speechPatterns: [],
                                  backstory: null,
                                  appearance: null,
                                  mbtiType: null,
                                  connections: []
                                })
                              }
                            }}
                            className="font-semibold text-white hover:text-gray-200 hover:underline cursor-pointer transition-colors flex items-center gap-2"
                          >
                            {message.sender.name}
                            {message.sender.isOfficial && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">OFFICIAL</span>
                            )}
                          </button>
                          <span className="text-xs text-gray-500 font-normal">
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                      )}
                      
                      {/* Main content */}
                      <div className="text-sm">
                        {message.imageUrl && (
                          <div className="mb-2">
                            <img 
                              src={message.imageUrl} 
                              alt="Shared image" 
                              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-white/20 max-h-80" 
                              onClick={() => setViewingImage(message.imageUrl!)} 
                            />
                          </div>
                        )}
                        {message.content && (
                          <div className="text-gray-100 whitespace-pre-wrap leading-relaxed">
                            {parseMessageWithMarkdown(message.content, [conversation.otherPersona.username])}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
            {isTyping && (
              <div className="px-4 py-1 text-xs text-gray-400/60 flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{typingPersona} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      {/* Message Input */}
      <div className="sticky bottom-0 p-4 border-t border-white/15 bg-black/80 backdrop-blur-sm">
        {isBlorpConversation ? (
          /* Read-only message for Blorp conversations */
          <div className="max-w-3xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-white/5 to-gray-300/5">
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-white/5 animate-pulse" />
              
              {/* Top decorative line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
              
              <div className="relative p-5">
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-amber-200">Official Notification Channel</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">VERIFIED</span>
                    </div>
                    <p className="text-sm text-gray-500">Blorp • Chrona Official Bot</p>
                  </div>
                </div>
                
                {/* Info cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <Bell className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-300/80">Account Alerts</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <Coins className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-300/80">Chronos Updates</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <Store className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-300/80">Marketplace</p>
                  </div>
                </div>
                
                {/* Footer message */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-xs text-gray-400/60">This is a read-only channel — You'll receive notifications here automatically</p>
                </div>
              </div>
            </div>
          </div>
        ) : !activePersona ? (
          <div className="text-center py-3 persona-card rounded-xl"><p className="text-gray-400/60 text-sm">Create and activate a persona to send messages</p></div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg border border-white/30" />
                <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-400 transition-colors shadow-lg"><X className="w-4 h-4" /></button>
              </div>
            )}
            <div className="flex gap-3 items-center">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage || isSending} className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl h-11 w-11 flex-shrink-0 border border-white/20">
                {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              </Button>
              <div className="flex-1 relative">
                <Textarea 
                  ref={textareaRef}
                  placeholder="Type a message... (Ctrl+B bold, Ctrl+I italic, Ctrl+U underline)" 
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
              <Button onClick={sendMessage} disabled={(!newMessage.trim() && !imagePreview) || isSending} className="btn-persona h-11 w-11 rounded-xl flex-shrink-0 px-0">
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setViewingImage(null)}
        >
          <button 
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={viewingImage} 
            alt="Full size image" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <a 
            href={viewingImage} 
            target="_blank" 
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm flex items-center gap-2 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Open in new tab</span>
            <span className="text-white/60">↗</span>
          </a>
        </div>
      )}
      
      {/* Context Menu for Messages */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
        >
          <div 
            className="fixed bg-black border border-white/20 rounded-lg shadow-xl py-1 min-w-[150px] z-50"
            style={{ 
              left: `${Math.min(contextMenu.x, window.innerWidth - 170)}px`, 
              top: `${Math.min(contextMenu.y, window.innerHeight - 100)}px` 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setReportMessage(contextMenu.message)
                setShowReportModal(true)
                setContextMenu(null)
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors rounded-lg mx-1"
            >
              <Flag className="w-4 h-4" />
              Report Message
            </button>
          </div>
        </div>
      )}
      
      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => { setShowReportModal(false); setReportMessage(null) }}
        type="dm_message"
        reportedId={conversation.otherPersona.id}
        referenceId={reportMessage?.id}
        reportedName={conversation.otherPersona.name}
        messagePreview={reportMessage?.content || undefined}
      />
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
            <MessageCircle className="w-5 h-5 text-white" />
            Send Message Request
          </DialogTitle>
          <DialogDescription className="text-gray-400/60">
            Start a conversation with {targetPersona.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <Avatar className="w-10 h-10 border-2 border-white/20">
              <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white font-semibold">
                {targetPersona.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white">{targetPersona.name}</p>
              <p className="text-xs text-gray-400/60">@{targetPersona.username}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Your message</Label>
            <Textarea
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="Write a message to start the conversation..."
              className="persona-input min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 text-right">{firstMessage.length}/500</p>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label className="text-gray-300">Add image (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-white/20">
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
                className="w-full py-3 rounded-lg border border-dashed border-white/30 text-gray-400 hover:border-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
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
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-white/20 text-gray-300 hover:bg-white/10 transition-colors">
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

// ==================== HOME PAGE (Discovery) ====================
// HomePageContent removed - was dead code. MainApp uses DiscoverPage component directly.

// ==================== MAIN APP ====================
function MainApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'friends' | 'storylines' | 'chat' | 'wallet' | 'admin' | 'marketplace'>('home')
  const [activeChat, setActiveChat] = useState<Conversation | null>(null)
  const [activeStorylineId, setActiveStorylineId] = useState<string | null>(null)
  const [showCreatePersonaModal, setShowCreatePersonaModal] = useState(false)
  const [showCreateScenarioModal, setShowCreateScenarioModal] = useState(false)
  const [showPersonasModal, setShowPersonasModal] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<OnlinePersona | null>(null)
  
  // Single global DM sidebar collapse state (persists across tabs)
  const [isDMSidebarCollapsed, setIsDMSidebarCollapsed] = useState(false)
  // Track if sidebar was auto-collapsed by marketplace (vs user manually collapsed)
  const wasAutoCollapsedByMarketplaceRef = useRef(false)
  
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!(window as any).electronAPI)
  const { user } = useAuth()
  const { createPersona } = usePersonas()
  const { toast } = useToast()
  
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
  
  // Handle selecting a chat from sidebar
  const handleSelectChat = async (conversationId: string) => {
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        const conv = data.conversations.find((c: Conversation) => c.id === conversationId)
        if (conv) {
          setActiveChat(conv)
          handleSetActiveTab('chat')
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error)
    }
  }
  
  // Handle selecting a storyline
  const handleSelectStoryline = (storylineId: string) => {
    setActiveStorylineId(storylineId)
    // For now, just go to storylines page
    handleSetActiveTab('storylines')
  }
  
  // Handle starting a chat from discovery
  const handleStartChat = (conv: Conversation) => {
    setActiveChat(conv)
    handleSetActiveTab('chat')
  }
  
  // Handle creating persona
  const handleSavePersona = async (data: {
    name: string
    title: string[]
    avatarUrl: string | null
    bannerUrl: string | null
    description: string | null
    archetype: string | null
    gender: string | null
    pronouns: string | null
    age: number | null
    tags: string[]
    personalityDescription: string | null
    personalitySpectrums: PersonalitySpectrums
    bigFive: BigFiveTraits
    hexaco: HexacoTraits
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
    themeEnabled: boolean
    rpStyle: string | null
    rpPreferredGenders: string[]
    rpGenres: string[]
    rpLimits: string[]
    rpThemes: string[]
    rpExperienceLevel: string | null
    rpResponseTime: string | null
    nsfwEnabled: boolean
    nsfwBodyType: string | null
    nsfwKinks: string[]
    nsfwContentWarnings: string[]
    nsfwOrientation: string | null
    nsfwRolePreference: string | null
    characterQuote: string | null
    psychologySurface: string | null
    psychologyBeneath: string | null
    occupation: string | null
    status: string | null
    orientation: string | null
    height: string | null
    dialogueLog: { type: string; content: string; mood?: string }[]
    characterScenarios: { title: string; description: string }[]
    galleryUrls: string[]
    alternateImageUrl: string | null
    connections?: { characterName: string; relationshipType: string; specificRole: string | null; characterAge: number | null; description: string | null }[]
  }) => {
    try {
      await createPersona(data)
      setShowCreatePersonaModal(false)
    } catch (error) {
      console.error('Failed to create persona:', error)
      // Re-throw so PersonaForm can show the error
      throw error
    }
  }
  
  return (
    <div className="min-h-screen w-full bg-black text-white">
      {isElectron && <TopBar />}
      <div className="flex h-full" style={{ height: isElectron ? 'calc(100vh - 36px)' : '100vh' }}>
        <Sidebar
          activeTab={activeTab}
          activeStorylineId={activeStorylineId}
          onSelectTab={(tab) => {
            handleSetActiveTab(tab)
            setActiveStorylineId(null) // Clear storyline when switching tabs
            if (tab !== 'chat') setActiveChat(null)
          }}
          onSelectStoryline={handleSelectStoryline}
          onCreatePersona={() => setShowCreatePersonaModal(true)}
          onCreateScenario={() => setShowCreateScenarioModal(true)}
          onCreateStoryline={() => {
            setActiveTab('storylines')
          }}
        />
        <DMSidebar
          activeChatId={activeChat?.id || null}
          onSelectChat={handleSelectChat}
          isCollapsed={isDMSidebarCollapsed}
          onToggleCollapse={handleToggleDMSidebar}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeStorylineId ? (
          <StorylineInterior 
            storylineId={activeStorylineId} 
            onBack={() => setActiveStorylineId(null)} 
          />
        ) : activeTab === 'chat' && activeChat ? (
          <ChatView conversation={activeChat} onBack={() => { setActiveChat(null); handleSetActiveTab('home') }} onViewProfile={setSelectedPersona} />
        ) : activeTab === 'friends' ? (
          <FriendsPage onStartChat={handleStartChat} />
        ) : activeTab === 'storylines' ? (
          <StorylinesPage onViewStoryline={handleSelectStoryline} onStartChat={handleStartChat} />
        ) : activeTab === 'wallet' ? (
          <WalletPage />
        ) : activeTab === 'marketplace' ? (
          <MarketplacePage />
        ) : activeTab === 'admin' ? (
          <AdminPanel />
        ) : (
          <DiscoverPage 
            onSelectPersona={(persona) => {
              setSelectedPersona(persona)
            }}
            onOpenMyCharacters={() => setShowPersonasModal(true)}
          />
        )}
      </div>
    </div>
    
    {/* Create Persona Modal */}
    <PersonaForm 
        isOpen={showCreatePersonaModal} 
        onClose={() => setShowCreatePersonaModal(false)} 
        onSave={handleSavePersona} 
        isAdult={user?.isAdult ?? false}
      />
      
      {/* My Personas Modal */}
      <MyPersonasModal isOpen={showPersonasModal} onClose={() => setShowPersonasModal(false)} />
      
      {/* Create Scenario Modal */}
      <ScenarioModal
        open={showCreateScenarioModal}
        onClose={() => setShowCreateScenarioModal(false)}
        onCreate={() => {
          setShowCreateScenarioModal(false)
          toast({
            title: 'Scenario created!',
            description: 'Your scenario has been created successfully.',
          })
        }}
      />
      
      {/* Character Profile Modal */}
      {selectedPersona && (
        <CharacterProfileModal
          persona={selectedPersona}
          isOpen={!!selectedPersona}
          onClose={() => setSelectedPersona(null)}
          onStartChat={(personaId) => {
            // Find the persona in discovery and start chat
            setSelectedPersona(null)
          }}
        />
      )}
      
      {/* Notification Modal - Shows pending notifications */}
      <NotificationModal />
    </div>
  )
}

// ==================== MAIN PAGE ====================
export default function Page() {
  const { isLoading, isAuthenticated } = useAuth()
  
  if (isLoading) {
    return (
      <div className="min-h-screen persona-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-white/25">
              <span className="text-black font-bold text-xl">C</span>
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-white animate-pulse" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated) return <AuthPage />
  return <MainApp />
}