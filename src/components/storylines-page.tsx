'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Compass, Search, Plus, Users, X, Loader2, Check, Crown,
  Sparkles, BookOpen, Wand2
} from 'lucide-react'
import { STORYLINE_CATEGORIES } from '@/lib/constants'

interface StorylineItem {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  category: string
  memberCount: number
  isJoined: boolean
  owner: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

interface StorylinesPageProps {
  onViewStoryline?: (storylineId: string) => void
}

export function StorylinesPage({ onViewStoryline }: StorylinesPageProps) {
  const { user } = useAuth()
  
  const [storylines, setStorylines] = useState<StorylineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: 'Other',
    isPublic: true
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  
  // Fetch storylines
  const fetchStorylines = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)
      if (searchQuery) params.set('search', searchQuery)
      
      const response = await fetch(`/api/storylines?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStorylines(data.storylines)
      }
    } catch (error) {
      console.error('Failed to fetch storylines:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    fetchStorylines()
  }, [selectedCategory])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2 || searchQuery.length === 0) {
        fetchStorylines()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Join storyline
  const handleJoin = async (storylineId: string) => {
    setJoiningId(storylineId)
    try {
      const response = await fetch(`/api/storylines/${storylineId}/join`, {
        method: 'POST'
      })
      
      if (response.ok) {
        fetchStorylines()
      } else {
        const data = await response.json()
        alert(data.error)
      }
    } catch (error) {
      console.error('Failed to join storyline:', error)
    } finally {
      setJoiningId(null)
    }
  }
  
  // Create storyline
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setCreateError('Name is required')
      return
    }
    
    setIsCreating(true)
    setCreateError('')
    
    try {
      const response = await fetch('/api/storylines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setShowCreateModal(false)
        setCreateForm({ name: '', description: '', category: 'Other', isPublic: true })
        fetchStorylines()
      } else {
        setCreateError(data.error || 'Failed to create storyline')
      }
    } catch (error) {
      console.error('Failed to create storyline:', error)
      setCreateError('Something went wrong')
    } finally {
      setIsCreating(false)
    }
  }
  
  // Get category icon
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Romance': '💕',
      'Action': '⚔️',
      'Horror': '👻',
      'Fantasy': '🧙',
      'Sci-Fi': '🚀',
      'Slice of Life': '🌸',
      'Mystery': '🔍',
      'Comedy': '😂',
      'Drama': '🎭',
      'Adventure': '🗺️',
      'Thriller': '😱',
      'Historical': '📜',
      'Supernatural': '✨',
      'Other': '📖'
    }
    return icons[category] || '📖'
  }
  
  return (
    <div className="flex flex-col h-full persona-bg">
      {/* Header */}
      <div className="h-14 border-b border-purple-500/15 flex items-center px-4 gap-4 bg-[#12091f]/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-500 flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-purple-100">Storylines</span>
        </div>
        
        {/* Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
            <input
              placeholder="Search storylines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="persona-input w-full pl-10 h-9 text-sm"
            />
          </div>
        </div>
        
        <div className="ml-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-persona flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Storyline
          </button>
        </div>
      </div>
      
      {/* Main Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-48 border-r border-purple-500/15 bg-[#0d0718]/50 flex-shrink-0 flex flex-col">
          <div className="p-3 border-b border-purple-500/10">
            <h3 className="text-xs font-semibold text-purple-400/60 uppercase tracking-wider px-2">Categories</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                  selectedCategory === null 
                    ? 'bg-purple-500/20 text-purple-100 border-l-2 border-l-purple-500' 
                    : 'text-purple-300/70 hover:text-purple-100 hover:bg-purple-500/5'
                }`}
              >
                <span className="text-base">✨</span>
                <span className="font-medium">All</span>
              </button>
              {STORYLINE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                    selectedCategory === cat 
                      ? 'bg-purple-500/20 text-purple-100 border-l-2 border-l-purple-500' 
                      : 'text-purple-300/70 hover:text-purple-100 hover:bg-purple-500/5'
                  }`}
                >
                  <span className="text-base">{getCategoryIcon(cat)}</span>
                  <span className="font-medium truncate">{cat}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Storylines Grid */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : storylines.length === 0 ? (
              <div className="persona-empty-state persona-card py-16">
                <div className="persona-empty-state-icon">
                  <BookOpen className="w-8 h-8" />
                </div>
                <p className="text-purple-200 text-lg font-medium">No storylines found</p>
                <p className="text-purple-400/60 text-sm mt-1">Create one to start a new adventure!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-persona mt-4 flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  Create Your First Storyline
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {storylines.map(sl => (
                  <div 
                    key={sl.id} 
                    className={`persona-card overflow-hidden ${sl.isJoined ? 'persona-card-hover cursor-pointer' : ''}`}
                    onClick={() => sl.isJoined && onViewStoryline?.(sl.id)}
                  >
                    {/* Banner */}
                    <div className="h-24 bg-gradient-to-br from-purple-600/40 via-fuchsia-500/30 to-cyan-500/20 relative">
                      {sl.iconUrl && (
                        <img src={sl.iconUrl} alt="" className="w-full h-full object-cover opacity-30" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1230] to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center border-2 border-[#1a1230] shadow-lg overflow-hidden">
                          {sl.iconUrl ? (
                            <img src={sl.iconUrl} alt={sl.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold text-xl">{sl.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="text-lg">{getCategoryIcon(sl.category)}</span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4 pt-2">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-purple-100">{sl.name}</h3>
                          <p className="text-xs text-purple-400/70">{sl.category}</p>
                        </div>
                        <span className="persona-badge persona-badge-primary text-xs">
                          {sl.memberCount} member{sl.memberCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {sl.description && (
                        <p className="text-sm text-purple-300/70 mb-3 line-clamp-2">{sl.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t border-purple-500/10">
                        <div className="flex items-center gap-2 text-xs text-purple-400/60">
                          <span>by @{sl.owner.username}</span>
                        </div>
                        {sl.isJoined ? (
                          <span className="flex items-center gap-1 text-sm text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Joined
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleJoin(sl.id)
                            }}
                            disabled={joiningId === sl.id}
                            className="btn-persona flex items-center gap-1 text-sm py-1.5 px-3"
                          >
                            {joiningId === sl.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              'Join'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Create Storyline Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="persona-modal max-w-md border-purple-500/30">
          <DialogHeader className="persona-modal-header">
            <DialogTitle className="text-xl font-bold persona-gradient-text flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-400" />
              Create a Storyline
            </DialogTitle>
            <DialogDescription className="text-purple-400/70">
              Create a group space for shared storytelling adventures!
            </DialogDescription>
          </DialogHeader>
          
          <div className="persona-modal-content space-y-5 pt-2">
            {createError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {createError}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-purple-200 text-sm font-medium">Storyline Name *</Label>
              <input
                id="name"
                placeholder="Enter a name..."
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="persona-input w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-purple-200 text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                placeholder="What's this storyline about?"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
                className="persona-input resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category" className="text-purple-200 text-sm font-medium">Category</Label>
              <select
                id="category"
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                className="persona-input w-full cursor-pointer"
              >
                {STORYLINE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
              <input
                type="checkbox"
                id="isPublic"
                checked={createForm.isPublic}
                onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                className="w-4 h-4 rounded border-purple-500/30 bg-purple-500/10 text-purple-500 focus:ring-purple-500/30"
              />
              <Label htmlFor="isPublic" className="text-purple-200 text-sm cursor-pointer">
                Public storyline (anyone can discover and join)
              </Label>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-persona-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !createForm.name.trim()}
                className="btn-persona flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
