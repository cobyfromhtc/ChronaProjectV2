'use client'

import React, { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useVariantAccent } from '@/lib/ui-variant-styles'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api-client'
import { CATEGORY_GRADIENTS } from '@/lib/scenario-constants'
import {
  Bot, Check, Loader2, MapPin, MessageCircle, Send, Sparkles, X,
  ArrowRight, PartyPopper
} from 'lucide-react'

// =============================================================
// Scenario Request Modal — the Personas-tab "Chat" flow
// =============================================================
// Chatting with someone else's persona from Discover > Personas goes through
// scenarios: the requester crafts the opening scene around their own active
// persona, previews it live, and sends it as a request. Blorp delivers the
// request to the persona's owner, who can Accept (conversation created) or
// Decline from their notification.

export interface ScenarioRequestTarget {
  id: string
  name: string
  avatarUrl: string | null
  username: string
}

interface ScenarioRequestModalProps {
  isOpen: boolean
  onClose: () => void
  target: ScenarioRequestTarget | null
  /** The requester's persona (who they speak as) */
  myPersona: { id: string; name: string; avatarUrl: string | null } | null
  /** Fired when a conversation already exists (opens the chat right away) */
  onOpenConversation: (conversationId: string) => void
  onRequestSent?: () => void
}

const CATEGORIES = [
  { value: 'romance', label: 'Romance' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'drama', label: 'Drama' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'slice-of-life', label: 'Slice of Life' },
  { value: 'supernatural', label: 'Supernatural' },
  { value: 'other', label: 'Other' },
]

const MOODS = ['Playful', 'Intense', 'Mysterious', 'Romantic', 'Dark', 'Wholesome', 'Chaotic', 'Melancholic']

type Phase = 'compose' | 'sending' | 'sent'

