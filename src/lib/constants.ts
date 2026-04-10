// Persona Archetypes for character identity
// New behaviour-based archetypes promoted to top (most searched), classic archetypes at the end
export const PERSONA_ARCHETYPES = [
  'Morally Grey',
  'Dominant',
  'Protective',
  'Cold & Distant',
  'Obsessive',
  'Brooding',
  'Flirtatious',
  'Tsundere',
  'Yandere',
  'Kuudere',
  'Mysterious',
  'Wholesome',
  'Chaotic',
  'Defiant',
  'Possessive',
  'Devoted',
  'Dark & Gritty',
  'Supernatural',
  'Royalty',
  'Warrior',
  'Scholar',
  'Trauma-Coded',
  'Protector',
  'Street-Smart',
  'Trickster',
  'Rebel',
  'Sage',
  'Lover',
  'Villain',
  'Hero',
  'Antihero',
  'Caregiver',
  'Explorer',
  'Creator',
  'Ruler',
  'Other'
] as const

export type PersonaArchetype = typeof PERSONA_ARCHETYPES[number]

// Storyline categories available for selection
export const STORYLINE_CATEGORIES = [
  'Romance',
  'Action',
  'Horror',
  'Fantasy',
  'Sci-Fi',
  'Slice of Life',
  'Mystery',
  'Comedy',
  'Drama',
  'Adventure',
  'Thriller',
  'Historical',
  'Supernatural',
  'Other'
] as const

export type StorylineCategory = typeof STORYLINE_CATEGORIES[number]
