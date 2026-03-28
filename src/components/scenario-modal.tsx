'use client'

import { useState, useEffect } from 'react'
import { 
  Heart, MessageCircle, Eye, Clock, ExternalLink, Pin, 
  ChevronDown, ChevronUp, Play, Plus, X, Loader2, Send,
  User, Calendar, Edit, Trash2, Image as ImageIcon, Brain,
  Sparkles, UserCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth-store'
import { usePersonaStore } from '@/stores/persona-store'
import { cn } from '@/lib/utils'

interface Scenario {
  id: string
  title: string
  description?: string | null
  scenarioContext?: string | null
  personalityNotes?: string | null
  illustrationUrl?: string | null
  alternateImageUrl?: string | null
  galleryUrls?: string | null
  likeCount: number
  favoriteCount: number
  viewCount: number
  discordLink?: string | null
  suggestionLink?: string | null
  publishedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  initialMessages?: string | null
  initialMessagesEnabled: boolean
  pinnedNote?: string | null
  isPublic: boolean
  persona: {
    id: string
    name: string
    avatarUrl?: string | null
    description?: string | null
    gender?: string | null
    pronouns?: string | null
    age?: number | null
    species?: string | null
    archetype?: string | null
    mbtiType?: string | null
    bigFive?: string | null
    hexaco?: string | null
    personalityDescription?: string | null
    personalitySpectrums?: string | null
    strengths?: string | null
    flaws?: string | null
    values?: string | null
    fears?: string | null
    likes?: string | null
    dislikes?: string | null
    hobbies?: string | null
    user: {
      id: string
      username: string
    }
  }
  user: {
    id: string
    username: string
    avatarUrl?: string | null
  }
  likes?: { userId: string; isFavorite: boolean }[]
  comments?: {
    id: string
    content: string
    isPinned: boolean
    isCreatorNote: boolean
    createdAt: Date
    user: { id: string; username: string; avatarUrl?: string | null }
    persona?: { id: string; name: string; avatarUrl?: string | null } | null
  }[]
  _count?: {
    likes: number
    comments: number
  }
}

interface ScenarioModalProps {
  scenarioId?: string
  open: boolean
  onClose: () => void
  onCreate?: () => void
}

export function ScenarioModal({ scenarioId, open, onClose, onCreate }: ScenarioModalProps) {
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    scenario: true,
    personality: false,
    messages: false,
    comments: true
  })
  const [activeInitialMessage, setActiveInitialMessage] = useState(0)
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(0)

  // Create mode state
  const [isCreateMode, setIsCreateMode] = useState(!scenarioId)
  const [createData, setCreateData] = useState({
    personaId: '',
    title: '',
    description: '',
    scenarioContext: '',
    personalityNotes: '',
    illustrationUrl: '',
    alternateImageUrl: '',
    galleryUrls: [] as string[],
    discordLink: '',
    suggestionLink: '',
    initialMessages: [''],
    pinnedNote: '',
    isPublic: true
  })

  const { user } = useAuthStore()
  const { personas } = usePersonaStore()

  useEffect(() => {
    if (scenarioId && open) {
      loadScenario()
    } else {
      setIsCreateMode(true)
      setScenario(null)
    }
  }, [scenarioId, open])

  useEffect(() => {
    if (scenario && user) {
      setIsOwner(scenario.user.id === user.id)
      const userLike = scenario.likes?.find(l => l.userId === user.id)
      setLiked(!!userLike && !userLike.isFavorite)
      setFavorited(!!userLike?.isFavorite)
    }
  }, [scenario, user])

  const loadScenario = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}`)
      const data = await res.json()
      setScenario(data.scenario)
      setIsCreateMode(false)
    } catch (error) {
      console.error('Error loading scenario:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (isFavorite = false) => {
    if (!user || !scenario) return

    try {
      const res = await fetch(`/api/scenarios/${scenario.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite })
      })

      if (res.ok) {
        if (isFavorite) {
          setFavorited(!favorited)
          if (!favorited) setLiked(false)
        } else {
          setLiked(!liked)
          if (!liked) setFavorited(false)
        }
      }
    } catch (error) {
      console.error('Error liking scenario:', error)
    }
  }

  const handleComment = async () => {
    if (!user || !scenario || !newComment.trim()) return

    setSubmittingComment(newComment)
    try {
      const res = await fetch(`/api/scenarios/${scenario.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })
      const data = await res.json()
      if (data.comment) {
        setScenario({
          ...scenario,
          comments: [data.comment, ...(scenario.comments || [])]
        })
        setNewComment('')
      }
    } catch (error) {
      console.error('Error posting comment:', error)
    } finally {
      setSubmittingComment('')
    }
  }

  const handleCreate = async () => {
    if (!createData.personaId || !createData.title) return

    setLoading(true)
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createData,
          initialMessages: createData.initialMessages.filter(m => m.trim())
        })
      })
      const data = await res.json()
      if (data.scenario) {
        onCreate?.()
        onClose()
      }
    } catch (error) {
      console.error('Error creating scenario:', error)
    } finally {
      setLoading(false)
    }
  }

  const parseInitialMessages = (messages: string | null | undefined): string[] => {
    if (!messages) return []
    try {
      return JSON.parse(messages)
    } catch {
      return []
    }
  }

  const initialMessages = scenario ? parseInitialMessages(scenario.initialMessages) : []

  if (isCreateMode) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-[#1a1625] border border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Create Scenario</DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[55vh] w-full">
            <div className="space-y-4 py-4 pr-6">
              {/* Persona Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200">Select Persona</label>
                <Select
                  value={createData.personaId}
                  onValueChange={(v) => setCreateData({ ...createData, personaId: v })}
                >
                  <SelectTrigger className="w-full bg-[#2a2438] border-purple-500/30 text-white hover:bg-[#352f45]">
                    <SelectValue placeholder="Choose a persona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2438] border-purple-500/30 text-white">
                    {personas.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="hover:bg-[#352f45] focus:bg-[#352f45]">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={p.avatarUrl || undefined} />
                            <AvatarFallback className="bg-purple-600 text-white">{p.name[0]}</AvatarFallback>
                          </Avatar>
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200">Scenario Title *</label>
                <Input
                  value={createData.title}
                  onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                  placeholder="e.g., Your victim's girlfriend came to confront you"
                  className="bg-[#2a2438] border-purple-500/30 text-white placeholder:text-purple-300/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200">Description</label>
                <Textarea
                  value={createData.description}
                  onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                  placeholder="Describe the scenario..."
                  rows={3}
                  className="bg-[#2a2438] border-purple-500/30 text-white placeholder:text-purple-300/50"
                />
              </div>

              {/* Scenario Context */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200">Scenario Context</label>
                <Textarea
                  value={createData.scenarioContext}
                  onChange={(e) => setCreateData({ ...createData, scenarioContext: e.target.value })}
                  placeholder="Sets the context for the roleplay..."
                  rows={3}
                  className="bg-[#2a2438] border-purple-500/30 text-white placeholder:text-purple-300/50"
                />
              </div>

              {/* Personality Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200">Personality Notes</label>
                <Textarea
                  value={createData.personalityNotes}
                  onChange={(e) => setCreateData({ ...createData, personalityNotes: e.target.value })}
                  placeholder="How the character thinks and behaves in this scenario..."
                  rows={3}
                  className="bg-[#2a2438] border-purple-500/30 text-white placeholder:text-purple-300/50"
                />
              </div>

              {/* Initial Messages */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200">Initial Messages</label>
                <p className="text-xs text-purple-300/70">Starter prompts for users</p>
                {createData.initialMessages.map((msg, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={msg}
                      onChange={(e) => {
                        const newMsgs = [...createData.initialMessages]
                        newMsgs[i] = e.target.value
                        setCreateData({ ...createData, initialMessages: newMsgs })
                      }}
                      placeholder={`Initial message ${i + 1}...`}
                      className="bg-[#2a2438] border-purple-500/30 text-white placeholder:text-purple-300/50"
                    />
                    {createData.initialMessages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-[#352f45]"
                        onClick={() => {
                          setCreateData({
                            ...createData,
                            initialMessages: createData.initialMessages.filter((_, idx) => idx !== i)
                          })
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500/30 text-white hover:bg-[#352f45]"
                  onClick={() => setCreateData({ ...createData, initialMessages: [...createData.initialMessages, ''] })}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Message
                </Button>
              </div>

              {/* Links */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-200">Discord Link</label>
                  <Input
                    value={createData.discordLink}
                    onChange={(e) => setCreateData({ ...createData, discordLink: e.target.value })}
                    placeholder="https://discord.gg/..."
                    className="bg-[#2a2438] border-purple-500/30 text-white placeholder:text-purple-300/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-200">Suggestion Link</label>
                  <Input
                    value={createData.suggestionLink}
                    onChange={(e) => setCreateData({ ...createData, suggestionLink: e.target.value })}
                    placeholder="Link for suggestions..."
                    className="bg-[#2a2438] border-purple-500/30 text-white placeholder:text-purple-300/50"
                  />
                </div>
              </div>

              {/* Pinned Note */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200">Pinned Creator Note</label>
                <Textarea
                  value={createData.pinnedNote}
                  onChange={(e) => setCreateData({ ...createData, pinnedNote: e.target.value })}
                  placeholder="Explain the intended use of this scenario..."
                  rows={2}
                  className="bg-[#2a2438] border-purple-500/30 text-white placeholder:text-purple-300/50"
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t border-purple-500/20">
            <Button variant="outline" className="border-purple-500/30 text-white hover:bg-[#352f45]" onClick={onClose}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleCreate} disabled={loading || !createData.personaId || !createData.title}>
              {loading ? 'Creating...' : 'Create Scenario'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-[#1a1625] border border-purple-500/30 text-white">
        {loading ? (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Loading Scenario</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          </>
        ) : scenario ? (
          <>
            <DialogHeader className="flex-shrink-0 pb-4 border-b border-purple-500/20">
              <DialogTitle className="text-xl">{scenario.title}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-purple-300/70 mt-1">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={scenario.user.avatarUrl || undefined} />
                  <AvatarFallback className="bg-purple-600 text-white text-xs">{scenario.user.username[0]}</AvatarFallback>
                </Avatar>
                <span>by @{scenario.user.username}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(scenario.createdAt).toLocaleDateString()}
                </span>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 py-4">
                {/* Main Content - Left 3 columns */}
                <div className="lg:col-span-3 space-y-4">
                  {/* Persona Card - Prominent Display */}
                  <Card className="bg-[#2a2438] border-purple-500/30 overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      {/* Persona Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-32 h-32 rounded-xl overflow-hidden bg-[#1a1625] border-2 border-purple-500/30">
                          {scenario.illustrationUrl || scenario.persona.avatarUrl ? (
                            <img
                              src={scenario.illustrationUrl || scenario.persona.avatarUrl || ''}
                              alt={scenario.persona.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <UserCircle className="w-16 h-16 text-purple-500/30" />
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Persona Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-white">{scenario.persona.name}</h3>
                          {scenario.persona.archetype && (
                            <Badge className="bg-purple-600/30 text-purple-200 border-purple-500/30">{scenario.persona.archetype}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-purple-300/70 flex-wrap">
                          {scenario.persona.gender && <span>{scenario.persona.gender}</span>}
                          {scenario.persona.pronouns && <span>• {scenario.persona.pronouns}</span>}
                          {scenario.persona.age && <span>• Age {scenario.persona.age}</span>}
                          {scenario.persona.species && <span>• {scenario.persona.species}</span>}
                        </div>
                        {scenario.persona.description && (
                          <p className="text-sm text-purple-200/80 mt-2 line-clamp-3">{scenario.persona.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3">
                          <Button
                            variant={liked ? 'default' : 'outline'}
                            size="sm"
                            className={liked ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-500/30 text-white hover:bg-[#352f45]'}
                            onClick={() => handleLike(false)}
                          >
                            <Heart className={cn("w-4 h-4 mr-1", liked && "fill-current")} />
                            {scenario.likeCount}
                          </Button>
                          <Button
                            variant={favorited ? 'default' : 'outline'}
                            size="sm"
                            className={favorited ? 'bg-yellow-600 hover:bg-yellow-700' : 'border-purple-500/30 text-white hover:bg-[#352f45]'}
                            onClick={() => handleLike(true)}
                          >
                            <span className={favorited ? 'text-white' : 'text-purple-300'}>★</span>
                            Favorite
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Art Gallery */}
                  {(() => {
                    const galleryImages = scenario.galleryUrls ? JSON.parse(scenario.galleryUrls) : []
                    const allImages = [
                      scenario.illustrationUrl,
                      scenario.alternateImageUrl,
                      ...galleryImages
                    ].filter(Boolean)
                    
                    if (allImages.length > 0) {
                      return (
                        <Card className="bg-[#2a2438] border-purple-500/30">
                          <CardContent className="p-4">
                            <h3 className="font-semibold flex items-center gap-2 mb-3">
                              <ImageIcon className="w-4 h-4 text-purple-400" />
                              Art Gallery
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {allImages.map((url, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedGalleryImage(i)}
                                  className={cn(
                                    "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                    selectedGalleryImage === i 
                                      ? "border-purple-500 ring-2 ring-purple-500/30" 
                                      : "border-transparent hover:border-purple-500/50"
                                  )}
                                >
                                  <img src={url!} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                            {allImages[selectedGalleryImage] && (
                              <div className="mt-3 rounded-lg overflow-hidden bg-[#1a1625]">
                                <img 
                                  src={allImages[selectedGalleryImage]!} 
                                  alt="Selected" 
                                  className="w-full max-h-64 object-contain"
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    }
                    return null
                  })()}

                  {/* Description */}
                  {scenario.description && (
                    <Card className="bg-[#2a2438] border-purple-500/30">
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">{scenario.description}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Scenario Context */}
                  {scenario.scenarioContext && (
                    <Collapsible
                      open={expandedSections.scenario}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, scenario: open })}
                    >
                      <Card className="bg-[#2a2438] border-purple-500/30">
                        <CollapsibleTrigger asChild>
                          <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#352f45]">
                            <h3 className="font-semibold">Scenario Context</h3>
                            {expandedSections.scenario ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </CardContent>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <p className="text-sm whitespace-pre-wrap">{scenario.scenarioContext}</p>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                  {/* Personality Notes */}
                  {scenario.personalityNotes && (
                    <Collapsible
                      open={expandedSections.personality}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, personality: open })}
                    >
                      <Card className="bg-[#2a2438] border-purple-500/30">
                        <CollapsibleTrigger asChild>
                          <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#352f45]">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Brain className="w-4 h-4 text-purple-400" />
                              Scenario Personality
                            </h3>
                            {expandedSections.personality ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </CardContent>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <p className="text-sm whitespace-pre-wrap">{scenario.personalityNotes}</p>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                  {/* Initial Messages */}
                  {initialMessages.length > 0 && scenario.initialMessagesEnabled && (
                    <Collapsible
                      open={expandedSections.messages}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, messages: open })}
                    >
                      <Card className="bg-[#2a2438] border-purple-500/30">
                        <CollapsibleTrigger asChild>
                          <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#352f45]">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-400" />
                              Initial Messages
                            </h3>
                            {expandedSections.messages ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </CardContent>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-2">
                            {initialMessages.map((msg, i) => (
                              <button
                                key={i}
                                onClick={() => setActiveInitialMessage(i)}
                                className={cn(
                                  "w-full p-3 rounded-lg text-left text-sm transition-colors",
                                  activeInitialMessage === i
                                    ? "bg-purple-600 text-white"
                                    : "bg-[#1a1625] hover:bg-[#352f45] text-white"
                                )}
                              >
                                {msg}
                              </button>
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                  {/* Comments */}
                  <Collapsible
                    open={expandedSections.comments}
                    onOpenChange={(open) => setExpandedSections({ ...expandedSections, comments: open })}
                  >
                    <Card className="bg-[#2a2438] border-purple-500/30">
                      <CollapsibleTrigger asChild>
                        <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#352f45]">
                          <h3 className="font-semibold flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Comments ({scenario.comments?.length || 0})
                          </h3>
                          {expandedSections.comments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {/* Pinned/Creator Notes */}
                          {scenario.comments?.filter(c => c.isPinned || c.isCreatorNote).map((comment) => (
                            <div
                              key={comment.id}
                              className={cn(
                                "p-3 rounded-lg",
                                comment.isCreatorNote ? "bg-purple-600/20 border border-purple-500/30" : "bg-[#1a1625]"
                              )}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={comment.user.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-purple-600 text-white">{comment.user.username[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm">{comment.user.username}</span>
                                {comment.isCreatorNote && (
                                  <Badge className="text-xs bg-purple-600">Creator</Badge>
                                )}
                                {comment.isPinned && (
                                  <Pin className="w-3 h-3 text-purple-300" />
                                )}
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          ))}

                          <Separator className="bg-purple-500/20" />

                          {/* Regular Comments */}
                          {scenario.comments?.filter(c => !c.isPinned && !c.isCreatorNote).map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={comment.user.avatarUrl || undefined} />
                                <AvatarFallback className="bg-purple-600 text-white">{comment.user.username[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {comment.persona?.name || comment.user.username}
                                  </span>
                                  <span className="text-xs text-purple-300/70">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm">{comment.content}</p>
                              </div>
                            </div>
                          ))}

                          {/* Add Comment */}
                          {user && (
                            <div className="flex gap-2">
                              <Input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="bg-[#1a1625] border-purple-500/30 text-white placeholder:text-purple-300/50"
                                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                              />
                              <Button
                                size="icon"
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={handleComment}
                                disabled={!newComment.trim() || !!submittingComment}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </div>

                {/* Sidebar - Right column */}
                <div className="space-y-4">
                  {/* Persona Personality Card */}
                  <Card className="bg-[#2a2438] border-purple-500/30">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-400" />
                        Personality
                      </h4>
                      
                      {/* MBTI Type */}
                      {scenario.persona.mbtiType && (
                        <div className="mb-3">
                          <span className="text-xs text-purple-300/70">MBTI Type</span>
                          <div className="text-lg font-bold text-purple-300">{scenario.persona.mbtiType}</div>
                        </div>
                      )}
                      
                      {/* Big Five Traits */}
                      {scenario.persona.bigFive && (() => {
                        try {
                          const bigFive = JSON.parse(scenario.persona.bigFive)
                          return (
                            <div className="space-y-2 mb-3">
                              <span className="text-xs text-purple-300/70">Big Five (OCEAN)</span>
                              {Object.entries(bigFive).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="text-xs text-purple-300/50 w-16 capitalize">{key}</span>
                                  <div className="flex-1 h-2 bg-[#1a1625] rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-purple-500 rounded-full transition-all"
                                      style={{ width: `${(value as number) * 10}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        } catch { return null }
                      })()}
                      
                      {/* Strengths & Flaws */}
                      {scenario.persona.strengths && (
                        <div className="mb-2">
                          <span className="text-xs text-purple-300/70">Strengths</span>
                          <p className="text-sm text-green-300/80">{scenario.persona.strengths}</p>
                        </div>
                      )}
                      {scenario.persona.flaws && (
                        <div className="mb-2">
                          <span className="text-xs text-purple-300/70">Flaws</span>
                          <p className="text-sm text-red-300/80">{scenario.persona.flaws}</p>
                        </div>
                      )}
                      
                      {/* Likes & Dislikes */}
                      {scenario.persona.likes && (
                        <div className="mb-2">
                          <span className="text-xs text-purple-300/70">Likes</span>
                          <p className="text-sm text-purple-200">{scenario.persona.likes}</p>
                        </div>
                      )}
                      {scenario.persona.dislikes && (
                        <div className="mb-2">
                          <span className="text-xs text-purple-300/70">Dislikes</span>
                          <p className="text-sm text-purple-200">{scenario.persona.dislikes}</p>
                        </div>
                      )}
                      
                      {!scenario.persona.mbtiType && !scenario.persona.bigFive && !scenario.persona.strengths && !scenario.persona.flaws && !scenario.persona.likes && !scenario.persona.dislikes && (
                        <p className="text-sm text-purple-300/50">No personality data set</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Links */}
                  <Card className="bg-[#2a2438] border-purple-500/30">
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-purple-400" />
                        Links
                      </h4>
                      {scenario.discordLink && (
                        <a
                          href={scenario.discordLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 hover:underline"
                        >
                          Discord Server
                        </a>
                      )}
                      {scenario.suggestionLink && (
                        <a
                          href={scenario.suggestionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 hover:underline"
                        >
                          Suggestions
                        </a>
                      )}
                      {!scenario.discordLink && !scenario.suggestionLink && (
                        <p className="text-sm text-purple-300/50">No links available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Creator Notes */}
                  {scenario.pinnedNote && (
                    <Card className="bg-[#2a2438] border-purple-500/30">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Pin className="w-4 h-4 text-purple-400" />
                          Creator Notes
                        </h4>
                        <p className="text-sm text-purple-300/70">{scenario.pinnedNote}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Stats */}
                  <Card className="bg-[#2a2438] border-purple-500/30">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3">Stats</h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-300/70">Views</span>
                        <span>{scenario.viewCount}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-purple-300/70">Likes</span>
                        <span>{scenario.likeCount}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-purple-300/70">Created</span>
                        <span>{new Date(scenario.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-purple-300/70">Updated</span>
                        <span>{new Date(scenario.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Scenario Not Found</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Scenario not found
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
