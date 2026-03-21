'use client'

// Force rebuild - v2
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePersonas } from '@/hooks/use-personas'
import { useChat, ChatMessage } from '@/hooks/use-chat'
import { extractMentions, parseMessageContent } from '@/lib/mentions'
import { parseMessageWithMarkdown, wrapSelection } from '@/lib/markdown'
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
  BookOpen, Compass, Star, Minus, Maximize2, Minimize2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Import components
import { Sidebar } from '@/components/sidebar'
import { DMSidebar } from '@/components/dm-sidebar'
import { FriendsPage } from '@/components/friends-page'
import { StorylinesPage } from '@/components/storylines-page'
import { StorylineInterior } from '@/components/storyline-interior'
import { PersonaForm } from '@/components/persona-form'
import { Persona, PersonaConnection, PersonalitySpectrums } from '@/stores/persona-store'
import { CharacterProfileModal } from '@/components/character-profile-modal'
import { WalletPage } from '@/components/wallet-page'
import { AdminPanel } from '@/components/admin-panel'
import { NotificationModal } from '@/components/notification-modal'

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
  bio: string | null
  username: string
  isOnline: boolean
  // Extended profile fields
  archetype: string | null
  gender: string | null
  age: number | null
  tags: string[]
  personalityDescription: string | null
  personalitySpectrums: {
    introvertExtrovert: number
    thinkingFeeling: number
    plannedSpontaneous: number
    reservedExpressive: number
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

interface Conversation {
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

// ==================== AUTH PAGE ====================
function AuthPage() {
  const { login, signup, setUser } = useAuth()
  
  const [signupForm, setSignupForm] = useState({ username: '', password: '', confirmPassword: '' })
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
      const data = await response.json()
      
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
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid security key')
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
                className="w-16 h-16 rounded-2xl shadow-lg shadow-purple-500/30 object-cover transform hover:scale-105 transition-transform"
              />
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-fuchsia-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-bold persona-gradient-text">Chrona</h1>
              <p className="text-purple-400/60 text-sm mt-1">Roleplay Universe</p>
            </div>
          </div>
          <p className="text-purple-300/50 text-sm">
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
                  <Label htmlFor="login-username" className="text-purple-200/80">Username</Label>
                  <Input id="login-username" type="text" placeholder="cooluser123" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} required className="persona-input h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-purple-200/80">Password</Label>
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
                  <Label htmlFor="signup-username" className="text-purple-200/80">Username</Label>
                  <Input id="signup-username" type="text" placeholder="cooluser123" value={signupForm.username} onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })} required className="persona-input h-11" />
                  <p className="text-xs text-purple-400/50">Letters, numbers, and underscores only. 3-20 characters.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-purple-200/80">Password</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} required className="persona-input h-11" />
                  <p className="text-xs text-purple-400/50">At least 6 characters.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm" className="text-purple-200/80">Confirm Password</Label>
                  <Input id="signup-confirm" type="password" placeholder="••••••••" value={signupForm.confirmPassword} onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} required className="persona-input h-11" />
                </div>
                <button type="submit" className="btn-persona w-full h-11 text-base font-medium flex items-center justify-center" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : <><Zap className="w-4 h-4 mr-2" />Create Account</>}
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Security Key Modal */}
      {showSecurityKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-[#150a25] to-[#0a0510] rounded-2xl border border-purple-500/20 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-purple-500/15 bg-gradient-to-r from-purple-900/30 to-fuchsia-900/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {isLoginFlow ? 'Security Verification' : 'Save Your Security Key'}
                  </h2>
                  <p className="text-sm text-purple-400/70">
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
                  <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-xs text-purple-400/60 mb-2 text-center">Your Security Key</p>
                    <div className="bg-black/30 rounded-lg p-3 font-mono text-xl text-center tracking-wider text-purple-100 select-all">
                      {securityKey}
                    </div>
                  </div>
                  
                  {/* Copy Button */}
                  <button 
                    onClick={copySecurityKey}
                    className="w-full py-2.5 rounded-lg border border-purple-500/20 text-sm text-purple-300 hover:bg-purple-500/10 transition-colors flex items-center justify-center gap-2"
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
                    <Label className="text-purple-200/80">Enter your security key</Label>
                    <Input 
                      type="text" 
                      placeholder="XXXX-XXXX-XXXX-XXXX" 
                      value={securityKeyInput}
                      onChange={(e) => setSecurityKeyInput(e.target.value.toUpperCase())}
                      className="persona-input h-12 text-center font-mono text-lg tracking-wider"
                      maxLength={19}
                    />
                    <p className="text-xs text-purple-400/50 text-center">
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
    </div>
  )
}

