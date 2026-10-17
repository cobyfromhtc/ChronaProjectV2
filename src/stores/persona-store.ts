'use client'

import { create } from 'zustand'

// Personality spectrums type (MBTI-based)
export interface PersonalitySpectrums {
  introvertExtrovert: number  // 0 = Introvert, 100 = Extrovert
  intuitiveObservant: number  // 0 = Intuitive, 100 = Observant
  thinkingFeeling: number     // 0 = Thinking, 100 = Feeling
  judgingProspecting: number  // 0 = Judging, 100 = Prospecting
  assertiveTurbulent: number  // 0 = Assertive, 100 = Turbulent
}

// Big Five (OCEAN) personality traits
export interface BigFiveTraits {
  openness: number           // 0 = Practical/Conventional, 100 = Open/Creative
  conscientiousness: number  // 0 = Flexible/Spontaneous, 100 = Organized/Disciplined
  extraversion: number       // 0 = Introverted/Reserved, 100 = Extraverted/Social
  agreeableness: number      // 0 = Competitive/Critical, 100 = Cooperative/Compassionate
  neuroticism: number        // 0 = Emotionally Stable, 100 = Emotionally Reactive
}

// HEXACO personality traits (6-factor model)
export interface HexacoTraits {
  honestyHumility: number    // 0 = Self-interest/Self-enhancement, 100 = Sincerity/Fairness/Modesty
  emotionality: number       // 0 = Detached/Unemotional, 100 = Sentimental/Emotionally sensitive
  extraversion: number       // 0 = Reserved/Solitary, 100 = Social/Expressive
  agreeableness: number      // 0 = Critical/Competitive, 100 = Patient/Tolerant/Forgiving
  conscientiousness: number  // 0 = Impulsive/Disorganized, 100 = Disciplined/Organized
  opennessToExperience: number // 0 = Conventional/Traditional, 100 = Creative/Unconventional
}

// DISC personality types
export interface DiscTraits {
  dominance: number       // 0 = Low D, 100 = High D (Direct, Decisive, Driven)
  influence: number       // 0 = Low I, 100 = High I (Enthusiastic, Optimistic, Collaborative)  
  steadiness: number      // 0 = Low S, 100 = High S (Patient, Reliable, Thoughtful)
  conscientiousness: number // 0 = Low C, 100 = High C (Analytical, Detail-oriented, Systematic)
}

// Enneagram personality type
export interface EnneagramTraits {
  type: number | null     // 1-9
  wing: number | null     // Adjacent wing (e.g., 1w2, 1w9)
  instinctualVariant: string | null  // sp, sx, so combinations
}

// StrengthsFinder (CliftonStrengths)  
export interface StrengthsFinderTraits {
  top5: string[]          // Top 5 signature themes
}

// DISC type labels
export const DISC_LABELS: Record<keyof DiscTraits, { left: string; right: string; description: string }> = {
  dominance: { 
    left: 'Collaborative', 
    right: 'Direct', 
    description: 'Dominance — direct, results-oriented, firm, decisive' 
  },
  influence: { 
    left: 'Reserved', 
    right: 'Enthusiastic', 
    description: 'Influence — enthusiastic, optimistic, collaborative, social' 
  },
  steadiness: { 
    left: 'Fast-paced', 
    right: 'Steady', 
    description: 'Steadiness — patient, reliable, thoughtful, consistent' 
  },
  conscientiousness: { 
    left: 'Intuitive', 
    right: 'Analytical', 
    description: 'Conscientiousness — analytical, detail-oriented, systematic, precise' 
  },
}

