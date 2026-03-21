'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  Camera, Loader2, Sparkles, X, Plus, User, Heart, Shield, 
  BookOpen, Users, Brain, ChevronLeft, ChevronRight,
  Trash2
} from 'lucide-react'
import { Persona, PersonaConnection, PersonalitySpectrums } from '@/stores/persona-store'

// Constants
const ARCHETYPES = ['Lover', 'Hero', 'Villain', 'Anti-Hero', 'Mentor', 'Sidekick', 'Trickster', 'Innocent', 'Sage', 'Explorer', 'Creator', 'Ruler', 'Caregiver', 'Everyman', 'Jester', 'Magician']
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
const RP_EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'New to roleplay' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced roleplayer' },
  { value: 'veteran', label: 'Veteran', description: 'Many years of experience' },
]
const RP_RESPONSE_TIMES = [
  { value: 'instant', label: 'Instant', description: 'Responds within minutes' },
  { value: 'same_day', label: 'Same Day', description: 'Responds within hours' },
  { value: 'few_days', label: 'Few Days', description: 'Responds within 2-3 days' },
  { value: 'weekly', label: 'Weekly', description: 'Responds once a week or less' },
]

const SPECTRUM_LABELS: Record<keyof PersonalitySpectrums, { left: string; right: string }> = {
  introvertExtrovert: { left: 'Introvert', right: 'Extrovert' },
  intuitiveObservant: { left: 'Intuitive', right: 'Observant' },
  thinkingFeeling: { left: 'Thinking', right: 'Feeling' },
  judgingProspecting: { left: 'Judging', right: 'Prospecting' },
  assertiveTurbulent: { left: 'Assertive', right: 'Turbulent' },
}

// Character limits
const MAX_DESCRIPTION_LENGTH = 12000
const MAX_BACKSTORY_LENGTH = 12000

