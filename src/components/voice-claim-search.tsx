'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Mic, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface VoiceClaim {
  id: string
  characterName: string
  actorName: string
  sourceTitle: string
  sourceType: string
  year?: number | null
  imageUrl?: string | null
  description?: string | null
  tags?: string | null
  useCount: number
}

interface VoiceClaimSearchProps {
  value?: {
    id: string
    name: string
    source: string
    notes?: string
  } | null
  onChange: (claim: { id: string; name: string; source: string; notes?: string } | null) => void
  placeholder?: string
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  movie: '🎬 Movie',
  tv_show: '📺 TV Show',
  anime: '🎌 Anime',
  game: '🎮 Game',
  other: '🎵 Other'
}

export function VoiceClaimSearch({ value, onChange, placeholder = 'Search for a voice claim...' }: VoiceClaimSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<VoiceClaim[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchVoiceClaims = async () => {
      if (!search && !selectedType) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (selectedType) params.set('sourceType', selectedType)
        params.set('limit', '15')

        const res = await fetch(`/api/voice-claims?${params}`)
        const data = await res.json()
        setResults(data.voiceClaims || [])
      } catch (error) {
        console.error('Error searching voice claims:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchVoiceClaims, 300)
    return () => clearTimeout(debounce)
  }, [search, selectedType])

  const handleSelect = (claim: VoiceClaim) => {
    onChange({
      id: claim.id,
      name: `${claim.characterName} - ${claim.actorName}`,
      source: claim.sourceTitle,
      notes: claim.description || undefined
    })
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    onChange(null)
  }

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{value.name}</p>
            <p className="text-sm text-muted-foreground truncate">{value.source}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      )}

      {isOpen && !value && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50">
          {/* Source Type Filter */}
          <div className="p-2 border-b flex gap-1 flex-wrap">
            <Button
              variant={selectedType === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('')}
              className="h-7 text-xs"
            >
              All
            </Button>
            {Object.entries(SOURCE_TYPE_LABELS).map(([type, label]) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="h-7 text-xs"
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Results */}
          <ScrollArea className="max-h-64">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length > 0 ? (
              <div className="p-1">
                {results.map((claim) => (
                  <button
                    key={claim.id}
                    onClick={() => handleSelect(claim)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted overflow-hidden">
                      {claim.imageUrl ? (
                        <img src={claim.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Mic className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{claim.characterName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {claim.actorName} • {claim.sourceTitle}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {SOURCE_TYPE_LABELS[claim.sourceType] || claim.sourceType}
                      </Badge>
                      {claim.year && (
                        <span className="text-xs text-muted-foreground">{claim.year}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : search || selectedType ? (
              <div className="p-8 text-center text-muted-foreground">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No voice claims found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Search for a voice claim</p>
                <p className="text-sm">Type a character, actor, or show name</p>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