// Enneagram type descriptions
export const ENNEAGRAM_TYPES: Record<number, { name: string; description: string; fear: string; desire: string; wings: number[] }> = {
  1: { name: 'The Perfectionist', description: 'Principled, purposeful, self-controlled', fear: 'Being corrupt/evil', desire: 'Being good/having integrity', wings: [9, 2] },
  2: { name: 'The Helper', description: 'Generous, empathetic, people-pleasing', fear: 'Being unwanted/unloved', desire: 'To feel loved', wings: [1, 3] },
  3: { name: 'The Achiever', description: 'Adaptable, excelling, driven', fear: 'Being worthless', desire: 'To feel valuable', wings: [2, 4] },
  4: { name: 'The Individualist', description: 'Expressive, dramatic, self-absorbed', fear: 'Having no identity/significance', desire: 'To be unique', wings: [3, 5] },
  5: { name: 'The Investigator', description: 'Perceptive, innovative, secretive', fear: 'Being useless/incapable', desire: 'To be competent', wings: [4, 6] },
  6: { name: 'The Loyalist', description: 'Engaging, responsible, anxious', fear: 'Being without support/guidance', desire: 'To have security', wings: [5, 7] },
  7: { name: 'The Enthusiast', description: 'Spontaneous, versatile, acquisitive', fear: 'Being deprived/in pain', desire: 'To be satisfied/content', wings: [6, 8] },
  8: { name: 'The Challenger', description: 'Self-confident, decisive, confrontational', fear: 'Being harmed/controlled', desire: 'To protect themselves', wings: [7, 9] },
  9: { name: 'The Peacemaker', description: 'Receptive, reassuring, complacent', fear: 'Being in conflict/lost', desire: 'To have inner stability', wings: [8, 1] },
}

// CliftonStrengths/StrengthsFinder categories
export const STRENGTHS_FINDER_CATEGORIES: Record<string, { themes: string[]; description: string }> = {
  'Executing': {
    description: 'Making things happen',
    themes: ['Achiever', 'Arranger', 'Belief', 'Consistency', 'Deliberative', 'Discipline', 'Focus', 'Responsibility', 'Restorative'],
  },
  'Influencing': {
    description: 'Taking charge and speaking up',
    themes: ['Activator', 'Command', 'Communication', 'Competition', 'Maximizer', 'Self-Assurance', 'Significance', 'Woo'],
  },
  'Relationship Building': {
    description: 'Building strong connections',
    themes: ['Adaptability', 'Connectedness', 'Empathy', 'Harmony', 'Includer', 'Individualization', 'Positivity', 'Relator'],
  },
  'Strategic Thinking': {
    description: 'Absorbing and analyzing information',
    themes: ['Analytical', 'Context', 'Futuristic', 'Ideation', 'Input', 'Intellection', 'Learner', 'Strategic'],
  },
}

// DISC auto-calibration data
export const DISC_CALIBRATION: Record<string, DiscTraits> = {
  D: { dominance: 85, influence: 30, steadiness: 25, conscientiousness: 40 },
  I: { dominance: 35, influence: 85, steadiness: 30, conscientiousness: 25 },
  S: { dominance: 20, influence: 40, steadiness: 85, conscientiousness: 45 },
  C: { dominance: 35, influence: 20, steadiness: 45, conscientiousness: 85 },
  DI: { dominance: 80, influence: 70, steadiness: 15, conscientiousness: 25 },
  DS: { dominance: 75, influence: 20, steadiness: 55, conscientiousness: 40 },
  DC: { dominance: 70, influence: 15, steadiness: 30, conscientiousness: 75 },
  IS: { dominance: 20, influence: 70, steadiness: 65, conscientiousness: 25 },
  IC: { dominance: 25, influence: 65, steadiness: 25, conscientiousness: 70 },
  SC: { dominance: 15, influence: 25, steadiness: 70, conscientiousness: 70 },
}

// Connection type for relationships
export interface PersonaConnection {
  id: string
  characterName: string
  relationshipType: string
  specificRole: string | null
  characterAge: number | null
  description: string | null
}

export interface Persona {
  id: string
  userId: string
  name: string
  avatarUrl: string | null
  isActive: boolean
  isOnline: boolean
  
  // Overview
  description: string | null
  archetype: string | null
  gender: string | null
  pronouns: string | null
  age: number | null
  tags: string[]
  
