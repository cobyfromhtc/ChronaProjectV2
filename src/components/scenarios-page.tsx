'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Sparkles, Heart, MessageCircle, Eye, Clock, Filter, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Scenarios</h2>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Scenario
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scenarios..."
              className="pl-9"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scenarios Grid */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">No scenarios yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Be the first to create a scenario!
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Scenario
            </Button>
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
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
      onClick={onClick}
    >
      {/* Illustration */}
      <div className="relative h-40 bg-muted">
        {scenario.illustrationUrl || scenario.persona.avatarUrl ? (
          <img
            src={scenario.illustrationUrl || scenario.persona.avatarUrl || ''}
            alt={scenario.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Sparkles className="w-12 h-12 text-primary/30" />
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="bg-black/50 text-white border-0">
            <Eye className="w-3 h-3 mr-1" />
            {scenario.viewCount}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="font-semibold line-clamp-2 mb-2">{scenario.title}</h3>
        
        {/* Description */}
        {scenario.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {scenario.description}
          </p>
        )}

        {/* Creator */}
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={scenario.user.avatarUrl || undefined} />
            <AvatarFallback>{scenario.user.username[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            by @{scenario.user.username}
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between text-sm text-muted-foreground">
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
      </CardFooter>
    </Card>
  )
}
