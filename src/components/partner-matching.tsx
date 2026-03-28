'use client'

import { useState, useEffect } from 'react'
import { Heart, X, Check, Sparkles, Loader2, Users, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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
        // Show match notification!
        alert(`🎉 It's a match! You and ${match.name} both liked each other!`)
      }

      setCurrentIndex(currentIndex + 1)
    } catch (error) {
      console.error('Error processing match:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
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
      <Button 
        variant="outline" 
        className="w-full gap-2"
        onClick={() => setOpen(true)}
      >
        <Heart className="w-4 h-4" />
        Find Partners
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Partner Matching for {personaName}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !currentMatch ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No more matches</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Check back later for new potential partners!
                </p>
                <Button variant="outline" onClick={loadMatches}>
                  Refresh Matches
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Match Card */}
                <Card className="overflow-hidden">
                  <div className={cn(
                    "h-2 bg-gradient-to-r",
                    getScoreGradient(currentMatch.compatibilityScore)
                  )} />
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={currentMatch.avatarUrl || undefined} />
                        <AvatarFallback>{currentMatch.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{currentMatch.name}</h3>
                        {currentMatch.user && (
                          <p className="text-sm text-muted-foreground">
                            by @{currentMatch.user.username}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-lg font-bold", getScoreColor(currentMatch.compatibilityScore))}>
                            {currentMatch.compatibilityScore}%
                          </span>
                          <span className="text-sm text-muted-foreground">compatible</span>
                        </div>
                      </div>
                    </div>

                    {/* Compatibility Progress */}
                    <div className="mt-4">
                      <Progress value={currentMatch.compatibilityScore} className="h-2" />
                    </div>

                    {/* Match Reasons */}
                    {currentMatch.matchReasons.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Why you match:</p>
                        <div className="flex flex-wrap gap-1">
                          {currentMatch.matchReasons.map((reason, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* RP Info */}
                    {(currentMatch.rpStyle || currentMatch.rpGenres) && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        {currentMatch.rpStyle && (
                          <p className="text-sm">
                            <span className="font-medium">Style:</span>{' '}
                            {currentMatch.rpStyle.replace('_', ' ')}
                          </p>
                        )}
                        {currentMatch.rpGenres && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {JSON.parse(currentMatch.rpGenres).slice(0, 4).map((genre: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 gap-2"
                    onClick={() => handleAction('passed')}
                    disabled={processing}
                  >
                    <X className="w-5 h-5" />
                    Pass
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 gap-2"
                    onClick={() => handleAction('liked')}
                    disabled={processing}
                  >
                    <Heart className="w-5 h-5" />
                    Like
                  </Button>
                </div>

                {/* Progress indicator */}
                <p className="text-center text-sm text-muted-foreground">
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