// MBTI Calibration Data
const MBTI_CALIBRATION: Record<string, {
  spectrums: PersonalitySpectrums
  habits: string[]
  skills: string[]
  speechPatterns: string[]
}> = {
  INTJ: {
    spectrums: { introvertExtrovert: 15, intuitiveObservant: 25, thinkingFeeling: 20, judgingProspecting: 25, assertiveTurbulent: 35 },
    habits: ['Plans everything in advance', 'Maintains detailed schedules', 'Researches extensively before decisions', 'Regularly analyzes and optimizes routines'],
    skills: ['Strategic planning', 'Systems analysis', 'Long-term vision', 'Problem-solving', 'Independent research'],
    speechPatterns: ['Speaks precisely and directly', 'Uses technical terminology', 'Pauses to think before responding', 'Avoids small talk', 'States conclusions before explanations']
  },
  INTP: {
    spectrums: { introvertExtrovert: 20, intuitiveObservant: 20, thinkingFeeling: 25, judgingProspecting: 80, assertiveTurbulent: 55 },
    habits: ['Gets lost in thought', 'Stays up late exploring ideas', 'Collects information on diverse topics', 'Procrastinates on practical tasks'],
    skills: ['Theoretical analysis', 'Pattern recognition', 'Logical reasoning', 'Creative problem-solving', 'Abstract thinking'],
    speechPatterns: ['Uses qualifiers like "possibly" and "theoretically"', 'Goes on tangents', 'Asks many questions', 'Struggles with small talk', 'Explains concepts in depth']
  },
  ENTJ: {
    spectrums: { introvertExtrovert: 85, intuitiveObservant: 30, thinkingFeeling: 25, judgingProspecting: 20, assertiveTurbulent: 25 },
    habits: ['Sets ambitious goals', 'Takes charge in group situations', 'Efficiently manages time', 'Constantly seeks self-improvement'],
    skills: ['Leadership', 'Strategic planning', 'Decision-making', 'Public speaking', 'Organization'],
    speechPatterns: ['Speaks confidently and assertively', 'Gives direct commands', 'Focuses on efficiency', 'Uses decisive language', 'Challenges others ideas']
  },
  ENTP: {
    spectrums: { introvertExtrovert: 80, intuitiveObservant: 25, thinkingFeeling: 30, judgingProspecting: 85, assertiveTurbulent: 45 },
    habits: ['Starts many projects', 'Debates for fun', 'Seeks novel experiences', 'Quickly loses interest in routine'],
    skills: ['Debate and persuasion', 'Brainstorming', 'Improvisation', 'Seeing multiple perspectives', 'Innovation'],
    speechPatterns: ['Plays devil advocate', 'Uses witty remarks', 'Jumps between topics', 'Challenges assumptions', 'Asks provocative questions']
  },
  INFJ: {
    spectrums: { introvertExtrovert: 25, intuitiveObservant: 20, thinkingFeeling: 80, judgingProspecting: 30, assertiveTurbulent: 60 },
    habits: ['Reflects deeply on conversations', 'Keeps a journal', 'Seeks meaningful connections', 'Plans for the future'],
    skills: ['Understanding others motivations', 'Writing', 'Counseling', 'Long-term planning', 'Seeing patterns in human behavior'],
    speechPatterns: ['Speaks thoughtfully and carefully', 'Uses metaphors', 'Focuses on deeper meaning', 'Listens more than talks', 'Asks about feelings']
  },
  INFP: {
    spectrums: { introvertExtrovert: 20, intuitiveObservant: 25, thinkingFeeling: 85, judgingProspecting: 75, assertiveTurbulent: 70 },
    habits: ['Daydreams frequently', 'Creates art or writes', 'Seeks authentic experiences', 'Reflects on personal values'],
    skills: ['Creative writing', 'Empathy', 'Artistic expression', 'Seeing potential in others', 'Mediating conflicts'],
    speechPatterns: ['Uses poetic language', 'Speaks about feelings and values', 'Avoids conflict', 'Goes on tangents about ideas', 'Expresses individuality']
  },
  ENFJ: {
    spectrums: { introvertExtrovert: 85, intuitiveObservant: 30, thinkingFeeling: 80, judgingProspecting: 25, assertiveTurbulent: 40 },
    habits: ['Organizes social events', 'Checks in on friends regularly', 'Mentors others', 'Volunteers for causes'],
    skills: ['Leadership', 'Public speaking', 'Empathy', 'Mediating conflicts', 'Motivating others'],
    speechPatterns: ['Uses encouraging language', 'Asks about others wellbeing', 'Gives compliments freely', 'Speaks warmly', 'Inspires action']
  },
  ENFP: {
    spectrums: { introvertExtrovert: 80, intuitiveObservant: 20, thinkingFeeling: 80, judgingProspecting: 85, assertiveTurbulent: 60 },
    habits: ['Starts new hobbies frequently', 'Connects people together', 'Shares ideas enthusiastically', 'Seeks new experiences'],
    skills: ['Brainstorming', 'Networking', 'Storytelling', 'Improvisation', 'Motivating others'],
    speechPatterns: ['Speaks enthusiastically', 'Uses exclamation points', 'Jumps between topics excitedly', 'Shares personal stories', 'Uses humor']
  },
  ISTJ: {
    spectrums: { introvertExtrovert: 20, intuitiveObservant: 80, thinkingFeeling: 35, judgingProspecting: 15, assertiveTurbulent: 30 },
    habits: ['Follows strict routines', 'Keeps detailed records', 'Fulfills duties reliably', 'Prepares thoroughly'],
    skills: ['Organization', 'Attention to detail', 'Reliability', 'Data analysis', 'Following procedures'],
    speechPatterns: ['Speaks factually', 'References past experiences', 'Uses precise language', 'Avoids speculation', 'Sticks to the point']
  },
  ISFJ: {
    spectrums: { introvertExtrovert: 25, intuitiveObservant: 80, thinkingFeeling: 85, judgingProspecting: 20, assertiveTurbulent: 55 },
    habits: ['Remembers important dates', 'Helps others practically', 'Maintains traditions', 'Creates comfortable environments'],
    skills: ['Attention to detail', 'Supporting others', 'Remembering details about people', 'Creating harmony', 'Practical problem-solving'],
    speechPatterns: ['Speaks warmly but quietly', 'Asks about others needs', 'Uses supportive language', 'Avoids conflict', 'Remembers past conversations']
  },
  ESTJ: {
    spectrums: { introvertExtrovert: 85, intuitiveObservant: 80, thinkingFeeling: 35, judgingProspecting: 15, assertiveTurbulent: 25 },
    habits: ['Organizes others', 'Follows and enforces rules', 'Takes responsibility seriously', 'Plans social activities'],
    skills: ['Management', 'Organization', 'Decision-making', 'Efficiency', 'Traditional leadership'],
    speechPatterns: ['Gives clear instructions', 'Speaks authoritatively', 'Values tradition and order', 'Expects compliance', 'Focuses on facts']
  },
  ESFJ: {
    spectrums: { introvertExtrovert: 90, intuitiveObservant: 80, thinkingFeeling: 85, judgingProspecting: 20, assertiveTurbulent: 45 },
    habits: ['Plans social gatherings', 'Checks on friends and family', 'Volunteers in community', 'Remembers everyones preferences'],
    skills: ['Social coordination', 'Empathy', 'Event planning', 'Creating harmony', 'Supporting others'],
    speechPatterns: ['Speaks warmly and inclusively', 'Uses we language', 'Asks about others feelings', 'Gives praise freely', 'Avoids controversial topics']
  },
  ISTP: {
    spectrums: { introvertExtrovert: 25, intuitiveObservant: 80, thinkingFeeling: 35, judgingProspecting: 85, assertiveTurbulent: 35 },
    habits: ['Takes things apart to understand them', 'Enjoys hands-on activities', 'Acts spontaneously', 'Problem-solves practically'],
    skills: ['Troubleshooting', 'Technical skills', 'Crisis management', 'Practical problem-solving', 'Working with tools'],
    speechPatterns: ['Speaks sparingly', 'Uses concise language', 'Focuses on facts', 'Avoids emotional topics', 'Goes straight to the point']
  },
  ISFP: {
    spectrums: { introvertExtrovert: 20, intuitiveObservant: 80, thinkingFeeling: 85, judgingProspecting: 80, assertiveTurbulent: 65 },
    habits: ['Creates art or music', 'Appreciates beauty', 'Lives in the moment', 'Follows personal values'],
    skills: ['Artistic expression', 'Noticing aesthetic details', 'Adapting to situations', 'Understanding others feelings', 'Hands-on creativity'],
    speechPatterns: ['Speaks quietly and gently', 'Avoids confrontation', 'Uses sensory descriptions', 'Expresses through actions not words', 'Values authenticity']
  },
  ESTP: {
    spectrums: { introvertExtrovert: 90, intuitiveObservant: 80, thinkingFeeling: 40, judgingProspecting: 90, assertiveTurbulent: 30 },
    habits: ['Seeks thrills', 'Acts before thinking', 'Enjoys physical activities', 'Lives in the moment'],
    skills: ['Quick thinking', 'Negotiation', 'Physical coordination', 'Improvisation', 'Risk assessment'],
    speechPatterns: ['Speaks quickly and directly', 'Uses action-oriented language', 'Makes quick decisions', 'Enjoys banter', 'Focuses on the present']
  },
  ESFP: {
    spectrums: { introvertExtrovert: 95, intuitiveObservant: 85, thinkingFeeling: 80, judgingProspecting: 90, assertiveTurbulent: 50 },
    habits: ['Loves being center of attention', 'Plans spontaneous adventures', 'Enjoys entertaining others', 'Lives for the moment'],
    skills: ['Performance', 'Social skills', 'Improvization', 'Making others happy', 'Hands-on activities'],
    speechPatterns: ['Speaks enthusiastically', 'Uses expressive body language', 'Tells engaging stories', 'Focuses on fun', 'Inclusive language']
  }
}

