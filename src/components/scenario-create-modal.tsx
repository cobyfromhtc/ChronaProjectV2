'use client'

import React, { useState, useRef, useMemo, useEffect, useCallback, type ChangeEvent } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  X, Plus, Loader2, Upload, Image as ImageIcon, MapPin, Tag, Sparkles,
  MessageSquare, Shirt, ShieldCheck, ChevronRight, User, Lock
} from 'lucide-react'
import { useVariantAccent } from '@/lib/ui-variant-styles'
import { useToast } from '@/hooks/use-toast'
import { isAdult } from '@/lib/age-utils'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch } from '@/lib/api-client'

interface ScenarioCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  personas: { id: string; name: string; avatarUrl: string | null; mbtiType: string | null; archetype: string | null }[]
  preselectedPersonaId?: string | null
}

const CATEGORIES = [
  'Romance', 'Adventure', 'Drama', 'Fantasy', 'Sci-Fi', 'Horror', 'Mystery',
  'Comedy', 'Slice of Life', 'Thriller', 'Supernatural', 'Historical', 'Other'
]

const MOODS = ['Playful', 'Intense', 'Mysterious', 'Romantic', 'Dark', 'Wholesome', 'Chaotic', 'Melancholic']

const CONTENT_RATINGS = [
  { value: 'safe', label: 'Safe', desc: 'Family-friendly content', adultOnly: false },
  { value: 'moderate', label: 'Moderate', desc: 'Teen-appropriate themes', adultOnly: false },
  { value: 'mature', label: 'Mature', desc: 'Adult themes and content', adultOnly: true },
]

type FormSection = 'persona' | 'details' | 'messages' | 'images'

class NetworkError extends Error {
  constructor() {
    super('Network error')
    this.name = 'NetworkError'
  }
}

class JsonParseError extends Error {
  constructor() {
    super('JSON parse error')
    this.name = 'JsonParseError'
  }
}