// ==================== MY PERSONAS MODAL ====================
function MyPersonasModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { personas, activePersona, isLoading, activatePersona, deletePersona, createPersona, updatePersona } = usePersonas()
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const handleActivate = async (id: string) => { try { await activatePersona(id) } catch (err) { console.error('Failed to activate:', err) } }
  const handleDelete = async (id: string) => { if (!confirm('Are you sure you want to delete this persona?')) return; setDeletingId(id); try { await deletePersona(id) } catch (err) { console.error('Failed to delete:', err) } finally { setDeletingId(null) } }
  
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
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="persona-modal max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="persona-modal-header flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold persona-gradient-text flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />
                My Characters
              </DialogTitle>
              <DialogDescription className="text-purple-400/60">
                Manage your character identities. Switch between characters to roleplay as different personas.
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
            ) : personas.length === 0 ? (
              <div className="persona-empty-state persona-card py-12">
                <div className="persona-empty-state-icon">
                  <User className="w-8 h-8" />
                </div>
                <p className="text-purple-200">You haven&apos;t created any characters yet.</p>
                <p className="text-purple-400/50 text-sm mt-1 mb-4">Create your first character to start roleplaying!</p>
                <button onClick={() => setShowCreateModal(true)} className="btn-persona flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Your First Character
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {personas.map((persona) => (
                  <div key={persona.id} className={`persona-card persona-card-hover p-4 ${persona.isActive ? 'border-purple-500/40 bg-purple-500/5' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Avatar className="w-14 h-14 border-2 border-purple-500/30">
                          <AvatarImage src={persona.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-lg font-semibold">{persona.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {persona.isActive && (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#1a1230] flex items-center justify-center"><Check className="w-3 h-3 text-white" /></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-purple-100 truncate">{persona.name}</h3>
                          {persona.isActive && <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Active</span>}
                        </div>
                        {persona.description && <p className="text-sm text-purple-400/60 mt-1 line-clamp-2">{persona.description}</p>}
                        {persona.archetype && <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300">{persona.archetype}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {!persona.isActive && (
                          <button onClick={() => handleActivate(persona.id)} className="btn-persona-ghost text-xs py-1.5 px-3 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Set Active
                          </button>
                        )}
                        <button onClick={() => setEditingPersona(persona)} className="w-9 h-9 rounded-lg flex items-center justify-center text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(persona.id)} disabled={deletingId === persona.id} className="w-9 h-9 rounded-lg flex items-center justify-center text-purple-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
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
            <div className="pt-4 border-t border-purple-500/15">
              <button onClick={() => setShowCreateModal(true)} className="btn-persona w-full flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Create New Character
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <PersonaForm 
        isOpen={showCreateModal || !!editingPersona} 
        onClose={() => { setShowCreateModal(false); setEditingPersona(null) }} 
        persona={editingPersona} 
        onSave={handleSavePersona} 
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
function ChatView({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const { user } = useAuth()
  const { activePersona, uploadAvatar } = usePersonas()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingPersona, setTypingPersona] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null) // Modal image viewer
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
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
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
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
          <div className="space-y-2 pb-4 max-w-[1100px] mx-auto w-full">
            {(() => {
              // Group consecutive messages from the same sender
              interface MessageGroup {
                sender: { id: string; name: string; avatarUrl: string | null }
                messages: ChatMessage[]
              }
              
              const groups: MessageGroup[] = []
              let currentGroup: MessageGroup | null = null
              
              messages.forEach((message) => {
                if (currentGroup && currentGroup.sender.id === message.senderId) {
                  // Add to current group
                  currentGroup.messages.push(message)
                } else {
                  // Start new group
                  if (currentGroup) groups.push(currentGroup)
                  currentGroup = {
                    sender: message.sender,
                    messages: [message]
                  }
                }
              })
              if (currentGroup) groups.push(currentGroup)
              
              return groups.map((group, groupIdx) => {
                const isMine = group.sender.id === activePersona?.id
                return (
                  <div key={`group-${groupIdx}`} className={`flex ${isMine ? 'justify-start' : 'justify-end'} persona-message`}>
                    <div className={`flex items-end gap-2.5 max-w-[75%] ${isMine ? '' : 'flex-row-reverse'}`}>
                      <Avatar className="w-8 h-8 border border-purple-500/30 flex-shrink-0">
                        <AvatarImage src={group.sender.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500/50 to-fuchsia-500/50 text-white text-sm font-medium">{group.sender.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1">
                        {group.messages.map((message, msgIdx) => {
                          const isLastInGroup = msgIdx === group.messages.length - 1
                          const isFirstInGroup = msgIdx === 0
                          return (
                            <div 
                              key={message.id} 
                              className={`px-4 py-2.5 ${
                                isMine 
                                  ? `bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white ${isFirstInGroup ? 'rounded-t-2xl' : 'rounded-t-md'} ${isLastInGroup ? 'rounded-b-2xl rounded-bl-md' : 'rounded-b-md'} shadow-lg shadow-purple-500/20` 
                                  : `persona-card text-white ${isFirstInGroup ? 'rounded-t-2xl' : 'rounded-t-md'} ${isLastInGroup ? 'rounded-b-2xl rounded-br-md' : 'rounded-b-md'}`
                              }`}
                            >
                              {isFirstInGroup && isMine && (
                                <p className="text-xs text-purple-200 mb-1 font-medium">{group.sender.name}</p>
                              )}
                              {message.imageUrl && (
                                <div className="mb-2">
                                  <img 
                                    src={message.imageUrl} 
                                    alt="Shared image" 
                                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-purple-500/20" 
                                    style={{ maxHeight: '300px', width: 'auto' }} 
                                    onClick={() => setViewingImage(message.imageUrl)} 
                                  />
                                </div>
                              )}
                              {message.content && (
                                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                  {parseMessageWithMarkdown(message.content, [conversation.otherPersona.username])}
                                </div>
                              )}
                              {isLastInGroup && (
                                <p className="text-xs opacity-50 mt-1">{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
            {isTyping && (
              <div className="flex justify-end persona-message">
                <div className="flex items-center gap-3 px-4 py-3 persona-card rounded-2xl rounded-br-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-purple-400/80">{typingPersona} is typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      {/* Message Input */}
      <div className="sticky bottom-0 p-4 border-t border-purple-500/15 bg-[#12091f]/80 backdrop-blur-sm">
        {!activePersona ? (
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
    </div>
  )
}

// ==================== HOME PAGE (Discovery) ====================
function HomePageContent({ onStartChat }: { onStartChat: (conv: Conversation) => void }) {
  const { user } = useAuth()
  const { personas, activePersona, isLoading: personasLoading, createPersona } = usePersonas()
  const [activeFilter, setActiveFilter] = useState('new')
  const [showPersonasModal, setShowPersonasModal] = useState(false)
  const [showCreatePersonaModal, setShowCreatePersonaModal] = useState(false)
  const [onlinePersonas, setOnlinePersonas] = useState<OnlinePersona[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(true)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [selectedPersona, setSelectedPersona] = useState<OnlinePersona | null>(null)
  
  useEffect(() => {
    async function fetchDiscovery() {
      try {
        const response = await fetch(`/api/discovery?filter=${activeFilter}`)
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
  }, [activeFilter])
  
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
    if (!activePersona) { alert('Please create and activate a persona first!'); return }
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPersonaId, myPersonaId: activePersona.id })
      })
      if (response.ok) {
        const data = await response.json()
        const convResponse = await fetch('/api/conversations')
        if (convResponse.ok) {
          const convData = await convResponse.json()
          setConversations(convData.conversations)
          const newConv = convData.conversations.find((c: Conversation) => c.id === data.conversation.id)
          if (newConv) onStartChat(newConv)
        }
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }
  
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
    <div className="flex flex-col h-full persona-bg">
      {/* Header */}
      <div className="h-14 border-b border-purple-500/15 flex items-center px-4 bg-[#12091f]/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-purple-100">Discover</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowPersonasModal(true)} className="btn-persona flex items-center gap-2 text-sm py-2">
            <User className="w-4 h-4" /> My Characters
          </button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {/* No Persona Warning */}
        {!personasLoading && personas.length === 0 && (
          <div className="persona-card persona-card-hover mb-6 p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 flex items-center justify-center border border-purple-500/20">
                <User className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-100">Create Your First Character</h3>
                <p className="text-purple-400/60 text-sm">You need a character to start chatting!</p>
              </div>
              <button onClick={() => setShowCreatePersonaModal(true)} className="btn-persona flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create
              </button>
            </div>
          </div>
        )}
        
        {/* Filter Tabs */}
        <div className="persona-tabs inline-flex mb-4">
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
        
        <p className="text-sm text-purple-400/60 mb-4 flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span>Showing personas that are currently online</span>
        </p>
        
        {/* Discovery Grid */}
        {isLoadingDiscovery ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="persona-card overflow-hidden animate-pulse">
                <div className="pt-4 pb-2 flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-purple-500/20" />
                </div>
                <div className="px-3 pb-3 text-center">
                  <div className="h-4 bg-purple-500/20 rounded w-3/4 mx-auto" />
                  <div className="h-3 bg-purple-500/10 rounded w-1/2 mx-auto mt-2" />
                  <div className="h-8 bg-purple-500/10 rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : onlinePersonas.length === 0 ? (
          <div className="persona-empty-state persona-card py-12">
            <div className="persona-empty-state-icon">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-purple-200">No one is online right now.</p>
            <p className="text-purple-400/60 text-sm mt-1">Check back later or invite friends!</p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {onlinePersonas.map((persona) => (
                <div 
                  key={persona.id} 
                  className="persona-card persona-card-hover overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedPersona(persona)}
                >
                  <div className="relative pt-4 pb-2 flex justify-center">
                    <div className="relative persona-status persona-status-online">
                      <Avatar className="w-16 h-16 border-2 border-purple-500/40 group-hover:border-purple-400/60 transition-colors">
                        <AvatarImage src={persona.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-xl font-semibold">{persona.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <div className="px-3 pb-3 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h3 className="font-medium text-purple-100 truncate text-sm cursor-help">{persona.name}</h3>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="persona-tooltip max-w-[200px] p-3">
                        <p className="font-medium text-purple-300 mb-1">{persona.name}</p>
                        <p className="text-xs text-purple-400/60">@{persona.username}</p>
                        {persona.bio && <p className="text-xs text-purple-300/70 mt-2 line-clamp-3">{persona.bio}</p>}
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-xs text-purple-400/50 mt-0.5 truncate">@{persona.username}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); startConversation(persona.id) }} 
                      className="btn-persona w-full mt-2 text-xs py-2"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" /> Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TooltipProvider>
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
    </div>
  )
}

// ==================== MAIN APP ====================
function MainApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'friends' | 'storylines' | 'chat' | 'wallet' | 'admin'>('home')
  const [activeChat, setActiveChat] = useState<Conversation | null>(null)
  const [activeStorylineId, setActiveStorylineId] = useState<string | null>(null)
  const [showCreatePersonaModal, setShowCreatePersonaModal] = useState(false)
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!(window as any).electronAPI)
  const { createPersona } = usePersonas()
  
  // Handle selecting a chat from sidebar
  const handleSelectChat = async (conversationId: string) => {
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        const conv = data.conversations.find((c: Conversation) => c.id === conversationId)
        if (conv) {
          setActiveChat(conv)
          setActiveTab('chat')
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
    setActiveTab('storylines')
  }
  
  // Handle starting a chat from discovery
  const handleStartChat = (conv: Conversation) => {
    setActiveChat(conv)
    setActiveTab('chat')
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
            setActiveTab(tab)
            setActiveStorylineId(null) // Clear storyline when switching tabs
            if (tab !== 'chat') setActiveChat(null)
          }}
          onSelectStoryline={handleSelectStoryline}
          onCreatePersona={() => setShowCreatePersonaModal(true)}
        />
        <DMSidebar
          activeChatId={activeChat?.id || null}
          onSelectChat={handleSelectChat}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeStorylineId ? (
          <StorylineInterior 
            storylineId={activeStorylineId} 
            onBack={() => setActiveStorylineId(null)} 
          />
        ) : activeTab === 'chat' && activeChat ? (
          <ChatView conversation={activeChat} onBack={() => { setActiveChat(null); setActiveTab('home') }} />
        ) : activeTab === 'friends' ? (
          <FriendsPage />
        ) : activeTab === 'storylines' ? (
          <StorylinesPage onViewStoryline={handleSelectStoryline} />
        ) : activeTab === 'wallet' ? (
          <WalletPage />
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