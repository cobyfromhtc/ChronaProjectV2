'use client'

import { useState, useEffect } from 'react'
import { Heart, X, Check, Sparkles, Loader2, Users, ChevronRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PartnerMatch {
  id: string
  name: string
  avatarUrl?: string | null
  compatibilityScore: number
  matchReasons: string[]
  user?: {
    id: string
    username: string
    avatarUrl?: string | null
  }
  rpStyle?: string | null
  rpGenres?: string | null
  rpThemes?: string | null
}

interface PartnerMatchingProps {
  personaId: string
  personaName: string
}

export function PartnerMatching({ personaId, personaName }: PartnerMatchingProps) {
  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState<PartnerMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [mutualMatchMsg, setMutualMatchMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadMatches()
    }
  }, [open])

  const loadMatches = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/partner-matching?personaId=${personaId}`)
      const data = await res.json()
      setMatches(data.matches || [])
      setCurrentIndex(0)
    } catch (error) {
      console.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'liked' | 'passed') => {
    const match = matches[currentIndex]
    if (!match) return

    setProcessing(true)
    setMutualMatchMsg(null)
    try {
      const res = await fetch(`/api/partner-matching/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          matcherId: personaId
        })
      })
      const data = await res.json()

      if (data.isMutualMatch) {
        setMutualMatchMsg(`It's a match! You and ${match.name} both liked each other!`)
      }

      setCurrentIndex(currentIndex + 1)
    } catch (error) {
      console.error('Error processing match:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500'
    if (score >= 60) return 'from-yellow-500 to-amber-500'
    if (score >= 40) return 'from-orange-500 to-amber-500'
    return 'from-red-500 to-rose-500'
  }

  const currentMatch = matches[currentIndex]

  return (
    <>
      <button 
        className="btn-persona-secondary w-full gap-2 inline-flex items-center justify-center"
        onClick={() => setOpen(true)}
      >
        <Heart className="w-4 h-4" />
        Find Partners
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-[#0a0a0a] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-white/80" />
              Partner Matching for {personaName}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {/* Mutual match message */}
            {mutualMatchMsg && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                <p className="text-green-400 text-sm font-medium">🎉 {mutualMatchMsg}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-white/60" />
              </div>
            ) : !currentMatch ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-white/20" />
                <h3 className="font-semibold text-white/90 mb-2">No more matches</h3>
                <p className="text-sm text-white/50 mb-4">
                  Check back later for new potential partners!
                </p>
                <button
                  className="btn-persona-secondary text-sm"
                  onClick={loadMatches}
                >
                  Refresh Matches
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Match Card */}
                <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
                  <div className={cn(
                    "h-2 bg-gradient-to-r",
                    getScoreGradient(currentMatch.compatibilityScore)
                  )} />
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={currentMatch.avatarUrl || undefined} />
                        <AvatarFallback className="bg-white/10 text-white/60">{currentMatch.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white/90 truncate">{currentMatch.name}</h3>
                        {currentMatch.user && (
                          <p className="text-sm text-white/50">
                            by @{currentMatch.user.username}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-lg font-bold", getScoreColor(currentMatch.compatibilityScore))}>
                            {currentMatch.compatibilityScore}%
                          </span>
                          <span className="text-sm text-white/50">compatible</span>
                        </div>
                      </div>
                    </div>

                    {/* Compatibility Progress */}
                    <div className="mt-4">
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                            getScoreGradient(currentMatch.compatibilityScore)
                          )}
                          style={{ width: `${currentMatch.compatibilityScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Match Reasons */}
                    {currentMatch.matchReasons.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-white/70 mb-2">Why you match:</p>
                        <div className="flex flex-wrap gap-1">
                          {currentMatch.matchReasons.map((reason, i) => (
                            <span key={i} className="bg-white/5 text-white/60 border border-white/10 text-xs px-2 py-0.5 rounded-full">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* RP Info */}
                    {(currentMatch.rpStyle || currentMatch.rpGenres) && (
                      <div className="mt-4 p-3 bg-white/[0.03] border border-white/5 rounded-lg">
                        {currentMatch.rpStyle && (
                          <p className="text-sm text-white/70">
                            <span className="font-medium text-white/80">Style:</span>{' '}
                            {currentMatch.rpStyle.replace('_', ' ')}
                          </p>
                        )}
                        {currentMatch.rpGenres && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {JSON.parse(currentMatch.rpGenres).slice(0, 4).map((genre: string, i: number) => (
                              <span key={i} className="bg-white/5 text-white/60 border border-white/10 text-xs px-2 py-0.5 rounded-full">
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    className="flex-1 gap-2 btn-persona-secondary inline-flex items-center justify-center py-3"
                    onClick={() => handleAction('passed')}
                    disabled={processing}
                  >
                    <X className="w-5 h-5" />
                    Pass
                  </button>
                  <button
                    className="flex-1 gap-2 btn-persona inline-flex items-center justify-center py-3"
                    onClick={() => handleAction('liked')}
                    disabled={processing}
                  >
                    <Heart className="w-5 h-5" />
                    Like
                  </button>
                </div>

                {/* Progress indicator */}
                <p className="text-center text-sm text-white/40">
                  {currentIndex + 1} of {matches.length}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
