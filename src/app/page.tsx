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
import { Persona, PersonaConnection, PersonalitySpectrums } from '@/stores/persona-store'
import { CharacterProfileModal } from '@/components/character-profile-modal'
import { WalletPage } from '@/components/wallet-page'
import { AdminPanel } from '@/components/admin-panel'
import { NotificationModal } from '@/components/notification-modal'
import { MarketplacePage } from '@/components/marketplace-page'
import { ListOnMarketplaceModal } from '@/components/list-on-marketplace-modal'
import { PersonaCard } from '@/components/persona-card'
import { AdvancedSearch } from '@/components/advanced-search'
import { ReportModal } from '@/components/report-modal'
import { useToast } from '@/hooks/use-toast'
import { BLORP_USER_ID } from '@/lib/blorp'

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
  title: string | null
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

// ==================== AUTH PAGE - REDESIGNED ====================
function AuthPage() {
  const { login, signup, setUser, verifySecurityKey: authVerifySecurityKey } = useAuth()
  
  const [signupForm, setSignupForm] = useState({ username: '', password: '', confirmPassword: '' })
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  
  // Security Key Modal State
  const [showSecurityKeyModal, setShowSecurityKeyModal] = useState(false)
  const [securityKey, setSecurityKey] = useState('')
  const [securityKeyInput, setSecurityKeyInput] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [isLoginFlow, setIsLoginFlow] = useState(false)
  const [hasCopiedKey, setHasCopiedKey] = useState(false)
  
  // Animated particles
  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 10,
    })), []
  )
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
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
  
  // Features list for the showcase
  const features = [
    { icon: User, title: 'Create Personas', desc: 'Build unique characters with rich profiles' },
    { icon: MessageCircle, title: 'Real-time Chat', desc: 'Connect with others through DMs and Storylines' },
    { icon: Store, title: 'Marketplace', desc: 'Share and discover amazing characters' },
    { icon: Crown, title: 'Premium Features', desc: 'Unlock exclusive themes and customization' },
  ]
  
  return (
    <div className="min-h-screen flex overflow-hidden bg-[#080410]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-fuchsia-600/15 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
        
        {/* Animated particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-purple-400/30 animate-float"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>
      
      {/* Left Side - Branding & Features (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center relative p-12">
        <div className="max-w-lg space-y-8">
          {/* Logo & Title */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src="/logo.png" 
                  alt="Chrona" 
                  className="w-20 h-20 rounded-2xl shadow-2xl shadow-purple-500/30 object-cover"
                />
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-2xl blur opacity-30 animate-pulse" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                  Chrona
                </h1>
                <p className="text-purple-300/60 text-lg">Roleplay Universe</p>
              </div>
            </div>
          </div>
          
          {/* Tagline */}
          <p className="text-2xl text-purple-100/80 leading-relaxed">
            Create your identity. Meet real people.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
              Roleplay your story.
            </span>
          </p>
          
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="group p-4 rounded-2xl bg-white/[0.02] border border-purple-500/10 hover:border-purple-500/30 hover:bg-white/[0.05] transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-sm text-purple-300/50">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src="/logo.png" alt="Chrona" className="w-12 h-12 rounded-xl shadow-lg shadow-purple-500/30" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Chrona</h1>
              <p className="text-purple-300/60 text-xs">Roleplay Universe</p>
            </div>
          </div>
          
          {/* Auth Card */}
          <div className="relative">
            {/* Card glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-50" />
            
            <div className="relative bg-[#0d0818]/90 backdrop-blur-xl rounded-3xl border border-purple-500/20 shadow-2xl overflow-hidden">
              {/* Card header with gradient */}
              <div className="relative px-8 pt-8 pb-6">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent" />
                <div className="relative">
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {activeTab === 'login' ? 'Welcome back' : 'Create account'}
                  </h2>
                  <p className="text-purple-300/50">
                    {activeTab === 'login' 
                      ? 'Sign in to continue your journey' 
                      : 'Start your roleplay adventure today'}
                  </p>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="px-8">
                <div className="flex gap-1 p-1 bg-purple-500/5 rounded-xl border border-purple-500/10">
                  <button
                    onClick={() => { setActiveTab('login'); setError('') }}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      activeTab === 'login'
                        ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25'
                        : 'text-purple-300/60 hover:text-purple-200 hover:bg-white/5'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </button>
                  <button
                    onClick={() => { setActiveTab('signup'); setError('') }}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      activeTab === 'signup'
                        ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25'
                        : 'text-purple-300/60 hover:text-purple-200 hover:bg-white/5'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </button>
                </div>
              </div>
              
              {/* Form Content */}
              <div className="p-8 pt-6">
                {error && !showSecurityKeyModal && (
                  <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <X className="w-4 h-4" />
                    </div>
                    {error}
                  </div>
                )}
                
                {/* Login Form */}
                {activeTab === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-purple-200/80">Username</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/40 group-focus-within:text-purple-400 transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          placeholder="Enter your username"
                          value={loginForm.username}
                          onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                          required
                          className="w-full h-12 pl-12 pr-4 bg-purple-500/5 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/30 focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/10 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-purple-200/80">Password</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/40 group-focus-within:text-purple-400 transition-colors">
                          <Crown className="w-5 h-5" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          required
                          className="w-full h-12 pl-12 pr-12 bg-purple-500/5 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/30 focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/10 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400/40 hover:text-purple-400 transition-colors"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          Sign In
                        </>
                      )}
                    </button>
                  </form>
                )}
                
                {/* Signup Form */}
                {activeTab === 'signup' && (
                  <form onSubmit={handleSignup} className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-purple-200/80">Username</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/40 group-focus-within:text-purple-400 transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          placeholder="Choose a username"
                          value={signupForm.username}
                          onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                          required
                          className="w-full h-12 pl-12 pr-4 bg-purple-500/5 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/30 focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/10 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                      </div>
                      <p className="text-xs text-purple-400/40 ml-1">Letters, numbers, underscores. 3-20 chars.</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-purple-200/80">Password</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/40 group-focus-within:text-purple-400 transition-colors">
                          <Crown className="w-5 h-5" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                          required
                          className="w-full h-12 pl-12 pr-12 bg-purple-500/5 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/30 focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/10 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400/40 hover:text-purple-400 transition-colors"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-purple-400/40 ml-1">At least 6 characters</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-purple-200/80">Confirm Password</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/40 group-focus-within:text-purple-400 transition-colors">
                          <Check className="w-5 h-5" />
                        </div>
                        <input
                          type="password"
                          placeholder="Confirm your password"
                          value={signupForm.confirmPassword}
                          onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                          required
                          className="w-full h-12 pl-12 pr-4 bg-purple-500/5 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/30 focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/10 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Create Account
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-8 pb-6">
                <div className="pt-4 border-t border-purple-500/10">
                  <p className="text-xs text-purple-400/40 text-center">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Security Key Modal - Redesigned */}
      {showSecurityKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md animate-in zoom-in-95 fade-in duration-300">
            {/* Modal glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-50" />
            
            <div className="relative bg-[#0d0818]/95 backdrop-blur-xl rounded-3xl border border-purple-500/20 shadow-2xl overflow-hidden">
              {/* Animated top border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
              
              {/* Header */}
              <div className="p-6 border-b border-purple-500/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {isLoginFlow ? 'Security Verification' : 'Save Your Key'}
                    </h2>
                    <p className="text-sm text-purple-300/50">
                      {isLoginFlow ? 'Enter your security key to continue' : 'Required for all future logins'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6">
                {!isLoginFlow ? (
                  <div className="space-y-5">
                    {/* Warning box */}
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Heart className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-amber-300 font-semibold text-sm">Keep this safe!</p>
                          <p className="text-amber-200/60 text-xs mt-1">
                            You&apos;ll need this key every time you log in. We can&apos;t recover it for you.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Security Key Display */}
                    <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                      <p className="text-xs text-purple-400/50 mb-3 text-center uppercase tracking-wider">Your Security Key</p>
                      <div className="bg-black/40 rounded-xl p-4 font-mono text-xl text-center tracking-widest text-white select-all border border-purple-500/10">
                        {securityKey}
                      </div>
                    </div>
                    
                    {/* Copy Button */}
                    <button
                      onClick={copySecurityKey}
                      className={`w-full py-3.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        hasCopiedKey
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20'
                      }`}
                    >
                      {hasCopiedKey ? (
                        <>
                          <Check className="w-5 h-5" />
                          Copied to clipboard!
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-5 h-5" />
                          Copy to clipboard
                        </>
                      )}
                    </button>
                    
                    {/* Continue Button */}
                    <button
                      onClick={handleConfirmSecurityKeySaved}
                      className="w-full h-12 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      I&apos;ve saved my key
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {error && (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <X className="w-4 h-4" />
                        </div>
                        {error}
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-purple-200/80">Enter your security key</label>
                      <input
                        type="text"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={securityKeyInput}
                        onChange={(e) => setSecurityKeyInput(e.target.value.toUpperCase())}
                        className="w-full h-14 bg-purple-500/5 border border-purple-500/20 rounded-xl text-center font-mono text-xl tracking-widest text-white placeholder-purple-400/30 focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/10 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        maxLength={19}
                        autoFocus
                      />
                      <p className="text-xs text-purple-400/40 text-center">
                        Enter the 16-character key you saved during signup
                      </p>
                    </div>
                    
                    <button
                      onClick={handleVerifySecurityKey}
                      disabled={securityKeyInput.replace(/-/g, '').length < 16 || isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify & Continue
                          <ChevronRight className="w-5 h-5" />
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
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
    if (!confirm('Are you sure you want to delete this persona?')) return
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
    title: string | null
    avatarUrl: string | null
    description: string | null
    archetype: string | null
    gender: string | null
    age: number | null
    tags: string[]
    personalityDescription: string | null
    personalitySpectrums: PersonalitySpectrums
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
    if (!mbti) return 'bg-purple-500/20 text-purple-300'
    const type = mbti.slice(0, 2)
    const colors: Record<string, string> = {
      'IN': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      'EN': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'IS': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'ES': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    }
    return colors[type] || 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  }

  // Archetype colors
  const getArchetypeGradient = (archetype: string | null) => {
    const gradients: Record<string, string> = {
      'Hero': 'from-amber-500/30 via-orange-500/20 to-red-500/30',
      'Villain': 'from-red-500/30 via-rose-500/20 to-pink-500/30',
      'Mentor': 'from-blue-500/30 via-cyan-500/20 to-teal-500/30',
      'Lover': 'from-pink-500/30 via-rose-500/20 to-red-500/30',
      'Explorer': 'from-emerald-500/30 via-teal-500/20 to-cyan-500/30',
      'Creator': 'from-purple-500/30 via-violet-500/20 to-fuchsia-500/30',
      'Outlaw': 'from-gray-500/30 via-slate-500/20 to-zinc-500/30',
      'Magician': 'from-indigo-500/30 via-purple-500/20 to-violet-500/30',
      'Everyman': 'from-amber-500/30 via-yellow-500/20 to-orange-500/30',
      'Jester': 'from-yellow-500/30 via-amber-500/20 to-orange-500/30',
      'Ruler': 'from-amber-500/30 via-orange-500/20 to-red-500/30',
      'Caregiver': 'from-rose-500/30 via-pink-500/20 to-fuchsia-500/30',
      'Innocent': 'from-sky-500/30 via-cyan-500/20 to-teal-500/30',
      'Sage': 'from-indigo-500/30 via-blue-500/20 to-cyan-500/30',
    }
    return gradients[archetype || ''] || 'from-purple-500/30 via-fuchsia-500/20 to-violet-500/30'
  }

  // Character Card - Modern horizontal design, wider and shorter
  const CharacterCard = ({ persona }: { persona: Persona }) => {
    const isHovered = hoveredPersona === persona.id
    const isDeleting = deletingId === persona.id
    
    return (
      <div 
        className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer backdrop-blur-sm ${
          persona.isActive 
            ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 shadow-lg shadow-emerald-500/10' 
            : 'border-purple-500/20 bg-[#0d0718]/80 hover:border-purple-500/40 hover:bg-[#0d0718]'
        }`}
        onMouseEnter={() => setHoveredPersona(persona.id)}
        onMouseLeave={() => setHoveredPersona(null)}
        onClick={() => !persona.isActive && handleActivate(persona.id)}
      >
        {/* Content - Horizontal layout */}
        <div className="flex items-center gap-4 p-4">
          {/* Avatar section with gradient background */}
          <div className="relative flex-shrink-0">
            <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${getArchetypeGradient(persona.archetype)} opacity-50 blur-sm transition-opacity ${isHovered ? 'opacity-80' : ''}`} />
            <Avatar className={`relative w-16 h-16 border-2 ${persona.isActive ? 'border-emerald-500/50' : 'border-purple-500/30'}`}>
              <AvatarImage src={persona.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-xl font-bold">
                {persona.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Active indicator */}
            {persona.isActive && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0d0718] flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          {/* Info section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-white text-base truncate">{persona.name}</h3>
              {persona.isActive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              )}
            </div>
            
            {/* Custom Archetypes */}
            {persona.title && persona.title.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {persona.title.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-purple-200 border border-purple-500/30">
                    {t}
                  </span>
                ))}
              </div>
            )}
            
            
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {persona.archetype && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  {persona.archetype}
                </span>
              )}
              {persona.mbtiType && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getMbtiColor(persona.mbtiType)}`}>
                  {persona.mbtiType}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-purple-400/70 flex-wrap">
              {persona.age && <span>{persona.age}y</span>}
              {persona.gender && <span>• {persona.gender}</span>}
              {persona.species && <span>• {persona.species}</span>}
            </div>
            
            {persona.description && (
              <p className="text-xs text-purple-300/50 line-clamp-1 mt-1.5">{persona.description}</p>
            )}
          </div>
          
          {/* Actions - Show on hover */}
          <div className={`flex items-center gap-1.5 transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {!persona.isActive && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleActivate(persona.id) }}
                className="w-9 h-9 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-300 transition-all border border-emerald-500/20"
                title="Activate"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); setEditingPersona(persona) }}
              className="w-9 h-9 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center text-purple-300 transition-all border border-purple-500/20"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setListingPersona(persona) }}
              className="w-9 h-9 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 flex items-center justify-center text-amber-300 transition-all border border-amber-500/20"
              title="List on Marketplace"
            >
              <Store className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(persona.id) }}
              disabled={isDeleting}
              className="w-9 h-9 rounded-xl bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-300 transition-all border border-red-500/20 disabled:opacity-50"
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
        className={`group flex items-center gap-6 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer bg-[#0d0718] ${
          persona.isActive 
            ? 'border-emerald-500/60 bg-emerald-500/5' 
            : 'border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/5'
        }`}
        onMouseEnter={() => setHoveredPersona(persona.id)}
        onMouseLeave={() => setHoveredPersona(null)}
        onClick={() => !persona.isActive && handleActivate(persona.id)}
      >
        <Avatar className={`w-16 h-16 border-3 ${persona.isActive ? 'border-emerald-500/50' : 'border-purple-500/30'}`}>
          <AvatarImage src={persona.avatarUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-xl font-semibold">
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
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                {persona.archetype}
              </span>
            )}
            {persona.mbtiType && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getMbtiColor(persona.mbtiType)}`}>
                {persona.mbtiType}
              </span>
            )}
            {persona.age && <span className="text-sm text-purple-400/70">{persona.age} years</span>}
            {persona.gender && <span className="text-sm text-purple-400/70">• {persona.gender}</span>}
            {persona.species && <span className="text-sm text-purple-400/70">• {persona.species}</span>}
          </div>
          
          {persona.description && (
            <p className="text-sm text-purple-300/50 truncate mt-2">{persona.description}</p>
          )}
        </div>
        
        <div className={`flex items-center gap-2 transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {!persona.isActive && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleActivate(persona.id) }}
              className="btn-persona text-sm py-2 px-4 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> Activate
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setEditingPersona(persona) }} className="w-10 h-10 rounded-xl flex items-center justify-center text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all border border-purple-500/20">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setListingPersona(persona) }} className="w-10 h-10 rounded-xl flex items-center justify-center text-purple-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-all border border-purple-500/20">
            <Store className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(persona.id) }} disabled={isDeleting} className="w-10 h-10 rounded-xl flex items-center justify-center text-purple-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 border border-purple-500/20">
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent showCloseButton={false} className="bg-[#0d0718] border-purple-500/20 max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
          {/* Accessibility: Hidden title for screen readers */}
          <VisuallyHidden>
            <DialogTitle>My Characters</DialogTitle>
          </VisuallyHidden>
          
          {/* Animated Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
          </div>
          
          <div className="relative h-full flex flex-col min-h-0">
            {/* Header Bar - Fixed height to prevent overflow */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/15 bg-black/20 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">My Characters</h2>
                  <p className="text-xs text-purple-400/60">{personas.length} character{personas.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              
              {/* Search */}
              <div className="flex-1 max-w-md mx-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
                  <input
                    type="text"
                    placeholder="Search characters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-purple-500/5 border border-purple-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-500/40 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400/50 hover:text-purple-300">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-3">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-purple-500/5 border border-purple-500/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all appearance-none cursor-pointer pr-8"
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
                    className="bg-purple-500/5 border border-purple-500/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all appearance-none cursor-pointer pr-8"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23c084fc' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
                  >
                    <option value="">All</option>
                    {archetypes.map(arch => (
                      <option key={arch} value={arch}>{arch}</option>
                    ))}
                  </select>
                )}
                
                {/* View Mode */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-purple-500/30 text-white' : 'text-purple-400/60 hover:text-purple-300'}`} title="Grid View">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-purple-500/30 text-white' : 'text-purple-400/60 hover:text-purple-300'}`} title="List View">
                    <List className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Create Button */}
                <button onClick={() => setShowCreateModal(true)} className="btn-persona flex items-center gap-2 py-2 px-4 text-sm font-medium">
                  <Plus className="w-4 h-4" /> Create New
                </button>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 overflow-hidden min-h-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
                  <p className="text-purple-400/60 text-lg">Loading characters...</p>
                </div>
              ) : personas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center mb-6 animate-pulse">
                    <Sparkles className="w-10 h-10 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">No characters yet</h3>
                  <p className="text-purple-400/60 text-lg mb-8">Create your first character to start roleplaying!</p>
                  <button onClick={() => setShowCreateModal(true)} className="btn-persona flex items-center gap-2 py-3 px-8 text-base">
                    <Plus className="w-5 h-5" /> Create Your First Character
                  </button>
                </div>
              ) : filteredPersonas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Search className="w-16 h-16 text-purple-400/40 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No matches found</h3>
                  <p className="text-purple-400/60 text-lg mb-6">Try adjusting your search or filters</p>
                  <button onClick={() => { setSearchQuery(''); setSelectedArchetype(null) }} className="btn-persona-secondary py-2.5 px-6 text-sm">
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
                    
                    {/* Add New Card - Horizontal style */}
                    <div 
                      className="group cursor-pointer animate-fade-up rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-purple-500/50 transition-all flex items-center justify-center gap-4 bg-purple-500/5 hover:bg-purple-500/10 p-6"
                      onClick={() => setShowCreateModal(true)}
                      style={{ animationDelay: `${filteredPersonas.length * 30}ms` }}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                        <Plus className="w-7 h-7 text-purple-400/60 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <p className="text-base font-medium text-purple-400/60 group-hover:text-purple-300 transition-colors">Create New Character</p>
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
                    
                    {/* Add New Card */}
                    <div 
                      className="group cursor-pointer animate-fade-up rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-purple-500/50 transition-all flex items-center justify-center gap-4 bg-purple-500/5 hover:bg-purple-500/10 p-6"
                      onClick={() => setShowCreateModal(true)}
                      style={{ animationDelay: `${filteredPersonas.length * 30}ms` }}
                    >
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                        <Plus className="w-6 h-6 text-purple-400/60 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <p className="text-base font-medium text-purple-400/60 group-hover:text-purple-300 transition-colors">Create New Character</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            {personas.length > 0 && (
              <div className="flex-shrink-0 px-8 py-4 border-t border-purple-500/15 bg-black/20 backdrop-blur-sm flex items-center justify-between text-sm text-purple-400/50">
                <span>Showing {filteredPersonas.length} of {personas.length} characters</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Active: <span className="text-purple-300 font-medium">{activePersona?.name || 'None'}</span>
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <PersonaForm 
        isOpen={showCreateModal || !!editingPersona} 
        onClose={() => { setShowCreateModal(false); setEditingPersona(null) }} 
        persona={editingPersona} 
        onSave={handleSavePersona} 
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
    <div className="topbar h-9 w-full flex items-center justify-between px-3 bg-[#120722]/95 border-b border-purple-500/25 text-purple-100 backdrop-blur-lg -webkit-app-region-drag">
      <div className="flex items-center gap-3 text-sm font-semibold select-none">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
          <span className="text-xs font-black">C</span>
        </div>
        <div className="flex flex-col leading-3">
          <span className="text-sm text-purple-100">Chrona</span>
          <span className="text-[10px] text-purple-300">Roleplay Universe</span>
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
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB'); return }
    
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (response.ok) {
        const data = await response.json()
        setImagePreview(data.avatarUrl || data.url)
      } else { alert('Failed to upload image') }
    } catch (error) {
      console.error('Image upload error:', error)
      alert('Failed to upload image')
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
  
  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-gradient-to-b from-[#090517] via-[#120a24] to-[#100827]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-purple-500/15 bg-[#12091f]/50 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" onClick={onBack} className="text-purple-300 hover:text-purple-100 hover:bg-purple-500/10 gap-2 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="w-px h-8 bg-purple-500/20" />
        <div className="relative persona-status" style={conversation.otherPersona.isOnline ? {} : {}}>
          <Avatar className="w-10 h-10 border-2 border-purple-500/30">
            <AvatarImage src={conversation.otherPersona.avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500/50 to-fuchsia-500/50 text-white font-semibold">{conversation.otherPersona.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#12091f] ${conversation.otherPersona.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-purple-100">{conversation.otherPersona.name}</h3>
          <p className="text-xs text-purple-400/60">@{conversation.otherPersona.username}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
          <span className={`w-2 h-2 rounded-full ${conversation.otherPersona.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className={`text-xs font-medium ${conversation.otherPersona.isOnline ? 'text-emerald-400' : 'text-purple-400/60'}`}>{conversation.otherPersona.isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-purple-400/60">
            <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20"><MessageCircle className="w-10 h-10" /></div>
            <p className="text-lg font-medium text-purple-200">Start the conversation!</p>
            <p className="text-sm mt-1 text-purple-400/60">Say hello to {conversation.otherPersona.name}</p>
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
                      "group flex gap-3 hover:bg-purple-500/5 -mx-2 px-2 py-0.5 rounded-lg transition-colors relative",
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
                              title: null,
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
                          <AvatarFallback className="bg-gradient-to-br from-purple-500/50 to-fuchsia-500/50 text-white text-sm font-medium">
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
                                  title: null,
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
                            className="font-semibold text-white hover:text-purple-200 hover:underline cursor-pointer transition-colors flex items-center gap-2"
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
                              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-purple-500/20 max-h-80" 
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
              <div className="px-4 py-1 text-xs text-purple-400/60 flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{typingPersona} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      {/* Message Input */}
      <div className="sticky bottom-0 p-4 border-t border-purple-500/15 bg-[#12091f]/80 backdrop-blur-sm">
        {isBlorpConversation ? (
          /* Read-only message for Blorp conversations */
          <div className="max-w-3xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-fuchsia-500/10">
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-fuchsia-500/5 animate-pulse" />
              
              {/* Top decorative line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
              
              <div className="relative p-5">
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#12091f] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-amber-200">Official Notification Channel</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">VERIFIED</span>
                    </div>
                    <p className="text-sm text-purple-400/60">Blorp • Chrona Official Bot</p>
                  </div>
                </div>
                
                {/* Info cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <Bell className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-xs text-purple-300/80">Account Alerts</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <Coins className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-xs text-purple-300/80">Chronos Updates</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <Store className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-xs text-purple-300/80">Marketplace</p>
                  </div>
                </div>
                
                {/* Footer message */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-xs text-purple-300/60">This is a read-only channel — You'll receive notifications here automatically</p>
                </div>
              </div>
            </div>
          </div>
        ) : !activePersona ? (
          <div className="text-center py-3 persona-card rounded-xl"><p className="text-purple-400/60 text-sm">Create and activate a persona to send messages</p></div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg border border-purple-500/30" />
                <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-400 transition-colors shadow-lg"><X className="w-4 h-4" /></button>
              </div>
            )}
            <div className="flex gap-3 items-center">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage || isSending} className="text-purple-400 hover:text-purple-200 hover:bg-purple-500/10 rounded-xl h-11 w-11 flex-shrink-0 border border-purple-500/20">
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
            className="fixed bg-[#0d0718] border border-purple-500/30 rounded-lg shadow-xl py-1 min-w-[150px] z-50"
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
            <MessageCircle className="w-5 h-5 text-purple-400" />
            Send Message Request
          </DialogTitle>
          <DialogDescription className="text-purple-400/60">
            Start a conversation with {targetPersona.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Avatar className="w-10 h-10 border-2 border-purple-500/30">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white font-semibold">
                {targetPersona.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-purple-100">{targetPersona.name}</p>
              <p className="text-xs text-purple-400/60">@{targetPersona.username}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-purple-200/80">Your message</Label>
            <Textarea
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="Write a message to start the conversation..."
              className="persona-input min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-purple-400/50 text-right">{firstMessage.length}/500</p>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label className="text-purple-200/80">Add image (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-purple-500/20">
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
                className="w-full py-3 rounded-lg border border-dashed border-purple-500/30 text-purple-400 hover:border-purple-500/50 hover:text-purple-300 transition-colors flex items-center justify-center gap-2"
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
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-purple-500/20 text-purple-300 hover:bg-purple-500/10 transition-colors">
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
function HomePageContent({ onStartChat }: { onStartChat: (conv: Conversation) => void }) {
  const { user } = useAuth()
  const { personas, activePersona, isLoading: personasLoading, createPersona } = usePersonas()
  const { toast } = useToast()
  const [activeFilter, setActiveFilter] = useState('new')
  const [showOffline, setShowOffline] = useState(false)
  const [showPersonasModal, setShowPersonasModal] = useState(false)
  const [showCreatePersonaModal, setShowCreatePersonaModal] = useState(false)
  const [onlinePersonas, setOnlinePersonas] = useState<OnlinePersona[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(true)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [selectedPersona, setSelectedPersona] = useState<OnlinePersona | null>(null)
  
  // Search filters state
  const [searchFilters, setSearchFilters] = useState<{
    query: string
    searchIn: string[]
    mbti: string[]
    gender: string[]
    ageMin: number | null
    ageMax: number | null
    species: string[]
    archetype: string[]
    tags: string[]
    attributes: string[]
    likes: string[]
    hobbies: string[]
    skills: string[]
    syncPersonality: boolean
  }>({
    query: '',
    searchIn: ['all'],
    mbti: [],
    gender: [],
    ageMin: null,
    ageMax: null,
    species: [],
    archetype: [],
    tags: [],
    attributes: [],
    likes: [],
    hobbies: [],
    skills: [],
    syncPersonality: false
  })
  
  // DM Request Dialog state
  const [showDmRequestDialog, setShowDmRequestDialog] = useState(false)
  const [dmRequestTarget, setDmRequestTarget] = useState<{ id: string; name: string; username: string } | null>(null)
  
  // Build search URL with filters
  const buildSearchUrl = useCallback(() => {
    const params = new URLSearchParams()
    params.set('filter', activeFilter)
    params.set('showOffline', showOffline.toString())
    
    if (searchFilters.query) params.set('q', searchFilters.query)
    if (searchFilters.searchIn.length > 0 && !searchFilters.searchIn.includes('all')) {
      params.set('searchIn', searchFilters.searchIn.join(','))
    }
    if (searchFilters.mbti.length > 0) params.set('mbti', searchFilters.mbti.join(','))
    if (searchFilters.gender.length > 0) params.set('gender', searchFilters.gender.join(','))
    if (searchFilters.ageMin !== null) params.set('ageMin', searchFilters.ageMin.toString())
    if (searchFilters.ageMax !== null) params.set('ageMax', searchFilters.ageMax.toString())
    if (searchFilters.species.length > 0) params.set('species', searchFilters.species.join(','))
    if (searchFilters.archetype.length > 0) params.set('archetype', searchFilters.archetype.join(','))
    if (searchFilters.tags.length > 0) params.set('tags', searchFilters.tags.join(','))
    if (searchFilters.attributes.length > 0) params.set('attributes', searchFilters.attributes.join(','))
    if (searchFilters.likes.length > 0) params.set('likes', searchFilters.likes.join(','))
    if (searchFilters.hobbies.length > 0) params.set('hobbies', searchFilters.hobbies.join(','))
    if (searchFilters.skills.length > 0) params.set('skills', searchFilters.skills.join(','))
    if (searchFilters.syncPersonality) params.set('syncPersonality', 'true')
    
    return `/api/discovery?${params.toString()}`
  }, [activeFilter, showOffline, searchFilters])
  
  useEffect(() => {
    async function fetchDiscovery() {
      setIsLoadingDiscovery(true)
      try {
        const response = await apiFetch(buildSearchUrl())
        if (response.ok) {
          const data = await response.json()
          setOnlinePersonas(data.personas)
        }
      } catch (error) {
        console.error('Failed to fetch discovery:', error)
      } finally {
        setIsLoadingDiscovery(false)
      }
    }
    fetchDiscovery()
  }, [buildSearchUrl])
  
  useEffect(() => {
    async function fetchConversations() {
      try {
        const response = await fetch('/api/conversations')
        if (response.ok) {
          const data = await response.json()
          setConversations(data.conversations)
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
      } finally {
        setIsLoadingConversations(false)
      }
    }
    if (personas.length > 0) fetchConversations()
  }, [personas.length])
  
  const startConversation = async (targetPersonaId: string) => {
    if (!activePersona) {
      toast({ title: 'No Active Character', description: 'Please create and activate a character first!', variant: 'destructive' })
      return
    }
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPersonaId, myPersonaId: activePersona.id })
      })
      const data = await response.json()
      
      if (response.ok) {
        // Check if we need to show DM request dialog
        if (data.needsDmRequest && data.targetPersona) {
          setDmRequestTarget(data.targetPersona)
          setShowDmRequestDialog(true)
          return
        }
        
        // Check if conversation was created
        if (data.conversation) {
          const convResponse = await fetch('/api/conversations')
          if (convResponse.ok) {
            const convData = await convResponse.json()
            setConversations(convData.conversations)
            const newConv = convData.conversations.find((c: Conversation) => c.id === data.conversation.id)
            if (newConv) {
              onStartChat(newConv)
              // Refresh DM sidebar
              window.dispatchEvent(new CustomEvent(DM_REFRESH_EVENT))
            }
          }
        } else if (data.dmRequest) {
          // DM request was sent successfully
          toast({ title: 'Request sent!', description: 'Your message request has been sent', variant: 'default' })
        }
      } else {
        toast({ title: 'Failed to Start Conversation', description: data.error || 'Something went wrong', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
      toast({ title: 'Failed to Start Conversation', description: 'Network error. Please try again.', variant: 'destructive' })
    }
  }
  
  // Handle successful DM request (when conversation is created)
  const handleDmRequestSuccess = async (conversationId: string) => {
    setShowDmRequestDialog(false)
    setDmRequestTarget(null)
    const convResponse = await fetch('/api/conversations')
    if (convResponse.ok) {
      const convData = await convResponse.json()
      setConversations(convData.conversations)
      const newConv = convData.conversations.find((c: Conversation) => c.id === conversationId)
      if (newConv) {
        onStartChat(newConv)
        // Refresh DM sidebar
        window.dispatchEvent(new CustomEvent(DM_REFRESH_EVENT))
      }
    }
  }
  
  const handleSavePersona = async (data: {
    name: string
    title: string | null
    avatarUrl: string | null
    description: string | null
    archetype: string | null
    gender: string | null
    age: number | null
    tags: string[]
    personalityDescription: string | null
    personalitySpectrums: PersonalitySpectrums
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
  }) => {
    await createPersona(data)
    setShowCreatePersonaModal(false)
  }
  
  return (
    <div className="flex flex-col h-full persona-bg">
      {/* Header */}
      <div className="h-14 border-b border-purple-500/20 flex items-center px-4 bg-[#12091f]/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold persona-gradient-text">Discover</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowPersonasModal(true)} className="btn-persona flex items-center gap-2 text-sm py-2 px-3">
            <User className="w-4 h-4" /> My Characters
          </button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 min-h-0 p-4">
        {/* No Persona Warning */}
        {!personasLoading && personas.length === 0 && (
          <div className="persona-card mb-4 p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <User className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-100">Create Your First Character</h3>
                <p className="text-sm text-purple-400/70">You need a character to start chatting with others!</p>
              </div>
              <button onClick={() => setShowCreatePersonaModal(true)} className="btn-persona flex items-center gap-2 py-2 px-4">
                <Plus className="w-4 h-4" /> Create Character
              </button>
            </div>
          </div>
        )}
        
        {/* Advanced Search */}
        <div className="mb-4">
          <AdvancedSearch 
            onSearch={(filters) => setSearchFilters(filters)}
            isLoading={isLoadingDiscovery}
          />
        </div>
        
        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="persona-tabs inline-flex p-1">
            {['new', 'following', 'followers'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`persona-tab ${activeFilter === filter ? 'persona-tab-active' : ''}`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Show Offline Toggle */}
          <button
            onClick={() => setShowOffline(!showOffline)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showOffline 
                ? 'bg-purple-500/20 border border-purple-500/30 text-purple-200' 
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showOffline ? 'bg-purple-400' : 'bg-emerald-400 animate-pulse'}`} />
            {showOffline ? 'All Users' : 'Online Only'}
          </button>
        </div>
        
        <p className="text-xs text-purple-400/60 mb-3 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${showOffline ? 'bg-purple-400' : 'bg-emerald-400 animate-pulse'}`} />
          <span>{showOffline ? 'Showing all personas' : 'Showing online personas'}</span>
        </p>
        
        {/* Discovery Grid */}
        {isLoadingDiscovery ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="persona-card overflow-hidden">
                <div className="h-20 bg-purple-500/10" />
                <div className="relative -mt-8 px-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-[#12091f] skeleton-avatar persona-skeleton" />
                </div>
                <div className="px-3 pb-3 pt-1">
                  <div className="h-3 persona-skeleton skeleton-text w-2/3 rounded" />
                  <div className="h-2 persona-skeleton skeleton-text w-1/2 rounded mt-2" />
                  <div className="flex gap-1.5 mt-2">
                    <div className="h-6 persona-skeleton rounded flex-1" />
                    <div className="h-6 persona-skeleton rounded flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : onlinePersonas.length === 0 ? (
          <div className="persona-empty-state persona-card py-12 mt-2">
            <div className="persona-empty-state-icon">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-purple-200">No personas found</p>
            <p className="text-purple-400/50 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {onlinePersonas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                onStartChat={startConversation}
                onViewProfile={setSelectedPersona}
              />
            ))}
          </div>
        )}
      </ScrollArea>
      
      <MyPersonasModal isOpen={showPersonasModal} onClose={() => setShowPersonasModal(false)} />
      <PersonaForm isOpen={showCreatePersonaModal} onClose={() => setShowCreatePersonaModal(false)} onSave={handleSavePersona} />
      
      {/* Character Profile Modal */}
      {selectedPersona && (
        <CharacterProfileModal
          persona={selectedPersona}
          isOpen={!!selectedPersona}
          onClose={() => setSelectedPersona(null)}
          onStartChat={(personaId) => {
            startConversation(personaId)
            setSelectedPersona(null)
          }}
        />
      )}
      
      {/* DM Request Dialog */}
      <DmRequestDialog
        isOpen={showDmRequestDialog}
        onClose={() => { setShowDmRequestDialog(false); setDmRequestTarget(null) }}
        targetPersona={dmRequestTarget}
        myPersona={activePersona}
        onSuccess={handleDmRequestSuccess}
      />
    </div>
  )
}

