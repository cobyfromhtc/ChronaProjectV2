'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, X, SlidersHorizontal, ChevronDown, ChevronUp, 
  User, Brain, Heart, Sparkles, Hash, Calendar, Zap, Plus, Star,
  ToggleLeft, Wifi, BookOpen, PenTool
} from 'lucide-react'
import { PERSONA_ARCHETYPES } from '@/lib/constants'

// MBTI Types
const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
]

// Common genders
const GENDERS = ['Male', 'Female', 'Non-binary', 'Genderfluid', 'Agender', 'Other']

// Common archetypes - imported from constants
// PERSONA_ARCHETYPES is used directly

// Common species
const SPECIES_OPTIONS = [
  'Human', 'Elf', 'Vampire', 'Werewolf', 'Demon', 'Angel',
  'Fae', 'Dragon', 'Witch', 'Android', 'Alien',
  'Mermaid', 'Neko', 'Anthro', 'Other'
]

// Search field options
const SEARCH_FIELDS = [
  { value: 'all', label: 'All Fields' },
  { value: 'username', label: 'Username' },
  { value: 'name', label: 'Persona Name' },
  { value: 'tags', label: 'Tags' },
  { value: 'backstory', label: 'Backstory' },
  { value: 'description', label: 'Bio' },
  { value: 'attributes', label: 'Attributes' },
  { value: 'appearance', label: 'Appearance' }
]

// Predefined popular tags for personas
const PREDEFINED_TAGS = [
  'friendly', 'mysterious', 'adventurous', 'romantic', 'dark', 'cheerful',
  'introvert', 'extrovert', 'loyal', 'mischievous', 'wise', 'protective',
  'playful', 'serious', 'cunning', 'brave', 'shy', 'confident',
  'artistic', 'musical', 'scholarly', 'warrior', 'healer', 'royalty',
  'rebel', 'gentle', 'fierce', 'elegant', 'casual', 'dramatic'
]

// RP Style options
const RP_STYLES = [
  { value: 'one_liner', label: 'One-Liner' },
  { value: 'semi_lit', label: 'Semi-Lit' },
  { value: 'literate', label: 'Literate' },
  { value: 'novella', label: 'Novella' },
]

// RP Experience Level options
const RP_EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'veteran', label: 'Veteran' },
]

// Personality spectrum config
const PERSONALITY_SPECTRUMS = [
  { key: 'introvertExtrovert' as const, leftLabel: 'Introvert', rightLabel: 'Extrovert', leftIcon: '🤫', rightIcon: '🗣️' },
  { key: 'intuitiveObservant' as const, leftLabel: 'Intuitive', rightLabel: 'Observant', leftIcon: '💭', rightIcon: '👁️' },
  { key: 'thinkingFeeling' as const, leftLabel: 'Thinking', rightLabel: 'Feeling', leftIcon: '🧠', rightIcon: '💗' },
  { key: 'judgingProspecting' as const, leftLabel: 'Judging', rightLabel: 'Prospecting', leftIcon: '📋', rightIcon: '🎲' },
  { key: 'assertiveTurbulent' as const, leftLabel: 'Assertive', rightLabel: 'Turbulent', leftIcon: '💪', rightIcon: '🌪️' },
]

// LocalStorage key for custom tags
const CUSTOM_TAGS_STORAGE_KEY = 'chrona-custom-tags'

interface PersonalitySpectrumFilters {
  introvertExtrovert: [number, number] // [min, max] 0-100
  intuitiveObservant: [number, number]
  thinkingFeeling: [number, number]
  judgingProspecting: [number, number]
  assertiveTurbulent: [number, number]
}

interface SearchFilters {
  query: string
  searchIn: string[]
  mbti: string[]
  gender: string[]
  ageMin: number | null
  ageMax: number | null
  species: string[]
  archetype: string[]
  tags: string[]
  attributes: string[]
  likes: string[]
  hobbies: string[]
  skills: string[]
  syncPersonality: boolean
  personalitySpectrums: PersonalitySpectrumFilters | null
  rpStyle: string[]
  rpExperienceLevel: string[]
  lookingForPartner: boolean | null
  onlineOnly: boolean
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void
  isLoading?: boolean
}