  // Personality
  personalityDescription: string | null
  personalitySpectrums: PersonalitySpectrums
  bigFive: BigFiveTraits
  hexaco: HexacoTraits
  strengths: string[]
  flaws: string[]
  values: string[]
  fears: string[]
  
  // Attributes
  species: string | null
  likes: string[]
  dislikes: string[]
  hobbies: string[]
  skills: string[]
  languages: string[]
  habits: string[]
  speechPatterns: string[]
  
  // Backstory
  backstory: string | null
  appearance: string | null
  
  // MBTI
  mbtiType: string | null
  
  // DISC
  disc: DiscTraits
  discType: string | null
  
  // Enneagram  
  enneagram: EnneagramTraits
  
  // StrengthsFinder
  strengthsFinder: StrengthsFinderTraits
  
  // Profile Theme
  themeId: string | null
  themeEnabled: boolean
  
  // Roleplay Preferences
  rpStyle: string | null
  rpPreferredGenders: string[]
  rpGenres: string[]
  rpLimits: string[]
  rpThemes: string[]
  rpExperienceLevel: string | null
  rpResponseTime: string | null
  
  // NSFW Content (18+)
  nsfwEnabled: boolean
  nsfwBodyType: string | null
  nsfwKinks: string[]
  nsfwContentWarnings: string[]
  nsfwOrientation: string | null
  nsfwRolePreference: string | null
  
  // Timestamps
  createdAt: string
  updatedAt: string
  
  // Relations
  connections?: PersonaConnection[]
}

interface PersonaState {
  personas: Persona[]
  activePersona: Persona | null
  isLoading: boolean
  
  // Actions
  setPersonas: (personas: Persona[]) => void
  addPersona: (persona: Persona) => void
  updatePersona: (id: string, data: Partial<Persona>) => void
  removePersona: (id: string) => void
  setActivePersona: (persona: Persona | null) => void
  setLoading: (loading: boolean) => void
}

// Helper to parse JSON arrays safely
function parseJsonArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Helper to parse personality spectrums
function parseSpectrums(value: string | null): PersonalitySpectrums {
  const defaultSpectrums: PersonalitySpectrums = {
    introvertExtrovert: 50,
    intuitiveObservant: 50,
    thinkingFeeling: 50,
    judgingProspecting: 50,
    assertiveTurbulent: 50,
  }
  if (!value) return defaultSpectrums
  try {
    const parsed = JSON.parse(value)
    return { ...defaultSpectrums, ...parsed }
  } catch {
    return defaultSpectrums
  }
}

// Default Big Five values
export const defaultBigFive: BigFiveTraits = {
  openness: 50,
  conscientiousness: 50,
  extraversion: 50,
  agreeableness: 50,
  neuroticism: 50,
}

// Default HEXACO values
export const defaultHexaco: HexacoTraits = {
  honestyHumility: 50,
  emotionality: 50,
  extraversion: 50,
  agreeableness: 50,
  conscientiousness: 50,
  opennessToExperience: 50,
}

// Helper to parse Big Five traits
function parseBigFive(value: string | null): BigFiveTraits {
  if (!value) return defaultBigFive
  try {
    const parsed = JSON.parse(value)
    return { ...defaultBigFive, ...parsed }
  } catch {
    return defaultBigFive
  }
}

// Helper to parse HEXACO traits
function parseHexaco(value: string | null): HexacoTraits {
  if (!value) return defaultHexaco
  try {
    const parsed = JSON.parse(value)
    return { ...defaultHexaco, ...parsed }
  } catch {
    return defaultHexaco
  }
}

// Default DISC values
export const defaultDisc: DiscTraits = {
  dominance: 50,
  influence: 50,
  steadiness: 50,
  conscientiousness: 50,
}

// Default Enneagram values
export const defaultEnneagram: EnneagramTraits = {
  type: null,
  wing: null,
  instinctualVariant: null,
}

// Default StrengthsFinder values
export const defaultStrengthsFinder: StrengthsFinderTraits = {
  top5: [],
}