export function ScenarioRequestModal({ isOpen, onClose, target, myPersona, onOpenConversation, onRequestSent }: ScenarioRequestModalProps) {
  const accent = useVariantAccent()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [openingMessage, setOpeningMessage] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState('romance')
  const [mood, setMood] = useState('')
  const [location, setLocation] = useState('')
  const [phase, setPhase] = useState<Phase>('compose')
  const [error, setError] = useState('')

  const categoryGradient = CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS['other']

  const canSend = useMemo(
    () => !!(myPersona && target && title.trim().length >= 3 && (description.trim() || openingMessage.trim())),
    [myPersona, target, title, description, openingMessage]
  )

  const resetAndClose = () => {
    onClose()
    // Reset after the close animation starts
    setTimeout(() => {
      setPhase('compose')
      setTitle('')
      setDescription('')
      setOpeningMessage('')
      setNote('')
      setCategory('romance')
      setMood('')
      setLocation('')
      setError('')
    }, 200)
  }

  const handleSend = async () => {
    if (!myPersona || !target || !canSend) return
    setPhase('sending')
    setError('')
    try {
      // 1. Create the scenario (private — crafted for this one partner)
      const scenarioRes = await apiFetch('/api/scenarios', {
        method: 'POST',
        body: JSON.stringify({
          personaId: myPersona.id,
          title: title.trim(),
          description: description.trim() || null,
          category,
          mood: mood || null,
          location: location.trim() || null,
          initialMessages: openingMessage.trim() ? [openingMessage.trim()] : null,
          isPublic: false,
        }),
      })
      const scenarioData = await scenarioRes.json()
      if (!scenarioRes.ok) {
        throw new Error(scenarioData.error || 'Failed to create the scenario')
      }

      // 2. Send the request to the persona's owner
      const requestRes = await apiFetch('/api/scenario-requests', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: scenarioData.scenario.id,
          fromPersonaId: myPersona.id,
          toPersonaId: target.id,
          message: note.trim() || null,
        }),
      })
      const requestData = await requestRes.json()
      if (!requestRes.ok) {
        throw new Error(requestData.error || 'Failed to send the request')
      }

      // If they already have a conversation, just open it
      if (requestData.alreadyExists && requestData.conversationId) {
        toast({
          title: 'You already have a conversation',
          description: `Opening your existing chat with ${target.name}.`,
        })
        onOpenConversation(requestData.conversationId)
        resetAndClose()
        return
      }

      setPhase('sent')
      onRequestSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('compose')
    }
  }

  if (!target) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0d0f14] border-white/[0.08] p-0 gap-0">
        {phase === 'sent' ? (
          /* ── Success state ─────────────────────────────────────── */
          <div className="p-8 text-center">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 -m-3 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                <PartyPopper className="w-9 h-9 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Scenario request sent!</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
              <span className="inline-flex items-center gap-1 font-semibold text-violet-300">
                <Bot className="w-3.5 h-3.5" /> Blorp
              </span>{' '}
              is delivering your scenario <span className="font-semibold text-slate-200">“{title.trim()}”</span> to{' '}
              <span className="font-semibold text-slate-200">@{target.username}</span>.
            </p>
            <div className="mt-4 mx-auto max-w-sm rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-left">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-violet-300" />
                </span>
                <p className="leading-relaxed">
                  <span className="text-slate-200">“{myPersona?.name} is asking trying to Start a scenario with you”</span> — @{target.username} will see your scenario&apos;s details and can Accept or Decline.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              You&apos;ll get a notification the moment they respond.
            </p>
            <button
              onClick={resetAndClose}
              className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r ${accent.from} ${accent.to} text-white hover:opacity-90 transition-all`}
            >
              <Check className="w-4 h-4" /> Done
            </button>
          </div>
        ) : (
          /* ── Compose state ─────────────────────────────────────── */
          <>
            <DialogHeader className="px-5 pt-5 pb-0">
              <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-100">
                Start a Scenario
                <span className="text-slate-500 font-normal">with</span>
                <span className="flex items-center gap-1.5 min-w-0">
                  <Avatar className="w-6 h-6 border border-white/15">
                    <AvatarImage src={target.avatarUrl || undefined} />
                    <AvatarFallback className="bg-teal-500/20 text-teal-300 text-[10px] font-bold">
                      {target.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-teal-300">{target.name}</span>
                </span>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs leading-relaxed">
                Chats from Discover begin with a scenario. Craft the opening scene —{' '}
                <span className="text-slate-300">@{target.username}</span> will review it through Blorp and can accept or decline to engage.
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 pt-3 grid md:grid-cols-[1fr_240px] gap-5">
              {/* ── Left: form ── */}
              <div className="space-y-4 min-w-0">
                {/* Speaking as */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex-shrink-0">Speaking as</span>
                  <Avatar className="w-7 h-7 border border-white/15">
                    <AvatarImage src={myPersona?.avatarUrl || undefined} />
                    <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-[10px] font-bold`}>
                      {(myPersona?.name || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-slate-200 truncate">{myPersona?.name || 'No persona'}</span>
                  {!myPersona && (
                    <span className="text-[10px] text-rose-400 ml-auto">Activate a character first</span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">
                    Scenario title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    placeholder={`e.g. A chance meeting with ${target.name}…`}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/10 transition-all"
                  />
                </div>

                {/* Category chips */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                          category === cat.value
                            ? `${accent.bgTint} ${accent.text} ${accent.borderSubtle}`
                            : 'border-white/[0.08] text-slate-400 bg-white/[0.02] hover:bg-white/[0.05] hover:text-slate-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood chips */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Mood</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MOODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMood(mood === m ? '' : m)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                          mood === m
                            ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                            : 'border-white/[0.08] text-slate-400 bg-white/[0.02] hover:bg-white/[0.05] hover:text-slate-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Location <span className="text-slate-600">(optional)</span></label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. The Lantern District, midnight rain…"
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/10 transition-all"
                  />
                </div>

                {/* Opening scene */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">
                    Opening scene <span className="text-rose-400">*</span>{' '}
                    <span className="text-slate-600">— the scenario&apos;s description @{target.username} will read</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder={`Set the stage: where are you and ${target.name}, what's happening, what's the mood?`}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/10 transition-all resize-none custom-scrollbar"
                  />
                </div>

                {/* First message */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">
                    Your opening message <span className="text-slate-600">(sent when they accept)</span>
                  </label>
                  <textarea
                    value={openingMessage}
                    onChange={(e) => setOpeningMessage(e.target.value)}
                    maxLength={2000}
                    rows={2}
                    placeholder={`What does ${myPersona?.name || 'your character'} say or do first?`}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/10 transition-all resize-none custom-scrollbar"
                  />
                </div>

                {/* Note to owner */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">
                    Note to @{target.username} <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={200}
                    placeholder="Anything you'd like to say to the persona's owner…"
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/10 transition-all"
                  />
                </div>
              </div>

              {/* ── Right: live preview ── */}
              <div className="md:sticky md:top-0 self-start">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Live preview
                </p>
                <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#0d0f14] shadow-xl shadow-black/30">
                  {/* Banner */}
                  <div className={`h-20 bg-gradient-to-br ${categoryGradient} relative`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-[#0d0f14]/30 to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5">
                      <p className="text-sm font-bold text-white truncate leading-tight">
                        {title.trim() || 'Untitled scenario'}
                      </p>
                      <p className="text-[10px] text-slate-300/80">
                        {CATEGORIES.find(c => c.value === category)?.label}
                        {mood && ` · ${mood}`}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    {location.trim() && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" /> {location.trim()}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 line-clamp-4 leading-relaxed min-h-[2.5rem]">
                      {description.trim() || 'Your opening scene will appear here as you write it…'}
                    </p>
                    {openingMessage.trim() && (
                      <div className="flex gap-1.5 px-2 py-1.5 rounded-lg bg-black/30 border border-white/[0.05]">
                        <MessageCircle className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-400 italic line-clamp-2 leading-relaxed">
                          {openingMessage.trim()}
                        </p>
                      </div>
                    )}
                    {/* From → to */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/[0.05]">
                      <Avatar className="w-5 h-5 border border-white/10">
                        <AvatarImage src={myPersona?.avatarUrl || undefined} />
                        <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-[9px] font-bold`}>
                          {(myPersona?.name || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-slate-400 truncate">{myPersona?.name || 'You'}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                      <Avatar className="w-5 h-5 border border-white/10">
                        <AvatarImage src={target.avatarUrl || undefined} />
                        <AvatarFallback className="bg-teal-500/20 text-teal-300 text-[9px] font-bold">
                          {target.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-slate-400 truncate">{target.name}</span>
                    </div>
                  </div>
                </div>

                {/* Blorp delivery note */}
                <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl border border-violet-500/20 bg-violet-500/[0.06]">
                  <span className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-violet-300" />
                  </span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Blorp will deliver this to <span className="text-slate-300 font-medium">@{target.username}</span> —
                    they&apos;ll see the scenario details and can <span className="text-emerald-400">Accept</span> to start the conversation or <span className="text-rose-400">Decline</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/[0.06] bg-white/[0.01]">
              {error && (
                <p className="text-xs text-rose-400 mb-3 flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" /> {error}
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500">
                  {canSend
                    ? 'Ready to send — the scenario is created privately for this chat.'
                    : 'Add a title and an opening scene to continue.'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetAndClose}
                    disabled={phase === 'sending'}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!canSend || phase === 'sending'}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r ${accent.from} ${accent.to} text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg`}
                  >
                    {phase === 'sending'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                      : <><Send className="w-4 h-4" /> Send Request</>}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
