'use client'

import React, { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  X, Plus, Loader2, Upload, Image as ImageIcon, MapPin, Tag, Sparkles,
  MessageSquare, Shirt, ShieldCheck, ChevronRight, User, Lock, Trash2
} from 'lucide-react'
import { useVariantAccent } from '@/lib/ui-variant-styles'
import { useToast } from '@/hooks/use-toast'
import { isAdult } from '@/lib/age-utils'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch } from '@/lib/api-client'

interface ScenarioEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
  scenarioId: string | null
  personas: { id: string; name: string; avatarUrl: string | null; mbtiType: string | null; archetype: string | null }[]
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

type FormSection = 'details' | 'messages' | 'images'

export function ScenarioEditModal({ isOpen, onClose, onSaved, onDeleted, scenarioId, personas }: ScenarioEditModalProps) {
  const accent = useVariantAccent()
  const { toast } = useToast()
  const { user } = useAuth()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const charImageInputRef = useRef<HTMLInputElement>(null)

  // Determine if user is adult for age-gating
  const userIsAdult = user?.dateOfBirth ? isAdult(new Date(user.dateOfBirth)) : false

  // Filter available content ratings based on age
  const availableRatings = CONTENT_RATINGS.filter(r => !r.adultOnly || userIsAdult)

  // Section navigation
  const [activeSection, setActiveSection] = useState<FormSection>('details')

  // Form state
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
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
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch scenario data on open
  useEffect(() => {
    if (!isOpen || !scenarioId) return

    const fetchScenario = async () => {
      setIsLoading(true)
      setError('')
      try {
        const res = await apiFetch(`/api/scenarios/${scenarioId}`)
        if (res.ok) {
          const data = await res.json()
          const s = data.scenario

          // Pre-populate form
          setSelectedPersonaId(s.personaId)
          setTitle(s.title || '')
          setDescription(s.description || '')
          // Map category back to title case
          const catMatch = CATEGORIES.find(c => c.toLowerCase().replace(/\s+/g, '-') === s.category)
          setCategory(catMatch || 'Other')
          setMood(s.mood || '')
          setLocation(s.location || '')
          setAttire(s.attire || '')
          setContentRating(s.contentRating || 'safe')
          setTags(Array.isArray(s.tags) ? s.tags : [])
          setInitialMessages(
            Array.isArray(s.initialMessages) && s.initialMessages.length > 0
              ? s.initialMessages
              : ['']
          )
          setCoverImageUrl(s.bannerUrl || '')
          setCharImageUrl(s.imageUrl || '')
        } else {
          setError('Failed to load scenario data.')
        }
      } catch (e) {
        console.error('Failed to fetch scenario:', e)
        setError('Failed to load scenario data.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchScenario()
  }, [isOpen, scenarioId])

  // Auto-dismiss error after 10 seconds
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 10000)
    return () => clearTimeout(timer)
  }, [error])

  const canSave = selectedPersonaId && title.trim().length > 0

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

  const handleSave = async () => {
    if (!canSave || !scenarioId) return

    setIsSaving(true)
    setError('')

    try {
      const body: Record<string, unknown> = {
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

      const response = await apiFetch(`/api/scenarios/${scenarioId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast({ title: 'Scenario Updated!', description: `"${title}" has been saved.` })
        onSaved()
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update scenario. Please try again.')
      }
    } catch (err) {
      console.error('Failed to update scenario:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!scenarioId) return

    setIsDeleting(true)
    try {
      const response = await apiFetch(`/api/scenarios/${scenarioId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({ title: 'Scenario Deleted', description: 'The scenario has been permanently deleted.' })
        setShowDeleteConfirm(false)
        onDeleted()
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete scenario.')
        setShowDeleteConfirm(false)
      }
    } catch (err) {
      console.error('Failed to delete scenario:', err)
      setError('Network error. Please try again.')
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isSaving && !isLoading) {
      onClose()
    }
  }

  const sections: { id: FormSection; label: string; icon: React.ReactNode; completed: boolean }[] = [
    { id: 'details', label: 'Details', icon: <Sparkles className="w-4 h-4" />, completed: title.trim().length > 0 },
    { id: 'messages', label: 'Greetings', icon: <MessageSquare className="w-4 h-4" />, completed: initialMessages.some(m => m.trim()) },
    { id: 'images', label: 'Images', icon: <ImageIcon className="w-4 h-4" />, completed: !!coverImageUrl || !!charImageUrl },
  ]

  const sectionOrder: FormSection[] = ['details', 'messages', 'images']
  const currentStepIndex = sectionOrder.indexOf(activeSection)
  const progressPercent = ((currentStepIndex + 1) / sectionOrder.length) * 100

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 bg-gradient-to-b from-[#0d0f14] to-[#0a0c10] border-white/[0.08]">
          <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
            <DialogTitle className={`text-xl font-bold bg-gradient-to-r ${accent.from} ${accent.to} bg-clip-text text-transparent flex items-center gap-2`}>
              <Sparkles className="w-5 h-5 text-slate-400" />
              Edit Scenario
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Update your scenario details. Changes are saved immediately.
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

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="flex flex-1 min-h-0 overflow-hidden border-t border-white/[0.04]">
                {/* Left nav */}
                <div className="w-36 border-r border-white/[0.06] py-4 px-2 flex-shrink-0 overflow-y-auto hidden sm:block">
                  {sections.map((section) => (
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

                  {/* Delete button */}
                  <div className="mt-6 pt-4 border-t border-white/[0.06]">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 scroll-smooth custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                  {error && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <span className="flex-1">{error}</span>
                      <button
                        onClick={() => setError('')}
                        className="shrink-0 text-red-400/60 hover:text-red-300 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Scenario Details */}
                  {activeSection === 'details' && (
                    <div className="space-y-5">
                      {/* Persona (read-only) */}
                      <div className="space-y-2">
                        <Label className="text-slate-200 text-sm font-medium flex items-center gap-2">
                          <User className="w-4 h-4 text-teal-400" />
                          Persona
                        </Label>
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.01]">
                          {(() => {
                            const p = personas.find(p => p.id === selectedPersonaId)
                            if (!p) return <span className="text-sm text-slate-500">Persona not found</span>
                            return (
                              <>
                                <Avatar className="w-10 h-10 border border-white/[0.1]">
                                  <AvatarImage src={p.avatarUrl || undefined} />
                                  <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-sm font-semibold`}>
                                    {p.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-100 truncate">{p.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {p.mbtiType && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-fuchsia-500/15 text-fuchsia-300/80 border border-fuchsia-500/20">
                                        {p.mbtiType}
                                      </span>
                                    )}
                                    {p.archetype && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-teal-500/15 text-teal-300/80 border border-teal-500/20">
                                        {p.archetype}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs text-slate-500">Cannot change</span>
                              </>
                            )
                          })()}
                        </div>
                      </div>

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
                          onClick={() => setActiveSection('messages')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${accent.from} ${accent.to} text-white`}
                        >
                          Next: Greetings <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Mobile delete button */}
                      <div className="sm:hidden pt-4 border-t border-white/[0.06]">
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Scenario
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
                          These messages will be shown to users when they start chatting with your character.
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
                <button
                  onClick={handleSave}
                  disabled={!canSave || isSaving}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    canSave && !isSaving
                      ? `bg-gradient-to-r ${accent.from} ${accent.to} text-white hover:opacity-90 shadow-lg ${accent.shadowGlow}`
                      : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#0d0f14] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete Scenario?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. The scenario &ldquo;{title}&rdquo; will be permanently deleted along with all its likes and views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
