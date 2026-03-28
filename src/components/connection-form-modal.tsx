'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from '@/components/ui/dialog'
import { apiFetch } from '@/lib/api-client'
import { 
  Camera, Loader2, Sparkles, X, Plus, User, Heart, Shield, 
  BookOpen, Users, Brain, ChevronLeft, ChevronRight,
  Trash2, Flame, AlertTriangle
} from 'lucide-react'
import { PersonalitySpectrums, BigFiveTraits, HexacoTraits, defaultBigFive, defaultHexaco } from '@/stores/persona-store'

// Constants (same as PersonaForm)
const ARCHETYPES = ['Hero', 'Villain', 'Antihero', 'Mentor', 'Sidekick', 'Trickster', 'Lover', 'Everyman', 'Rebel', 'Creator', 'Caregiver', 'Explorer', 'Sage', 'Innocent', 'Ruler', 'Other']
const GENDERS = ['Male', 'Female', 'Non-binary', 'Genderfluid', 'Agender', 'Other', 'Prefer not to say']
const PRONOUNS = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'any/all', 'xe/xem', 'ze/zir', 'Other']
const RELATIONSHIP_TYPES = ['Family', 'Friend', 'Romance', 'Rival', 'Ally', 'Enemy', 'Acquaintance', 'Colleague', 'Mentor', 'Student', 'Other']
const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']

// RP Preference Constants
const RP_STYLES = [
  { value: 'one_liner', label: 'One-liner', description: 'Short, quick responses (1-2 sentences)' },
  { value: 'semi_lit', label: 'Semi-literate', description: 'Moderate length (1-2 paragraphs)' },
  { value: 'literate', label: 'Literate', description: 'Detailed responses (2-4 paragraphs)' },
  { value: 'novella', label: 'Novella', description: 'Long, story-like responses (5+ paragraphs)' },
]
const RP_GENDERS = ['Male', 'Female', 'Non-binary', 'Other']
const RP_GENRES = ['Romance', 'Action', 'Fantasy', 'Sci-Fi', 'Horror', 'Mystery', 'Slice of Life', 'Drama', 'Comedy', 'Adventure', 'Thriller', 'Historical', 'Supernatural', 'Modern', 'Other']

// NSFW Constants
const NSFW_ROLE_PREFERENCES = [
  { value: 'dominant', label: 'Dominant', description: 'Takes the lead in intimate scenarios' },
  { value: 'submissive', label: 'Submissive', description: 'Prefers to follow partner\'s lead' },
  { value: 'switch', label: 'Switch', description: 'Comfortable with either role' },
  { value: 'versatile', label: 'Versatile', description: 'Open to various dynamics' },
]
const NSFW_ORIENTATIONS = ['Heterosexual', 'Homosexual', 'Bisexual', 'Pansexual', 'Asexual', 'Demisexual', 'Queer', 'Questioning', 'Other']
const NSFW_BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Petite', 'Tall', 'Plus-size', 'Other']

const SPECTRUM_LABELS: Record<keyof PersonalitySpectrums, { left: string; right: string }> = {
  introvertExtrovert: { left: 'Introvert', right: 'Extrovert' },
  intuitiveObservant: { left: 'Intuitive', right: 'Observant' },
  thinkingFeeling: { left: 'Thinking', right: 'Feeling' },
  judgingProspecting: { left: 'Judging', right: 'Prospecting' },
  assertiveTurbulent: { left: 'Assertive', right: 'Turbulent' },
}

const BIG_FIVE_LABELS: Record<keyof BigFiveTraits, { left: string; right: string; description: string }> = {
  openness: { left: 'Practical', right: 'Open', description: 'Openness to Experience' },
  conscientiousness: { left: 'Flexible', right: 'Organized', description: 'Conscientiousness' },
  extraversion: { left: 'Reserved', right: 'Social', description: 'Extraversion' },
  agreeableness: { left: 'Competitive', right: 'Cooperative', description: 'Agreeableness' },
  neuroticism: { left: 'Stable', right: 'Reactive', description: 'Neuroticism' },
}

