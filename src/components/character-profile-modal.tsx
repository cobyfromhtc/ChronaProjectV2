'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  X, MessageSquare, User, Sparkles, Heart, BookOpen,
  Brain, Star, Users, Eye, Link2, ChevronLeft, Hash
} from 'lucide-react'

// Connection interface
interface PersonaConnection {
  id: string
  characterName: string
  relationshipType: string
  specificRole: string | null
  characterAge: number | null
  description: string | null
}

// Full persona profile interface
interface PersonaProfile {
  id: string
  name: string
  avatarUrl: string | null
  bio: string | null
  username: string
  isOnline: boolean
  archetype: string | null
  gender: string | null
  age: number | null
  tags: string[]
  personalityDescription: string | null
  personalitySpectrums: {
    introvertExtrovert: number
    thinkingFeeling: number
    plannedSpontaneous: number
    reservedExpressive: number
  } | null
  strengths: string[]
  flaws: string[]
  values: string[]
  fears: string[]
  species: string | null
  likes: string[]
  dislikes: string[]
  hobbies: string[]
  skills: string[]
  languages: string[]
  habits: string[]
  speechPatterns: string[]
  backstory: string | null
  appearance: string | null
  mbtiType: string | null
  connections: PersonaConnection[]
}

interface CharacterProfileModalProps {
  persona: PersonaProfile
  isOpen: boolean
  onClose: () => void
  onStartChat: (personaId: string) => void
}

// Helper component for tag chips
function TagChip({ label, color = 'purple' }: { label: string; color?: string }) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    red: 'bg-red-500/15 text-red-300 border-red-500/25',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    pink: 'bg-pink-500/15 text-pink-300 border-pink-500/25',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
  }
  
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs border ${colors[color] || colors.purple}`}>
      {label}
    </span>
  )
}

// Helper for spectrum bars with modern look
function SpectrumBar({ label, value, leftLabel, rightLabel, icon }: { 
  label: string; 
  value: number; 
  leftLabel: string; 
  rightLabel: string;
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/10">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-medium text-purple-200">{label}</span>
      </div>
      <div className="flex justify-between text-xs text-purple-400/60 mb-2">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="h-3 bg-purple-950/50 rounded-full overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-purple-500/30 to-fuchsia-500/30" />
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full relative transition-all duration-300"
          style={{ width: `${value}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-purple-500/50" />
        </div>
      </div>
    </div>
  )
}

// Section component
function Section({ title, icon: Icon, children, className = '' }: { 
  title: string; 
  icon: any; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-purple-200 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// Text block for longer content
function TextBlock({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div className={`bg-purple-900/15 rounded-xl p-4 border border-purple-500/10 ${className}`}>
      <p className="text-purple-100/90 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}

// Tag grid
function TagGrid({ items, color = 'purple' }: { items: string[]; color?: string }) {
  if (!items || items.length === 0) return null
  
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <TagChip key={i} label={item} color={color} />
      ))}
    </div>
  )
}