interface PersonaFormProps {
  isOpen: boolean
  onClose: () => void
  persona?: Persona | null
  onSave: (data: FormData) => Promise<void>
}

interface FormData {
  name: string
  avatarUrl: string | null
  description: string | null
  archetype: string | null
  gender: string | null
  pronouns: string | null
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
  themeEnabled: boolean
  rpStyle: string | null
  rpPreferredGenders: string[]
  rpGenres: string[]
  rpLimits: string[]
  rpThemes: string[]
  rpExperienceLevel: string | null
  rpResponseTime: string | null
  connections?: {
    characterName: string
    relationshipType: string
    specificRole: string | null
    characterAge: number | null
    description: string | null
  }[]
}

const defaultSpectrums: PersonalitySpectrums = {
  introvertExtrovert: 50,
  intuitiveObservant: 50,
  thinkingFeeling: 50,
  judgingProspecting: 50,
  assertiveTurbulent: 50,
}

const defaultFormData: FormData = {
  name: '',
  avatarUrl: null,
  description: null,
  archetype: null,
  gender: null,
  pronouns: null,
  age: null,
  tags: [],
  personalityDescription: null,
  personalitySpectrums: defaultSpectrums,
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
  themeEnabled: false,
  rpStyle: null,
  rpPreferredGenders: [],
  rpGenres: [],
  rpLimits: [],
  rpThemes: [],
  rpExperienceLevel: null,
  rpResponseTime: null,
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
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-purple-500/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-fuchsia-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/30 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
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

// Connection Card Component
function ConnectionCard({
  connection,
  onUpdate,
  onDelete,
}: {
  connection: PersonaConnection & { isNew?: boolean }
  onUpdate: (data: Partial<PersonaConnection>) => void
  onDelete: () => void
}) {
  return (
    <div className="persona-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-purple-100">{connection.characterName || 'New Connection'}</span>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-purple-400/60">Character Name</Label>
          <Input
            value={connection.characterName}
            onChange={(e) => onUpdate({ characterName: e.target.value })}
            placeholder="Name"
            className="h-9 text-sm bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-purple-400/60">Relationship</Label>
          <select
            value={connection.relationshipType}
            onChange={(e) => onUpdate({ relationshipType: e.target.value })}
            className="w-full h-9 px-2 rounded-lg bg-purple-500/5 border border-purple-500/20 text-purple-100 text-sm"
          >
            <option value="" className="bg-[#1a1230]">Select...</option>
            {RELATIONSHIP_TYPES.map(type => (
              <option key={type} value={type} className="bg-[#1a1230]">{type}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-purple-400/60">Specific Role</Label>
          <Input
            value={connection.specificRole || ''}
            onChange={(e) => onUpdate({ specificRole: e.target.value || null })}
            placeholder="e.g., Father, Ex..."
            className="h-9 text-sm bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-purple-400/60">Age</Label>
          <Input
            type="number"
            value={connection.characterAge || ''}
            onChange={(e) => onUpdate({ characterAge: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="Age"
            className="h-9 text-sm bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs text-purple-400/60">Description</Label>
        <Textarea
          value={connection.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value || null })}
          placeholder="Describe the relationship..."
          className="text-sm resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
          rows={2}
        />
      </div>
    </div>
  )
}

const tabs = [
  { name: 'Overview', icon: User },
  { name: 'Personality', icon: Heart },
  { name: 'Attributes', icon: Shield },
  { name: 'Backstory', icon: BookOpen },
  { name: 'Connections', icon: Users },
  { name: 'MBTI', icon: Brain },
  { name: 'RP Prefs', icon: Sparkles },
]

// Main Form Component
export function PersonaForm({ isOpen, onClose, persona, onSave }: PersonaFormProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [connections, setConnections] = useState<(PersonaConnection & { isNew?: boolean })[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Initialize form with persona data
  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name,
        avatarUrl: persona.avatarUrl,
        description: persona.description,
        archetype: persona.archetype,
        gender: persona.gender,
        pronouns: persona.pronouns || null,
        age: persona.age,
        tags: persona.tags || [],
        personalityDescription: persona.personalityDescription,
        personalitySpectrums: persona.personalitySpectrums || defaultSpectrums,
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
        rpStyle: persona.rpStyle || null,
        rpPreferredGenders: persona.rpPreferredGenders || [],
        rpGenres: persona.rpGenres || [],
        rpLimits: persona.rpLimits || [],
        rpThemes: persona.rpThemes || [],
        rpExperienceLevel: persona.rpExperienceLevel || null,
        rpResponseTime: persona.rpResponseTime || null,
      })
      setConnections(persona.connections || [])
    } else {
      setFormData(defaultFormData)
      setConnections([])
    }
    setActiveTab(0)
    setError('')
  }, [persona, isOpen])
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    setError('')
    
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })
      
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, avatarUrl: data.url || data.avatarUrl }))
      } else {
        throw new Error('Upload failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Name is required')
      setActiveTab(0)
      return
    }
    
    setIsSaving(true)
    setError('')
    
    try {
      const connectionsData = connections
        .filter(c => c.characterName && c.relationshipType)
        .map(c => ({
          characterName: c.characterName,
          relationshipType: c.relationshipType,
          specificRole: c.specificRole,
          characterAge: c.characterAge,
          description: c.description,
        }))
      
      await onSave({
        ...formData,
        connections: connectionsData,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }
  
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const addNewConnection = () => {
    setConnections(prev => [...prev, {
      id: `new-${Date.now()}`,
      personaId: persona?.id || '',
      characterName: '',
      relationshipType: '',
      specificRole: null,
      characterAge: null,
      description: null,
      isNew: true,
    }])
  }
  
  const updateConnection = (index: number, data: Partial<PersonaConnection>) => {
    setConnections(prev => prev.map((c, i) => i === index ? { ...c, ...data } : c))
  }
  
  const removeConnection = (index: number) => {
    setConnections(prev => prev.filter((_, i) => i !== index))
  }
  
  const nextTab = () => setActiveTab(prev => Math.min(prev + 1, tabs.length - 1))
  const prevTab = () => setActiveTab(prev => Math.max(prev - 1, 0))
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="persona-modal max-w-4xl h-[90vh] p-0 overflow-hidden flex flex-col bg-[#12091f] border-purple-500/20">
        <DialogHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b border-purple-500/10 flex-shrink-0">
          <div>
            <DialogTitle className="text-xl font-bold persona-gradient-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              {persona ? 'Edit Character' : 'Create Character'}
            </DialogTitle>
            <DialogDescription className="text-purple-400/60">
              {persona ? 'Update your character identity.' : 'Create a new character to roleplay as.'}
            </DialogDescription>
          </div>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="border-b border-purple-500/10 px-6 flex items-center gap-1 overflow-x-auto flex-shrink-0">
          {tabs.map((tab, i) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === i 
                    ? 'text-purple-300 border-purple-500' 
                    : 'text-purple-400/60 border-transparent hover:text-purple-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            )
          })}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex-shrink-0">
            {error}
          </div>
        )}
        
        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* Overview Tab */}
          {activeTab === 0 && (
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-colors" />
                  <Avatar className="w-28 h-28 border-2 border-purple-500/40 relative persona-avatar-glow">
                    <AvatarImage src={formData.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-2xl font-semibold">
                      {formData.name.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading} 
                    className="absolute bottom-0 right-0 w-9 h-9 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-lg hover:scale-110 border-2 border-[#1a1230]"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Camera className="w-4 h-4 text-white" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
                <p className="text-xs text-purple-400/50">Click camera to upload avatar</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-purple-200/80">Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter character name"
                  maxLength={50}
                  className="h-11 bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <StyledSelect
                  label="Archetype"
                  value={formData.archetype || ''}
                  onChange={(v) => updateField('archetype', v || null)}
                  options={ARCHETYPES}
                  placeholder="Select archetype..."
                />
                
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
                  <Label className="text-purple-200/80">Age</Label>
                  <Input
                    type="number"
                    value={formData.age ?? ''}
                    onChange={(e) => updateField('age', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Character age"
                    className="h-11 bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-purple-200/80">Species</Label>
                  <Input
                    value={formData.species || ''}
                    onChange={(e) => updateField('species', e.target.value || null)}
                    placeholder="e.g., Human, Elf..."
                    className="h-11 bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                  />
                </div>
                
                {/* Profile Theme Toggle */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <div>
                      <p className="font-medium text-purple-100">Enable Profile Theme</p>
                      <p className="text-xs text-purple-400/60">Apply your purchased profile theme to this character</p>
                    </div>
                    <button
                      onClick={() => updateField('themeEnabled', !formData.themeEnabled)}
                      className={`w-12 h-6 rounded-full transition-all ${
                        formData.themeEnabled ? 'bg-purple-500' : 'bg-purple-500/20'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                        formData.themeEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-purple-200/80">Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value || null)}
                  placeholder="Describe your character..."
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  rows={6}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40"
                />
                <p className="text-xs text-purple-400/50">{(formData.description || '').length}/{MAX_DESCRIPTION_LENGTH} characters</p>
              </div>
              
              <TagInput
                label="Tags"
                tags={formData.tags}
                onChange={(tags) => updateField('tags', tags)}
                placeholder="Add tags (e.g., Fantasy, Modern...)"
              />
            </div>
          )}
          
          {/* Personality Tab */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-purple-200/80">Personality Description</Label>
                <Textarea
                  value={formData.personalityDescription || ''}
                  onChange={(e) => updateField('personalityDescription', e.target.value || null)}
                  placeholder="Describe your character's personality..."
                  maxLength={2000}
                  rows={4}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                />
              </div>
              
              <div className="space-y-4">
                <Label className="text-purple-200/80">Personality Spectrums</Label>
                <p className="text-xs text-purple-400/60 -mt-3">Drag the sliders to position your character on each spectrum</p>
                
                <div className="grid gap-6">
                  {(Object.keys(SPECTRUM_LABELS) as (keyof PersonalitySpectrums)[]).map(key => (
                    <SpectrumSlider
                      key={key}
                      label=""
                      value={formData.personalitySpectrums[key]}
                      onChange={(v) => updateField('personalitySpectrums', { ...formData.personalitySpectrums, [key]: v })}
                      leftLabel={SPECTRUM_LABELS[key].left}
                      rightLabel={SPECTRUM_LABELS[key].right}
                    />
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <TagInput label="Strengths" tags={formData.strengths} onChange={(strengths) => updateField('strengths', strengths)} placeholder="Add strengths..." />
                <TagInput label="Flaws" tags={formData.flaws} onChange={(flaws) => updateField('flaws', flaws)} placeholder="Add flaws..." />
                <TagInput label="Values" tags={formData.values} onChange={(values) => updateField('values', values)} placeholder="Add values..." />
                <TagInput label="Fears" tags={formData.fears} onChange={(fears) => updateField('fears', fears)} placeholder="Add fears..." />
              </div>
            </div>
          )}
          
          {/* Attributes Tab */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <TagInput label="Likes" tags={formData.likes} onChange={(likes) => updateField('likes', likes)} placeholder="Add likes..." />
                <TagInput label="Dislikes" tags={formData.dislikes} onChange={(dislikes) => updateField('dislikes', dislikes)} placeholder="Add dislikes..." />
                <TagInput label="Hobbies" tags={formData.hobbies} onChange={(hobbies) => updateField('hobbies', hobbies)} placeholder="Add hobbies..." />
                <TagInput label="Skills" tags={formData.skills} onChange={(skills) => updateField('skills', skills)} placeholder="Add skills..." />
                <TagInput label="Languages" tags={formData.languages} onChange={(languages) => updateField('languages', languages)} placeholder="Add languages..." />
                <TagInput label="Habits" tags={formData.habits} onChange={(habits) => updateField('habits', habits)} placeholder="Add habits..." />
              </div>
              
              <TagInput
                label="Speech Patterns"
                tags={formData.speechPatterns}
                onChange={(speechPatterns) => updateField('speechPatterns', speechPatterns)}
                placeholder="Add speech patterns (e.g., speaks softly...)"
              />
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
                  placeholder="Write your character's backstory..."
                  maxLength={MAX_BACKSTORY_LENGTH}
                  rows={8}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                />
                <p className="text-xs text-purple-400/50">{(formData.backstory || '').length}/{MAX_BACKSTORY_LENGTH} characters</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-purple-200/80">Appearance</Label>
                <Textarea
                  value={formData.appearance || ''}
                  onChange={(e) => updateField('appearance', e.target.value || null)}
                  placeholder="Describe your character's physical appearance..."
                  maxLength={5000}
                  rows={6}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                />
                <p className="text-xs text-purple-400/50">{(formData.appearance || '').length}/5000 characters</p>
              </div>
            </div>
          )}
          
          {/* Connections Tab */}
          {activeTab === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-purple-200/80">Character Connections</Label>
                  <p className="text-xs text-purple-400/60 mt-1">Add relationships with other characters (real or fictional)</p>
                </div>
                <Button
                  onClick={addNewConnection}
                  className="btn-persona flex items-center gap-2"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Connection
                </Button>
              </div>
              
              {connections.length === 0 ? (
                <div className="text-center py-8 rounded-lg border border-dashed border-purple-500/30">
                  <Users className="w-8 h-8 text-purple-400/40 mx-auto mb-2" />
                  <p className="text-purple-300/60">No connections yet</p>
                  <p className="text-xs text-purple-400/40">Add relationships to build your character's world</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {connections.map((connection, index) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      onUpdate={(data) => updateConnection(index, data)}
                      onDelete={() => removeConnection(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* MBTI Tab */}
          {activeTab === 5 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-purple-200/80">MBTI Personality Type</Label>
                <p className="text-xs text-purple-400/60">Select the Myers-Briggs Type that best fits your character</p>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {MBTI_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => updateField('mbtiType', type === formData.mbtiType ? null : type)}
                    className={`p-4 rounded-xl text-center font-bold text-lg transition-all ${
                      formData.mbtiType === type 
                        ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25' 
                        : 'persona-card text-purple-300 hover:border-purple-500/40'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              
              {formData.mbtiType && (
                <div className="space-y-4">
                  <div className="persona-card p-4 rounded-xl">
                    <h4 className="font-medium text-purple-200 mb-2">{formData.mbtiType} Profile</h4>
                    <p className="text-sm text-purple-400/70">
                      {formData.mbtiType.startsWith('I') ? 'Introverted' : 'Extroverted'}, {' '}
                      {formData.mbtiType[1] === 'N' ? 'Intuitive' : 'Observant'}, {' '}
                      {formData.mbtiType[2] === 'T' ? 'Thinking' : 'Feeling'}, {' '}
                      {formData.mbtiType[3] === 'J' ? 'Judging' : 'Prospecting'}
                    </p>
                  </div>
                  
                  <div className="persona-card p-4 rounded-xl border-purple-500/30 bg-purple-500/5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-purple-200 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-fuchsia-400" />
                          Auto-Calibration
                        </h4>
                        <p className="text-xs text-purple-400/60 mt-1">
                          Apply {formData.mbtiType} traits to Personality & Attributes
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          const calibration = MBTI_CALIBRATION[formData.mbtiType!]
                          if (calibration) {
                            // Apply personality spectrums
                            setFormData(prev => ({
                              ...prev,
                              personalitySpectrums: calibration.spectrums,
                              habits: [...new Set([...prev.habits, ...calibration.habits])],
                              skills: [...new Set([...prev.skills, ...calibration.skills])],
                              speechPatterns: [...new Set([...prev.speechPatterns, ...calibration.speechPatterns])],
                            }))
                          }
                        }}
                        className="btn-persona"
                        size="sm"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Apply Calibration
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-purple-400/60">Personality</span>
                        <p className="text-purple-300 mt-1">5 spectrums adjusted</p>
                      </div>
                      <div>
                        <span className="text-purple-400/60">Attributes</span>
                        <p className="text-purple-300 mt-1">Habits, Skills, Speech</p>
                      </div>
                      <div>
                        <span className="text-purple-400/60">Suggestions</span>
                        <p className="text-purple-300 mt-1">{MBTI_CALIBRATION[formData.mbtiType]?.habits.length || 0} habits, {MBTI_CALIBRATION[formData.mbtiType]?.skills.length || 0} skills</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* RP Preferences Tab */}
          {activeTab === 6 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-purple-200/80">Roleplay Preferences</Label>
                <p className="text-xs text-purple-400/60">Set your roleplay style and preferences to help find compatible partners</p>
              </div>
              
              {/* RP Style */}
              <div className="space-y-3">
                <Label className="text-purple-200/80">Writing Style</Label>
                <div className="grid grid-cols-2 gap-3">
                  {RP_STYLES.map(style => (
                    <button
                      key={style.value}
                      onClick={() => updateField('rpStyle', formData.rpStyle === style.value ? null : style.value)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        formData.rpStyle === style.value 
                          ? 'bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border-purple-500/50 text-purple-100 border' 
                          : 'persona-card text-purple-300 hover:border-purple-500/40'
                      }`}
                    >
                      <p className="font-medium">{style.label}</p>
                      <p className="text-xs text-purple-400/60 mt-1">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Preferred Genders for RP */}
              <div className="space-y-3">
                <Label className="text-purple-200/80">Preferred Character Genders</Label>
                <p className="text-xs text-purple-400/60">Select which gender characters you prefer to RP with</p>
                <div className="flex flex-wrap gap-2">
                  {RP_GENDERS.map(gender => (
                    <button
                      key={gender}
                      onClick={() => {
                        const current = formData.rpPreferredGenders
                        if (current.includes(gender)) {
                          updateField('rpPreferredGenders', current.filter(g => g !== gender))
                        } else {
                          updateField('rpPreferredGenders', [...current, gender])
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        formData.rpPreferredGenders.includes(gender)
                          ? 'bg-purple-500/30 border border-purple-500/50 text-purple-100'
                          : 'bg-purple-500/5 border border-purple-500/20 text-purple-300 hover:border-purple-500/40'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Preferred Genres */}
              <TagInput
                label="Preferred Genres"
                tags={formData.rpGenres}
                onChange={(tags) => updateField('rpGenres', tags)}
                placeholder="Add genres (e.g., Fantasy, Romance...)"
              />
              
              {/* Limits/Triggers */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-purple-200/80">Limits & Triggers</Label>
                  <span className="text-xs text-red-400/60 bg-red-500/10 px-2 py-0.5 rounded-full">Avoid</span>
                </div>
                <Textarea
                  value={formData.rpLimits.join(', ')}
                  onChange={(e) => updateField('rpLimits', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="Topics/themes you want to avoid (comma-separated)..."
                  rows={2}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                />
                <p className="text-xs text-purple-400/50">Separate with commas</p>
              </div>
              
              {/* Themes & Topics */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-purple-200/80">Themes & Topics</Label>
                  <span className="text-xs text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded-full">Prefer</span>
                </div>
                <Textarea
                  value={formData.rpThemes.join(', ')}
                  onChange={(e) => updateField('rpThemes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="Themes and topics you enjoy in RP (comma-separated)..."
                  rows={2}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                />
                <p className="text-xs text-purple-400/50">Separate with commas</p>
              </div>
              
              {/* Experience Level */}
              <div className="space-y-3">
                <Label className="text-purple-200/80">Experience Level</Label>
                <div className="grid grid-cols-2 gap-3">
                  {RP_EXPERIENCE_LEVELS.map(level => (
                    <button
                      key={level.value}
                      onClick={() => updateField('rpExperienceLevel', formData.rpExperienceLevel === level.value ? null : level.value)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        formData.rpExperienceLevel === level.value 
                          ? 'bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border-purple-500/50 text-purple-100 border' 
                          : 'persona-card text-purple-300 hover:border-purple-500/40'
                      }`}
                    >
                      <p className="font-medium text-sm">{level.label}</p>
                      <p className="text-xs text-purple-400/60">{level.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Response Time */}
              <div className="space-y-3">
                <Label className="text-purple-200/80">Typical Response Time</Label>
                <div className="grid grid-cols-2 gap-3">
                  {RP_RESPONSE_TIMES.map(time => (
                    <button
                      key={time.value}
                      onClick={() => updateField('rpResponseTime', formData.rpResponseTime === time.value ? null : time.value)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        formData.rpResponseTime === time.value 
                          ? 'bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border-purple-500/50 text-purple-100 border' 
                          : 'persona-card text-purple-300 hover:border-purple-500/40'
                      }`}
                    >
                      <p className="font-medium text-sm">{time.label}</p>
                      <p className="text-xs text-purple-400/60">{time.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer - Fixed at bottom */}
        <div className="border-t border-purple-500/10 p-4 flex items-center justify-between bg-[#12091f]/80 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              onClick={prevTab}
              disabled={activeTab === 0}
              variant="ghost"
              className="text-purple-300 hover:text-purple-100 hover:bg-purple-500/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={onClose} variant="ghost" className="text-purple-400 hover:text-purple-200 hover:bg-purple-500/10">
              Cancel
            </Button>
            {activeTab < tabs.length - 1 ? (
              <Button onClick={nextTab} className="btn-persona">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()} className="btn-persona">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {persona ? 'Save Changes' : 'Create Character'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
