'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, X, SlidersHorizontal, ChevronDown, ChevronUp, 
  User, Brain, Heart, Sparkles, Hash, Calendar, Zap
} from 'lucide-react'

// MBTI Types
const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
]

// Common genders
const GENDERS = ['Male', 'Female', 'Non-binary', 'Genderfluid', 'Agender', 'Other']

// Common archetypes
const ARCHETYPES = [
  'Hero', 'Villain', 'Mentor', 'Lover', 'Explorer', 
  'Creator', 'Jester', 'Sage', 'Magician', 'Ruler',
  'Caregiver', 'Everyman', 'Outlaw', 'Innocent'
]

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
    syncPersonality: false
  })
  
  // Tag input states
  const [tagInput, setTagInput] = useState('')
  const [attributeInput, setAttributeInput] = useState('')
  const [likesInput, setLikesInput] = useState('')
  const [hobbiesInput, setHobbiesInput] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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
    const tag = input.trim()
    if (tag && !(filters[key] as string[]).includes(tag)) {
      setFilters(prev => ({
        ...prev,
        [key]: [...(prev[key] as string[]), tag]
      }))
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
      syncPersonality: false
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
    filters.skills.length > 0
  
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
    filters.skills.length

  return (
    <div className="space-y-3">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
          <Input
            type="text"
            placeholder="Search by username, name, tags, backstory..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="pl-10 pr-4 h-10 bg-purple-900/20 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40"
          />
          {filters.query && (
            <button
              onClick={() => updateFilter('query', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400/50 hover:text-purple-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-10 px-3 border-purple-500/20 ${showAdvanced ? 'bg-purple-500/20 border-purple-500/40' : 'bg-purple-900/20'}`}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-purple-500 text-white text-xs">
              {activeFilterCount}
            </span>
          )}
          {showAdvanced ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>
      </div>
      
      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Search In Field */}
          <div>
            <label className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-1.5">
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
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:border-purple-500/30'
                  }`}
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* MBTI Types */}
          <div>
            <label className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              MBTI Type
              <span className="text-purple-400/50 font-normal">- Syncs with HEXACO/OCEAN</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {MBTI_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => toggleArrayFilter('mbti', type)}
                  className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                    filters.mbti.includes(type)
                      ? 'bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-500/40'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:border-purple-500/30'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-purple-400 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.syncPersonality}
                onChange={(e) => updateFilter('syncPersonality', e.target.checked)}
                className="rounded border-purple-500/30 bg-purple-900/20"
              />
              <Zap className="w-3 h-3" />
              Sync with HEXACO/OCEAN traits (find similar personalities)
            </label>
          </div>
          
          {/* Gender & Age Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-1.5">
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
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:border-purple-500/30'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Age Range
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.ageMin ?? ''}
                  onChange={(e) => updateFilter('ageMin', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-20 h-8 bg-purple-900/20 border-purple-500/20 text-purple-100 text-sm"
                  min={0}
                  max={999}
                />
                <span className="text-purple-400">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.ageMax ?? ''}
                  onChange={(e) => updateFilter('ageMax', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-20 h-8 bg-purple-900/20 border-purple-500/20 text-purple-100 text-sm"
                  min={0}
                  max={999}
                />
              </div>
            </div>
          </div>
          
          {/* Species & Archetype Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-1.5">
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
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:border-purple-500/30'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                Archetype
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ARCHETYPES.map(a => (
                  <button
                    key={a}
                    onClick={() => toggleArrayFilter('archetype', a)}
                    className={`px-2 py-1 rounded-lg text-xs transition-all ${
                      filters.archetype.includes(a)
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:border-purple-500/30'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Custom Tag Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tags */}
            <div>
              <label className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTagToFilter('tags', tagInput, setTagInput)}
                  className="flex-1 h-8 bg-purple-900/20 border-purple-500/20 text-purple-100 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTagToFilter('tags', tagInput, setTagInput)}
                  className="h-8 px-3 border-purple-500/20"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs"
                  >
                    {tag}
                    <button onClick={() => removeTagFromFilter('tags', tag)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* Attributes (Strengths, Flaws, Values, Fears) */}
            <div>
              <label className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-1.5">
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
                  className="flex-1 h-8 bg-purple-900/20 border-purple-500/20 text-purple-100 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTagToFilter('attributes', attributeInput, setAttributeInput)}
                  className="h-8 px-3 border-purple-500/20"
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
          </div>
          
          {/* Likes, Hobbies, Skills Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Likes */}
            <div>
              <label className="text-xs font-medium text-purple-300 mb-2">Likes</label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Add..."
                  value={likesInput}
                  onChange={(e) => setLikesInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTagToFilter('likes', likesInput, setLikesInput)}
                  className="flex-1 h-8 bg-purple-900/20 border-purple-500/20 text-purple-100 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTagToFilter('likes', likesInput, setLikesInput)}
                  className="h-8 px-2 border-purple-500/20"
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
            
            {/* Hobbies */}
            <div>
              <label className="text-xs font-medium text-purple-300 mb-2">Hobbies</label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Add..."
                  value={hobbiesInput}
                  onChange={(e) => setHobbiesInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTagToFilter('hobbies', hobbiesInput, setHobbiesInput)}
                  className="flex-1 h-8 bg-purple-900/20 border-purple-500/20 text-purple-100 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTagToFilter('hobbies', hobbiesInput, setHobbiesInput)}
                  className="h-8 px-2 border-purple-500/20"
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
              <label className="text-xs font-medium text-purple-300 mb-2">Skills</label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Add..."
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTagToFilter('skills', skillsInput, setSkillsInput)}
                  className="flex-1 h-8 bg-purple-900/20 border-purple-500/20 text-purple-100 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTagToFilter('skills', skillsInput, setSkillsInput)}
                  className="h-8 px-2 border-purple-500/20"
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
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-purple-500/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-purple-400 hover:text-red-400 hover:bg-red-500/10"
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
