'use client'

import { useState, useRef, useEffect, useCallback, startTransition } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  Camera, Loader2, Sparkles, X, Plus, User, Heart, Shield, 
  BookOpen, Users, Brain, ChevronLeft, ChevronRight,
  Trash2, Flame, AlertTriangle, Upload, Lock, Check,
  Save, Clock, MessageSquare, Wand2, Target, Hexagon, Award, Compass, Layers, PieChart
} from 'lucide-react'
import { Persona, PersonaConnection, PersonalitySpectrums, BigFiveTraits, HexacoTraits, DiscTraits, EnneagramTraits, StrengthsFinderTraits, defaultBigFive, defaultHexaco, DISC_LABELS, ENNEAGRAM_TYPES, STRENGTHS_FINDER_CATEGORIES, defaultDisc, defaultEnneagram, defaultStrengthsFinder } from '@/stores/persona-store'
import { MBTI_CALIBRATION_SEEDS, CalibrationSeed, SEED_LABELS, ENNEAGRAM_WING_OPTIONS, getWingRarity } from '@/lib/mbti-calibration-data'
import { useVariantAccent, useVariantCombo } from '@/lib/ui-variant-styles'

// ─── Constants ────────────────────────────────────────────────────────────────
const ARCHETYPES = ['Hero', 'Villain', 'Antihero', 'Mentor', 'Sidekick', 'Trickster', 'Lover', 'Everyman', 'Rebel', 'Creator', 'Caregiver', 'Explorer', 'Sage', 'Innocent', 'Ruler', 'Other']
const GENDERS = ['Male', 'Female', 'Non-binary', 'Genderfluid', 'Agender', 'Other', 'Prefer not to say']
const PRONOUNS = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'any/all', 'xe/xem', 'ze/zir', 'Other']
const RELATIONSHIP_TYPES = ['Family', 'Friend', 'Romance', 'Rival', 'Ally', 'Enemy', 'Acquaintance', 'Colleague', 'Mentor', 'Student', 'Other']
const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']

const MBTI_DESCRIPTIONS: Record<string, string> = {
  INTJ: 'The Architect - Strategic and independent',
  INTP: 'The Logician - Analytical and curious',
  ENTJ: 'The Commander - Bold and strategic leader',
  ENTP: 'The Debater - Innovative and energetic',
  INFJ: 'The Advocate - Quietly inspiring and idealistic',
  INFP: 'The Mediator - Poetic and compassionate',
  ENFJ: 'The Protagonist - Charismatic and inspiring',
  ENFP: 'The Campaigner - Enthusiastic and creative',
  ISTJ: 'The Logistician - Practical and fact-minded',
  ISFJ: 'The Defender - Very dedicated and warm protector',
  ESTJ: 'The Executive - Excellent organizer and manager',
  ESFJ: 'The Consul - Extraordinarily caring and social',
  ISTP: 'The Virtuoso - Bold and practical experimenter',
  ISFP: 'The Adventurer - Flexible and charming artist',
  ESTP: 'The Entrepreneur - Smart and energetic perceiver',
  ESFP: 'The Entertainer - Spontaneous and enthusiastic',
}

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

// Big Five (OCEAN) personality trait labels
const BIG_FIVE_LABELS: Record<keyof BigFiveTraits, { left: string; right: string; description: string }> = {
  openness: { 
    left: 'Practical', 
    right: 'Open', 
    description: 'Openness to Experience — creativity, curiosity, appreciation for art' 
  },
  conscientiousness: { 
    left: 'Flexible', 
    right: 'Organized', 
    description: 'Conscientiousness — self-discipline, dutifulness, organization' 
  },
  extraversion: { 
    left: 'Reserved', 
    right: 'Social', 
    description: 'Extraversion — sociability, assertiveness, positive emotions' 
  },
  agreeableness: { 
    left: 'Competitive', 
    right: 'Cooperative', 
    description: 'Agreeableness — compassion, cooperation, trust' 
  },
  neuroticism: { 
    left: 'Stable', 
    right: 'Reactive', 
    description: 'Neuroticism — emotional sensitivity, anxiety, mood swings' 
  },
}

// HEXACO personality trait labels (6-factor model)
const HEXACO_LABELS: Record<keyof HexacoTraits, { left: string; right: string; description: string }> = {
  honestyHumility: { 
    left: 'Self-Serving', 
    right: 'Genuine', 
    description: 'Honesty-Humility — sincerity, fairness, modesty, avoiding greed' 
  },
  emotionality: { 
    left: 'Detached', 
    right: 'Sensitive', 
    description: 'Emotionality — emotional sensitivity, sentimentality, fearfulness' 
  },
  extraversion: { 
    left: 'Reserved', 
    right: 'Expressive', 
    description: 'Extraversion — sociability, expressiveness, optimism' 
  },
  agreeableness: { 
    left: 'Critical', 
    right: 'Tolerant', 
    description: 'Agreeableness — patience, tolerance, forgiveness vs. competitiveness' 
  },
  conscientiousness: { 
    left: 'Impulsive', 
    right: 'Disciplined', 
    description: 'Conscientiousness — organization, diligence, perfectionism' 
  },
  opennessToExperience: { 
    left: 'Conventional', 
    right: 'Creative', 
    description: 'Openness to Experience — creativity, unconventionality, intellectual curiosity' 
  },
}

// DISC Types
const DISC_TYPES = [
  { value: 'D', label: 'D - Dominance', description: 'Direct, results-oriented, firm', color: 'from-red-500 to-rose-400' },
  { value: 'I', label: 'I - Influence', description: 'Enthusiastic, optimistic, collaborative', color: 'from-amber-500 to-yellow-400' },
  { value: 'S', label: 'S - Steadiness', description: 'Patient, reliable, thoughtful', color: 'from-emerald-500 to-green-400' },
  { value: 'C', label: 'C - Conscientiousness', description: 'Analytical, detail-oriented, systematic', color: 'from-sky-500 to-blue-400' },
  { value: 'DI', label: 'DI', description: 'Dominant & Influential', color: 'from-red-500 to-amber-400' },
  { value: 'DS', label: 'DS', description: 'Dominant & Steady', color: 'from-red-500 to-emerald-400' },
  { value: 'DC', label: 'DC', description: 'Dominant & Conscientious', color: 'from-red-500 to-sky-400' },
  { value: 'IS', label: 'IS', description: 'Influential & Steady', color: 'from-amber-500 to-emerald-400' },
  { value: 'IC', label: 'IC', description: 'Influential & Conscientious', color: 'from-amber-500 to-sky-400' },
  { value: 'SC', label: 'SC', description: 'Steady & Conscientious', color: 'from-emerald-500 to-sky-400' },
]

// Enneagram Instinctual Variants
const INSTINCTUAL_VARIANTS = [
  { value: 'sp', label: 'Self-Preservation (sp)', description: 'Focus on safety, comfort, and resources' },
  { value: 'sx', label: 'Sexual/One-to-One (sx)', description: 'Focus on intensity, chemistry, and close bonds' },
  { value: 'so', label: 'Social (so)', description: 'Focus on belonging, recognition, and group dynamics' },
  { value: 'sp/sx', label: 'sp/sx', description: 'Self-Preservation primary, Sexual secondary' },
  { value: 'sp/so', label: 'sp/so', description: 'Self-Preservation primary, Social secondary' },
  { value: 'sx/sp', label: 'sx/sp', description: 'Sexual primary, Self-Preservation secondary' },
  { value: 'sx/so', label: 'sx/so', description: 'Sexual primary, Social secondary' },
  { value: 'so/sp', label: 'so/sp', description: 'Social primary, Self-Preservation secondary' },
  { value: 'so/sx', label: 'so/sx', description: 'Social primary, Sexual secondary' },
]

const ENNEAGRAM_WING_DESCRIPTIONS: Record<string, string> = {
  // Type 1 wings
  '1w2': 'The Advocate — principled with empathy',
  '1w9': 'The Idealist — principled with peacefulness',
  '1w3': 'The Reformer-Achiever — principled ambition',
  '1w4': 'The Perfectionist-Individualist — principled sensitivity',
  '1w5': 'The Philosopher — principled objectivity',
  '1w6': 'The Guardian — principled loyalty',
  '1w7': 'The Optimistic Reformer — principled enthusiasm',
  '1w8': 'The Champion — principled assertiveness',
  // Type 2 wings
  '2w1': 'The Servant — empathetic with principles',
  '2w3': 'The Host/Hostess — empathetic ambition',
  '2w4': 'The Giver-Individualist — empathetic depth',
  '2w9': 'The Peacemaker-Helper — empathetic harmony',
  '2w5': 'The Advisor — empathetic insight',
  '2w6': 'The Supporter — empathetic vigilance',
  '2w7': 'The Entertainer-Helper — empathetic joy',
  '2w8': 'The Protector-Helper — empathetic power',
  // Type 3 wings
  '3w2': 'The Charmer — ambitious with empathy',
  '3w4': 'The Professional — ambitious with depth',
  '3w1': 'The Achiever-Reformer — ambitious principles',
  '3w5': 'The Expert — ambitious intellect',
  '3w6': 'The Status-Seeker — ambitious loyalty',
  '3w7': 'The Visionary — ambitious enthusiasm',
  '3w8': 'The Power-Seeker — ambitious assertiveness',
  '3w9': 'The Ambitious Peacemaker — ambitious harmony',
  // Type 4 wings
  '4w3': 'The Aristocrat — sensitive with ambition',
  '4w5': 'The Bohemian — sensitive with intellect',
  '4w2': 'The Romantic-Helper — sensitive empathy',
  '4w6': 'The Individualist-Loyalist — sensitive vigilance',
  '4w1': 'The Artist-Reformer — sensitive principles',
  '4w7': 'The Free Spirit — sensitive enthusiasm',
  '4w8': 'The Rebel — sensitive assertiveness',
  '4w9': 'The Dreamer — sensitive harmony',
  // Type 5 wings
  '5w4': 'The Iconoclast — perceptive with depth',
  '5w6': 'The Problem Solver — perceptive with loyalty',
  '5w3': 'The Specialist — perceptive ambition',
  '5w7': 'The Innovator — perceptive enthusiasm',
  '5w1': 'The Thinker-Reformer — perceptive principles',
  '5w2': 'The Sage-Helper — perceptive empathy',
  '5w8': 'The Mastermind — perceptive assertiveness',
  '5w9': 'The Contemplative — perceptive harmony',
  // Type 6 wings
  '6w5': 'The Defender — loyal with intellect',
  '6w7': 'The Buddy — loyal with enthusiasm',
  '6w4': 'The Seeker — loyal with depth',
  '6w8': 'The Challenger-Loyalist — loyal assertiveness',
  '6w1': 'The Guardian-Reformer — loyal principles',
  '6w2': 'The Friend — loyal empathy',
  '6w3': 'The Loyal Achiever — loyal ambition',
  '6w9': 'The Traditionalist — loyal harmony',
  // Type 7 wings
  '7w6': 'The Entertainer — enthusiastic with loyalty',
  '7w8': 'The Realist — enthusiastic with power',
  '7w5': 'The Explorer — enthusiastic intellect',
  '7w9': 'The Optimist — enthusiastic harmony',
  '7w1': 'The Crusader — enthusiastic principles',
  '7w2': 'The Social Butterfly — enthusiastic empathy',
  '7w3': 'The Visionary-Performer — enthusiastic ambition',
  '7w4': 'The Aesthete — enthusiastic depth',
  // Type 8 wings
  '8w7': 'The Maverick — assertive with enthusiasm',
  '8w9': 'The Bear — assertive with receptiveness',
  '8w6': 'The Challenger-Loyalist — assertive vigilance',
  '8w1': 'The Reformer-Challenger — assertive principles',
  '8w2': 'The Protector-Benefactor — assertive empathy',
  '8w3': 'The Boss — assertive ambition',
  '8w4': 'The Warrior-Poet — assertive depth',
  '8w5': 'The Strategist — assertive intellect',
  // Type 9 wings
  '9w8': 'The Referee — peaceful with assertiveness',
  '9w1': 'The Dreamer-Reformer — peaceful principles',
  '9w7': 'The Adventurous Peacemaker — peaceful enthusiasm',
  '9w2': 'The Comforter — peaceful empathy',
  '9w3': 'The Peacemaker-Achiever — peaceful ambition',
  '9w4': 'The Mystic — peaceful depth',
  '9w5': 'The Philosopher-Peacemaker — peaceful intellect',
  '9w6': 'The Mediator-Loyalist — peaceful vigilance',
}