// Helper to parse DISC traits
function parseDisc(value: string | null): DiscTraits {
  if (!value) return defaultDisc
  try {
    const parsed = JSON.parse(value)
    return { ...defaultDisc, ...parsed }
  } catch {
    return defaultDisc
  }
}

// Helper to parse Enneagram traits
function parseEnneagram(value: string | null): EnneagramTraits {
  if (!value) return defaultEnneagram
  try {
    const parsed = JSON.parse(value)
    // Handle new format: full object { type, wing, instinctualVariant }
    if (typeof parsed === 'object' && parsed !== null) {
      return { ...defaultEnneagram, ...parsed }
    }
    // Handle legacy format: just a number (type)
    if (typeof parsed === 'number') {
      return { ...defaultEnneagram, type: parsed }
    }
    return defaultEnneagram
  } catch {
    // Handle legacy format: plain string like "5w4" or "5"
    const match = value.match(/^(\d)(?:w(\d))?$/)
    if (match) {
      return {
        ...defaultEnneagram,
        type: parseInt(match[1]),
        wing: match[2] ? parseInt(match[2]) : null,
      }
    }
    return defaultEnneagram
  }
}

// Helper to parse StrengthsFinder traits
function parseStrengthsFinder(value: string | null): StrengthsFinderTraits {
  if (!value) return defaultStrengthsFinder
  try {
    const parsed = JSON.parse(value)
    return { ...defaultStrengthsFinder, ...parsed }
  } catch {
    return defaultStrengthsFinder
  }
}

// Transform raw database persona to frontend Persona
export function transformPersona(raw: {
  id: string
  userId: string
  name: string
  avatarUrl: string | null
  isActive: boolean
  isOnline: boolean
  description: string | null
  archetype: string | null
  gender: string | null
  pronouns: string | null
  age: number | null
  tags: string | null
  personalityDescription: string | null
  personalitySpectrums: string | null
  bigFive: string | null
  hexaco: string | null
  strengths: string | null
  flaws: string | null
  values: string | null
  fears: string | null
  species: string | null
  likes: string | null
  dislikes: string | null
  hobbies: string | null
  skills: string | null
  languages: string | null
  habits: string | null
  speechPatterns: string | null
  backstory: string | null
  appearance: string | null
  mbtiType: string | null
  disc: string | null
  discType: string | null
  enneagramType: string | null
  strengthsFinder: string | null
  themeId: string | null
  themeEnabled: boolean
  rpStyle: string | null
  rpPreferredGenders: string | null
  rpGenres: string | null
  rpLimits: string | null
  rpThemes: string | null
  rpExperienceLevel: string | null
  rpResponseTime: string | null
  // NSFW fields
  nsfwEnabled: boolean
  nsfwBodyType: string | null
  nsfwKinks: string | null
  nsfwContentWarnings: string | null
  nsfwOrientation: string | null
  nsfwRolePreference: string | null
  createdAt: Date | string
  updatedAt: Date | string
  connections?: {
    id: string
    characterName: string
    relationshipType: string
    specificRole: string | null
    characterAge: number | null
    description: string | null
  }[]
}): Persona {
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    avatarUrl: raw.avatarUrl,
    isActive: raw.isActive,
    isOnline: raw.isOnline,
    description: raw.description,
    archetype: raw.archetype,
    gender: raw.gender,
    pronouns: raw.pronouns,
    age: raw.age,
    tags: parseJsonArray(raw.tags),
    personalityDescription: raw.personalityDescription,
    personalitySpectrums: parseSpectrums(raw.personalitySpectrums),
    bigFive: parseBigFive(raw.bigFive),
    hexaco: parseHexaco(raw.hexaco),
    strengths: parseJsonArray(raw.strengths),
    flaws: parseJsonArray(raw.flaws),
    values: parseJsonArray(raw.values),
    fears: parseJsonArray(raw.fears),
    species: raw.species,
    likes: parseJsonArray(raw.likes),
    dislikes: parseJsonArray(raw.dislikes),
    hobbies: parseJsonArray(raw.hobbies),
    skills: parseJsonArray(raw.skills),
    languages: parseJsonArray(raw.languages),
    habits: parseJsonArray(raw.habits),
    speechPatterns: parseJsonArray(raw.speechPatterns),
    backstory: raw.backstory,
    appearance: raw.appearance,
    mbtiType: raw.mbtiType,
    // DISC
    disc: parseDisc(raw.disc),
    discType: raw.discType,
    // Enneagram
    enneagram: parseEnneagram(raw.enneagramType),
    // StrengthsFinder
    strengthsFinder: parseStrengthsFinder(raw.strengthsFinder),
    themeId: raw.themeId,
    themeEnabled: raw.themeEnabled ?? false,
    rpStyle: raw.rpStyle,
    rpPreferredGenders: parseJsonArray(raw.rpPreferredGenders),
    rpGenres: parseJsonArray(raw.rpGenres),
    rpLimits: parseJsonArray(raw.rpLimits),
    rpThemes: parseJsonArray(raw.rpThemes),
    rpExperienceLevel: raw.rpExperienceLevel,
    rpResponseTime: raw.rpResponseTime,
    // NSFW fields
    nsfwEnabled: raw.nsfwEnabled ?? false,
    nsfwBodyType: raw.nsfwBodyType,
    nsfwKinks: parseJsonArray(raw.nsfwKinks),
    nsfwContentWarnings: parseJsonArray(raw.nsfwContentWarnings),
    nsfwOrientation: raw.nsfwOrientation,
    nsfwRolePreference: raw.nsfwRolePreference,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : raw.createdAt.toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : raw.updatedAt.toISOString(),
    connections: raw.connections?.map(c => ({
      id: c.id,
      characterName: c.characterName,
      relationshipType: c.relationshipType,
      specificRole: c.specificRole,
      characterAge: c.characterAge,
      description: c.description,
    })),
  }
}