const HEXACO_LABELS: Record<keyof HexacoTraits, { left: string; right: string; description: string }> = {
  honestyHumility: { left: 'Self-Serving', right: 'Genuine', description: 'Honesty-Humility' },
  emotionality: { left: 'Detached', right: 'Sensitive', description: 'Emotionality' },
  extraversion: { left: 'Reserved', right: 'Expressive', description: 'Extraversion' },
  agreeableness: { left: 'Critical', right: 'Tolerant', description: 'Agreeableness' },
  conscientiousness: { left: 'Impulsive', right: 'Disciplined', description: 'Conscientiousness' },
  opennessToExperience: { left: 'Conventional', right: 'Creative', description: 'Openness to Experience' },
}

// Extended Connection interface
export interface ExtendedConnection {
  id?: string
  characterName: string
  avatarUrl?: string | null
  bannerUrl?: string | null
  relationshipType: string
  specificRole?: string | null
  characterAge?: number | null
  description?: string | null
  gender?: string | null
  pronouns?: string | null
  species?: string | null
  archetype?: string | null
  mbtiType?: string | null
  tags?: string[]
  personalityDescription?: string | null
  personalitySpectrums?: PersonalitySpectrums
  bigFive?: BigFiveTraits
  hexaco?: HexacoTraits
  strengths?: string[]
  flaws?: string[]
  values?: string[]
  fears?: string[]
  likes?: string[]
  dislikes?: string[]
  hobbies?: string[]
  skills?: string[]
  languages?: string[]
  habits?: string[]
  speechPatterns?: string[]
  backstory?: string | null
  appearance?: string | null
  rpStyle?: string | null
  rpPreferredGenders?: string[]
  rpGenres?: string[]
  rpLimits?: string[]
  rpThemes?: string[]
  rpExperienceLevel?: string | null
  rpResponseTime?: string | null
  nsfwEnabled?: boolean
  nsfwBodyType?: string | null
  nsfwKinks?: string[]
  nsfwContentWarnings?: string[]
  nsfwOrientation?: string | null
  nsfwRolePreference?: string | null
  isNew?: boolean
}

interface ConnectionFormModalProps {
  isOpen: boolean
  onClose: () => void
  connection: ExtendedConnection | null
  onSave: (connection: ExtendedConnection) => void
}

const defaultSpectrums: PersonalitySpectrums = {
  introvertExtrovert: 50,
  intuitiveObservant: 50,
  thinkingFeeling: 50,
  judgingProspecting: 50,
  assertiveTurbulent: 50,
}

const defaultConnection: ExtendedConnection = {
  characterName: '',
  avatarUrl: null,
  bannerUrl: null,
  relationshipType: '',
  specificRole: null,
  characterAge: null,
  description: null,
  gender: null,
  pronouns: null,
  species: null,
  archetype: null,
  mbtiType: null,
  tags: [],
  personalityDescription: null,
  personalitySpectrums: defaultSpectrums,
  bigFive: defaultBigFive,
  hexaco: defaultHexaco,
  strengths: [],
  flaws: [],
  values: [],
  fears: [],
  likes: [],
  dislikes: [],
  hobbies: [],
  skills: [],
  languages: [],
  habits: [],
  speechPatterns: [],
  backstory: null,
  appearance: null,
  rpStyle: null,
  rpPreferredGenders: [],
  rpGenres: [],
  rpLimits: [],
  rpThemes: [],
  rpExperienceLevel: null,
  rpResponseTime: null,
  nsfwEnabled: false,
  nsfwBodyType: null,
  nsfwKinks: [],
  nsfwContentWarnings: [],
  nsfwOrientation: null,
  nsfwRolePreference: null,
  isNew: true,
}