// Character limits
const MAX_DESCRIPTION_LENGTH = 12000
const MAX_BACKSTORY_LENGTH = 12000

// ─── Section Definitions ──────────────────────────────────────────────────────
const SECTIONS = [
  { name: 'Overview', icon: User, description: 'Basic identity and appearance' },
  { name: 'Personality', icon: Brain, description: 'Traits, spectrums, MBTI, DISC, Enneagram & more' },
  { name: 'Attributes', icon: Sparkles, description: 'Likes, skills, and habits' },
  { name: 'Backstory', icon: BookOpen, description: 'History and physical appearance' },
  { name: 'Connections', icon: Users, description: 'Relationships with other characters' },
  { name: 'RP Preferences', icon: Heart, description: 'Roleplay style and preferences' },
  { name: 'NSFW', icon: Shield, description: 'Mature content settings (18+)' },
]

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface PersonaFormProps {
  isOpen: boolean
  onClose: () => void
  persona?: Persona | null
  importedData?: any | null
  onSave: (data: FormData) => Promise<void>
  isUserAdult?: boolean
}

export interface FormData {
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
  disc: DiscTraits
  discType: string | null
  enneagram: EnneagramTraits
  strengthsFinder: StrengthsFinderTraits
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
  bigFive: defaultBigFive,
  hexaco: defaultHexaco,
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
  disc: defaultDisc,
  discType: null,
  enneagram: defaultEnneagram,
  strengthsFinder: defaultStrengthsFinder,
  themeEnabled: false,
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
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function TagInput({ 
  label, 
  tags, 
  onChange, 
  placeholder = 'Type and press Enter...',
  icon: Icon,
  suggestions,
  colorScheme = 'teal'
}: { 
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  icon?: React.ElementType
  suggestions?: string[]
  colorScheme?: 'teal' | 'amber' | 'rose' | 'emerald' | 'violet' | 'sky'
}) {
  const accent = useVariantAccent()
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const colorMap = {
    teal: { bg: accent.bgTint, text: accent.text, border: accent.borderSubtle, hover: `hover:${accent.bgHeavy}` },
    amber: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/20', hover: 'hover:bg-amber-500/25' },
    rose: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/20', hover: 'hover:bg-rose-500/25' },
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/20', hover: 'hover:bg-emerald-500/25' },
    violet: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/20', hover: 'hover:bg-violet-500/25' },
    sky: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/20', hover: 'hover:bg-sky-500/25' },
  }
  const colors = colorMap[colorScheme]
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()])
      }
      setInput('')
      setShowSuggestions(false)
    }
  }

  const addSuggestion = (suggestion: string) => {
    if (!tags.includes(suggestion)) {
      onChange([...tags, suggestion])
    }
    setShowSuggestions(false)
  }
  
  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  const filteredSuggestions = suggestions?.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  ).slice(0, 6)
  
  return (
    <div className="space-y-1.5 relative">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
        <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">{label}</Label>
        {tags.length > 0 && (
          <span className="text-[10px] text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded-full">{tags.length}</span>
        )}
      </div>
      <div 
        className={`flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] min-h-[40px] focus-within:${accent.borderMedium} focus-within:bg-white/[0.04] transition-all`}
        onClick={() => setShowSuggestions(true)}
      >
        {tags.map((tag, i) => (
          <span 
            key={i} 
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${colors.bg} ${colors.text} border ${colors.border} transition-all ${colors.hover} group`}
          >
            {tag}
            <button 
              onClick={(e) => { e.stopPropagation(); removeTag(i) }} 
              className="w-3.5 h-3.5 rounded-full opacity-50 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-xs text-slate-100 placeholder:text-slate-600"
        />
      </div>
      {showSuggestions && filteredSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 p-1.5 rounded-xl bg-[#1a1c24] border border-white/[0.08] shadow-xl shadow-black/40 max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, i) => (
            <button
              key={i}
              onMouseDown={() => addSuggestion(suggestion)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/[0.06] hover:${accent.text} transition-colors`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SpectrumSlider({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
  description,
  colorFrom = 'from-teal-500',
  colorTo = 'to-cyan-400',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  leftLabel: string
  rightLabel: string
  description?: string
  colorFrom?: string
  colorTo?: string
}) {
  const accent = useVariantAccent()
  const resolvedFrom = colorFrom === 'from-teal-500' ? accent.from : colorFrom
  const resolvedTo = colorTo === 'to-cyan-400' ? accent.to : colorTo
  return (
    <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] transition-colors group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{leftLabel}</span>
        {description && <span className="text-[10px] text-slate-600 hidden sm:block">{description}</span>}
        <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{rightLabel}</span>
      </div>
      <div className="relative">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-white/[0.06]" />
        <div 
          className={`absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full bg-gradient-to-r ${resolvedFrom} ${resolvedTo} transition-all duration-150`}
          style={{ width: `${value}%` }}
        />
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={`relative w-full h-6 rounded-full appearance-none cursor-pointer bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:${accent.borderStrong} [&::-webkit-slider-thumb]:${accent.to} [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:${accent.shadowGlow} [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:active:scale-110 [&::-webkit-slider-thumb]:transition-transform`}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${resolvedFrom} ${resolvedTo}`} />
          <span className="text-[10px] font-semibold text-slate-500">{value}%</span>
        </div>
      </div>
    </div>
  )
}

function StyledSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  icon: Icon,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  icon?: React.ElementType
}) {
  const accent = useVariantAccent()
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
        <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">{label}</Label>
      </div>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-10 px-3 pr-10 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-100 text-sm appearance-none cursor-pointer focus:outline-none focus:${accent.borderMedium} focus:bg-white/[0.04] transition-all hover:border-white/[0.12]`}
        >
          <option value="" className={`${accent.bgSurface} text-slate-400`}>{placeholder}</option>
          {options.map(opt => (
            <option key={opt} value={opt} className={`${accent.bgSurface} text-slate-100`}>{opt}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronRight className={`w-4 h-4 text-slate-400 group-focus-within:${accent.text} rotate-90 transition-colors`} />
        </div>
      </div>
    </div>
  )
}

function ConnectionCard({
  connection,
  onUpdate,
  onDelete,
}: {
  connection: PersonaConnection & { isNew?: boolean }
  onUpdate: (data: Partial<PersonaConnection>) => void
  onDelete: () => void
}) {
  const accent = useVariantAccent()
  return (
    <div className="p-4 space-y-3 bg-white/[0.02] border border-white/[0.08] rounded-xl hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent.fromSubtle} ${accent.toSubtle} flex items-center justify-center border ${accent.borderSubtle}`}>
            <Users className={`w-3.5 h-3.5 ${accent.text}`} />
          </div>
          <span className="font-medium text-slate-100 text-sm">{connection.characterName || 'New Connection'}</span>
        </div>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Character Name</Label>
          <Input
            value={connection.characterName}
            onChange={(e) => onUpdate({ characterName: e.target.value })}
            placeholder="Name"
            className={`h-9 text-sm bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:${accent.borderMedium} rounded-xl`}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Relationship</Label>
          <select
            value={connection.relationshipType}
            onChange={(e) => onUpdate({ relationshipType: e.target.value })}
            className={`w-full h-9 px-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-100 text-sm focus:${accent.borderMedium}`}
          >
            <option value="" className={`${accent.bgSurface}`}>Select...</option>
            {RELATIONSHIP_TYPES.map(type => (
              <option key={type} value={type} className={`${accent.bgSurface}`}>{type}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Specific Role</Label>
          <Input
            value={connection.specificRole || ''}
            onChange={(e) => onUpdate({ specificRole: e.target.value || null })}
            placeholder="e.g., Father, Ex..."
            className="h-9 text-sm bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-500 rounded-xl"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Age</Label>
          <Input
            type="number"
            value={connection.characterAge || ''}
            onChange={(e) => onUpdate({ characterAge: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="Age"
            className="h-9 text-sm bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-500 rounded-xl"
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Description</Label>
        <Textarea
          value={connection.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value || null })}
          placeholder="Describe the relationship..."
          className="text-sm resize-none bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-500 rounded-xl"
          rows={2}
        />
      </div>
    </div>
  )
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function SectionDivider({ label, color = 'teal' }: { label: string; color?: string }) {
  const accent = useVariantAccent()
  const colorMap: Record<string, string> = {
    teal: `${accent.fromSubtle} ${accent.textDim}`,
    rose: 'from-rose-500/20 text-rose-400/70',
    sky: 'from-sky-500/20 text-sky-400/70',
    amber: 'from-amber-500/20 text-amber-400/70',
    emerald: 'from-emerald-500/20 text-emerald-400/70',
    violet: 'from-violet-500/20 text-violet-400/70',
  }
  const colors = colorMap[color] || colorMap.teal
  return (
    <div className="flex items-center gap-2 pt-3">
      <div className={`h-px flex-1 bg-gradient-to-r ${colors.split(' ')[0]} to-transparent`} />
      <span className={`text-[10px] font-semibold uppercase tracking-widest ${colors.split(' ')[1]}`}>{label}</span>
      <div className={`h-px flex-1 bg-gradient-to-l ${colors.split(' ')[0]} to-transparent`} />
    </div>
  )
}

// ─── Main Form Component ──────────────────────────────────────────────────────
export function PersonaForm({ isOpen, onClose, persona, importedData, onSave, isUserAdult = false }: PersonaFormProps) {
  const accent = useVariantAccent()
  const combo = useVariantCombo()
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [connections, setConnections] = useState<(PersonaConnection & { isNew?: boolean })[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const [personalityTab, setPersonalityTab] = useState<string>('mbti')
  const [calibrationSeed, setCalibrationSeed] = useState<CalibrationSeed>('balanced')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importFileRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Compute visible sections based on age
  const visibleSections = isUserAdult ? SECTIONS : SECTIONS.filter(s => s.name !== 'NSFW')

  // Helper to safely parse array fields from imported data
  const safeArray = (val: any): string[] => {
    if (Array.isArray(val)) return val.map(String)
    if (typeof val === 'string') {
      try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed.map(String) : [] } catch { return [] }
    }
    return []
  }

  // Track changes for unsaved indicator
  useEffect(() => {
    if (isOpen) {
      startTransition(() => { setHasUnsavedChanges(false) })
    }
  }, [isOpen])

  // Mark as changed whenever form data updates
  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        if (hasUnsavedChanges) {
          setShowCloseConfirm(true)
        } else {
          onClose()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasUnsavedChanges, formData, connections])

  // Import persona from JSON file
  const handleImportInsideForm = () => {
    importFileRef.current?.click()
  }

  const handleImportFileInsideForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        const d = json.persona || json
        setFormData({
          name: d.name || '',
          avatarUrl: d.avatarUrl || null,
          description: d.description || null,
          archetype: d.archetype || null,
          gender: d.gender || null,
          pronouns: d.pronouns || null,
          age: typeof d.age === 'number' ? d.age : null,
          tags: safeArray(d.tags),
          personalityDescription: d.personalityDescription || null,
          personalitySpectrums: d.personalitySpectrums || defaultSpectrums,
          bigFive: d.bigFive || defaultBigFive,
          hexaco: d.hexaco || defaultHexaco,
          strengths: safeArray(d.strengths),
          flaws: safeArray(d.flaws),
          values: safeArray(d.values),
          fears: safeArray(d.fears),
          species: d.species || null,
          likes: safeArray(d.likes),
          dislikes: safeArray(d.dislikes),
          hobbies: safeArray(d.hobbies),
          skills: safeArray(d.skills),
          languages: safeArray(d.languages),
          habits: safeArray(d.habits),
          speechPatterns: safeArray(d.speechPatterns),
          backstory: d.backstory || null,
          appearance: d.appearance || null,
          mbtiType: d.mbtiType || null,
          disc: d.disc || defaultDisc,
          discType: d.discType || null,
          enneagram: d.enneagram || defaultEnneagram,
          strengthsFinder: d.strengthsFinder || defaultStrengthsFinder,
          themeEnabled: d.themeEnabled ?? false,
          rpStyle: d.rpStyle || null,
          rpPreferredGenders: safeArray(d.rpPreferredGenders),
          rpGenres: safeArray(d.rpGenres),
          rpLimits: safeArray(d.rpLimits),
          rpThemes: safeArray(d.rpThemes),
          rpExperienceLevel: d.rpExperienceLevel || null,
          rpResponseTime: d.rpResponseTime || null,
          nsfwEnabled: d.nsfwEnabled ?? false,
          nsfwBodyType: d.nsfwBodyType || null,
          nsfwKinks: safeArray(d.nsfwKinks),
          nsfwContentWarnings: safeArray(d.nsfwContentWarnings),
          nsfwOrientation: d.nsfwOrientation || null,
          nsfwRolePreference: d.nsfwRolePreference || null,
        })
        setConnections(
          Array.isArray(d.connections)
            ? d.connections.map((c: any) => ({
                characterName: c.characterName || '',
                relationshipType: c.relationshipType || '',
                specificRole: c.specificRole || null,
                characterAge: typeof c.characterAge === 'number' ? c.characterAge : null,
                description: c.description || null,
              }))
            : []
        )
        setActiveTab(0)
      } catch (err) {
        setError('Invalid persona file. Please use a valid JSON file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Initialize form with persona data or imported data
  useEffect(() => {
    startTransition(() => {
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
        bigFive: persona.bigFive || defaultBigFive,
        hexaco: persona.hexaco || defaultHexaco,
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
        disc: persona.disc || defaultDisc,
        discType: persona.discType || null,
        enneagram: persona.enneagram || defaultEnneagram,
        strengthsFinder: persona.strengthsFinder || defaultStrengthsFinder,
        themeEnabled: persona.themeEnabled ?? false,
        rpStyle: persona.rpStyle || null,
        rpPreferredGenders: persona.rpPreferredGenders || [],
        rpGenres: persona.rpGenres || [],
        rpLimits: persona.rpLimits || [],
        rpThemes: persona.rpThemes || [],
        rpExperienceLevel: persona.rpExperienceLevel || null,
        rpResponseTime: persona.rpResponseTime || null,
        nsfwEnabled: persona.nsfwEnabled ?? false,
        nsfwBodyType: persona.nsfwBodyType || null,
        nsfwKinks: persona.nsfwKinks || [],
        nsfwContentWarnings: persona.nsfwContentWarnings || [],
        nsfwOrientation: persona.nsfwOrientation || null,
        nsfwRolePreference: persona.nsfwRolePreference || null,
      })
      setConnections(persona.connections || [])
    } else if (importedData) {
      const d = importedData
      setFormData({
        name: d.name || '',
        avatarUrl: d.avatarUrl || null,
        description: d.description || null,
        archetype: d.archetype || null,
        gender: d.gender || null,
        pronouns: d.pronouns || null,
        age: typeof d.age === 'number' ? d.age : null,
        tags: safeArray(d.tags),
        personalityDescription: d.personalityDescription || null,
        personalitySpectrums: d.personalitySpectrums || defaultSpectrums,
        bigFive: d.bigFive || defaultBigFive,
        hexaco: d.hexaco || defaultHexaco,
        strengths: safeArray(d.strengths),
        flaws: safeArray(d.flaws),
        values: safeArray(d.values),
        fears: safeArray(d.fears),
        species: d.species || null,
        likes: safeArray(d.likes),
        dislikes: safeArray(d.dislikes),
        hobbies: safeArray(d.hobbies),
        skills: safeArray(d.skills),
        languages: safeArray(d.languages),
        habits: safeArray(d.habits),
        speechPatterns: safeArray(d.speechPatterns),
        backstory: d.backstory || null,
        appearance: d.appearance || null,
        mbtiType: d.mbtiType || null,
        disc: d.disc || defaultDisc,
        discType: d.discType || null,
        enneagram: d.enneagram || defaultEnneagram,
        strengthsFinder: d.strengthsFinder || defaultStrengthsFinder,
        themeEnabled: d.themeEnabled ?? false,
        rpStyle: d.rpStyle || null,
        rpPreferredGenders: safeArray(d.rpPreferredGenders),
        rpGenres: safeArray(d.rpGenres),
        rpLimits: safeArray(d.rpLimits),
        rpThemes: safeArray(d.rpThemes),
        rpExperienceLevel: d.rpExperienceLevel || null,
        rpResponseTime: d.rpResponseTime || null,
        nsfwEnabled: d.nsfwEnabled ?? false,
        nsfwBodyType: d.nsfwBodyType || null,
        nsfwKinks: safeArray(d.nsfwKinks),
        nsfwContentWarnings: safeArray(d.nsfwContentWarnings),
        nsfwOrientation: d.nsfwOrientation || null,
        nsfwRolePreference: d.nsfwRolePreference || null,
      })
      setConnections(
        Array.isArray(d.connections)
          ? d.connections.map((c: any) => ({
              characterName: c.characterName || '',
              relationshipType: c.relationshipType || '',
              specificRole: c.specificRole || null,
              characterAge: typeof c.characterAge === 'number' ? c.characterAge : null,
              description: c.description || null,
            }))
          : []
      )
    } else {
      setFormData(defaultFormData)
      setConnections([])
    }
    setActiveTab(0)
    setError('')
    setHasUnsavedChanges(false)
    })
  }, [persona, importedData, isOpen])
  
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
        updateField('avatarUrl', data.url || data.avatarUrl)
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
        nsfwEnabled: isUserAdult ? formData.nsfwEnabled : false,
        nsfwBodyType: isUserAdult ? formData.nsfwBodyType : null,
        nsfwKinks: isUserAdult ? formData.nsfwKinks : [],
        nsfwContentWarnings: isUserAdult ? formData.nsfwContentWarnings : [],
        nsfwOrientation: isUserAdult ? formData.nsfwOrientation : null,
        nsfwRolePreference: isUserAdult ? formData.nsfwRolePreference : null,
        connections: connectionsData,
      })
      setHasUnsavedChanges(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAttemptClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])
  
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
    setHasUnsavedChanges(true)
  }
  
  const updateConnection = (index: number, data: Partial<PersonaConnection>) => {
    setConnections(prev => prev.map((c, i) => i === index ? { ...c, ...data } : c))
    setHasUnsavedChanges(true)
  }
  
  const removeConnection = (index: number) => {
    setConnections(prev => prev.filter((_, i) => i !== index))
    setHasUnsavedChanges(true)
  }
  
  const nextTab = () => {
    setActiveTab(prev => Math.min(prev + 1, visibleSections.length - 1))
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const prevTab = () => {
    setActiveTab(prev => Math.max(prev - 1, 0))
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Section completion check
  const isSectionComplete = (index: number): boolean => {
    switch (index) {
      case 0: return !!(formData.name.trim() && formData.description)
      case 1: return !!(formData.personalityDescription || formData.strengths.length > 0 || formData.flaws.length > 0)
      case 2: return !!(formData.likes.length > 0 || formData.dislikes.length > 0 || formData.skills.length > 0)
      case 3: return !!(formData.backstory || formData.appearance)
      case 4: return connections.some(c => c.characterName && c.relationshipType)
      case 5: return !!(formData.mbtiType || formData.discType || formData.enneagram.type || formData.strengthsFinder.top5.length > 0)
      case 6: return !!(formData.rpStyle || formData.rpGenres.length > 0)
      case 7: return formData.nsfwEnabled
      default: return false
    }
  }

  const isLastTab = activeTab === visibleSections.length - 1

  // ─── Render Section Content ───────────────────────────────────────────────
  const renderSectionContent = () => {
    // Map visible section index to original section index
    const sectionName = visibleSections[activeTab]?.name

    if (sectionName === 'Overview') {
      return (
        <div className="space-y-5 animate-in fade-in-0 duration-200">
          {/* Avatar & Name */}
          <div className="flex items-start gap-5">
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="relative group">
                <div className={`absolute -inset-1.5 bg-gradient-to-br ${accent.fromSubtle} ${accent.toSubtle} rounded-2xl blur-md group-hover:${accent.bgHeavy} group-hover:${accent.avatarTo} transition-all opacity-0 group-hover:opacity-100`} />
                <Avatar className="w-24 h-24 border-2 border-white/[0.12] relative rounded-2xl">
                  <AvatarImage src={formData.avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white text-3xl font-semibold rounded-2xl`}>
                    {formData.name.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploading} 
                  className={`absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br ${accent.from} ${accent.to} rounded-xl flex items-center justify-center hover:opacity-90 transition-all shadow-lg ${accent.shadowGlow} hover:scale-110 border-2 ${accent.bgSurface}`}
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Camera className="w-3.5 h-3.5 text-white" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
              <p className="text-[10px] text-slate-600 text-center">Upload<br/>avatar</p>
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Character Name *</Label>
                </div>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter character name..."
                  maxLength={50}
                  className={`h-10 bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600 rounded-xl text-sm focus:${accent.borderMedium} ${!formData.name.trim() && error ? 'border-red-500/50 focus:border-red-500/50' : ''}`}
                />
                <div className="flex justify-between">
                  <p className="text-[10px] text-slate-600">{formData.name.length}/50 characters</p>
                  {!formData.name.trim() && error && <p className="text-[10px] text-red-400">Required</p>}
                </div>
              </div>
              <StyledSelect
                label="Archetype"
                value={formData.archetype || ''}
                onChange={(v) => updateField('archetype', v || null)}
                options={ARCHETYPES}
                placeholder="Select archetype..."
                icon={Sparkles}
              />
            </div>
          </div>

          <SectionDivider label="Identity" />
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Age</Label>
              <Input
                type="number"
                value={formData.age ?? ''}
                onChange={(e) => updateField('age', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Character age"
                className={`h-10 bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus:${accent.borderMedium} rounded-xl`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Species</Label>
              <Input
                value={formData.species || ''}
                onChange={(e) => updateField('species', e.target.value || null)}
                placeholder="e.g., Human, Elf..."
                className={`h-10 bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus:${accent.borderMedium} rounded-xl`}
              />
            </div>
          </div>

          <SectionDivider label="About" />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Description</Label>
              </div>
              <span className={`text-[10px] font-mono ${(formData.description || '').length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-amber-400' : 'text-slate-600'}`}>
                {(formData.description || '').length}/{MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value || null)}
              placeholder="Bring your character to life... Describe their essence, what drives them, their quirks, and what makes them unique."
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={6}
              className={`resize-none bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus:${accent.borderMedium} rounded-xl text-sm leading-relaxed`}
            />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    (formData.description || '').length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'bg-amber-500' : accent.bgHeavy
                  }`}
                  style={{ width: `${Math.min(100, ((formData.description || '').length / MAX_DESCRIPTION_LENGTH) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <SectionDivider label="Labels" />
          <TagInput
            label="Tags"
            tags={formData.tags}
            onChange={(tags) => updateField('tags', tags)}
            placeholder="Add tags (e.g., Fantasy, Modern, Warrior...)"
            icon={Sparkles}
            suggestions={['Fantasy', 'Sci-Fi', 'Modern', 'Historical', 'Romance', 'Adventure', 'Dark', 'Comedy', 'Horror', 'Mystery', 'Slice of Life', 'Action', 'Supernatural', 'Steampunk', 'Cyberpunk', 'Medieval']}
          />

          <SectionDivider label="Customization" />
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.12] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-sm text-slate-100">Profile Theme</p>
                <p className="text-[10px] text-slate-500">Apply a purchased profile theme to this character</p>
              </div>
            </div>
            <button
              onClick={() => updateField('themeEnabled', !formData.themeEnabled)}
              className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                formData.themeEnabled ? `bg-gradient-to-r ${accent.from} ${accent.to}` : 'bg-white/[0.08]'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                formData.themeEnabled ? 'left-5.5' : 'left-0.5'
              }`} />
            </button>
          </div>
        </div>
      )
    }

    if (sectionName === 'Personality') {
      return (
        <div className="space-y-5 animate-in fade-in-0 duration-200">
          <SectionDivider label="Core Personality" color="rose" />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-slate-500" />
                <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Personality Description</Label>
              </div>
              <span className={`text-[10px] font-mono ${(formData.personalityDescription || '').length > 1800 ? 'text-amber-400' : 'text-slate-600'}`}>
                {(formData.personalityDescription || '').length}/2000
              </span>
            </div>
            <Textarea
              value={formData.personalityDescription || ''}
              onChange={(e) => updateField('personalityDescription', e.target.value || null)}
              placeholder="Describe what makes your character tick... Their temperament, how they react under pressure, what drives their decisions, and how they relate to others."
              maxLength={2000}
              rows={5}
              className={`resize-none bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus:${accent.borderMedium} rounded-xl text-sm leading-relaxed`}
            />
            <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  (formData.personalityDescription || '').length > 1800 ? 'bg-amber-500' : 'bg-rose-500/30'
                }`}
                style={{ width: `${Math.min(100, ((formData.personalityDescription || '').length / 2000) * 100)}%` }}
              />
            </div>
          </div>

          <SectionDivider label="MBTI Spectrums" />
          <p className="text-[10px] text-slate-600 -mt-3">Position your character on each psychological dimension</p>
          <div className="grid gap-2">
            {(Object.keys(SPECTRUM_LABELS) as (keyof PersonalitySpectrums)[]).map((key, idx) => {
              const colors = [
                { from: 'from-teal-500', to: 'to-cyan-400' },
                { from: 'from-cyan-500', to: 'to-sky-400' },
                { from: 'from-amber-500', to: 'to-orange-400' },
                { from: 'from-violet-500', to: 'to-purple-400' },
                { from: 'from-rose-500', to: 'to-pink-400' },
              ]
              return (
                <SpectrumSlider
                  key={key}
                  label=""
                  value={formData.personalitySpectrums[key]}
                  onChange={(v) => updateField('personalitySpectrums', { ...formData.personalitySpectrums, [key]: v })}
                  leftLabel={SPECTRUM_LABELS[key].left}
                  rightLabel={SPECTRUM_LABELS[key].right}
                  colorFrom={colors[idx].from}
                  colorTo={colors[idx].to}
                />
              )
            })}
          </div>

          <SectionDivider label="Big Five (OCEAN)" color="sky" />
          <p className="text-[10px] text-slate-600 -mt-3">Scientifically validated Five Factor Model personality dimensions</p>
          <div className="grid gap-2">
            {(Object.keys(BIG_FIVE_LABELS) as (keyof BigFiveTraits)[]).map((key, idx) => {
              const bigFiveColors = [
                { from: 'from-sky-500', to: 'to-blue-400' },
                { from: 'from-emerald-500', to: 'to-green-400' },
                { from: 'from-amber-500', to: 'to-yellow-400' },
                { from: 'from-rose-500', to: 'to-red-400' },
                { from: 'from-violet-500', to: 'to-indigo-400' },
              ]
              return (
                <SpectrumSlider
                  key={key}
                  label=""
                  value={formData.bigFive[key]}
                  onChange={(v) => updateField('bigFive', { ...formData.bigFive, [key]: v })}
                  leftLabel={BIG_FIVE_LABELS[key].left}
                  rightLabel={BIG_FIVE_LABELS[key].right}
                  description={BIG_FIVE_LABELS[key].description}
                  colorFrom={bigFiveColors[idx].from}
                  colorTo={bigFiveColors[idx].to}
                />
              )
            })}
          </div>

          <SectionDivider label="HEXACO Model" color="emerald" />
          <p className="text-[10px] text-slate-600 -mt-3">Six-factor model with Honesty-Humility, not found in Big Five</p>
          <div className="grid gap-2">
            {(Object.keys(HEXACO_LABELS) as (keyof HexacoTraits)[]).map((key, idx) => {
              const hexacoColors = [
                { from: 'from-emerald-500', to: 'to-teal-400' },
                { from: 'from-pink-500', to: 'to-rose-400' },
                { from: 'from-orange-500', to: 'to-amber-400' },
                { from: 'from-cyan-500', to: 'to-sky-400' },
                { from: 'from-lime-500', to: 'to-green-400' },
                { from: 'from-fuchsia-500', to: 'to-purple-400' },
              ]
              return (
                <SpectrumSlider
                  key={key}
                  label=""
                  value={formData.hexaco[key]}
                  onChange={(v) => updateField('hexaco', { ...formData.hexaco, [key]: v })}
                  leftLabel={HEXACO_LABELS[key].left}
                  rightLabel={HEXACO_LABELS[key].right}
                  description={HEXACO_LABELS[key].description}
                  colorFrom={hexacoColors[idx].from}
                  colorTo={hexacoColors[idx].to}
                />
              )
            })}
          </div>

          <SectionDivider label="Character Traits" color="amber" />
          <div className="grid grid-cols-2 gap-3">
            <TagInput 
              label="Strengths" 
              tags={formData.strengths} 
              onChange={(strengths) => updateField('strengths', strengths)} 
              placeholder="Add strengths..."
              icon={Shield}
              colorScheme="teal"
              suggestions={['Brave', 'Intelligent', 'Charismatic', 'Resilient', 'Empathetic', 'Resourceful', 'Loyal', 'Creative', 'Disciplined', 'Wise']}
            />
            <TagInput 
              label="Flaws" 
              tags={formData.flaws} 
              onChange={(flaws) => updateField('flaws', flaws)} 
              placeholder="Add flaws..."
              icon={AlertTriangle}
              colorScheme="rose"
              suggestions={['Stubborn', 'Impulsive', 'Arrogant', 'Naive', 'Jealous', 'Selfish', 'Reckless', 'Anxious', 'Distrustful', 'Proud']}
            />
            <TagInput 
              label="Values" 
              tags={formData.values} 
              onChange={(values) => updateField('values', values)} 
              placeholder="Add values..."
              icon={Heart}
              colorScheme="amber"
              suggestions={['Freedom', 'Justice', 'Loyalty', 'Honesty', 'Family', 'Knowledge', 'Power', 'Peace', 'Honor', 'Compassion']}
            />
            <TagInput 
              label="Fears" 
              tags={formData.fears} 
              onChange={(fears) => updateField('fears', fears)} 
              placeholder="Add fears..."
              icon={AlertTriangle}
              colorScheme="violet"
              suggestions={['Failure', 'Abandonment', 'Death', 'Betrayal', 'Loneliness', 'Loss of control', 'The unknown', 'Rejection', 'Poverty', 'Humiliation']}
            />
          </div>

          {/* ─── Personality Typing Systems (merged from Personality Typing tab) ─── */}
          <SectionDivider label="Personality Typing Systems" color="violet" />
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500">Define your character across multiple personality frameworks</p>
          </div>
          {/* Sub-tabs for personality systems */}
          <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {[
              { id: 'mbti', label: 'MBTI', icon: Brain },
              { id: 'bigfive', label: 'Big Five', icon: PieChart },
              { id: 'disc', label: 'DISC', icon: Target },
              { id: 'enneagram', label: 'Enneagram', icon: Hexagon },
              { id: 'strengths', label: 'Strengths', icon: Award },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setPersonalityTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  personalityTab === tab.id
                    ? `bg-gradient-to-r ${accent.from} ${accent.to} text-white shadow-sm ${accent.shadowGlow}`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* MBTI Sub-tab */}
          {personalityTab === 'mbti' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">MBTI Personality Type</Label>
                <p className="text-xs text-slate-500">Select the Myers-Briggs Type that best fits your character</p>
              </div>
              
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {MBTI_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => updateField('mbtiType', type === formData.mbtiType ? null : type)}
                    title={`${type}: ${MBTI_DESCRIPTIONS[type] || ''}`}
                    className={`p-2 rounded-xl text-center font-bold text-xs transition-all duration-200 ${
                      formData.mbtiType === type 
                        ? `bg-gradient-to-br ${accent.from} ${accent.to} text-white shadow-lg ${accent.shadowGlow} scale-105` 
                        : 'bg-white/[0.03] border border-white/[0.08] text-slate-200 hover:border-white/[0.15] hover:bg-white/[0.05]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              
              {formData.mbtiType && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] border-l-2 border-l-teal-500/40">
                    <h4 className="font-medium text-slate-200 mb-1 text-sm flex items-center gap-2">
                      <Brain className={`w-4 h-4 ${accent.text}`} />
                      {formData.mbtiType} Profile
                    </h4>
                    <p className="text-sm text-slate-400">
                      {formData.mbtiType.startsWith('I') ? 'Introverted' : 'Extroverted'}, {' '}
                      {formData.mbtiType[1] === 'N' ? 'Intuitive' : 'Observant'}, {' '}
                      {formData.mbtiType[2] === 'T' ? 'Thinking' : 'Feeling'}, {' '}
                      {formData.mbtiType[3] === 'J' ? 'Judging' : 'Prospecting'}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-xl bg-gradient-to-r ${accent.fromSubtle} ${accent.toSubtle} border ${accent.borderSubtle}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-slate-200 flex items-center gap-2">
                          <Wand2 className={`w-4 h-4 ${accent.text}`} />
                          Calibrate All
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Apply {formData.mbtiType} traits to all personality frameworks
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setCalibrating(true)
                          const seed = calibrationSeed
                          const calibration = MBTI_CALIBRATION_SEEDS[formData.mbtiType!]?.[seed]
                          if (calibration) {
                            setTimeout(() => {
                              setFormData(prev => ({
                                ...prev,
                                personalitySpectrums: calibration.spectrums,
                                bigFive: calibration.bigFive,
                                hexaco: calibration.hexaco,
                                disc: calibration.disc,
                                discType: calibration.discType,
                                strengthsFinder: { top5: calibration.strengthsFinder },
                                enneagram: {
                                  type: calibration.enneagram.type,
                                  wing: calibration.enneagram.wing,
                                  instinctualVariant: calibration.enneagram.instinctualVariant,
                                },
                                likes: calibration.likes,
                                dislikes: calibration.dislikes,
                                hobbies: calibration.hobbies,
                                habits: calibration.habits,
                                skills: calibration.skills,
                                speechPatterns: calibration.speechPatterns,
                              }))
                              setCalibrating(false)
                              setHasUnsavedChanges(true)
                            }, 800)
                          }
                        }}
                        disabled={calibrating}
                        className={`bg-gradient-to-r ${accent.from} ${accent.to} hover:${accent.borderStrong} hover:${accent.to} text-white`}
                        size="sm"
                      >
                        {calibrating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Calibrating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Calibrate All
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Seed Selector */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">Calibration Variant <span className="text-slate-600 font-normal">— Choose how strongly the type expresses</span></span>
                        <button
                          onClick={() => {
                            const seeds: CalibrationSeed[] = ['balanced', 'intense', 'nuanced']
                            const randomSeed = seeds[Math.floor(Math.random() * seeds.length)]
                            setCalibrationSeed(randomSeed)
                          }}
                          className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors active:scale-95"
                        >
                          <Sparkles className="w-3 h-3" />
                          Random
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {(['balanced', 'intense', 'nuanced'] as CalibrationSeed[]).map(seed => {
                          const seedInfo = SEED_LABELS[seed]
                          const isActive = calibrationSeed === seed
                          return (
                            <button
                              key={seed}
                              onClick={() => setCalibrationSeed(seed)}
                              className={`flex-1 p-2.5 rounded-xl text-center transition-all duration-200 ${
                                isActive
                                  ? `bg-gradient-to-r ${accent.fromSubtle} ${accent.toSubtle} border ${accent.borderMedium} ${accent.text}`
                                  : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                              }`}
                            >
                              <div className="text-sm">{seedInfo.emoji}</div>
                              <div className="text-xs font-medium">{seedInfo.label}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">{seedInfo.description}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* What will be calibrated preview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { label: 'Big Five', icon: '🧠', count: '5 traits' },
                        { label: 'HEXACO', icon: '🔬', count: '6 traits' },
                        { label: 'DISC', icon: '🎯', count: MBTI_CALIBRATION_SEEDS[formData.mbtiType!]?.[calibrationSeed]?.discType || '4 dims' },
                        { label: 'Strengths', icon: '🏆', count: `${MBTI_CALIBRATION_SEEDS[formData.mbtiType!]?.[calibrationSeed]?.strengthsFinder?.length || 5} top` },
                        { label: 'Enneagram', icon: '⬡', count: (() => { const e = MBTI_CALIBRATION_SEEDS[formData.mbtiType!]?.[calibrationSeed]?.enneagram; return e ? `${e.type}w${e.wing}` : 'type'; })() },
                        { label: 'Attributes', icon: '📝', count: `${(MBTI_CALIBRATION_SEEDS[formData.mbtiType!]?.[calibrationSeed]?.likes?.length || 0) + (MBTI_CALIBRATION_SEEDS[formData.mbtiType!]?.[calibrationSeed]?.dislikes?.length || 0)} items` },
                      ].map(item => (
                        <div key={item.label} className={`p-2 rounded-lg bg-white/[0.03] transition-all ${calibrating ? 'animate-pulse' : ''}`}>
                          <span className="text-slate-500 block mb-0.5">{item.icon} {item.label}</span>
                          <span className="text-slate-300 font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Big Five Sub-tab */}
          {personalityTab === 'bigfive' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Big Five (OCEAN) Model</Label>
                <p className="text-xs text-slate-500">Scientifically validated Five Factor Model — the gold standard in personality psychology</p>
              </div>
              <div className="grid gap-2">
                {(Object.keys(BIG_FIVE_LABELS) as (keyof BigFiveTraits)[]).map((key, idx) => {
                  const bigFiveColors = [
                    { from: 'from-sky-500', to: 'to-blue-400' },
                    { from: 'from-emerald-500', to: 'to-green-400' },
                    { from: 'from-amber-500', to: 'to-yellow-400' },
                    { from: 'from-rose-500', to: 'to-red-400' },
                    { from: 'from-violet-500', to: 'to-purple-400' },
                  ]
                  return (
                    <SpectrumSlider
                      key={key}
                      label=""
                      value={formData.bigFive[key]}
                      onChange={(v) => updateField('bigFive', { ...formData.bigFive, [key]: v })}
                      leftLabel={BIG_FIVE_LABELS[key].left}
                      rightLabel={BIG_FIVE_LABELS[key].right}
                      description={BIG_FIVE_LABELS[key].description}
                      colorFrom={bigFiveColors[idx].from}
                      colorTo={bigFiveColors[idx].to}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* DISC Sub-tab */}
          {personalityTab === 'disc' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">DISC Profile</Label>
                <p className="text-xs text-slate-500">Behavioral assessment focusing on Dominance, Influence, Steadiness, and Conscientiousness</p>
              </div>

              {/* DISC Type Selection */}
              <div className="grid grid-cols-2 gap-2">
                {DISC_TYPES.map(disc => (
                  <button
                    key={disc.value}
                    onClick={() => updateField('discType', disc.value === formData.discType ? null : disc.value)}
                    className={`p-3 rounded-xl text-left transition-all duration-200 ${
                      formData.discType === disc.value
                        ? `bg-gradient-to-r ${disc.color} text-white shadow-lg scale-[1.02]`
                        : 'bg-white/[0.03] border border-white/[0.08] text-slate-200 hover:border-white/[0.15]'
                    }`}
                  >
                    <p className="font-bold text-sm">{disc.label}</p>
                    <p className={`text-xs mt-0.5 ${formData.discType === disc.value ? 'text-white/70' : 'text-slate-500'}`}>{disc.description}</p>
                  </button>
                ))}
              </div>

              {formData.discType && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className={`w-4 h-4 ${accent.text}`} />
                      <span className="text-sm font-medium text-slate-200">{formData.discType} Profile</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {formData.discType.split('').map(c => {
                        const descriptions: Record<string, string> = {
                          D: 'Dominant — Direct and results-driven',
                          I: 'Influential — Enthusiastic and social',
                          S: 'Steady — Patient and reliable',
                          C: 'Conscientious — Analytical and precise',
                        }
                        return descriptions[c] || c
                      }).join(' + ')}
                    </p>
                  </div>
                </div>
              )}

              {/* DISC Spectrum Sliders */}
              <SectionDivider label="DISC Dimensions" color="amber" />
              <div className="grid gap-2">
                {(Object.keys(DISC_LABELS) as (keyof DiscTraits)[]).map((key, idx) => {
                  const discColors = [
                    { from: 'from-red-500', to: 'to-rose-400' },
                    { from: 'from-amber-500', to: 'to-yellow-400' },
                    { from: 'from-emerald-500', to: 'to-green-400' },
                    { from: 'from-sky-500', to: 'to-blue-400' },
                  ]
                  return (
                    <SpectrumSlider
                      key={key}
                      label=""
                      value={formData.disc[key]}
                      onChange={(v) => updateField('disc', { ...formData.disc, [key]: v })}
                      leftLabel={DISC_LABELS[key].left}
                      rightLabel={DISC_LABELS[key].right}
                      description={DISC_LABELS[key].description}
                      colorFrom={discColors[idx].from}
                      colorTo={discColors[idx].to}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Enneagram Sub-tab */}
          {personalityTab === 'enneagram' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Enneagram Type</Label>
                <p className="text-xs text-slate-500">Nine interconnected personality types revealing core motivations and fears</p>
              </div>

              {/* Enneagram Type Selection */}
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3,4,5,6,7,8,9].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      const enneagramData = ENNEAGRAM_TYPES[type]
                      if (formData.enneagram.type === type) {
                        updateField('enneagram', { ...formData.enneagram, type: null, wing: null })
                      } else {
                        updateField('enneagram', { 
                          ...formData.enneagram, 
                          type,
                          wing: null // Reset wing when changing type
                        })
                      }
                    }}
                    className={`p-3 rounded-xl text-center transition-all duration-200 ${
                      formData.enneagram.type === type
                        ? `bg-gradient-to-br ${accent.from} ${accent.to} text-white shadow-lg ${accent.shadowGlow} scale-105`
                        : 'bg-white/[0.03] border border-white/[0.08] text-slate-200 hover:border-white/[0.15] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-2xl font-bold">{type}</div>
                    <div className={`text-[10px] mt-0.5 ${formData.enneagram.type === type ? 'text-white/80' : 'text-slate-500'}`}>
                      {ENNEAGRAM_TYPES[type].name}
                    </div>
                  </button>
                ))}
              </div>

              {formData.enneagram.type && (
                <div className="space-y-3">
                  {/* Type Description */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <h4 className="font-medium text-slate-200 mb-1 text-sm flex items-center gap-2">
                      <Hexagon className={`w-4 h-4 ${accent.text}`} />
                      Type {formData.enneagram.type}: {ENNEAGRAM_TYPES[formData.enneagram.type].name}
                    </h4>
                    <p className="text-sm text-slate-400">{ENNEAGRAM_TYPES[formData.enneagram.type].description}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <span className="text-red-400 block mb-0.5">Core Fear</span>
                        <span className="text-slate-300">{ENNEAGRAM_TYPES[formData.enneagram.type].fear}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-emerald-400 block mb-0.5">Core Desire</span>
                        <span className="text-slate-300">{ENNEAGRAM_TYPES[formData.enneagram.type].desire}</span>
                      </div>
                    </div>
                  </div>

                  {/* Wing Selection - Expanded */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Wing</Label>

                    {/* Common/Adjacent Wings */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Adjacent Wings (Common)</span>
                      <div className="flex gap-2">
                        {ENNEAGRAM_WING_OPTIONS[formData.enneagram.type]?.slice(0, 2).map(wing => (
                          <button
                            key={wing}
                            onClick={() => updateField('enneagram', {
                              ...formData.enneagram,
                              wing: formData.enneagram.wing === wing ? null : wing
                            })}
                            className={`flex-1 p-2.5 rounded-xl text-center transition-all duration-200 ${
                              formData.enneagram.wing === wing
                                ? `bg-gradient-to-r ${accent.fromSubtle} ${accent.toSubtle} border ${accent.borderMedium} ${accent.text}`
                                : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                            }`}
                          >
                            <span className="text-sm font-bold">{formData.enneagram.type}w{wing}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">{ENNEAGRAM_TYPES[wing].name}</span>
                            <span className="block text-[9px] text-slate-600 mt-0.5 truncate">{ENNEAGRAM_WING_DESCRIPTIONS[`${formData.enneagram.type}w${wing}`] || ''}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => updateField('enneagram', { ...formData.enneagram, wing: null })}
                          className={`px-3 py-2 rounded-xl text-xs transition-all ${
                            formData.enneagram.wing === null
                              ? `bg-white/[0.06] border ${accent.borderMedium} ${accent.text}`
                              : 'bg-white/[0.03] border border-white/[0.08] text-slate-500 hover:border-white/[0.15]'
                          }`}
                        >
                          No Wing
                        </button>
                      </div>
                    </div>

                    {/* Uncommon Wings */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-amber-500/70 uppercase tracking-wider">Extended Wings (Uncommon)</span>
                      <div className="flex flex-wrap gap-2">
                        {ENNEAGRAM_WING_OPTIONS[formData.enneagram.type]?.slice(2, 4).map(wing => {
                          const rarity = getWingRarity(formData.enneagram.type!, wing)
                          return (
                            <button
                              key={wing}
                              onClick={() => updateField('enneagram', {
                                ...formData.enneagram,
                                wing: formData.enneagram.wing === wing ? null : wing
                              })}
                              className={`px-3 py-2 rounded-xl text-center transition-all duration-200 ${
                                formData.enneagram.wing === wing
                                  ? `bg-gradient-to-r ${accent.fromSubtle} ${accent.toSubtle} border ${accent.borderMedium} ${accent.text}`
                                  : 'bg-white/[0.03] border border-amber-500/10 text-slate-400 hover:border-amber-500/20'
                              }`}
                            >
                              <span className="text-xs font-bold">{formData.enneagram.type}w{wing}</span>
                              <span className="block text-[10px] text-slate-500 mt-0.5">{ENNEAGRAM_TYPES[wing].name}</span>
                              <span className="block text-[9px] text-amber-600/50 mt-0.5 truncate">{ENNEAGRAM_WING_DESCRIPTIONS[`${formData.enneagram.type}w${wing}`] || ''}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Rare Wings */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-violet-500/70 uppercase tracking-wider flex items-center gap-1">
                        Creative Wings (Rare)
                        <span className="text-[9px] text-slate-600">— Unconventional combinations</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {ENNEAGRAM_WING_OPTIONS[formData.enneagram.type]?.slice(4).map(wing => (
                          <button
                            key={wing}
                            onClick={() => updateField('enneagram', {
                              ...formData.enneagram,
                              wing: formData.enneagram.wing === wing ? null : wing
                            })}
                            className={`px-2.5 py-1.5 rounded-lg text-center transition-all duration-200 ${
                              formData.enneagram.wing === wing
                                ? `bg-gradient-to-r ${accent.fromSubtle} ${accent.toSubtle} border ${accent.borderMedium} ${accent.text}`
                                : 'bg-white/[0.03] border border-violet-500/10 text-slate-500 hover:border-violet-500/20 hover:text-slate-300'
                            }`}
                          >
                            <span className="text-[11px] font-bold">{formData.enneagram.type}w{wing}</span>
                            <span className="block text-[9px] text-violet-600/50 mt-0.5">{ENNEAGRAM_WING_DESCRIPTIONS[`${formData.enneagram.type}w${wing}`] || ''}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Instinctual Variant */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Instinctual Variant</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {INSTINCTUAL_VARIANTS.map(variant => (
                        <button
                          key={variant.value}
                          onClick={() => updateField('enneagram', { 
                            ...formData.enneagram, 
                            instinctualVariant: formData.enneagram.instinctualVariant === variant.value ? null : variant.value 
                          })}
                          className={`p-2 rounded-xl text-left transition-all duration-200 ${
                            formData.enneagram.instinctualVariant === variant.value
                              ? `bg-gradient-to-r ${accent.fromSubtle} ${accent.toSubtle} border ${accent.borderMedium} text-slate-100`
                              : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                          }`}
                        >
                          <p className="text-xs font-medium">{variant.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 hidden lg:block">{variant.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* StrengthsFinder Sub-tab */}
          {personalityTab === 'strengths' && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">CliftonStrengths (StrengthsFinder)</Label>
                <p className="text-xs text-slate-500">Identify your character&apos;s top 5 signature strengths from 34 talent themes</p>
              </div>

              {formData.strengthsFinder.top5.length > 0 && (
                <div className="flex gap-2">
                  {formData.strengthsFinder.top5.map((strength, idx) => {
                    const category = Object.entries(STRENGTHS_FINDER_CATEGORIES).find(
                      ([, cat]) => cat.themes.includes(strength)
                    )
                    const catColors: Record<string, string> = {
                      'Executing': 'from-amber-500 to-orange-400',
                      'Influencing': 'from-rose-500 to-pink-400',
                      'Relationship Building': 'from-emerald-500 to-teal-400',
                      'Strategic Thinking': 'from-sky-500 to-cyan-400',
                    }
                    return (
                      <div key={idx} className={`flex-1 p-2 rounded-xl bg-gradient-to-br ${category ? catColors[category[0]] || accent.from + ' ' + accent.to : accent.from + ' ' + accent.to} text-white text-center`}>
                        <div className="text-[10px] opacity-70">#{idx + 1}</div>
                        <div className="text-xs font-bold">{strength}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Category-based strength selection */}
              {Object.entries(STRENGTHS_FINDER_CATEGORIES).map(([categoryName, category]) => {
                const catIcons: Record<string, React.ElementType> = {
                  'Executing': Target,
                  'Influencing': Flame,
                  'Relationship Building': Heart,
                  'Strategic Thinking': Brain,
                }
                const CatIcon = catIcons[categoryName] || Target
                const catColors: Record<string, string> = {
                  'Executing': 'text-amber-400 border-amber-500/20 bg-amber-500/10',
                  'Influencing': 'text-rose-400 border-rose-500/20 bg-rose-500/10',
                  'Relationship Building': 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
                  'Strategic Thinking': 'text-sky-400 border-sky-500/20 bg-sky-500/10',
                }
                const colorClass = catColors[categoryName] || ''
                return (
                  <div key={categoryName} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CatIcon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                      <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">{categoryName}</Label>
                      <span className="text-[10px] text-slate-600">{category.description}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {category.themes.map(theme => {
                        const isSelected = formData.strengthsFinder.top5.includes(theme)
                        const rank = formData.strengthsFinder.top5.indexOf(theme) + 1
                        return (
                          <button
                            key={theme}
                            onClick={() => {
                              const current = [...formData.strengthsFinder.top5]
                              if (isSelected) {
                                updateField('strengthsFinder', { top5: current.filter(t => t !== theme) })
                              } else if (current.length < 5) {
                                updateField('strengthsFinder', { top5: [...current, theme] })
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                              isSelected
                                ? `${colorClass} border font-semibold`
                                : 'bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:border-white/[0.12] hover:text-slate-200'
                            } ${!isSelected && formData.strengthsFinder.top5.length >= 5 ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            {isSelected && <span className="mr-1 font-bold">#{rank}</span>}
                            {theme}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {formData.strengthsFinder.top5.length > 0 && formData.strengthsFinder.top5.length < 5 && (
                <p className="text-xs text-slate-500 text-center">
                  Select {5 - formData.strengthsFinder.top5.length} more strength{5 - formData.strengthsFinder.top5.length > 1 ? 's' : ''} to complete your Top 5
                </p>
              )}
              {formData.strengthsFinder.top5.length === 5 && (
                <div className={`p-3 rounded-xl bg-gradient-to-r ${accent.fromSubtle} ${accent.toSubtle} border ${accent.borderSubtle} text-center`}>
                  <Award className={`w-5 h-5 ${accent.text} mx-auto mb-1`} />
                  <p className="text-sm font-medium text-slate-200">Top 5 Complete!</p>
                  <p className="text-xs text-slate-400">Your character&apos;s signature strengths are set</p>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }


    if (sectionName === 'Attributes') {
      return (
        <div className="space-y-4 animate-in fade-in-0 duration-200">
          <div className="grid grid-cols-2 gap-3">
            <TagInput label="Likes" tags={formData.likes} onChange={(likes) => updateField('likes', likes)} placeholder="Add likes..." colorScheme="teal" suggestions={['Music', 'Nature', 'Reading', 'Cooking', 'Travel', 'Art', 'Animals', 'Stargazing', 'Rainy days', 'Spicy food']} />
            <TagInput label="Dislikes" tags={formData.dislikes} onChange={(dislikes) => updateField('dislikes', dislikes)} placeholder="Add dislikes..." colorScheme="rose" suggestions={['Lies', 'Crowds', 'Cold weather', 'Boredom', 'Loud noises', 'Being rushed', 'Injustice', 'Repetition']} />
            <TagInput label="Hobbies" tags={formData.hobbies} onChange={(hobbies) => updateField('hobbies', hobbies)} placeholder="Add hobbies..." colorScheme="sky" suggestions={['Painting', 'Fencing', 'Gardening', 'Chess', 'Archery', 'Dancing', 'Singing', 'Writing', 'Fishing', 'Gaming']} />
            <TagInput label="Skills" tags={formData.skills} onChange={(skills) => updateField('skills', skills)} placeholder="Add skills..." colorScheme="emerald" suggestions={['Swordsmanship', 'Magic', 'Healing', 'Stealth', 'Negotiation', 'Strategy', 'Survival', 'Crafting']} />
            <TagInput label="Languages" tags={formData.languages} onChange={(languages) => updateField('languages', languages)} placeholder="Add languages..." colorScheme="amber" suggestions={['English', 'Japanese', 'Elvish', 'Draconic', 'Latin', 'French', 'Korean', 'Sign Language']} />
            <TagInput label="Habits" tags={formData.habits} onChange={(habits) => updateField('habits', habits)} placeholder="Add habits..." colorScheme="violet" suggestions={['Taps fingers when thinking', 'Hums while working', 'Stays up late', 'Always carries a weapon', 'Talks to animals']} />
          </div>
          
          <TagInput
            label="Speech Patterns"
            tags={formData.speechPatterns}
            onChange={(speechPatterns) => updateField('speechPatterns', speechPatterns)}
            placeholder="Add speech patterns (e.g., speaks softly...)"
            colorScheme="teal"
            suggestions={['Speaks formally', 'Uses contractions rarely', 'Stutters when nervous', 'Speaks in riddles', 'Whispers', 'Talks rapidly', 'Uses archaic terms', 'Sarcastic tone']}
          />
        </div>
      )
    }

    if (sectionName === 'Backstory') {
      return (
        <div className="space-y-5 animate-in fade-in-0 duration-200">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Backstory</Label>
              </div>
              <span className={`text-[10px] font-mono ${(formData.backstory || '').length > MAX_BACKSTORY_LENGTH * 0.9 ? 'text-amber-400' : 'text-slate-600'}`}>
                {(formData.backstory || '').length}/{MAX_BACKSTORY_LENGTH}
              </span>
            </div>
            <Textarea
              value={formData.backstory || ''}
              onChange={(e) => updateField('backstory', e.target.value || null)}
              placeholder="Write your character's backstory... Where did they come from? What events shaped them? What drives their motivations and fears?"
              maxLength={MAX_BACKSTORY_LENGTH}
              rows={8}
              className={`resize-none bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:${accent.borderMedium} rounded-xl text-sm leading-relaxed`}
            />
            <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  (formData.backstory || '').length > MAX_BACKSTORY_LENGTH * 0.9 ? 'bg-amber-500' : accent.bgHeavy
                }`}
                style={{ width: `${Math.min(100, ((formData.backstory || '').length / MAX_BACKSTORY_LENGTH) * 100)}%` }}
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Physical Appearance</Label>
              </div>
              <span className={`text-[10px] font-mono ${(formData.appearance || '').length > 4500 ? 'text-amber-400' : 'text-slate-600'}`}>
                {(formData.appearance || '').length}/5000
              </span>
            </div>
            <Textarea
              value={formData.appearance || ''}
              onChange={(e) => updateField('appearance', e.target.value || null)}
              placeholder="Describe your character's physical appearance... Hair, eyes, build, distinctive features, clothing style, and any unique markings."
              maxLength={5000}
              rows={6}
              className={`resize-none bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:${accent.borderMedium} rounded-xl text-sm leading-relaxed`}
            />
            <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  (formData.appearance || '').length > 4500 ? 'bg-amber-500' : accent.bgHeavy
                }`}
                style={{ width: `${Math.min(100, ((formData.appearance || '').length / 5000) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )
    }

    if (sectionName === 'Connections') {
      return (
        <div className="space-y-4 animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-300">Character Connections</Label>
              <p className="text-xs text-slate-500 mt-1">Add relationships with other characters (real or fictional)</p>
            </div>
            <Button
              onClick={addNewConnection}
              className={`bg-gradient-to-r ${accent.from} ${accent.to} hover:${accent.borderStrong} hover:${accent.to} text-white flex items-center gap-2`}
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Add Connection
            </Button>
          </div>
          
          {connections.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-white/[0.10] bg-white/[0.01]">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">No connections yet</p>
              <p className="text-xs text-slate-500 mt-1">Add relationships to build your character&apos;s world</p>
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
      )
    }


    if (sectionName === 'RP Preferences') {
      return (
        <div className="space-y-5 animate-in fade-in-0 duration-200">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Roleplay Preferences</Label>
            <p className="text-xs text-slate-500">Set your roleplay style and preferences to help find compatible partners</p>
          </div>
          
          <div className="space-y-3">
            <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Writing Style</Label>
            <div className="grid grid-cols-2 gap-3">
              {RP_STYLES.map(style => (
                <button
                  key={style.value}
                  onClick={() => updateField('rpStyle', formData.rpStyle === style.value ? null : style.value)}
                  className={`p-3 rounded-xl text-left transition-all duration-200 ${
                    formData.rpStyle === style.value 
                      ? `bg-gradient-to-br ${accent.fromSubtle} ${accent.toSubtle} ${accent.borderMedium} text-slate-100 border shadow-sm ${accent.shadowGlow}` 
                      : 'bg-white/[0.03] border border-white/[0.08] text-slate-200 hover:border-white/[0.15]'
                  }`}
                >
                  <p className="font-medium text-sm">{style.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{style.description}</p>
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Preferred Character Genders</Label>
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
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all duration-200 ${
                    formData.rpPreferredGenders.includes(gender)
                      ? `${accent.bgTint} border ${accent.borderMedium} ${accent.text}`
                      : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                  }`}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>
          
          <TagInput
            label="Preferred Genres"
            tags={formData.rpGenres}
            onChange={(tags) => updateField('rpGenres', tags)}
            placeholder="Add genres (e.g., Fantasy, Romance...)"
          />
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Limits & Triggers</Label>
              <span className="text-xs text-red-400/60 bg-red-500/10 px-2 py-0.5 rounded-full">Avoid</span>
            </div>
            <Textarea
              value={formData.rpLimits.join(', ')}
              onChange={(e) => updateField('rpLimits', e.target.value.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean))}
              placeholder="Topics/themes you want to avoid..."
              rows={2}
              className={`resize-none bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:${accent.borderMedium} rounded-xl`}
            />
            <p className="text-xs text-slate-500">Separate items with commas (e.g., gore, violence, non-con)</p>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Themes & Topics</Label>
              <span className="text-xs text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded-full">Prefer</span>
            </div>
            <Textarea
              value={formData.rpThemes.join(', ')}
              onChange={(e) => updateField('rpThemes', e.target.value.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean))}
              placeholder="Themes and topics you enjoy in RP..."
              rows={2}
              className={`resize-none bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:${accent.borderMedium} rounded-xl`}
            />
            <p className="text-xs text-slate-500">Separate items with commas (e.g., romance, adventure, mystery)</p>
          </div>
          
          <div className="space-y-3">
            <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Experience Level</Label>
            <div className="grid grid-cols-2 gap-3">
              {RP_EXPERIENCE_LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => updateField('rpExperienceLevel', formData.rpExperienceLevel === level.value ? null : level.value)}
                  className={`p-2.5 rounded-xl text-left transition-all duration-200 ${
                    formData.rpExperienceLevel === level.value 
                      ? `bg-gradient-to-br ${accent.fromSubtle} ${accent.toSubtle} ${accent.borderMedium} text-slate-100 border shadow-sm ${accent.shadowGlow}` 
                      : 'bg-white/[0.03] border border-white/[0.08] text-slate-200 hover:border-white/[0.15]'
                  }`}
                >
                  <p className="font-medium text-sm">{level.label}</p>
                  <p className="text-xs text-slate-500">{level.description}</p>
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Typical Response Time</Label>
            <div className="grid grid-cols-2 gap-3">
              {RP_RESPONSE_TIMES.map(time => (
                <button
                  key={time.value}
                  onClick={() => updateField('rpResponseTime', formData.rpResponseTime === time.value ? null : time.value)}
                  className={`p-2.5 rounded-xl text-left transition-all duration-200 ${
                    formData.rpResponseTime === time.value 
                      ? `bg-gradient-to-br ${accent.fromSubtle} ${accent.toSubtle} ${accent.borderMedium} text-slate-100 border shadow-sm ${accent.shadowGlow}` 
                      : 'bg-white/[0.03] border border-white/[0.08] text-slate-200 hover:border-white/[0.15]'
                  }`}
                >
                  <p className="font-medium text-sm">{time.label}</p>
                  <p className="text-xs text-slate-500">{time.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (sectionName === 'NSFW') {
      return (
        <div className="space-y-5 animate-in fade-in-0 duration-200">
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-sm">Enable NSFW Content</h3>
                  <p className="text-xs text-slate-500">Unlock mature content options (18+ only)</p>
                </div>
              </div>
              <button
                onClick={() => updateField('nsfwEnabled', !formData.nsfwEnabled)}
                className={`relative w-14 h-8 rounded-full transition-all duration-200 ${
                  formData.nsfwEnabled 
                    ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                    : 'bg-white/[0.06]'
                }`}
              >
                <div className={`w-6 h-6 rounded-full bg-white shadow-lg transition-transform duration-200 ${
                  formData.nsfwEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
          
          {formData.nsfwEnabled && (
            <>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Body Type / Physical Description</Label>
                <Textarea
                  value={formData.nsfwBodyType || ''}
                  onChange={(e) => updateField('nsfwBodyType', e.target.value || null)}
                  placeholder="Describe physical attributes, body type, measurements, distinctive features..."
                  rows={3}
                  maxLength={12000}
                  className={`resize-none bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:${accent.borderMedium} rounded-xl`}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Detailed physical description</span>
                  <span>{(formData.nsfwBodyType || '').length}/12000</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Sexual Orientation</Label>
                <div className="flex flex-wrap gap-2">
                  {NSFW_ORIENTATIONS.map(orientation => (
                    <button
                      key={orientation}
                      onClick={() => updateField('nsfwOrientation', formData.nsfwOrientation === orientation ? null : orientation)}
                      className={`px-3 py-1.5 rounded-xl text-xs transition-all duration-200 ${
                        formData.nsfwOrientation === orientation
                          ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                          : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                      }`}
                    >
                      {orientation}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Role Preference</Label>
                <div className="grid grid-cols-2 gap-3">
                  {NSFW_ROLE_PREFERENCES.map(role => (
                    <button
                      key={role.value}
                      onClick={() => updateField('nsfwRolePreference', formData.nsfwRolePreference === role.value ? null : role.value)}
                      className={`p-2.5 rounded-xl text-left transition-all duration-200 ${
                        formData.nsfwRolePreference === role.value 
                          ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/40 text-slate-100 border' 
                          : 'bg-white/[0.03] border border-white/[0.08] text-slate-200 hover:border-white/[0.15]'
                      }`}
                    >
                      <p className="font-medium">{role.label}</p>
                      <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              <TagInput
                label="Kinks & Interests"
                tags={formData.nsfwKinks}
                onChange={(tags) => updateField('nsfwKinks', tags)}
                placeholder="Add interests (e.g., BDSM, Voyeurism...)"
              />
              
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Content Themes</Label>
                <p className="text-xs text-slate-500">What mature themes you&apos;re comfortable with in RP</p>
                <Textarea
                  value={formData.nsfwContentWarnings.join(', ')}
                  onChange={(e) => updateField('nsfwContentWarnings', e.target.value.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean))}
                  placeholder="Themes you're comfortable with..."
                  rows={2}
                  className={`resize-none bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:${accent.borderMedium} rounded-xl`}
                />
                <p className="text-xs text-slate-500">Separate items with commas (e.g., romance, slice of life, drama)</p>
              </div>
            </>
          )}
          
          {!formData.nsfwEnabled && (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <Flame className="w-7 h-7 text-slate-500" />
              </div>
              <p className="text-slate-500 text-sm">Enable NSFW content to access mature customization options</p>
              <p className="text-xs text-slate-500 mt-2">You must be 18+ to use these features</p>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <>
      <Dialog open={isOpen && !showCloseConfirm} onOpenChange={(open) => { if (!open) handleAttemptClose() }}>
        <DialogContent className={`max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col ${accent.bgSurface}/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/50`}>
          {/* ─── Header ──────────────────────────────────────────────────── */}
          <DialogHeader className={`px-6 py-3.5 flex flex-row items-center justify-between border-b border-white/[0.06] flex-shrink-0 ${accent.bgSurface}/80`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent.fromSubtle} ${accent.toSubtle} flex items-center justify-center`}>
                <Sparkles className={`w-4 h-4 ${accent.text}`} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-100">
                  {persona ? 'Edit Character' : importedData ? 'Import Character' : 'Create Character'}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs">
                  {persona ? 'Update your character identity.' : importedData ? 'Review and customize the imported character.' : 'Create a new character to roleplay as.'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-save indicator */}
              <div className="flex items-center gap-1.5 text-xs">
                {hasUnsavedChanges ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-400/80">Unsaved changes</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400/80">Draft saved</span>
                  </>
                )}
              </div>
              {!persona && (
                <button
                  onClick={handleImportInsideForm}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06] hover:text-slate-200 hover:bg-white/[0.06] hover:border-white/[0.10] transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import
                </button>
              )}
              <button
                onClick={handleAttemptClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input ref={importFileRef} type="file" accept=".json" onChange={handleImportFileInsideForm} className="hidden" />
          </DialogHeader>
          
          {/* ─── Main Content: Sidebar + Content ─────────────────────────── */}
          <div className="flex flex-1 min-h-0">
            {/* Left Sidebar Navigation */}
            <nav className="w-[200px] flex-shrink-0 border-r border-white/[0.06] py-3 px-2 bg-[#0d0f14]/60 overflow-y-auto">
              <div className="space-y-0.5">
                {visibleSections.map((section, i) => {
                  const Icon = section.icon
                  const isActive = activeTab === i
                  const isComplete = isSectionComplete(i)
                  return (
                    <button
                      key={section.name}
                      onClick={() => { setActiveTab(i); contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-200 group relative ${
                        isActive 
                          ? `bg-gradient-to-r ${accent.bgTint} ${accent.toSubtle} ${accent.text}` 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b ${accent.borderStrong} ${accent.to}`} />
                      )}
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? accent.text : 'text-slate-500 group-hover:text-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium block truncate">{section.name}</span>
                      </div>
                      {isComplete && (
                        <div className={`w-4 h-4 rounded-full ${accent.bgHeavy} flex items-center justify-center flex-shrink-0`}>
                          <Check className={`w-2.5 h-2.5 ${accent.text}`} />
                        </div>
                      )}
                    </button>
                  )
                })}
                {!isUserAdult && (
                  <div className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 select-none">
                    <Lock className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <span className="truncate">NSFW (18+)</span>
                  </div>
                )}
              </div>
            </nav>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Section Header */}
              <div className="px-6 pt-4 pb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = visibleSections[activeTab]?.icon
                    return Icon ? <Icon className={`w-4 h-4 ${accent.text}`} /> : null
                  })()}
                  <h2 className="text-sm font-semibold text-slate-100">{visibleSections[activeTab]?.name}</h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 ml-6">{visibleSections[activeTab]?.description}</p>
              </div>

              {/* Error */}
              {error && (
                <div className="mx-6 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex-shrink-0">
                  {error}
                </div>
              )}

              {/* Scrollable Content */}
              <div ref={contentRef} className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
                {renderSectionContent()}
              </div>
            </div>
          </div>
          
          {/* ─── Sticky Footer ───────────────────────────────────────────── */}
          <div className="border-t border-white/[0.06] px-6 py-3 flex items-center justify-between bg-[#0d0f14]/80 backdrop-blur-xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <Button
                onClick={prevTab}
                disabled={activeTab === 0}
                variant="ghost"
                size="sm"
                className="bg-white/[0.06] border border-white/[0.10] text-slate-300 hover:text-white hover:bg-white/[0.10] disabled:opacity-30 h-8"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              
              {/* Step Progress */}
              <div className="flex items-center gap-1.5">
                {visibleSections.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveTab(i); contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="group relative"
                  >
                    <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      i === activeTab 
                        ? `bg-gradient-to-r ${accent.borderStrong} ${accent.to} scale-125` 
                        : i < activeTab 
                          ? accent.bgHeavy 
                          : 'bg-white/[0.08]'
                    }`} />
                  </button>
                ))}
                <span className="text-[10px] text-slate-500 ml-1.5 font-mono">
                  Step {activeTab + 1} of {visibleSections.length}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isLastTab ? (
                <Button onClick={nextTab} size="sm" className={`bg-gradient-to-r ${accent.from} ${accent.to} hover:${accent.borderStrong} hover:${accent.to} text-white h-8 text-xs`}>
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()} size="sm" className={`bg-gradient-to-r ${accent.from} ${accent.to} hover:${accent.borderStrong} hover:${accent.to} text-white h-8 text-xs disabled:opacity-50`}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      {persona ? 'Save Changes' : 'Create Character'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Close Confirmation Dialog ───────────────────────────────────── */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className={`max-w-md ${accent.bgSurface}/95 backdrop-blur-2xl border border-white/[0.08]`}>
          <DialogHeader>
            <DialogTitle className="text-slate-100">Unsaved Changes</DialogTitle>
            <DialogDescription className="text-slate-400">
              You have unsaved changes that will be lost. Are you sure you want to close?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCloseConfirm(false)}
              className="bg-white/[0.06] border border-white/[0.10] text-slate-300 hover:text-white hover:bg-white/[0.10]"
            >
              Keep Editing
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowCloseConfirm(false)
                setHasUnsavedChanges(false)
                onClose()
              }}
              className="bg-red-500/80 hover:bg-red-500 text-white"
            >
              Discard & Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
