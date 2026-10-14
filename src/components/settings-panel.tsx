'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/use-auth'
import { useUIVariant, UI_VARIANT_INFO, type UIVariant } from '@/stores/ui-variant-store'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import {
  X, Settings, Palette, Bell, Shield, User, Moon, Sun,
  Check, Loader2, Eye, EyeOff, LogOut, KeyRound, Monitor
} from 'lucide-react'

// =============================================================
// Chrona Settings Panel
// =============================================================
// A comprehensive settings modal with tabs for:
//   - Appearance (UI variant, theme color, navigation mode)
//   - Notifications (DM, storyline, mention preferences)
//   - Privacy (content maturity, blocked users)
//   - Account (security key, logout)
// =============================================================

type Tab = 'appearance' | 'notifications' | 'privacy' | 'account'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  onLogout?: () => void
  onRevealSecurityKey?: () => void
}

export function SettingsPanel({ open, onClose, onLogout, onRevealSecurityKey }: SettingsPanelProps) {
  const { user } = useAuth()
  const { variant, setVariant } = useUIVariant()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('appearance')
  const [contentMaturity, setContentMaturity] = useState(user?.contentMaturity || 'safe')
  const [theme, setTheme] = useState(user?.theme || 'dark')
  const [navigationMode, setNavigationMode] = useState(user?.navigationMode || 'static')
  const [isUpdating, setIsUpdating] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({
    dmMessages: true,
    storylineMessages: true,
    mentions: true,
    friendRequests: true,
    marketplace: false,
    soundEnabled: false,
  })

  // Load preferences from localStorage
  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem('chrona-notif-prefs')
        if (stored) setNotifPrefs(JSON.parse(stored))
      } catch {}
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const saveNotifPrefs = useCallback((prefs: typeof notifPrefs) => {
    setNotifPrefs(prefs)
    try { localStorage.setItem('chrona-notif-prefs', JSON.stringify(prefs)) } catch {}
    toast({ title: 'Notification preferences saved', variant: 'default' })
  }, [toast])

  const updateContentMaturity = async (maturity: string) => {
    setIsUpdating(true)
    try {
      const resp = await apiFetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentMaturity: maturity }),
      })
      if (resp.ok) {
        setContentMaturity(maturity)
        toast({ title: 'Content maturity updated', variant: 'default' })
      }
    } catch (e) {
      toast({ title: 'Failed to update', variant: 'destructive' })
    } finally {
      setIsUpdating(false)
    }
  }

  const updateTheme = async (newTheme: string) => {
    setIsUpdating(true)
    try {
      const resp = await apiFetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      })
      if (resp.ok) {
        setTheme(newTheme)
        // Apply theme to document
        const root = document.documentElement
        root.classList.remove('theme-dark', 'theme-midnight', 'theme-forest', 'theme-light', 'dark')
        root.classList.add(`theme-${newTheme}`)
        if (newTheme !== 'light') root.classList.add('dark')
        try { localStorage.setItem('chrona-theme', newTheme) } catch {}
        toast({ title: 'Theme updated', variant: 'default' })
      }
    } catch (e) {
      toast({ title: 'Failed to update theme', variant: 'destructive' })
    } finally {
      setIsUpdating(false)
    }
  }

  const updateNavigationMode = async (mode: string) => {
    setIsUpdating(true)
    try {
      const resp = await apiFetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ navigationMode: mode }),
      })
      if (resp.ok) {
        setNavigationMode(mode)
        window.dispatchEvent(new CustomEvent('chrona:navigation-mode-changed', { detail: { mode } }))
        toast({ title: 'Navigation mode updated', variant: 'default' })
      }
    } catch (e) {
      toast({ title: 'Failed to update', variant: 'destructive' })
    } finally {
      setIsUpdating(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'account', label: 'Account', icon: User },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-popover border border-border shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
        style={{ animation: 'fadeInScale 0.18s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Settings className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Settings</h2>
              <p className="text-[11px] text-muted-foreground">Customize your Chrona experience</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs + Content */}
        <div className="flex flex-1 min-h-0">
          {/* Tab sidebar */}
          <div className="w-40 sm:w-48 border-r border-border bg-card/30 flex-shrink-0 p-2 overflow-y-auto custom-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            {isUpdating && (
              <div className="absolute top-2 right-4 flex items-center gap-1.5 text-xs text-primary">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-1">UI Variant</h3>
                  <p className="text-xs text-muted-foreground mb-3">Choose the overall layout style</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(UI_VARIANT_INFO) as UIVariant[]).map((v) => {
                      const info = UI_VARIANT_INFO[v]
                      const active = variant === v
                      return (
                        <button
                          key={v}
                          onClick={() => { setVariant(v); toast({ title: `Switched to ${info.name}`, variant: 'default' }) }}
                          className={`relative p-3 rounded-xl border text-left transition-all hover:-translate-y-0.5 ${
                            active ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{info.icon}</span>
                            <span className="text-sm font-medium text-foreground">{info.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">{info.description}</p>
                          {active && (
                            <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Theme Color</h3>
                  <p className="text-xs text-muted-foreground mb-3">Background color scheme</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'dark', label: 'Dark', icon: Moon, color: 'bg-slate-900' },
                      { id: 'midnight', label: 'Midnight', icon: Moon, color: 'bg-indigo-950' },
                      { id: 'forest', label: 'Forest', icon: Monitor, color: 'bg-emerald-950' },
                      { id: 'light', label: 'Light', icon: Sun, color: 'bg-slate-100' },
                    ].map((t) => {
                      const Icon = t.icon
                      const active = theme === t.id
                      return (
                        <button
                          key={t.id}
                          onClick={() => updateTheme(t.id)}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all hover:-translate-y-0.5 ${
                            active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full ${t.color} border border-white/20 flex items-center justify-center`}>
                            <Icon className="w-3.5 h-3.5 text-white/80" />
                          </div>
                          <span className="text-[11px] font-medium text-foreground">{t.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Navigation Mode</h3>
                  <p className="text-xs text-muted-foreground mb-3">How the main navigation is displayed</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'static', label: 'Sidebar', desc: 'Persistent left sidebar' },
                      { id: 'linear', label: 'Topbar', desc: 'Top navigation + DM rail' },
                    ].map((m) => {
                      const active = navigationMode === m.id
                      return (
                        <button
                          key={m.id}
                          onClick={() => updateNavigationMode(m.id)}
                          className={`p-3 rounded-lg border text-left transition-all hover:-translate-y-0.5 ${
                            active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground">{m.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Notification Preferences</h3>
                {[
                  { key: 'dmMessages', label: 'Direct Messages', desc: 'When you receive a new DM' },
                  { key: 'storylineMessages', label: 'Storyline Messages', desc: 'Messages in joined storyline channels' },
                  { key: 'mentions', label: 'Mentions', desc: 'When someone @mentions you' },
                  { key: 'friendRequests', label: 'Friend Requests', desc: 'When you receive a friend request' },
                  { key: 'marketplace', label: 'Marketplace Updates', desc: 'Purchases and listing activity' },
                  { key: 'soundEnabled', label: 'Sound Effects', desc: 'Play a sound for new messages' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                      onClick={() => saveNotifPrefs({ ...notifPrefs, [item.key]: !notifPrefs[item.key as keyof typeof notifPrefs] })}
                      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
                        notifPrefs[item.key as keyof typeof notifPrefs] ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        notifPrefs[item.key as keyof typeof notifPrefs] ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </label>
                ))}
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-5">
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Content Maturity</h3>
                  <p className="text-xs text-muted-foreground mb-3">Control what content is visible to you</p>
                  <div className="space-y-2">
                    {[
                      { id: 'safe', label: 'Safe', desc: 'Only SFW content — no adult themes' },
                      { id: 'mature', label: 'Moderate', desc: 'Mild mature themes, no explicit content' },
                      { id: 'unrestricted', label: 'Adult', desc: 'All content including explicit (18+ only)' },
                    ].map((m) => {
                      const active = contentMaturity === m.id
                      const disabled = m.id === 'unrestricted' && user?.dateOfBirth ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear() < 18 : false
                      return (
                        <button
                          key={m.id}
                          disabled={disabled}
                          onClick={() => updateContentMaturity(m.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                            active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
                          </div>
                          {active && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Blocked Users</h3>
                  <p className="text-xs text-muted-foreground mb-3">Manage users you've blocked</p>
                  <button
                    onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('chrona:open-friends')) }}
                    className="w-full p-3 rounded-lg border border-border bg-card hover:border-primary/40 text-left text-sm text-foreground transition-colors"
                  >
                    Manage blocked users in Friends page →
                  </button>
                </section>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-5">
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Profile</h3>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user?.username || 'Unknown'}</p>
                      <p className="text-[11px] text-muted-foreground">Role: {user?.role || 'member'}</p>
                    </div>
                    <button
                      onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('chrona:open-edit-profile')) }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Security</h3>
                  <button
                    onClick={() => { onClose(); onRevealSecurityKey?.() }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Security Key</p>
                      <p className="text-[11px] text-muted-foreground">Reveal your account recovery key</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('chrona:open-shortcuts')) }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors text-left mt-2"
                  >
                    <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <Command className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Keyboard Shortcuts</p>
                      <p className="text-[11px] text-muted-foreground">View available shortcuts (press ?)</p>
                    </div>
                  </button>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Session</h3>
                  <button
                    onClick={() => { onLogout?.(); onClose() }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                      <LogOut className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-rose-400">Log Out</p>
                      <p className="text-[11px] text-muted-foreground">Sign out of your account</p>
                    </div>
                  </button>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