// Tag Input Component
function TagInput({ 
  label, 
  tags, 
  onChange, 
  placeholder = 'Type and press Enter...' 
}: { 
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()])
      }
      setInput('')
    }
  }
  
  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }
  
  return (
    <div className="space-y-2">
      <Label className="text-purple-200/80">{label}</Label>
      <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 min-h-[44px]">
        {tags.map((tag, i) => (
          <span 
            key={i} 
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-purple-500/20 text-purple-200 border border-purple-500/30"
          >
            {tag}
            <button 
              onClick={() => removeTag(i)} 
              className="w-4 h-4 rounded-full hover:bg-purple-500/30 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-purple-100 placeholder:text-purple-400/40"
        />
      </div>
    </div>
  )
}

// Spectrum Slider Component
function SpectrumSlider({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  leftLabel: string
  rightLabel: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-purple-200/80">{label}</Label>
      <div className="flex items-center justify-between text-xs text-purple-400/60 mb-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-purple-500/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-fuchsia-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/30"
      />
      <div className="text-center text-xs text-purple-400/40">{value}%</div>
    </div>
  )
}

// Styled Select Component
function StyledSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...'
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-purple-200/80">{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 px-3 pr-10 rounded-lg bg-purple-500/5 border border-purple-500/20 text-purple-100 text-sm appearance-none cursor-pointer focus:outline-none focus:border-purple-500/40 transition-colors"
        >
          <option value="" className="bg-[#1a1230] text-purple-400">{placeholder}</option>
          {options.map(opt => (
            <option key={opt} value={opt} className="bg-[#1a1230] text-purple-100">{opt}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronRight className="w-4 h-4 text-purple-400 rotate-90" />
        </div>
      </div>
    </div>
  )
}

const tabs = [
  { name: 'Overview', icon: User },
  { name: 'Personality', icon: Heart },
  { name: 'Attributes', icon: Shield },
  { name: 'Backstory', icon: BookOpen },
  { name: 'MBTI', icon: Brain },
  { name: 'RP Prefs', icon: Sparkles },
  { name: 'NSFW', icon: Flame },
]

export function ConnectionFormModal({ isOpen, onClose, connection, onSave }: ConnectionFormModalProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState<ExtendedConnection>(defaultConnection)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  
  // Initialize form with connection data
  useEffect(() => {
    if (connection) {
      setFormData({
        ...defaultConnection,
        ...connection,
        tags: connection.tags || [],
        personalitySpectrums: connection.personalitySpectrums || defaultSpectrums,
        bigFive: connection.bigFive || defaultBigFive,
        hexaco: connection.hexaco || defaultHexaco,
        strengths: connection.strengths || [],
        flaws: connection.flaws || [],
        values: connection.values || [],
        fears: connection.fears || [],
        likes: connection.likes || [],
        dislikes: connection.dislikes || [],
        hobbies: connection.hobbies || [],
        skills: connection.skills || [],
        languages: connection.languages || [],
        habits: connection.habits || [],
        speechPatterns: connection.speechPatterns || [],
        rpPreferredGenders: connection.rpPreferredGenders || [],
        rpGenres: connection.rpGenres || [],
        rpLimits: connection.rpLimits || [],
        rpThemes: connection.rpThemes || [],
        nsfwEnabled: connection.nsfwEnabled ?? false,
        nsfwKinks: connection.nsfwKinks || [],
        nsfwContentWarnings: connection.nsfwContentWarnings || [],
      })
    } else {
      setFormData({ ...defaultConnection, isNew: true })
    }
    setActiveTab(0)
    setError('')
  }, [connection, isOpen])
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      
      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }
      
      const data = await response.json()
      if (type === 'avatar') {
        setFormData(prev => ({ ...prev, avatarUrl: data.url }))
      } else {
        setFormData(prev => ({ ...prev, bannerUrl: data.url }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleSave = async () => {
    if (!formData.characterName.trim()) {
      setError('Character name is required')
      return
    }
    if (!formData.relationshipType) {
      setError('Relationship type is required')
      return
    }
    
    setIsSaving(true)
    setError('')
    
    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save connection')
    } finally {
      setIsSaving(false)
    }
  }
  
  // Update helpers
  const updateField = <K extends keyof ExtendedConnection>(field: K, value: ExtendedConnection[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const updateSpectrum = (field: keyof PersonalitySpectrums, value: number) => {
    setFormData(prev => ({
      ...prev,
      personalitySpectrums: {
        ...(prev.personalitySpectrums || defaultSpectrums),
        [field]: value
      }
    }))
  }
  
  const updateBigFive = (field: keyof BigFiveTraits, value: number) => {
    setFormData(prev => ({
      ...prev,
      bigFive: {
        ...(prev.bigFive || defaultBigFive),
        [field]: value
      }
    }))
  }
  
  const updateHexaco = (field: keyof HexacoTraits, value: number) => {
    setFormData(prev => ({
      ...prev,
      hexaco: {
        ...(prev.hexaco || defaultHexaco),
        [field]: value
      }
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="bg-[#0d0718] border-purple-500/20 max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col">
        <VisuallyHidden>
          <DialogTitle>{formData.isNew ? 'Create Connection' : 'Edit Connection'}</DialogTitle>
        </VisuallyHidden>
        
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 bg-black/20 border-r border-purple-500/15 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="p-4 border-b border-purple-500/15 flex-shrink-0">
              <h3 className="text-sm font-semibold text-purple-100 truncate">
                {formData.characterName || 'New Connection'}
              </h3>
              <p className="text-xs text-purple-400/60 mt-1 truncate">
                {formData.relationshipType || 'Select relationship'}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {tabs.map((tab, index) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(index)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeTab === index 
                      ? 'bg-purple-500/20 text-purple-100 border border-purple-500/30' 
                      : 'text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar min-h-0">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}
              
              {/* Overview Tab */}
              {activeTab === 0 && (
                <>
                  {/* Avatar and Banner Upload */}
                  <div className="flex gap-6">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative group">
                        <Avatar className="w-28 h-28 border-2 border-purple-500/30">
                          <AvatarImage src={formData.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-3xl font-bold">
                            {formData.characterName?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {isUploading ? (
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          ) : (
                            <Camera className="w-6 h-6 text-white" />
                          )}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, 'avatar')}
                        />
                      </div>
                      <span className="text-xs text-purple-400/60">Avatar</span>
                    </div>
                    
                    {/* Banner */}
                    <div className="flex-1">
                      <div 
                        className="relative h-28 rounded-xl overflow-hidden bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-cyan-500/20 border border-purple-500/20 group cursor-pointer"
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        {formData.bannerUrl && (
                          <img src={formData.bannerUrl} alt="" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, 'banner')}
                        />
                      </div>
                      <span className="text-xs text-purple-400/60 mt-1 block">Banner Image</span>
                    </div>
                  </div>
                  
                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label className="text-purple-200/80">Character Name *</Label>
                      <Input
                        value={formData.characterName}
                        onChange={(e) => updateField('characterName', e.target.value)}
                        placeholder="Enter character name"
                        className="bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40"
                      />
                    </div>
                    
                    <StyledSelect
                      label="Relationship Type *"
                      value={formData.relationshipType}
                      onChange={(v) => updateField('relationshipType', v)}
                      options={RELATIONSHIP_TYPES}
                      placeholder="Select relationship..."
                    />
                    
                    <div className="space-y-2">
                      <Label className="text-purple-200/80">Specific Role</Label>
                      <Input
                        value={formData.specificRole || ''}
                        onChange={(e) => updateField('specificRole', e.target.value || null)}
                        placeholder="e.g., Father, Ex-boyfriend..."
                        className="bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-purple-200/80">Age</Label>
                      <Input
                        type="number"
                        value={formData.characterAge || ''}
                        onChange={(e) => updateField('characterAge', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Age"
                        className="bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40"
                      />
                    </div>
                    
                    <StyledSelect
                      label="Gender"
                      value={formData.gender || ''}
                      onChange={(v) => updateField('gender', v || null)}
                      options={GENDERS}
                      placeholder="Select gender..."
                    />
                    
                    <StyledSelect
                      label="Pronouns"
                      value={formData.pronouns || ''}
                      onChange={(v) => updateField('pronouns', v || null)}
                      options={PRONOUNS}
                      placeholder="Select pronouns..."
                    />
                    
                    <div className="space-y-2">
                      <Label className="text-purple-200/80">Species</Label>
                      <Input
                        value={formData.species || ''}
                        onChange={(e) => updateField('species', e.target.value || null)}
                        placeholder="e.g., Human, Elf, Vampire..."
                        className="bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40"
                      />
                    </div>
                    
                    <StyledSelect
                      label="Archetype"
                      value={formData.archetype || ''}
                      onChange={(v) => updateField('archetype', v || null)}
                      options={ARCHETYPES}
                      placeholder="Select archetype..."
                    />
                  </div>
                  
                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-purple-200/80">Description</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => updateField('description', e.target.value || null)}
                      placeholder="Brief description of this character and their relationship..."
                      className="bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40 min-h-[100px] resize-none"
                    />
                  </div>
                  
                  {/* Tags */}
                  <TagInput
                    label="Tags"
                    tags={formData.tags || []}
                    onChange={(tags) => updateField('tags', tags)}
                    placeholder="Add tags..."
                  />
                </>
              )}
              
              {/* Personality Tab */}
              {activeTab === 1 && (
                <>
                  <div className="space-y-2">
                    <Label className="text-purple-200/80">Personality Description</Label>
                    <Textarea
                      value={formData.personalityDescription || ''}
                      onChange={(e) => updateField('personalityDescription', e.target.value || null)}
                      placeholder="Describe their personality in detail..."
                      className="bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40 min-h-[120px] resize-none"
                    />
                  </div>
                  
                  {/* Personality Spectrums */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-purple-200/80">Personality Spectrums</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {Object.entries(SPECTRUM_LABELS).map(([key, labels]) => (
                        <SpectrumSlider
                          key={key}
                          label={labels.left + ' ↔ ' + labels.right}
                          value={formData.personalitySpectrums?.[key as keyof PersonalitySpectrums] || 50}
                          onChange={(v) => updateSpectrum(key as keyof PersonalitySpectrums, v)}
                          leftLabel={labels.left}
                          rightLabel={labels.right}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Traits */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TagInput label="Strengths" tags={formData.strengths || []} onChange={(tags) => updateField('strengths', tags)} placeholder="Add strength..." />
                    <TagInput label="Flaws" tags={formData.flaws || []} onChange={(tags) => updateField('flaws', tags)} placeholder="Add flaw..." />
                    <TagInput label="Values" tags={formData.values || []} onChange={(tags) => updateField('values', tags)} placeholder="Add value..." />
                    <TagInput label="Fears" tags={formData.fears || []} onChange={(tags) => updateField('fears', tags)} placeholder="Add fear..." />
                  </div>
                </>
              )}
              
              {/* Attributes Tab */}
              {activeTab === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TagInput label="Likes" tags={formData.likes || []} onChange={(tags) => updateField('likes', tags)} placeholder="Add like..." />
                  <TagInput label="Dislikes" tags={formData.dislikes || []} onChange={(tags) => updateField('dislikes', tags)} placeholder="Add dislike..." />
                  <TagInput label="Hobbies" tags={formData.hobbies || []} onChange={(tags) => updateField('hobbies', tags)} placeholder="Add hobby..." />
                  <TagInput label="Skills" tags={formData.skills || []} onChange={(tags) => updateField('skills', tags)} placeholder="Add skill..." />
                  <TagInput label="Languages" tags={formData.languages || []} onChange={(tags) => updateField('languages', tags)} placeholder="Add language..." />
                  <TagInput label="Habits" tags={formData.habits || []} onChange={(tags) => updateField('habits', tags)} placeholder="Add habit..." />
                  <TagInput label="Speech Patterns" tags={formData.speechPatterns || []} onChange={(tags) => updateField('speechPatterns', tags)} placeholder="Add speech pattern..." className="md:col-span-2" />
                </div>
              )}
              
              {/* Backstory Tab */}
              {activeTab === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-purple-200/80">Backstory</Label>
                    <Textarea
                      value={formData.backstory || ''}
                      onChange={(e) => updateField('backstory', e.target.value || null)}
                      placeholder="Write the character's backstory..."
                      className="bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40 min-h-[200px] resize-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-purple-200/80">Appearance</Label>
                    <Textarea
                      value={formData.appearance || ''}
                      onChange={(e) => updateField('appearance', e.target.value || null)}
                      placeholder="Describe their physical appearance..."
                      className="bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40 min-h-[150px] resize-none"
                    />
                  </div>
                </div>
              )}
              
              {/* MBTI Tab */}
              {activeTab === 4 && (
                <>
                  <StyledSelect
                    label="MBTI Type"
                    value={formData.mbtiType || ''}
                    onChange={(v) => updateField('mbtiType', v || null)}
                    options={MBTI_TYPES}
                    placeholder="Select MBTI type..."
                  />
                  
                  {/* Big Five */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-purple-200/80">Big Five (OCEAN)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {Object.entries(BIG_FIVE_LABELS).map(([key, info]) => (
                        <div key={key} className="space-y-1">
                          <SpectrumSlider
                            label={info.left + ' ↔ ' + info.right}
                            value={formData.bigFive?.[key as keyof BigFiveTraits] || 50}
                            onChange={(v) => updateBigFive(key as keyof BigFiveTraits, v)}
                            leftLabel={info.left}
                            rightLabel={info.right}
                          />
                          <p className="text-[10px] text-purple-400/40">{info.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* HEXACO */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-purple-200/80">HEXACO Model</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {Object.entries(HEXACO_LABELS).map(([key, info]) => (
                        <div key={key} className="space-y-1">
                          <SpectrumSlider
                            label={info.left + ' ↔ ' + info.right}
                            value={formData.hexaco?.[key as keyof HexacoTraits] || 50}
                            onChange={(v) => updateHexaco(key as keyof HexacoTraits, v)}
                            leftLabel={info.left}
                            rightLabel={info.right}
                          />
                          <p className="text-[10px] text-purple-400/40">{info.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {/* RP Prefs Tab */}
              {activeTab === 5 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-purple-200/80">RP Style</Label>
                      <select
                        value={formData.rpStyle || ''}
                        onChange={(e) => updateField('rpStyle', e.target.value || null)}
                        className="w-full h-11 px-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-purple-100 text-sm appearance-none cursor-pointer focus:outline-none focus:border-purple-500/40"
                      >
                        <option value="" className="bg-[#1a1230] text-purple-400">Select style...</option>
                        {RP_STYLES.map(style => (
                          <option key={style.value} value={style.value} className="bg-[#1a1230]">{style.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <TagInput label="Preferred Genders" tags={formData.rpPreferredGenders || []} onChange={(tags) => updateField('rpPreferredGenders', tags)} placeholder="Add preferred gender..." />
                  <TagInput label="Preferred Genres" tags={formData.rpGenres || []} onChange={(tags) => updateField('rpGenres', tags)} placeholder="Add genre..." />
                  <TagInput label="Limits & Triggers" tags={formData.rpLimits || []} onChange={(tags) => updateField('rpLimits', tags)} placeholder="Add limit..." />
                  <TagInput label="Preferred Themes" tags={formData.rpThemes || []} onChange={(tags) => updateField('rpThemes', tags)} placeholder="Add theme..." />
                </div>
              )}
              
              {/* NSFW Tab */}
              {activeTab === 6 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-300 font-medium">Adult Content Settings</p>
                      <p className="text-xs text-amber-400/60 mt-1">These settings are for characters involved in mature roleplay scenarios.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="nsfw-enabled"
                      checked={formData.nsfwEnabled || false}
                      onChange={(e) => updateField('nsfwEnabled', e.target.checked)}
                      className="w-5 h-5 rounded border-purple-500/30 bg-purple-500/5 text-purple-500 focus:ring-purple-500/30"
                    />
                    <Label htmlFor="nsfw-enabled" className="text-purple-200/80">Enable NSFW Content for this Connection</Label>
                  </div>
                  
                  {formData.nsfwEnabled && (
                    <div className="space-y-4">
                      <StyledSelect
                        label="Orientation"
                        value={formData.nsfwOrientation || ''}
                        onChange={(v) => updateField('nsfwOrientation', v || null)}
                        options={NSFW_ORIENTATIONS}
                        placeholder="Select orientation..."
                      />
                      
                      <StyledSelect
                        label="Body Type"
                        value={formData.nsfwBodyType || ''}
                        onChange={(v) => updateField('nsfwBodyType', v || null)}
                        options={NSFW_BODY_TYPES}
                        placeholder="Select body type..."
                      />
                      
                      <div className="space-y-2">
                        <Label className="text-purple-200/80">Role Preference</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {NSFW_ROLE_PREFERENCES.map(pref => (
                            <button
                              key={pref.value}
                              onClick={() => updateField('nsfwRolePreference', formData.nsfwRolePreference === pref.value ? null : pref.value)}
                              className={`p-3 rounded-lg text-sm transition-all ${
                                formData.nsfwRolePreference === pref.value
                                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-200'
                                  : 'bg-purple-500/5 border border-purple-500/20 text-purple-400/60 hover:bg-purple-500/10'
                              }`}
                            >
                              {pref.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <TagInput label="Kinks & Interests" tags={formData.nsfwKinks || []} onChange={(tags) => updateField('nsfwKinks', tags)} placeholder="Add kink..." />
                      <TagInput label="Content Warnings" tags={formData.nsfwContentWarnings || []} onChange={(tags) => updateField('nsfwContentWarnings', tags)} placeholder="Add warning..." />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-purple-500/15 bg-black/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {formData.avatarUrl && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={formData.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-sm">
                      {formData.characterName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm text-purple-400/60 truncate max-w-[200px]">
                  {formData.characterName || 'Unnamed Connection'}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="text-purple-400/60 hover:text-purple-200 hover:bg-purple-500/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !formData.characterName.trim() || !formData.relationshipType}
                  className="btn-persona px-6"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    formData.isNew ? 'Create Connection' : 'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