export const usePersonaStore = create<PersonaState>((set) => ({
  personas: [],
  activePersona: null,
  isLoading: true,
  
  setPersonas: (personas) => {
    // Fix: Ensure only ONE persona is marked as active
    const activePersonas = personas.filter(p => p.isActive)
    let fixedPersonas = personas
    
    if (activePersonas.length > 1) {
      // Keep only the first active one
      fixedPersonas = personas.map(p => ({
        ...p,
        isActive: p.id === activePersonas[0].id,
        isOnline: p.id === activePersonas[0].id
      }))
    }
    
    return set({ 
      personas: fixedPersonas,
      activePersona: fixedPersonas.find(p => p.isActive) || null,
      isLoading: false 
    })
  },
  
  addPersona: (persona) => set((state) => {
    // If new persona is active, deactivate all others
    const updatedPersonas = persona.isActive 
      ? [{ ...persona }, ...state.personas.map(p => ({ ...p, isActive: false, isOnline: false }))]
      : [persona, ...state.personas]
    
    return {
      personas: updatedPersonas,
      activePersona: persona.isActive ? persona : state.activePersona
    }
  }),
  
  updatePersona: (id, data) => set((state) => ({ 
    personas: state.personas.map(p => 
      p.id === id ? { ...p, ...data } : p
    ),
    activePersona: state.activePersona?.id === id 
      ? { ...state.activePersona, ...data } 
      : state.activePersona
  })),
  
  removePersona: (id) => set((state) => ({ 
    personas: state.personas.filter(p => p.id !== id),
    activePersona: state.activePersona?.id === id 
      ? state.personas.find(p => p.id !== id && p.isActive) || null
      : state.activePersona
  })),
  
  setActivePersona: (persona) => set((state) => ({ 
    activePersona: persona,
    personas: state.personas.map(p => ({
      ...p,
      isActive: p.id === persona?.id,
      isOnline: p.id === persona?.id
    }))
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
}))
