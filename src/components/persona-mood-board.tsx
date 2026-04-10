'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, RefreshCw, ImageIcon, Loader2, AlertCircle } from 'lucide-react'

interface PersonaMoodBoardProps {
  archetype: string | null
  secondaryArchetype?: string | null
  personalityDescription?: string | null
  appearance?: string | null
  backstory?: string | null
  mbtiType?: string | null
}

const IMAGE_LABELS = ['Atmosphere', 'Setting', 'Symbolism', 'Colors']

export function PersonaMoodBoard({
  archetype,
  secondaryArchetype,
  personalityDescription,
  appearance,
  backstory,
  mbtiType,
}: PersonaMoodBoardProps) {
  const [images, setImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const generateMoodBoard = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/moodboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetype,
          secondaryArchetype,
          personalityDescription,
          appearance,
          backstory,
          mbtiType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate mood board')
      }

      setImages(data.images || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate mood board')
    } finally {
      setIsLoading(false)
    }
  }

  const hasImages = images.some((img) => img !== '')

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-white/40" />
          <span className="text-sm font-medium text-white/70">Mood Board</span>
          {hasImages && (
            <span className="text-[10px] text-white/30">
              Visual vibe for {archetype || 'this character'}
              {secondaryArchetype ? ` × ${secondaryArchetype}` : ''}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateMoodBoard}
          disabled={isLoading}
          className="h-7 px-3 text-xs text-white/50 hover:text-white hover:bg-white/10"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : hasImages ? (
            <>
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-1.5" />
              Generate Mood Board
            </>
          )}
        </Button>
      </div>

      {/* Image Grid */}
      {isLoading && !hasImages ? (
        // Loading skeleton
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                <span className="text-[10px] text-white/30">{IMAGE_LABELS[i]}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent animate-pulse" />
            </div>
          ))}
        </div>
      ) : hasImages ? (
        // Display images
        <div className="grid grid-cols-2 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 group">
              {img ? (
                <>
                  <img
                    src={img}
                    alt={`${IMAGE_LABELS[i]} mood for ${archetype || 'character'}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white/80 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {IMAGE_LABELS[i]}
                  </span>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-5 h-5 text-white/20 mx-auto mb-1" />
                    <span className="text-[10px] text-white/30">Failed</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : error ? (
        // Error state
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-300">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateMoodBoard}
            className="mt-2 text-red-300 hover:text-red-200 hover:bg-red-500/10"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Try Again
          </Button>
        </div>
      ) : (
        // Empty state - prompt to generate
        <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 border-dashed text-center">
          <Sparkles className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/50">Generate visual vibes for this character</p>
          <p className="text-[10px] text-white/30 mt-1">
            Creates 4 aesthetic images: atmosphere, setting, symbolism, and colors
          </p>
          <Button
            onClick={generateMoodBoard}
            disabled={isLoading}
            className="mt-3 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white text-xs"
            size="sm"
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            Generate
          </Button>
        </div>
      )}
    </div>
  )
}
