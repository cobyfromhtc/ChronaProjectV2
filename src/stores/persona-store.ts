'use client'

import { create } from 'zustand'

// Personality spectrums type
export interface PersonalitySpectrums {
  introvertExtrovert: number  // 0 = Introvert, 100 = Extrovert
  intuitiveObservant: number  // 0 = Intuitive, 100 = Observant
  thinkingFeeling: number     // 0 = Thinking, 100 = Feeling
  judgingProspecting: number  // 0 = Judging, 100 = Prospecting
  assertiveTurbulent: number  // 0 = Assertive, 100 = Turbulent
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
  themeId: string | null
  themeEnabled: boolean
  rpStyle: string | null
  rpPreferredGenders: string | null
  rpGenres: string | null
  rpLimits: string | null
  rpThemes: string | null
  rpExperienceLevel: string | null
  rpResponseTime: string | null
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
    themeId: raw.themeId,
    themeEnabled: raw.themeEnabled ?? false,
    rpStyle: raw.rpStyle,
    rpPreferredGenders: parseJsonArray(raw.rpPreferredGenders),
    rpGenres: parseJsonArray(raw.rpGenres),
    rpLimits: parseJsonArray(raw.rpLimits),
    rpThemes: parseJsonArray(raw.rpThemes),
    rpExperienceLevel: raw.rpExperienceLevel,
    rpResponseTime: raw.rpResponseTime,
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