// ==================== MAIN APP ====================
function MainApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'friends' | 'storylines' | 'chat' | 'wallet' | 'admin' | 'marketplace'>('home')
  const [activeChat, setActiveChat] = useState<Conversation | null>(null)
  const [activeStorylineId, setActiveStorylineId] = useState<string | null>(null)
  const [showCreatePersonaModal, setShowCreatePersonaModal] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<OnlinePersona | null>(null)
  
  // Single global DM sidebar collapse state (persists across tabs)
  const [isDMSidebarCollapsed, setIsDMSidebarCollapsed] = useState(false)
  // Track if sidebar was auto-collapsed by marketplace (vs user manually collapsed)
  const wasAutoCollapsedByMarketplaceRef = useRef(false)
  
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!(window as any).electronAPI)
  const { createPersona } = usePersonas()
  
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
    avatarUrl: string | null
    description: string | null
    archetype: string | null
    gender: string | null
    age: number | null
    tags: string[]
    personalityDescription: string | null
    personalitySpectrums: PersonalitySpectrums
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
  }) => {
    await createPersona(data)
    setShowCreatePersonaModal(false)
  }
  
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#08030f] via-[#120a25] to-[#0a0312] text-purple-100">
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
          <HomePageContent onStartChat={handleStartChat} />
        )}
      </div>
    </div>
    
    {/* Create Persona Modal */}
    <PersonaForm 
        isOpen={showCreatePersonaModal} 
        onClose={() => setShowCreatePersonaModal(false)} 
        onSave={handleSavePersona} 
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-fuchsia-400 animate-pulse" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated) return <AuthPage />
  return <MainApp />
}