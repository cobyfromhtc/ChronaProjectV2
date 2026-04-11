'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Sparkles, Heart, MessageCircle, Eye, Clock, Filter, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScenarioModal } from './scenario-modal'
import { cn } from '@/lib/utils'

interface Scenario {
  id: string
  title: string
  description?: string | null
  illustrationUrl?: string | null
  likeCount: number
  favoriteCount: number
  viewCount: number
  publishedAt?: Date | null
  createdAt: Date
  persona: {
    id: string
    name: string
    avatarUrl?: string | null
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
  _count?: {
    likes: number
    comments: number
  }
}

export function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('trending')

  useEffect(() => {
    loadScenarios()
  }, [activeTab, search])

  const loadScenarios = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      
      let endpoint = '/api/scenarios'
      if (activeTab === 'trending') {
        // Already sorted by recent, which is good for trending
      } else if (activeTab === 'new') {
        // Recent
      }

      const res = await fetch(`${endpoint}?${params}`)
      const data = await res.json()
      setScenarios(data.scenarios || [])
    } catch (error) {
      console.error('Error loading scenarios:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col persona-bg">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white/80" />
            <h2 className="text-xl font-bold text-white">Scenarios</h2>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-persona inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Scenario
          </button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scenarios..."
              className="pl-9 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:ring-white/5"
            />
          </div>
        </div>

        <div className="persona-tabs">
          {['trending', 'new', 'following'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'persona-tab',
                activeTab === tab && 'persona-tab-active'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Scenarios Grid */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <h3 className="font-semibold text-white/90 mb-2">No scenarios yet</h3>
            <p className="text-sm text-white/50 mb-4">
              Be the first to create a scenario!
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="btn-persona inline-flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Scenario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario) => (
              <ScenarioCard 
                key={scenario.id} 
                scenario={scenario} 
                onClick={() => setSelectedScenario(scenario)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Scenario Modal */}
      {selectedScenario && (
        <ScenarioModal
          scenarioId={selectedScenario.id}
          open={!!selectedScenario}
          onClose={() => setSelectedScenario(null)}
        />
      )}

      {/* Create Scenario Modal */}
      <ScenarioModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={loadScenarios}
      />
    </div>
  )
}

// Scenario Card Component
function ScenarioCard({ scenario, onClick }: { scenario: Scenario; onClick: () => void }) {
  return (
    <div 
      className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-white/20 transition-all duration-300 group"
      onClick={onClick}
    >
      {/* Illustration */}
      <div className="relative h-40 bg-white/5">
        {scenario.illustrationUrl || scenario.persona.avatarUrl ? (
          <img
            src={scenario.illustrationUrl || scenario.persona.avatarUrl || ''}
            alt={scenario.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/[0.02]">
            <Sparkles className="w-12 h-12 text-white/20" />
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/50 text-white/80 border-0 text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/10">
            <Eye className="w-3 h-3" />
            {scenario.viewCount}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-white/90 line-clamp-2 mb-2">{scenario.title}</h3>
        
        {/* Description */}
        {scenario.description && (
          <p className="text-sm text-white/50 line-clamp-2 mb-3">
            {scenario.description}
          </p>
        )}

        {/* Creator */}
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={scenario.user.avatarUrl || undefined} />
            <AvatarFallback className="bg-white/10 text-white/60 text-xs">{scenario.user.username[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-white/50">
            by @{scenario.user.username}
          </span>
        </div>
      </div>

      <div className="p-4 pt-0 flex items-center justify-between text-sm text-white/40">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {scenario._count?.likes || 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            {scenario._count?.comments || 0}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs">
          <Clock className="w-3 h-3" />
          {new Date(scenario.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}
