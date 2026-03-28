'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { apiFetch } from '@/lib/api-client'
import { 
  Loader2, User, Tag, Palette, Sparkles, Check, X
} from 'lucide-react'
import { getRoleColor, getRoleLabel } from '@/lib/roles'

interface CTagPersona {
  id: string
  name: string
  avatarUrl: string | null
  isActive: boolean
  customTag: string | null
}

interface CTagUser {
  id: string
  username: string
  avatarUrl: string | null
  role: string
}

interface CTagModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: CTagUser | null
  activePersona: CTagPersona | null
  personas: CTagPersona[]
  onSuccess: (message: string) => void
}

// Available custom tag styles
const TAG_STYLES = [
  { id: 'glossy', name: 'Glossy', description: 'Shiny, reflective appearance', preview: 'bg-gradient-to-r from-amber-400 to-yellow-300' },
  { id: 'radiant', name: 'Radiant', description: 'Glowing, vibrant appearance', preview: 'bg-gradient-to-r from-purple-400 to-pink-300' },
  { id: 'shadowy', name: 'Shadowy', description: 'Dark, mysterious appearance', preview: 'bg-gradient-to-r from-gray-600 to-gray-800' },
  { id: 'shiny', name: 'Shiny', description: 'Bright, sparkling effect', preview: 'bg-gradient-to-r from-cyan-400 to-blue-300' },
  { id: 'neon', name: 'Neon', description: 'Neon glow effect', preview: 'bg-gradient-to-r from-green-400 to-emerald-300' },
  { id: 'fire', name: 'Fire', description: 'Fiery, burning effect', preview: 'bg-gradient-to-r from-orange-500 to-red-400' },
  { id: 'ice', name: 'Ice', description: 'Icy, frozen effect', preview: 'bg-gradient-to-r from-blue-300 to-cyan-200' },
  { id: 'electric', name: 'Electric', description: 'Electric, shocking effect', preview: 'bg-gradient-to-r from-yellow-300 to-amber-400' },
]

// Preset colors
const PRESET_COLORS = [
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#6366f1', // Indigo
]

