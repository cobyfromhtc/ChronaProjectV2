'use client'

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  X, Plus, Loader2, Upload, Image as ImageIcon, MapPin, Tag, Sparkles,
  MessageSquare, Shirt, ShieldCheck, ChevronRight, ChevronLeft, User, Lock,
  Check, Flame, Eye
} from 'lucide-react'
import { useVariantAccent } from '@/lib/ui-variant-styles'
import { useToast } from '@/hooks/use-toast'
import { isAdult } from '@/lib/age-utils'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch } from '@/lib/api-client'
import {
  CATEGORY_COLORS,
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
} from '@/lib/scenario-constants'

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

type FormStep = 'basics' | 'details' | 'images' | 'visibility'

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

  // Step navigation
  const [activeStep, setActiveStep] = useState<FormStep>('basics')

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
  const [allowTrending, setAllowTrending] = useState(false)

  // Drag & drop state
  const [dragField, setDragField] = useState<'cover' | 'char' | null>(null)
  const [uploadingField, setUploadingField] = useState<'cover' | 'char' | null>(null)

  // Submission state
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [stepError, setStepError] = useState('')

  const sectionOrder: FormStep[] = ['basics', 'details', 'images', 'visibility']
  const currentStepIndex = sectionOrder.indexOf(activeStep)
  const progressPercent = ((currentStepIndex + 1) / sectionOrder.length) * 100

  const selectedPersona = personas.find(p => p.id === selectedPersonaId) || null
  const categorySlug = category.toLowerCase().replace(/\s+/g, '-')

  const steps: { id: FormStep; num: number; label: string; shortLabel: string; icon: React.ReactNode; completed: boolean }[] = [
    { id: 'basics', num: 1, label: 'Scenario Basics', shortLabel: 'Basics', icon: <User className="w-4 h-4" />, completed: !!selectedPersonaId && title.trim().length > 0 },
    { id: 'details', num: 2, label: 'Details & Mood', shortLabel: 'Details', icon: <Sparkles className="w-4 h-4" />, completed: mood !== '' || location.trim() !== '' || tags.length > 0 },
    { id: 'images', num: 3, label: 'Images', shortLabel: 'Images', icon: <ImageIcon className="w-4 h-4" />, completed: !!coverImageUrl || !!charImageUrl },
    { id: 'visibility', num: 4, label: 'Advanced & Visibility', shortLabel: 'Advanced', icon: <ShieldCheck className="w-4 h-4" />, completed: initialMessages.some(m => m.trim()) || allowTrending },
  ]

  // Auto-dismiss error after 10 seconds
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 10000)
    return () => clearTimeout(timer)
  }, [error])

  const handleSelectPersona = useCallback((personaId: string) => {
    setSelectedPersonaId(personaId)
  }, [])

  const canCreate = selectedPersonaId && title.trim().length > 0

  // ---- Validation -------------------------------------------------------
  const validateStep = useCallback((step: FormStep): string => {
    if (step === 'basics') {
      if (!selectedPersonaId) return 'Choose a persona for this scenario first.'
      if (!title.trim()) return 'Give your scenario a title.'
    }
    return ''
  }, [selectedPersonaId, title])

  const goToStep = (step: FormStep) => {
    setStepError('')
    setActiveStep(step)
  }

  const handleNext = () => {
    const err = validateStep(activeStep)
    if (err) {
      setStepError(err)
      return
    }
    setStepError('')
    const nextIndex = Math.min(currentStepIndex + 1, sectionOrder.length - 1)
    setActiveStep(sectionOrder[nextIndex])
  }

  const handleBack = () => {
    setStepError('')
    const prevIndex = Math.max(currentStepIndex - 1, 0)
    setActiveStep(sectionOrder[prevIndex])
  }

  // ---- Tags -------------------------------------------------------------
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

  // ---- Greeting messages ------------------------------------------------
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

  // ---- Image upload (shared by click + drag & drop) ----------------------
  const uploadImage = useCallback(async (file: File, field: 'cover' | 'char') => {
    // Client-side sanity checks (server re-validates)
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Only PNG, JPG, GIF and WebP images are allowed.' })
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Maximum size is 8MB.' })
      return
    }

    setUploadingField(field)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('uploadType', 'scenario_image')

    try {
      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      }, 0)

      if (response.ok) {
        const data = await response.json()
        const url = data.url || data.avatarUrl
        if (url) {
          if (field === 'cover') {
            setCoverImageUrl(url)
          } else {
            setCharImageUrl(url)
          }
        }
      } else {
        const data = await response.json().catch(() => ({}))
        toast({ title: 'Upload failed', description: (data as { error?: string }).error || 'Please try again.' })
      }
    } catch (err) {
      console.error('Upload failed:', err)
      toast({ title: 'Upload failed', description: 'Network error — please try again.' })
    } finally {
      setUploadingField(null)
    }
  }, [toast])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'cover' | 'char') => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file, field)
    // Allow re-selecting the same file
    e.target.value = ''
  }

  // ---- Submit ------------------------------------------------------------
  const handleCreate = async () => {
    // Validate everything first — jump to the offending step
    const basicsError = validateStep('basics')
    if (basicsError) {
      setActiveStep('basics')
      setStepError(basicsError)
      return
    }

    if (!canCreate) return

    setIsCreating(true)
    setError('')

    try {
      const body = {
        personaId: selectedPersonaId,
        title: title.trim(),
        description: description.trim() || null,
        category: categorySlug,
        mood: mood || null,
        location: location.trim() || null,
        attire: attire.trim() || null,
        contentRating,
        tags: tags.length > 0 ? tags : null,
        initialMessages: initialMessages.some(m => m.trim()) ? initialMessages.filter(m => m.trim()) : null,
        bannerUrl: coverImageUrl || null,
        imageUrl: charImageUrl || null,
        allowTrending,
      }

      let response: Response
      try {
        response = await apiFetch('/api/scenarios', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      } catch {
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
        toast({
          title: 'Scenario Created!',
          description: allowTrending
            ? `"${title}" is live — and opted in to trending & showcase.`
            : `"${title}" is now live for everyone to discover.`,
        })
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
        setAllowTrending(false)
        setSelectedPersonaId(preselectedPersonaId || null)
        setActiveStep('basics')
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

  // ---- Shared drag & drop zone props -------------------------------------
  const dropZoneProps = (field: 'cover' | 'char') => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragField(field)
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragField(null)
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragField(null)
      const file = e.dataTransfer.files?.[0]
      if (file) uploadImage(file, field)
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0 bg-gradient-to-b from-[#0d0f14] to-[#0a0c10] border-white/[0.08]">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle className={`text-xl font-bold bg-gradient-to-r ${accent.from} ${accent.to} bg-clip-text text-transparent flex items-center gap-2`}>
            <Sparkles className="w-5 h-5 text-slate-400" />
            Create Scenario
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Set the stage for your persona — other users can discover it and start a roleplay.
          </DialogDescription>
          {/* Progress bar (mobile step indicator) */}
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
          {/* LEFT pane — step nav + live preview */}
          <div className="w-48 border-r border-white/[0.06] py-4 px-2 flex-shrink-0 overflow-y-auto hidden sm:flex sm:flex-col custom-scrollbar">
            {/* Step nav */}
            <div className="space-y-1">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                    activeStep === step.id
                      ? `${accent.bgTint} ${accent.text} ${accent.borderSubtle} border`
                      : step.completed
                        ? 'text-slate-300 hover:text-slate-100 hover:bg-white/[0.03]'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold ${
                      activeStep === step.id
                        ? `${accent.bgSolid} text-white`
                        : step.completed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/[0.06] text-slate-500 border border-white/[0.08]'
                    }`}
                  >
                    {step.completed && activeStep !== step.id ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      step.num
                    )}
                  </span>
                  <span className="truncate">{step.label}</span>
                </button>
              ))}
            </div>

            {/* Live preview card */}
            <div className="mt-auto pt-4">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Eye className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Live Preview</span>
              </div>
              <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#0d0f14]">
                {/* Banner */}
                <div className="h-16 relative overflow-hidden">
                  {coverImageUrl ? (
                    <>
                      <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-[#0d0f14]/40 to-transparent" />
                    </>
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${CATEGORY_GRADIENTS[categorySlug] || CATEGORY_GRADIENTS.other}`}>
                      <div className="absolute top-1 right-4 w-8 h-8 rounded-full bg-white/5 blur-lg" />
                      <div className="absolute bottom-0 left-6 w-6 h-6 rounded-full bg-white/5 blur-md" />
                    </div>
                  )}
                  {/* Category chip */}
                  <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium border backdrop-blur-sm flex items-center gap-0.5 ${CATEGORY_COLORS[categorySlug] || CATEGORY_COLORS.other}`}>
                    <span className="text-[8px]">{CATEGORY_ICONS[categorySlug] || '📖'}</span>
                    {category}
                  </span>
                  {/* Persona avatar */}
                  <div className="absolute -bottom-4 left-2.5">
                    <Avatar className="w-9 h-9 border-2 border-[#0d0f14] shadow-lg">
                      <AvatarImage src={charImageUrl || selectedPersona?.avatarUrl || undefined} />
                      <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-xs font-semibold`}>
                        {selectedPersona ? selectedPersona.name.charAt(0).toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                {/* Meta */}
                <div className="px-2.5 pt-6 pb-2.5">
                  <p className={`text-[10px] font-medium ${accent.text} truncate`}>
                    {selectedPersona ? selectedPersona.name : 'No persona selected'}
                  </p>
                  <h4 className="text-xs font-semibold text-slate-100 line-clamp-2 leading-tight mt-0.5">
                    {title.trim() || 'Untitled scenario'}
                  </h4>
                  {mood && (
                    <p className="text-[9px] text-slate-500 mt-1 capitalize">{mood}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT pane — current step form */}
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

            {stepError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="flex-1">{stepError}</span>
                <button
                  onClick={() => setStepError('')}
                  className="shrink-0 text-amber-300/60 hover:text-amber-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ================= STEP 1 — Scenario Basics ================= */}
            {activeStep === 'basics' && (
              <div className="space-y-5">
                {/* Persona */}
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-400" />
                    Select Persona <span className="text-red-400">*</span>
                  </Label>
                  <p className="text-xs text-slate-500">
                    Choose which of your personas this scenario is built around.
                  </p>

                  {personas.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <User className="w-8 h-8 text-slate-600 mb-2" />
                      <p className="text-sm text-slate-400">No personas found.</p>
                      <p className="text-xs text-slate-500">Create a persona first!</p>
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
                            <div className={`w-5 h-5 rounded-full ${accent.bgSolid} flex items-center justify-center flex-shrink-0`}>
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium">
                    Title <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    placeholder="Midnight rooftop confession..."
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

                {/* Mobile nav */}
                <div className="flex sm:hidden mt-4">
                  <button
                    onClick={handleNext}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${accent.from} ${accent.to} text-white`}
                  >
                    Next: Details <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= STEP 2 — Details & Mood ================= */}
            {activeStep === 'details' && (
              <div className="space-y-5">
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
                    {availableRatings.map(rating => {
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
                    onClick={handleBack}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06]"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${accent.from} ${accent.to} text-white`}
                  >
                    Next: Images <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= STEP 3 — Images ================= */}
            {activeStep === 'images' && (
              <div className="space-y-5">
                {/* Cover Image — drag & drop */}
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                    Cover Image
                  </Label>
                  <p className="text-xs text-slate-500">Banner image for the scenario card. Drag & drop or click to upload. Recommended: 1200x400px</p>
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
                    <div
                      {...dropZoneProps('cover')}
                      onClick={() => coverInputRef.current?.click()}
                      className={`w-full h-32 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                        dragField === 'cover'
                          ? 'border-teal-400/60 bg-teal-500/10 text-teal-300'
                          : 'border-white/[0.08] hover:border-teal-500/30 bg-white/[0.01] hover:bg-white/[0.02] text-slate-500 hover:text-teal-400'
                      }`}
                    >
                      {uploadingField === 'cover' ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
                          <span className="text-xs">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6" />
                          <span className="text-xs">Drag & drop or click to upload</span>
                          <span className="text-[10px] text-slate-600">PNG, JPG, GIF or WebP — max 8MB</span>
                        </>
                      )}
                    </div>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => handleImageUpload(e, 'cover')} className="hidden" />
                </div>

                {/* Character Image — drag & drop */}
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
                    <div
                      {...dropZoneProps('char')}
                      onClick={() => charImageInputRef.current?.click()}
                      className={`w-32 h-20 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        dragField === 'char'
                          ? 'border-teal-400/60 bg-teal-500/10 text-teal-300'
                          : 'border-white/[0.08] hover:border-teal-500/30 bg-white/[0.01] hover:bg-white/[0.02] text-slate-500 hover:text-teal-400'
                      }`}
                    >
                      {uploadingField === 'char' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span className="text-[9px]">Drag & drop</span>
                        </>
                      )}
                    </div>
                  )}
                  <input ref={charImageInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => handleImageUpload(e, 'char')} className="hidden" />
                </div>

                {/* Mobile nav */}
                <div className="flex sm:hidden gap-2 mt-4">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06]"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${accent.from} ${accent.to} text-white`}
                  >
                    Next: Advanced <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= STEP 4 — Advanced & Visibility ================= */}
            {activeStep === 'visibility' && (
              <div className="space-y-5">
                {/* Greeting messages */}
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-400" />
                    Greeting Messages
                  </Label>
                  <p className="text-xs text-slate-500">
                    Shown to users when they start a roleplay with your persona in this scenario. They can pick which greeting to start from.
                  </p>

                  <div className="space-y-3">
                    {initialMessages.map((msg, index) => (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Message {index + 1}</span>
                          {initialMessages.length > 1 && (
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
                </div>

                {/* Trending opt-in toggle */}
                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Flame className="w-5 h-5 text-fuchsia-300" />
                      </div>
                      <div className="min-w-0">
                        <Label htmlFor="allow-trending" className="text-slate-100 text-sm font-medium cursor-pointer">
                          Allow in trending &amp; showcase
                        </Label>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          If enabled, this scenario may appear in Trending This Week and Persona of the Week showcases. Optional — off by default. You can change this anytime.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="allow-trending"
                      checked={allowTrending}
                      onCheckedChange={setAllowTrending}
                      className="data-[state=checked]:bg-fuchsia-500 mt-1"
                    />
                  </div>
                  {allowTrending && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
                      <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 flex-shrink-0" />
                      <p className="text-[11px] text-fuchsia-200/80">
                        This scenario will be considered for Trending This Week and the Persona of the Week showcase.
                      </p>
                    </div>
                  )}
                </div>

                {/* Mobile nav */}
                <div className="flex sm:hidden gap-2 mt-4">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06]"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isCreating}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            {/* Desktop step nav (prev/next) */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={handleBack}
                disabled={currentStepIndex === 0 || isCreating}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleNext}
                disabled={currentStepIndex === sectionOrder.length - 1 || isCreating}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentStepIndex < sectionOrder.length - 1
                    ? `bg-gradient-to-r ${accent.from} ${accent.to} text-white hover:opacity-90`
                    : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
                }`}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
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