export function CharacterProfileModal({ 
  persona, 
  isOpen, 
  onClose, 
  onStartChat 
}: CharacterProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'appearance' | 'personality' | 'attributes' | 'connections'>('overview')
  
  if (!isOpen) return null
  
  const hasAnyContent = persona.bio || persona.backstory || persona.likes?.length || persona.dislikes?.length || 
    persona.hobbies?.length || persona.skills?.length || persona.appearance || 
    persona.personalityDescription || persona.strengths?.length || persona.flaws?.length ||
    persona.values?.length || persona.fears?.length || persona.habits?.length || 
    persona.speechPatterns?.length || persona.languages?.length || persona.connections?.length
  
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'personality', label: 'Personality' },
    { id: 'attributes', label: 'Attributes' },
    { id: 'connections', label: 'Connections' },
  ] as const
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] bg-gradient-to-b from-[#150a25] to-[#0a0510] rounded-2xl border border-purple-500/20 shadow-2xl shadow-purple-500/10 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 border-b border-purple-500/15 bg-gradient-to-r from-purple-900/30 via-fuchsia-900/20 to-purple-900/30 flex-shrink-0">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl" />
          </div>
          
          <div className="relative flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-20 h-20 border-2 border-purple-500/40 shadow-lg shadow-purple-500/20">
                <AvatarImage src={persona.avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-2xl font-bold">
                  {persona.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#150a25] ${persona.isOnline ? 'bg-emerald-400' : 'bg-gray-500'}`} />
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white mb-0.5">{persona.name}</h2>
              <p className="text-purple-400/70 text-sm mb-2">@{persona.username}</p>
              
              {/* Quick info */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {persona.archetype && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/20">
                    {persona.archetype}
                  </span>
                )}
                {persona.species && (
                  <span className="flex items-center gap-1 text-purple-300/80">
                    <Sparkles className="w-3 h-3" />
                    {persona.species}
                  </span>
                )}
                {persona.gender && (
                  <span className="flex items-center gap-1 text-purple-300/80">
                    <User className="w-3 h-3" />
                    {persona.gender}
                  </span>
                )}
                {persona.age && (
                  <span className="text-purple-300/80">Age {persona.age}</span>
                )}
                {persona.mbtiType && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/20">
                    {persona.mbtiType}
                  </span>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => { onStartChat(persona.id); onClose(); }}
                className="btn-persona h-9 px-4 gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </Button>
              <button 
                onClick={onClose}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-purple-400/60 hover:text-purple-200 hover:bg-purple-500/10 transition-all border border-purple-500/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-1 mt-4 -mb-5 relative z-10">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[#0a0510] text-purple-100 border-t border-l border-r border-purple-500/20' 
                    : 'text-purple-400/50 hover:text-purple-300 hover:bg-purple-500/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-5">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Bio */}
                {persona.bio && (
                  <Section title="About" icon={User}>
                    <TextBlock content={persona.bio} />
                  </Section>
                )}
                
                {/* Backstory */}
                {persona.backstory && (
                  <Section title="Backstory" icon={BookOpen}>
                    <TextBlock content={persona.backstory} />
                  </Section>
                )}
                
                {/* Tags */}
                {persona.tags && persona.tags.length > 0 && (
                  <Section title="Tags" icon={Hash}>
                    <TagGrid items={persona.tags} />
                  </Section>
                )}
                
                {/* Likes & Dislikes */}
                <div className="grid grid-cols-2 gap-4">
                  {persona.likes && persona.likes.length > 0 && (
                    <Section title="Likes" icon={Heart}>
                      <TagGrid items={persona.likes} color="green" />
                    </Section>
                  )}
                  {persona.dislikes && persona.dislikes.length > 0 && (
                    <Section title="Dislikes" icon={Heart}>
                      <TagGrid items={persona.dislikes} color="red" />
                    </Section>
                  )}
                </div>
                
                {/* Hobbies & Skills */}
                <div className="grid grid-cols-2 gap-4">
                  {persona.hobbies && persona.hobbies.length > 0 && (
                    <Section title="Hobbies" icon={Sparkles}>
                      <TagGrid items={persona.hobbies} color="cyan" />
                    </Section>
                  )}
                  {persona.skills && persona.skills.length > 0 && (
                    <Section title="Skills" icon={Star}>
                      <TagGrid items={persona.skills} color="amber" />
                    </Section>
                  )}
                </div>
                
                {!persona.bio && !persona.backstory && (!persona.tags || persona.tags.length === 0) &&
                  (!persona.likes || persona.likes.length === 0) && (!persona.dislikes || persona.dislikes.length === 0) &&
                  (!persona.hobbies || persona.hobbies.length === 0) && (!persona.skills || persona.skills.length === 0) && (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-purple-500/30 mx-auto mb-3" />
                    <p className="text-purple-300/50">No overview information available</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                {persona.appearance ? (
                  <Section title="Physical Description" icon={Eye}>
                    <TextBlock content={persona.appearance} />
                  </Section>
                ) : (
                  <div className="text-center py-12">
                    <Eye className="w-12 h-12 text-purple-500/30 mx-auto mb-3" />
                    <p className="text-purple-300/50">No appearance information provided</p>
                  </div>
                )}
                
                {/* Basic appearance info */}
                <div className="grid grid-cols-3 gap-3">
                  {persona.species && (
                    <div className="bg-purple-900/15 rounded-xl p-4 border border-purple-500/10 text-center">
                      <p className="text-xs text-purple-400/60 mb-1">Species</p>
                      <p className="text-sm font-medium text-purple-100">{persona.species}</p>
                    </div>
                  )}
                  {persona.gender && (
                    <div className="bg-purple-900/15 rounded-xl p-4 border border-purple-500/10 text-center">
                      <p className="text-xs text-purple-400/60 mb-1">Gender</p>
                      <p className="text-sm font-medium text-purple-100">{persona.gender}</p>
                    </div>
                  )}
                  {persona.age && (
                    <div className="bg-purple-900/15 rounded-xl p-4 border border-purple-500/10 text-center">
                      <p className="text-xs text-purple-400/60 mb-1">Age</p>
                      <p className="text-sm font-medium text-purple-100">{persona.age}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Personality Tab */}
            {activeTab === 'personality' && (
              <div className="space-y-4">
                {/* Personality Description */}
                {persona.personalityDescription && (
                  <Section title="Personality" icon={Brain}>
                    <TextBlock content={persona.personalityDescription} />
                  </Section>
                )}
                
                {/* Personality Spectrums - Modern UI */}
                {persona.personalitySpectrums && (
                  <div className="space-y-3">
                    <SpectrumBar 
                      label="Social Energy" 
                      value={persona.personalitySpectrums.introvertExtrovert} 
                      leftLabel="Introvert" 
                      rightLabel="Extrovert"
                      icon={<Users className="w-4 h-4 text-purple-400" />}
                    />
                    <SpectrumBar 
                      label="Decision Making" 
                      value={persona.personalitySpectrums.thinkingFeeling} 
                      leftLabel="Thinking" 
                      rightLabel="Feeling"
                      icon={<Brain className="w-4 h-4 text-purple-400" />}
                    />
                    <SpectrumBar 
                      label="Planning Style" 
                      value={persona.personalitySpectrums.plannedSpontaneous} 
                      leftLabel="Planned" 
                      rightLabel="Spontaneous"
                      icon={<Sparkles className="w-4 h-4 text-purple-400" />}
                    />
                    <SpectrumBar 
                      label="Expression" 
                      value={persona.personalitySpectrums.reservedExpressive} 
                      leftLabel="Reserved" 
                      rightLabel="Expressive"
                      icon={<Heart className="w-4 h-4 text-purple-400" />}
                    />
                  </div>
                )}
                
                {/* Strengths & Flaws */}
                <div className="grid grid-cols-2 gap-4">
                  {persona.strengths && persona.strengths.length > 0 && (
                    <Section title="Strengths" icon={Star}>
                      <TagGrid items={persona.strengths} color="green" />
                    </Section>
                  )}
                  {persona.flaws && persona.flaws.length > 0 && (
                    <Section title="Flaws" icon={Heart}>
                      <TagGrid items={persona.flaws} color="red" />
                    </Section>
                  )}
                </div>
                
                {/* Values & Fears */}
                <div className="grid grid-cols-2 gap-4">
                  {persona.values && persona.values.length > 0 && (
                    <Section title="Core Values" icon={Heart}>
                      <TagGrid items={persona.values} color="pink" />
                    </Section>
                  )}
                  {persona.fears && persona.fears.length > 0 && (
                    <Section title="Fears" icon={Heart}>
                      <TagGrid items={persona.fears} color="amber" />
                    </Section>
                  )}
                </div>
                
                {!persona.personalityDescription && !persona.personalitySpectrums &&
                  (!persona.strengths || persona.strengths.length === 0) && 
                  (!persona.flaws || persona.flaws.length === 0) &&
                  (!persona.values || persona.values.length === 0) && 
                  (!persona.fears || persona.fears.length === 0) && (
                  <div className="text-center py-12">
                    <Brain className="w-12 h-12 text-purple-500/30 mx-auto mb-3" />
                    <p className="text-purple-300/50">No personality information provided</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Attributes Tab */}
            {activeTab === 'attributes' && (
              <div className="space-y-4">
                {/* Speech Patterns */}
                {persona.speechPatterns && persona.speechPatterns.length > 0 && (
                  <Section title="Speech Patterns" icon={User}>
                    <div className="space-y-2">
                      {persona.speechPatterns.map((pattern, i) => (
                        <div key={i} className="flex items-start gap-3 bg-purple-900/15 rounded-lg p-3 border border-purple-500/10">
                          <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                          <span className="text-sm text-purple-100/90">{pattern}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
                
                {/* Habits */}
                {persona.habits && persona.habits.length > 0 && (
                  <Section title="Habits" icon={Sparkles}>
                    <TagGrid items={persona.habits} />
                  </Section>
                )}
                
                {/* Languages */}
                {persona.languages && persona.languages.length > 0 && (
                  <Section title="Languages" icon={Sparkles}>
                    <TagGrid items={persona.languages} color="blue" />
                  </Section>
                )}
                
                {/* Character Info Card */}
                <div className="bg-purple-900/15 rounded-xl p-4 border border-purple-500/10">
                  <h4 className="text-sm font-medium text-purple-200 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" />
                    Character Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {persona.species && (
                      <div className="flex justify-between">
                        <span className="text-xs text-purple-400/60">Species</span>
                        <span className="text-xs text-purple-100">{persona.species}</span>
                      </div>
                    )}
                    {persona.gender && (
                      <div className="flex justify-between">
                        <span className="text-xs text-purple-400/60">Gender</span>
                        <span className="text-xs text-purple-100">{persona.gender}</span>
                      </div>
                    )}
                    {persona.age && (
                      <div className="flex justify-between">
                        <span className="text-xs text-purple-400/60">Age</span>
                        <span className="text-xs text-purple-100">{persona.age}</span>
                      </div>
                    )}
                    {persona.mbtiType && (
                      <div className="flex justify-between">
                        <span className="text-xs text-purple-400/60">MBTI</span>
                        <span className="text-xs text-purple-100">{persona.mbtiType}</span>
                      </div>
                    )}
                    {persona.archetype && (
                      <div className="flex justify-between">
                        <span className="text-xs text-purple-400/60">Archetype</span>
                        <span className="text-xs text-purple-100">{persona.archetype}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {(!persona.speechPatterns || persona.speechPatterns.length === 0) && 
                  (!persona.habits || persona.habits.length === 0) && 
                  (!persona.languages || persona.languages.length === 0) && (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-purple-500/30 mx-auto mb-3" />
                    <p className="text-purple-300/50">No attribute information provided</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Connections Tab */}
            {activeTab === 'connections' && (
              <div className="space-y-3">
                {persona.connections && persona.connections.length > 0 ? (
                  persona.connections.map((connection) => (
                    <div 
                      key={connection.id} 
                      className="bg-purple-900/15 rounded-xl p-4 border border-purple-500/10 hover:border-purple-500/20 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 flex items-center justify-center flex-shrink-0">
                          <Link2 className="w-5 h-5 text-purple-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-purple-100">{connection.characterName}</h4>
                            {connection.characterAge && (
                              <span className="text-xs text-purple-400/60">Age {connection.characterAge}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-xs">
                              {connection.relationshipType}
                            </span>
                            {connection.specificRole && (
                              <span className="text-xs text-purple-400/60">{connection.specificRole}</span>
                            )}
                          </div>
                          {connection.description && (
                            <p className="text-xs text-purple-200/70 leading-relaxed">{connection.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Link2 className="w-12 h-12 text-purple-500/30 mx-auto mb-3" />
                    <p className="text-purple-300/50">No character connections defined</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}