export function CTagModal({ open, onOpenChange, user, activePersona, personas, onSuccess }: CTagModalProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('')
  const [tagText, setTagText] = useState('')
  const [tagColor, setTagColor] = useState('#f59e0b')
  const [tagStyle, setTagStyle] = useState('glossy')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Reset form when modal opens with new data
  useState(() => {
    if (activePersona) {
      setSelectedPersonaId(activePersona.id)
    } else if (personas.length > 0) {
      setSelectedPersonaId(personas[0].id)
    }
  })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!selectedPersonaId) {
      setError('Please select a persona')
      return
    }
    
    if (!tagText.trim()) {
      setError('Please enter tag text')
      return
    }
    
    if (tagText.length > 50) {
      setError('Tag text must be 50 characters or less')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await apiFetch('/api/admin/ctag-apply', {
        method: 'POST',
        body: JSON.stringify({
          personaId: selectedPersonaId,
          text: tagText.trim(),
          color: tagColor,
          style: tagStyle,
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        onSuccess(data.message)
        onOpenChange(false)
        // Reset form
        setTagText('')
        setTagColor('#f59e0b')
        setTagStyle('glossy')
      } else {
        setError(data.error || 'Failed to apply custom tag')
      }
    } catch (err) {
      console.error('Error applying custom tag:', err)
      setError('Failed to apply custom tag')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleClearTag = async () => {
    if (!selectedPersonaId) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await apiFetch('/api/admin/ctag-apply', {
        method: 'POST',
        body: JSON.stringify({
          personaId: selectedPersonaId,
          clear: true,
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        onSuccess(data.message)
        onOpenChange(false)
      } else {
        setError(data.error || 'Failed to clear custom tag')
      }
    } catch (err) {
      console.error('Error clearing custom tag:', err)
      setError('Failed to clear custom tag')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const selectedPersona = personas.find(p => p.id === selectedPersonaId)
  
  // Update selected persona when personas change
  useState(() => {
    if (personas.length > 0 && !selectedPersonaId) {
      setSelectedPersonaId(activePersona?.id || personas[0].id)
    }
  })
  
  if (!user) return null
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#0a0510] border-purple-500/20 text-purple-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-400" />
            Custom Tag Editor
          </DialogTitle>
          <DialogDescription className="text-purple-400/60">
            Assign a custom tag to a user&apos;s persona
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* User Info Section */}
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-purple-500/30">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white font-bold text-xl">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-purple-100">{user.username}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-purple-400/60">
                  <User className="w-3 h-3" />
                  <span className="font-mono">ID: {user.id}</span>
                </div>
                {activePersona && (
                  <div className="text-sm text-purple-400/60 mt-1">
                    Active: {activePersona.name}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Persona Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-purple-300 flex items-center gap-2">
              <User className="w-4 h-4" />
              Select Persona <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-purple-400/60">
              Custom tags can ONLY be applied to a persona, not directly to the user
            </p>
            <div className="grid gap-2 max-h-40 overflow-y-auto">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setSelectedPersonaId(persona.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selectedPersonaId === persona.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-purple-500/15 bg-purple-500/5 hover:border-purple-500/30'
                  }`}
                >
                  <Avatar className="w-8 h-8 border border-purple-500/30">
                    <AvatarImage src={persona.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-xs">
                      {persona.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-purple-100">{persona.name}</span>
                      {persona.isActive && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400">Active</span>
                      )}
                      {persona.customTag && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400">Has Tag</span>
                      )}
                    </div>
                  </div>
                  {selectedPersonaId === persona.id && (
                    <Check className="w-4 h-4 text-purple-400" />
                  )}
                </button>
              ))}
              {personas.length === 0 && (
                <div className="text-center py-4 text-purple-400/60">
                  This user has no personas
                </div>
              )}
            </div>
          </div>
          
          {/* Tag Text Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-purple-300 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tag Text <span className="text-red-400">*</span>
            </label>
            <Input
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="e.g., The Charismatic Bad Boy"
              maxLength={50}
              className="bg-purple-500/5 border-purple-500/20 focus:border-purple-500 text-purple-100 placeholder-purple-400/40"
            />
            <p className="text-xs text-purple-400/40">{tagText.length}/50 characters</p>
          </div>
          
          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-purple-300 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Tag Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTagColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    tagColor === color
                      ? 'border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border border-purple-500/20"
                />
                <span className="text-xs font-mono text-purple-400/60">{tagColor}</span>
              </div>
            </div>
          </div>
          
          {/* Style Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-purple-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Tag Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TAG_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setTagStyle(style.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                    tagStyle === style.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-purple-500/15 bg-purple-500/5 hover:border-purple-500/30'
                  }`}
                >
                  <div className={`w-4 h-4 rounded ${style.preview}`} />
                  <div className="text-left">
                    <div className="text-sm font-medium text-purple-100">{style.name}</div>
                    <div className="text-[10px] text-purple-400/60">{style.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Preview */}
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15">
            <label className="text-sm font-medium text-purple-300 mb-2 block">Preview</label>
            <div className="flex items-center justify-center">
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: tagColor + '20',
                  color: tagColor,
                  boxShadow: tagStyle === 'neon' ? `0 0 10px ${tagColor}` :
                            tagStyle === 'fire' ? `0 0 10px #ff6b35` :
                            tagStyle === 'ice' ? `0 0 10px #7dd3fc` :
                            tagStyle === 'electric' ? `0 0 10px #fbbf24` :
                            undefined,
                  textShadow: tagStyle === 'radiant' ? `0 0 8px ${tagColor}` :
                              tagStyle === 'shadowy' ? '2px 2px 4px rgba(0,0,0,0.5)' :
                              undefined,
                }}
              >
                {tagText || 'Your Tag Here'}
              </span>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {selectedPersona?.customTag && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearTag}
                className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Clear Tag'}
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
              disabled={isSubmitting || personas.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Applying...
                </>
              ) : (
                'Apply Tag'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