export function AdvancedSearch({ onSearch, isLoading }: AdvancedSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    searchIn: ['all'],
    mbti: [],
    gender: [],
    ageMin: null,
    ageMax: null,
    species: [],
    archetype: [],
    tags: [],
    attributes: [],
    likes: [],
    hobbies: [],
    skills: [],
    syncPersonality: false,
    personalitySpectrums: null,
    rpStyle: [],
    rpExperienceLevel: [],
    lookingForPartner: null,
    onlineOnly: false
  })
  
  // Tag input states
  const [tagInput, setTagInput] = useState('')
  const [attributeInput, setAttributeInput] = useState('')
  const [likesInput, setLikesInput] = useState('')
  const [hobbiesInput, setHobbiesInput] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  
  // Custom tags saved by the user (persisted in localStorage)
  // Initialize from localStorage synchronously to avoid flickering
  const getInitialCustomTags = (): string[] => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch (e) {
      console.error('Failed to load custom tags:', e)
    }
    return []
  }
  
  const [savedCustomTags, setSavedCustomTags] = useState<string[]>(getInitialCustomTags)
  
  // All available tags (predefined + custom)
  const [allAvailableTags, setAllAvailableTags] = useState<string[]>(() => {
    const customTags = getInitialCustomTags()
    return [...new Set([...PREDEFINED_TAGS, ...customTags])]
  })
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Save custom tags to localStorage
  const saveCustomTagToStorage = useCallback((tag: string) => {
    const normalizedTag = tag.toLowerCase().trim()
    if (!normalizedTag || savedCustomTags.includes(normalizedTag) || PREDEFINED_TAGS.includes(normalizedTag)) {
      return
    }
    
    const newCustomTags = [...savedCustomTags, normalizedTag]
    setSavedCustomTags(newCustomTags)
    setAllAvailableTags(prev => [...new Set([...prev, normalizedTag])])
    
    try {
      localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(newCustomTags))
    } catch (e) {
      console.error('Failed to save custom tag:', e)
    }
  }, [savedCustomTags])
  
  // Remove custom tag from storage
  const removeCustomTagFromStorage = useCallback((tag: string) => {
    const normalizedTag = tag.toLowerCase().trim()
    const newCustomTags = savedCustomTags.filter(t => t !== normalizedTag)
    setSavedCustomTags(newCustomTags)
    setAllAvailableTags(prev => prev.filter(t => t !== normalizedTag))
    
    try {
      localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(newCustomTags))
    } catch (e) {
      console.error('Failed to remove custom tag:', e)
    }
  }, [savedCustomTags])
  
  // Check if a tag is a custom (user-added) tag
  const isCustomTag = useCallback((tag: string) => {
    const normalizedTag = tag.toLowerCase().trim()
    return savedCustomTags.includes(normalizedTag) && !PREDEFINED_TAGS.includes(normalizedTag)
  }, [savedCustomTags])
  
  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      onSearch(filters)
    }, 300)
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [filters])
  
  // Handle search query change - just update the query, don't auto-extract tags
  const handleQueryChange = useCallback((newQuery: string) => {
    setFilters(prev => ({ ...prev, query: newQuery }))
  }, [])

  // Handle key down for tag submission (Enter or Space after #tag)
  const handleQueryKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const query = filters.query
      // Find all #tags in the query
      const tagMatches = query.match(/#(\w+)/g)

      if (tagMatches) {
        e.preventDefault()
        const extractedTags = tagMatches.map(t => t.slice(1).toLowerCase())

        // Remove the #tags from the query text
        const cleanQuery = query.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim()

        // Add new tags to filter and save as custom tags
        setFilters(prev => {
          const existingTags = prev.tags
          const newTags = extractedTags.filter(t => !existingTags.includes(t))

          // Save new tags as custom tags (if not predefined)
          newTags.forEach(tag => {
            if (!PREDEFINED_TAGS.includes(tag)) {
              // Use setTimeout to defer the localStorage update
              setTimeout(() => saveCustomTagToStorage(tag), 0)
            }
          })

          return {
            ...prev,
            tags: [...new Set([...existingTags, ...extractedTags])],
            query: cleanQuery
          }
        })
      }
    }
  }, [filters.query, saveCustomTagToStorage])
  
  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  
  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const arr = prev[key] as string[]
      const newArr = arr.includes(value)
        ? arr.filter(v => v !== value)
        : [...arr, value]
      return { ...prev, [key]: newArr }
    })
  }
  
  const addTagToFilter = (key: keyof SearchFilters, input: string, setInput: (v: string) => void) => {
    const tag = input.trim().toLowerCase()
    if (tag && !(filters[key] as string[]).includes(tag)) {
      setFilters(prev => ({
        ...prev,
        [key]: [...(prev[key] as string[]), tag]
      }))
      
      // If adding to tags filter and it's not predefined, save as custom tag
      if (key === 'tags' && !PREDEFINED_TAGS.includes(tag)) {
        saveCustomTagToStorage(tag)
      }
    }
    setInput('')
  }
  
  const removeTagFromFilter = (key: keyof SearchFilters, tag: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: (prev[key] as string[]).filter(t => t !== tag)
    }))
  }
  
  const clearAllFilters = () => {
    setFilters({
      query: '',
      searchIn: ['all'],
      mbti: [],
      gender: [],
      ageMin: null,
      ageMax: null,
      species: [],
      archetype: [],
      tags: [],
      attributes: [],
      likes: [],
      hobbies: [],
      skills: [],
      syncPersonality: false,
      personalitySpectrums: null,
      rpStyle: [],
      rpExperienceLevel: [],
      lookingForPartner: null,
      onlineOnly: false
    })
    setTagInput('')
    setAttributeInput('')
    setLikesInput('')
    setHobbiesInput('')
    setSkillsInput('')
  }
  
  const hasActiveFilters = 
    filters.query || 
    filters.mbti.length > 0 || 
    filters.gender.length > 0 || 
    filters.ageMin !== null || 
    filters.ageMax !== null ||
    filters.species.length > 0 ||
    filters.archetype.length > 0 ||
    filters.tags.length > 0 ||
    filters.attributes.length > 0 ||
    filters.likes.length > 0 ||
    filters.hobbies.length > 0 ||
    filters.skills.length > 0 ||
    filters.personalitySpectrums !== null ||
    filters.rpStyle.length > 0 ||
    filters.rpExperienceLevel.length > 0 ||
    filters.lookingForPartner !== null ||
    filters.onlineOnly
  
  const activeFilterCount = 
    (filters.query ? 1 : 0) +
    filters.mbti.length +
    filters.gender.length +
    (filters.ageMin !== null || filters.ageMax !== null ? 1 : 0) +
    filters.species.length +
    filters.archetype.length +
    filters.tags.length +
    filters.attributes.length +
    filters.likes.length +
    filters.hobbies.length +
    filters.skills.length +
    (filters.personalitySpectrums !== null ? 1 : 0) +
    filters.rpStyle.length +
    filters.rpExperienceLevel.length +
    (filters.lookingForPartner !== null ? 1 : 0) +
    (filters.onlineOnly ? 1 : 0)

  // Filter available tags based on input
  const filteredAvailableTags = tagInput 
    ? allAvailableTags.filter(t => t.includes(tagInput.toLowerCase()) && !filters.tags.includes(t))
    : allAvailableTags.filter(t => !filters.tags.includes(t))

  return (
    <div className="space-y-3">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400/50" />
          <Input
            type="text"
            placeholder="Search by username, name, tags... (use #tag and press Enter/Space to add)"
            value={filters.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleQueryKeyDown}
            className="pl-10 pr-4 h-10 bg-gray-900/20 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30"
          />
          {filters.query && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400/50 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-10 px-3 border-white/15 ${showAdvanced ? 'bg-white/10 border-white/30' : 'bg-gray-900/20'}`}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white text-white text-xs">
              {activeFilterCount}
            </span>
          )}
          {showAdvanced ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>
      </div>
      
      {/* Quick Tags - Show selected tags above filters */}
      {filters.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-400 mr-1">Active tags:</span>
          {filters.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-gray-200 text-xs border border-white/30"
            >
              <Hash className="w-3 h-3" />
              {tag}
              <button 
                onClick={() => removeTagFromFilter('tags', tag)} 
                className="hover:text-red-400 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      
      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="p-4 bg-gray-900/10 border border-white/15 rounded-xl space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Search In Field */}
          <div>
            <label className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Search In
            </label>
            <div className="flex flex-wrap gap-2">
              {SEARCH_FIELDS.map(field => (
                <button
                  key={field.value}
                  onClick={() => {
                    if (field.value === 'all') {
                      updateFilter('searchIn', ['all'])
                    } else {
                      const current = filters.searchIn.includes('all') ? [] : filters.searchIn
                      const newFields = current.includes(field.value)
                        ? current.filter(f => f !== field.value)
                        : [...current, field.value]
                      updateFilter('searchIn', newFields.length > 0 ? newFields : ['all'])
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    filters.searchIn.includes(field.value) || (field.value === 'all' && filters.searchIn.includes('all'))
                      ? 'bg-white/15 text-gray-200 border border-white/30'
                      : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/20'
                  }`}
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* MBTI Types */}
          <div>
            <label className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              MBTI Type
              <span className="text-gray-400/50 font-normal">- Syncs with HEXACO/OCEAN</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {MBTI_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => toggleArrayFilter('mbti', type)}
                  className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                    filters.mbti.includes(type)
                      ? 'bg-white/15 text-gray-200 border border-white/30'
                      : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/20'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.syncPersonality}
                onChange={(e) => updateFilter('syncPersonality', e.target.checked)}
                className="rounded border-white/20 bg-gray-900/20"
              />
              <Zap className="w-3 h-3" />
              Sync with HEXACO/OCEAN traits (find similar personalities)
            </label>
          </div>
          
          {/* Gender & Age Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Gender
              </label>
              <div className="flex flex-wrap gap-1.5">
                {GENDERS.map(g => (
                  <button
                    key={g}
                    onClick={() => toggleArrayFilter('gender', g)}
                    className={`px-2 py-1 rounded-lg text-xs transition-all ${
                      filters.gender.includes(g)
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
                        : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/20'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Age Range
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.ageMin ?? ''}
                  onChange={(e) => updateFilter('ageMin', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-20 h-8 bg-gray-900/20 border-white/15 text-white text-sm"
                  min={0}
                  max={999}
                />
                <span className="text-gray-400">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.ageMax ?? ''}
                  onChange={(e) => updateFilter('ageMax', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-20 h-8 bg-gray-900/20 border-white/15 text-white text-sm"
                  min={0}
                  max={999}
                />
              </div>
            </div>
          </div>
          
          {/* Species & Archetype Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Species
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SPECIES_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleArrayFilter('species', s)}
                    className={`px-2 py-1 rounded-lg text-xs transition-all ${
                      filters.species.includes(s)
                        ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'
                        : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/20'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                Archetype
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PERSONA_ARCHETYPES.map(a => (
                  <button
                    key={a}
                    onClick={() => toggleArrayFilter('archetype', a)}
                    className={`px-2 py-1 rounded-lg text-xs transition-all ${
                      filters.archetype.includes(a)
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                        : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/20'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Tags Section - Selectable Options */}
          <div>
            <label className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              Tags
              <span className="text-gray-400/50 font-normal">- Click to select or type custom</span>
            </label>
            
            {/* Custom tag input */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Type custom tag and press Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTagToFilter('tags', tagInput, setTagInput)
                    }
                  }}
                  className="h-8 bg-gray-900/20 border-white/15 text-white text-sm pr-10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addTagToFilter('tags', tagInput, setTagInput)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Selectable Tags Grid */}
            <div className="space-y-2">
              {/* Predefined Tags */}
              <div>
                <span className="text-[10px] text-gray-400/60 uppercase tracking-wider mb-1.5 block">Popular Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {filteredAvailableTags
                    .filter(tag => PREDEFINED_TAGS.includes(tag) || !savedCustomTags.includes(tag))
                    .slice(0, 20)
                    .map(tag => {
                      const isSelected = filters.tags.includes(tag)
                      const isPredefined = PREDEFINED_TAGS.includes(tag)
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleArrayFilter('tags', tag)}
                          className={`px-2 py-1 rounded-full text-xs transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-white/20 text-white border border-white/30'
                              : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/30 hover:bg-white/10'
                          }`}
                        >
                          <Hash className="w-3 h-3" />
                          {tag}
                          {isSelected && <X className="w-3 h-3 ml-0.5" onClick={(e) => {
                            e.stopPropagation()
                            removeTagFromFilter('tags', tag)
                          }} />}
                        </button>
                      )
                    })}
                </div>
              </div>
              
              {/* Custom Tags (User Added) */}
              {savedCustomTags.length > 0 && (
                <div>
                  <span className="text-[10px] text-gray-400/60 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Your Custom Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {savedCustomTags.map(tag => {
                      const isSelected = filters.tags.includes(tag)
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleArrayFilter('tags', tag)}
                          className={`px-2 py-1 rounded-full text-xs transition-all flex items-center gap-1 group ${
                            isSelected
                              ? 'bg-white/20 text-gray-200 border border-white/30'
                              : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/30 hover:bg-white/10'
                          }`}
                        >
                          <Hash className="w-3 h-3" />
                          {tag}
                          {isSelected && (
                            <X className="w-3 h-3 ml-0.5" onClick={(e) => {
                              e.stopPropagation()
                              removeTagFromFilter('tags', tag)
                            }} />
                          )}
                          <X 
                            className="w-3 h-3 ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity" 
                            onClick={(e) => {
                              e.stopPropagation()
                              removeCustomTagFromStorage(tag)
                              // Also remove from filter if selected
                              if (filters.tags.includes(tag)) {
                                removeTagFromFilter('tags', tag)
                              }
                            }}
                           />
                          <span className="sr-only">Remove custom tag</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Selected Tags Summary */}
            {filters.tags.length > 0 && (
              <div className="mt-3 pt-2 border-t border-white/10">
                <span className="text-[10px] text-gray-400/60 uppercase tracking-wider mb-1.5 block">
                  Selected ({filters.tags.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {filters.tags.map(tag => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        isCustomTag(tag) 
                          ? 'bg-white/15 text-gray-200 border border-white/20'
                          : 'bg-white/15 text-gray-200 border border-white/20'
                      }`}
                    >
                      <Hash className="w-3 h-3" />
                      {tag}
                      <button 
                        onClick={() => removeTagFromFilter('tags', tag)} 
                        className="hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Custom Tag Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Attributes (Strengths, Flaws, Values, Fears) */}
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                Attributes (Strengths/Flaws/Values/Fears)
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Add attribute..."
                  value={attributeInput}
                  onChange={(e) => setAttributeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTagToFilter('attributes', attributeInput, setAttributeInput)}
                  className="flex-1 h-8 bg-gray-900/20 border-white/15 text-white text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTagToFilter('attributes', attributeInput, setAttributeInput)}
                  className="h-8 px-3 border-white/15"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.attributes.map(attr => (
                  <span
                    key={attr}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs"
                  >
                    {attr}
                    <button onClick={() => removeTagFromFilter('attributes', attr)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* Likes */}
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2">Likes</label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Add..."
                  value={likesInput}
                  onChange={(e) => setLikesInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTagToFilter('likes', likesInput, setLikesInput)}
                  className="flex-1 h-8 bg-gray-900/20 border-white/15 text-white text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTagToFilter('likes', likesInput, setLikesInput)}
                  className="h-8 px-2 border-white/15"
                >
                  +
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.likes.map(like => (
                  <span key={like} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-xs">
                    {like}
                    <button onClick={() => removeTagFromFilter('likes', like)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Hobbies & Skills Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hobbies */}
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2">Hobbies</label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Add..."
                  value={hobbiesInput}
                  onChange={(e) => setHobbiesInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTagToFilter('hobbies', hobbiesInput, setHobbiesInput)}
                  className="flex-1 h-8 bg-gray-900/20 border-white/15 text-white text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTagToFilter('hobbies', hobbiesInput, setHobbiesInput)}
                  className="h-8 px-2 border-white/15"
                >
                  +
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.hobbies.map(hobby => (
                  <span key={hobby} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs">
                    {hobby}
                    <button onClick={() => removeTagFromFilter('hobbies', hobby)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* Skills */}
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2">Skills</label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Add..."
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTagToFilter('skills', skillsInput, setSkillsInput)}
                  className="flex-1 h-8 bg-gray-900/20 border-white/15 text-white text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTagToFilter('skills', skillsInput, setSkillsInput)}
                  className="h-8 px-2 border-white/15"
                >
                  +
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.skills.map(skill => (
                  <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs">
                    {skill}
                    <button onClick={() => removeTagFromFilter('skills', skill)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Personality Spectrums */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                Personality Spectrums
              </label>
              {filters.personalitySpectrums && (
                <button
                  onClick={() => updateFilter('personalitySpectrums', null)}
                  className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            
            {/* Toggle to enable spectrum filters */}
            <div className="mb-3">
              <button
                onClick={() => updateFilter('personalitySpectrums', filters.personalitySpectrums ? null : {
                  introvertExtrovert: [0, 100] as [number, number],
                  intuitiveObservant: [0, 100] as [number, number],
                  thinkingFeeling: [0, 100] as [number, number],
                  judgingProspecting: [0, 100] as [number, number],
                  assertiveTurbulent: [0, 100] as [number, number],
                })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  filters.personalitySpectrums
                    ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/20'
                }`}
              >
                <ToggleLeft className="w-3.5 h-3.5" />
                {filters.personalitySpectrums ? 'Spectrum filters active' : 'Enable spectrum filters'}
              </button>
            </div>
            
            {filters.personalitySpectrums && (
              <div className="space-y-3 p-3 rounded-lg bg-white/[0.02] border border-white/10">
                {PERSONALITY_SPECTRUMS.map(spectrum => {
                  const [min, max] = filters.personalitySpectrums![spectrum.key]
                  return (
                    <div key={spectrum.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          {spectrum.leftIcon} {spectrum.leftLabel}
                        </span>
                        <span className="text-[10px] text-white/50 font-mono">
                          {min} - {max}
                        </span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          {spectrum.rightLabel} {spectrum.rightIcon}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={min}
                          onChange={(e) => {
                            const newMin = parseInt(e.target.value)
                            if (newMin <= max) {
                              setFilters(prev => ({
                                ...prev,
                                personalitySpectrums: {
                                  ...prev.personalitySpectrums!,
                                  [spectrum.key]: [newMin, max] as [number, number]
                                }
                              }))
                            }
                          }}
                          className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-400"
                        />
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={max}
                          onChange={(e) => {
                            const newMax = parseInt(e.target.value)
                            if (newMax >= min) {
                              setFilters(prev => ({
                                ...prev,
                                personalitySpectrums: {
                                  ...prev.personalitySpectrums!,
                                  [spectrum.key]: [min, newMax] as [number, number]
                                }
                              }))
                            }
                          }}
                          className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-400"
                        />
                      </div>
                      {/* Quick preset buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => setFilters(prev => ({
                            ...prev,
                            personalitySpectrums: {
                              ...prev.personalitySpectrums!,
                              [spectrum.key]: [0, 30] as [number, number]
                            }
                          }))}
                          className={`px-1.5 py-0.5 rounded text-[9px] transition-all ${
                            min === 0 && max === 30
                              ? 'bg-white/15 text-white border border-white/25'
                              : 'bg-white/5 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {spectrum.leftLabel}
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({
                            ...prev,
                            personalitySpectrums: {
                              ...prev.personalitySpectrums!,
                              [spectrum.key]: [35, 65] as [number, number]
                            }
                          }))}
                          className={`px-1.5 py-0.5 rounded text-[9px] transition-all ${
                            min === 35 && max === 65
                              ? 'bg-white/15 text-white border border-white/25'
                              : 'bg-white/5 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          Ambivert
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({
                            ...prev,
                            personalitySpectrums: {
                              ...prev.personalitySpectrums!,
                              [spectrum.key]: [70, 100] as [number, number]
                            }
                          }))}
                          className={`px-1.5 py-0.5 rounded text-[9px] transition-all ${
                            min === 70 && max === 100
                              ? 'bg-white/15 text-white border border-white/25'
                              : 'bg-white/5 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {spectrum.rightLabel}
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({
                            ...prev,
                            personalitySpectrums: {
                              ...prev.personalitySpectrums!,
                              [spectrum.key]: [0, 100] as [number, number]
                            }
                          }))}
                          className={`px-1.5 py-0.5 rounded text-[9px] transition-all ${
                            min === 0 && max === 100
                              ? 'bg-white/15 text-white border border-white/25'
                              : 'bg-white/5 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          Any
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* RP Style & Experience Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" />
                RP Style
              </label>
              <div className="flex flex-wrap gap-1.5">
                {RP_STYLES.map(style => (
                  <button
                    key={style.value}
                    onClick={() => toggleArrayFilter('rpStyle', style.value)}
                    className={`px-2 py-1 rounded-lg text-xs transition-all ${
                      filters.rpStyle.includes(style.value)
                        ? 'bg-teal-500/30 text-teal-200 border border-teal-500/40'
                        : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/20'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                RP Experience
              </label>
              <div className="flex flex-wrap gap-1.5">
                {RP_EXPERIENCE_LEVELS.map(level => (
                  <button
                    key={level.value}
                    onClick={() => toggleArrayFilter('rpExperienceLevel', level.value)}
                    className={`px-2 py-1 rounded-lg text-xs transition-all ${
                      filters.rpExperienceLevel.includes(level.value)
                        ? 'bg-orange-500/30 text-orange-200 border border-orange-500/40'
                        : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/20'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Quick Toggles Row */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => updateFilter('lookingForPartner', filters.lookingForPartner === true ? null : true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                filters.lookingForPartner === true
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/20'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Looking for Partner
            </button>
            
            <button
              onClick={() => updateFilter('onlineOnly', !filters.onlineOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                filters.onlineOnly
                  ? 'bg-green-500/20 text-green-200 border border-green-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/15 hover:border-white/20'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              Online Only
            </button>
          </div>
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4 mr-2" />
                Clear All Filters ({activeFilterCount})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}