export function ScenarioCreateModal({ isOpen, onClose, onCreated, personas, preselectedPersonaId }: ScenarioCreateModalProps) {
  const accent = useVariantAccent()
  const { toast } = useToast()
  const { user } = useAuth()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const charImageInputRef = useRef<HTMLInputElement>(null)

  // Determine if user is adult for age-gating
  const userIsAdult = user?.dateOfBirth ? isAdult(new Date(user.dateOfBirth)) : false

  // Filter available content ratings based on age
  const availableRatings = useMemo(() =>
    CONTENT_RATINGS.filter(r => !r.adultOnly || userIsAdult),
    [userIsAdult]
  )

  // Section navigation
  const [activeSection, setActiveSection] = useState<FormSection>('persona')

  // Form state
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(preselectedPersonaId || null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Romance')
  const [mood, setMood] = useState('')
  const [location, setLocation] = useState('')
  const [attire, setAttire] = useState('')
  const [contentRating, setContentRating] = useState('safe')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [initialMessages, setInitialMessages] = useState<string[]>([''])
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [charImageUrl, setCharImageUrl] = useState('')

  // Submission state
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  // Persona selection animation
  const [personaJustSelected, setPersonaJustSelected] = useState<string | null>(null)

  const sectionOrder: FormSection[] = ['persona', 'details', 'messages', 'images']
  const currentStepIndex = sectionOrder.indexOf(activeSection)
  const progressPercent = ((currentStepIndex + 1) / sectionOrder.length) * 100

  const sections: { id: FormSection; label: string; icon: React.ReactNode; completed: boolean }[] = [
    { id: 'persona', label: 'Persona', icon: <User className="w-4 h-4" />, completed: !!selectedPersonaId },
    { id: 'details', label: 'Details', icon: <Sparkles className="w-4 h-4" />, completed: title.trim().length > 0 },
    { id: 'messages', label: 'Greetings', icon: <MessageSquare className="w-4 h-4" />, completed: initialMessages.some(m => m.trim()) },
    { id: 'images', label: 'Images', icon: <ImageIcon className="w-4 h-4" />, completed: !!coverImageUrl || !!charImageUrl },
  ]

  // Auto-dismiss error after 10 seconds
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 10000)
    return () => clearTimeout(timer)
  }, [error])

  const handleSelectPersona = useCallback((personaId: string) => {
    setSelectedPersonaId(personaId)
    setPersonaJustSelected(personaId)
    setTimeout(() => setPersonaJustSelected(null), 600)
  }, [])

  const canCreate = selectedPersonaId && title.trim().length > 0

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && tags.length < 10 && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleAddMessage = () => {
    if (initialMessages.length < 5) {
      setInitialMessages([...initialMessages, ''])
    }
  }

  const handleRemoveMessage = (index: number) => {
    setInitialMessages(initialMessages.filter((_, i) => i !== index))
  }

  const handleUpdateMessage = (index: number, value: string) => {
    const updated = [...initialMessages]
    updated[index] = value
    setInitialMessages(updated)
  }

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, field: 'cover' | 'char') => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      }, 0)

      if (response.ok) {
        const data = await response.json()
        const url = data.url || data.avatarUrl
        if (field === 'cover') {
          setCoverImageUrl(url)
        } else {
          setCharImageUrl(url)
        }
      }
    } catch (err) {
      console.error('Upload failed:', err)
    }
  }

  const handleCreate = async () => {
    if (!canCreate) return

    setIsCreating(true)
    setError('')

    try {
      const body = {
        personaId: selectedPersonaId,
        title: title.trim(),
        description: description.trim() || null,
        category: category.toLowerCase().replace(/\s+/g, '-'),
        mood: mood || null,
        location: location.trim() || null,
        attire: attire.trim() || null,
        contentRating,
        tags: tags.length > 0 ? tags : null,
        initialMessages: initialMessages.some(m => m.trim()) ? initialMessages.filter(m => m.trim()) : null,
        bannerUrl: coverImageUrl || null,
        imageUrl: charImageUrl || null,
      }

      let response: Response
      try {
        response = await apiFetch('/api/scenarios', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      } catch (fetchErr) {
        // Network error — fetch itself threw (no response received)
        throw new NetworkError()
      }

      let data: Record<string, unknown>
      try {
        data = await response.json()
      } catch {
        // JSON parse error — server returned non-JSON response
        throw new JsonParseError()
      }

      if (response.ok) {
        toast({ title: 'Scenario Created!', description: `"${title}" is now live for everyone to discover.` })
        // Reset form
        setTitle('')
        setDescription('')
        setCategory('Romance')
        setMood('')
        setLocation('')
        setAttire('')
        setContentRating('safe')
        setTags([])
        setTagInput('')
        setInitialMessages([''])
        setCoverImageUrl('')
        setCharImageUrl('')
        setSelectedPersonaId(preselectedPersonaId || null)
        setActiveSection('persona')
        onCreated()
        onClose()
      } else {
        // API validation error — show the specific error message from the server
        const serverError = typeof data.error === 'string' ? data.error : typeof data.message === 'string' ? data.message : ''
        setError(serverError || 'Failed to create scenario. Please try again.')
      }
    } catch (err) {
      if (err instanceof NetworkError) {
        setError('Network error. Please check your connection and try again.')
      } else if (err instanceof JsonParseError) {
        setError('Server returned an unexpected response. Please try again.')
      } else {
        console.error('Failed to create scenario:', err)
        setError('Failed to create scenario. Please try again.')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 bg-gradient-to-b from-[#0d0f14] to-[#0a0c10] border-white/[0.08]">
        {/* Keyframes for persona selection animation */}
        <style>{`
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes drawCheck {
            0% { stroke-dashoffset: 24; opacity: 0; }
            30% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
        `}</style>
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle className={`text-xl font-bold bg-gradient-to-r ${accent.from} ${accent.to} bg-clip-text text-transparent flex items-center gap-2`}>
            <Sparkles className="w-5 h-5 text-slate-400" />
            Create Scenario
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Create a scenario card based on your persona. Other users can browse and chat with your character!
          </DialogDescription>
          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${accent.from} ${accent.to} transition-all duration-500 ease-out`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 flex-shrink-0">{currentStepIndex + 1}/{sectionOrder.length}</span>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-white/[0.04]">
          {/* Left nav */}
          <div className="w-36 border-r border-white/[0.06] py-4 px-2 flex-shrink-0 overflow-y-auto hidden sm:block">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all mb-1 ${
                  activeSection === section.id
                    ? `${accent.bgTint} ${accent.text} ${accent.borderSubtle} border`
                    : section.completed
                      ? 'text-slate-300 hover:text-slate-100 hover:bg-white/[0.03]'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                {section.completed && activeSection !== section.id ? (
                  <div className={`w-4 h-4 rounded-full ${accent.bgSolid} flex items-center justify-center flex-shrink-0`}>
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ) : (
                  section.icon
                )}
                {section.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 scroll-smooth custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
            {error && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="flex-1">{error}</span>
                <button
                  onClick={handleCreate}
                  disabled={!canCreate || isCreating}
                  className="shrink-0 px-3 py-1 rounded-md text-xs font-medium bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 hover:border-red-500/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Retrying...' : 'Retry'}
                </button>
                <button
                  onClick={() => setError('')}
                  className="shrink-0 text-red-400/60 hover:text-red-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Persona Selection */}
            {activeSection === 'persona' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-200 text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-400" />
                    Select Persona <span className="text-red-400">*</span>
                  </Label>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    Choose which character this scenario is based on.
                  </p>
                </div>

                {personas.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <User className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400">No personas found.</p>
                    <p className="text-xs text-slate-500">Create a character first!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {personas.map(persona => (
                      <button
                        key={persona.id}
                        onClick={() => handleSelectPersona(persona.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                          selectedPersonaId === persona.id
                            ? `${accent.borderMedium} ${accent.bgTint} border`
                            : 'border-white/[0.06] hover:border-white/[0.12] bg-white/[0.01]'
                        }`}
                      >
                        <Avatar className="w-10 h-10 border border-white/[0.1]">
                          <AvatarImage src={persona.avatarUrl || undefined} />
                          <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-sm font-semibold`}>
                            {persona.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-100 truncate">{persona.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {persona.mbtiType && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-fuchsia-500/15 text-fuchsia-300/80 border border-fuchsia-500/20">
                                {persona.mbtiType}
                              </span>
                            )}
                            {persona.archetype && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-teal-500/15 text-teal-300/80 border border-teal-500/20">
                                {persona.archetype}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedPersonaId === persona.id && (
                          <div className={`w-5 h-5 rounded-full ${accent.bgSolid} flex items-center justify-center flex-shrink-0 ${personaJustSelected === persona.id ? 'animate-[scaleIn_0.3s_ease-out]' : ''}`}>
                            <svg className={`w-3 h-3 text-white ${personaJustSelected === persona.id ? 'animate-[drawCheck_0.4s_ease-out_0.1s_both]' : ''}`} viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mobile section nav */}
                <div className="flex sm:hidden mt-4">
                  <button
                    onClick={() => setActiveSection('details')}
                    disabled={!selectedPersonaId}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedPersonaId
                        ? `bg-gradient-to-r ${accent.from} ${accent.to} text-white`
                        : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Next: Details <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Scenario Details */}
            {activeSection === 'details' && (
              <div className="space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">
                    Title <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    placeholder="Your nerdy classmate wants to be your friend..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                    className="bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus:border-teal-500/30"
                    maxLength={100}
                  />
                  <p className="text-xs text-slate-400">{title.length}/100 characters</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">Description</Label>
                  <Textarea
                    placeholder="Describe the scenario in detail. What's the setting? What's happening? Why is this interesting?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                    className="bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus:border-teal-500/30 min-h-[100px] resize-y"
                    maxLength={2000}
                  />
                  <p className="text-xs text-slate-400">{description.length}/2000 characters</p>
                </div>

                {/* Category + Mood row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-slate-200 text-sm font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      Category
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-slate-100 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0d0f14] border-white/[0.08]">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-slate-200 focus:bg-white/[0.05] focus:text-slate-100">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200 text-sm font-medium">Mood</Label>
                    <Select value={mood} onValueChange={setMood}>
                      <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-slate-100 w-full">
                        <SelectValue placeholder="Select mood..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0d0f14] border-white/[0.08]">
                        {MOODS.map(m => (
                          <SelectItem key={m} value={m.toLowerCase()} className="text-slate-200 focus:bg-white/[0.05] focus:text-slate-100">
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Location + Attire row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-slate-200 text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-400" />
                      Location
                    </Label>
                    <Input
                      placeholder="High school rooftop..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value.slice(0, 200))}
                      className="bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200 text-sm font-medium flex items-center gap-1.5">
                      <Shirt className="w-3.5 h-3.5 text-teal-400" />
                      Attire
                    </Label>
                    <Input
                      placeholder="School uniform, glasses..."
                      value={attire}
                      onChange={(e) => setAttire(e.target.value.slice(0, 500))}
                      className="bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600"
                      maxLength={500}
                    />
                  </div>
                </div>

                {/* Content Rating */}
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    Content Rating
                  </Label>
                  <div className="flex gap-2">
                    {CONTENT_RATINGS.map(rating => {
                      const isLocked = rating.adultOnly && !userIsAdult
                      return (
                        <button
                          key={rating.value}
                          onClick={() => !isLocked && setContentRating(rating.value)}
                          disabled={isLocked}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all ${
                            isLocked
                              ? 'border-white/[0.04] bg-white/[0.01] text-slate-600 cursor-not-allowed opacity-50'
                              : contentRating === rating.value
                                ? `${accent.borderMedium} ${accent.bgTint} ${accent.text} border`
                                : 'border-white/[0.06] text-slate-400 hover:border-white/[0.12] bg-white/[0.01]'
                          }`}
                        >
                          <div className="font-medium flex items-center gap-1.5 justify-center">
                            {isLocked && <Lock className="w-3 h-3" />}
                            {rating.label}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {isLocked ? '18+ only' : rating.desc}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {!userIsAdult && (
                    <p className="text-[11px] text-amber-400/70 flex items-center gap-1 mt-1">
                      <Lock className="w-3 h-3" />
                      Mature content is restricted to users 18 and older
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-teal-400" />
                    Tags <span className="text-slate-500 font-normal">(max 10)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                      className="bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600 flex-1"
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || tags.length >= 10}
                      className={`px-3 py-2 rounded-lg border transition-all ${
                        tagInput.trim() && tags.length < 10
                          ? `${accent.borderSubtle} ${accent.text} ${accent.bgTint} border`
                          : 'border-white/[0.06] text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${accent.bgTint} ${accent.text} ${accent.borderSubtle} border`}
                        >
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="hover:text-white transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mobile nav */}
                <div className="flex sm:hidden gap-2 mt-4">
                  <button
                    onClick={() => setActiveSection('persona')}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setActiveSection('messages')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${accent.from} ${accent.to} text-white`}
                  >
                    Next: Greetings <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Initial Messages */}
            {activeSection === 'messages' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-200 text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-400" />
                    Greeting Messages
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    These messages will be shown to users when they start chatting with your character. They can pick which greeting to start from.
                  </p>
                </div>

                <div className="space-y-3">
                  {initialMessages.map((msg, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Message {index + 1}</span>
                        {index > 0 && (
                          <button
                            onClick={() => handleRemoveMessage(index)}
                            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <Textarea
                        placeholder={index === 0 ? "Hey! I noticed you're new here..." : "Another greeting option..."}
                        value={msg}
                        onChange={(e) => handleUpdateMessage(index, e.target.value.slice(0, 2000))}
                        className="bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus:border-teal-500/30 min-h-[70px] resize-y"
                        maxLength={2000}
                      />
                      <div className={`text-[11px] flex justify-end ${msg.length > 1900 ? 'text-amber-400' : msg.length >= 2000 ? 'text-red-400' : 'text-slate-500'}`}>
                        {msg.length}/2000
                      </div>
                    </div>
                  ))}
                </div>

                {initialMessages.length < 5 && (
                  <button
                    onClick={handleAddMessage}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${accent.bgTint} ${accent.text} ${accent.borderSubtle} border hover:brightness-110 transition-all`}
                  >
                    <Plus className="w-4 h-4" />
                    Add Greeting
                  </button>
                )}

                {/* Mobile nav */}
                <div className="flex sm:hidden gap-2 mt-4">
                  <button
                    onClick={() => setActiveSection('details')}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setActiveSection('images')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${accent.from} ${accent.to} text-white`}
                  >
                    Next: Images <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Images */}
            {activeSection === 'images' && (
              <div className="space-y-5">
                {/* Cover Image */}
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                    Cover Image
                  </Label>
                  <p className="text-xs text-slate-500">Banner image for the scenario card. Recommended: 1200x400px</p>
                  {coverImageUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-white/[0.08]">
                      <img src={coverImageUrl} alt="Cover" className="w-full h-32 object-cover" />
                      <button
                        onClick={() => setCoverImageUrl('')}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500/60 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      className="w-full h-32 rounded-lg border-2 border-dashed border-white/[0.08] hover:border-teal-500/30 bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-teal-400"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">Upload cover image</span>
                    </button>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} className="hidden" />
                </div>

                {/* Character Image */}
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-400" />
                    Character Image
                  </Label>
                  <p className="text-xs text-slate-500">Overrides the persona avatar for this scenario. Recommended: 400x400px</p>
                  {charImageUrl ? (
                    <div className="relative inline-block">
                      <img src={charImageUrl} alt="Character" className="w-20 h-20 rounded-lg object-cover border border-white/[0.08]" />
                      <button
                        onClick={() => setCharImageUrl('')}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500/60 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => charImageInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-white/[0.08] hover:border-teal-500/30 bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-teal-400"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[9px]">Upload</span>
                    </button>
                  )}
                  <input ref={charImageInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'char')} className="hidden" />
                </div>

                {/* Mobile nav */}
                <div className="flex sm:hidden gap-2 mt-4">
                  <button
                    onClick={() => setActiveSection('messages')}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06]"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] flex-shrink-0">
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || isCreating}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              canCreate && !isCreating
                ? `bg-gradient-to-r ${accent.from} ${accent.to} text-white hover:opacity-90 shadow-lg ${accent.shadowGlow}`
                : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
            }`}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Create Scenario
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
