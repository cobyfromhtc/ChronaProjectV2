'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { apiJson } from '@/lib/api-client'
import { parseMessageWithMarkdown } from '@/lib/markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  BookOpen, Plus, Search, Edit2, Trash2, Pin, PinOff, FileText,
  ChevronRight, Loader2, MapPin, Users, Swords, Wand2, Clock,
  Globe, HelpCircle, X
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ==================== Types ====================

interface WikiUser {
  id: string
  username: string
  avatarUrl: string | null
}

interface WikiArticle {
  id: string
  storylineId: string
  title: string
  slug: string
  content: string
  category: string
  createdById: string
  lastEditedBy: string | null
  isPinned: boolean
  position: number
  createdAt: string
  updatedAt: string
  createdBy: WikiUser
  lastEditedByUser: WikiUser | null
}

interface WikiTabProps {
  storylineId: string
  userId: string
  userRole: string
  onClose?: () => void
}

// Category configuration with icons and colors
const CATEGORIES = [
  { name: 'General', icon: FileText, color: '#94a3b8' },
  { name: 'Locations', icon: MapPin, color: '#22d3ee' },
  { name: 'Characters', icon: Users, color: '#a78bfa' },
  { name: 'Factions', icon: Swords, color: '#f97316' },
  { name: 'Magic & Systems', icon: Wand2, color: '#c084fc' },
  { name: 'History', icon: Clock, color: '#fbbf24' },
  { name: 'Culture', icon: Globe, color: '#34d399' },
  { name: 'Other', icon: HelpCircle, color: '#64748b' },
] as const

function getCategoryConfig(name: string) {
  return CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1]
}

// ==================== Wiki Tab Component ====================

export function WikiTab({ storylineId, userId, userRole, onClose }: WikiTabProps) {
  const [articles, setArticles] = useState<WikiArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.name)))

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formCategory, setFormCategory] = useState('General')
  const [formContent, setFormContent] = useState('')

  // Check permissions
  const canManage = userRole === 'owner' || userRole === 'admin'
  const canEdit = canManage // will also check canManageMessages from custom role on backend

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    try {
      const searchParam = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''
      const data = await apiJson<{ success: boolean; articles: WikiArticle[]; grouped: Record<string, WikiArticle[]>; pinnedArticles: WikiArticle[] }>(
        `/api/storylines/${storylineId}/wiki${searchParam}`
      )
      if (data.success) {
        setArticles(data.articles)
      }
    } catch (error) {
      console.error('Failed to fetch wiki articles:', error)
    } finally {
      setIsLoading(false)
    }
  }, [storylineId, searchQuery])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  // Group articles by category with pinned at top
  const groupedArticles = useMemo(() => {
    const pinned = articles.filter(a => a.isPinned)
    const unpinned = articles.filter(a => !a.isPinned)

    const groups: Record<string, WikiArticle[]> = {}
    for (const article of unpinned) {
      const cat = article.category || 'General'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(article)
    }

    return { pinned, groups }
  }, [articles])

  // Selected article
  const selectedArticle = useMemo(() => {
    return articles.find(a => a.id === selectedArticleId) || null
  }, [articles, selectedArticleId])

  // Toggle category expansion
  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Create article
  const handleCreate = async () => {
    if (!formTitle.trim() || isSaving) return
    setIsSaving(true)
    try {
      const data = await apiJson<{ success: boolean; article: WikiArticle }>(`/api/storylines/${storylineId}/wiki`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          category: formCategory,
          content: formContent
        })
      })
      if (data.success) {
        setShowCreateDialog(false)
        setFormTitle('')
        setFormCategory('General')
        setFormContent('')
        await fetchArticles()
        setSelectedArticleId(data.article.id)
      }
    } catch (error) {
      console.error('Failed to create article:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Update article
  const handleUpdate = async () => {
    if (!selectedArticle || !formTitle.trim() || isSaving) return
    setIsSaving(true)
    try {
      const data = await apiJson<{ success: boolean; article: WikiArticle }>(
        `/api/storylines/${storylineId}/wiki/${selectedArticle.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            category: formCategory,
            content: formContent
          })
        }
      )
      if (data.success) {
        setShowEditDialog(false)
        await fetchArticles()
      }
    } catch (error) {
      console.error('Failed to update article:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Delete article
  const handleDelete = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article? This cannot be undone.')) return
    try {
      await apiJson(`/api/storylines/${storylineId}/wiki/${articleId}`, {
        method: 'DELETE'
      })
      if (selectedArticleId === articleId) {
        setSelectedArticleId(null)
      }
      await fetchArticles()
    } catch (error) {
      console.error('Failed to delete article:', error)
    }
  }

  // Toggle pin
  const handleTogglePin = async (article: WikiArticle) => {
    try {
      await apiJson(`/api/storylines/${storylineId}/wiki/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !article.isPinned })
      })
      await fetchArticles()
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }

  // Open edit dialog
  const openEditDialog = (article: WikiArticle) => {
    setFormTitle(article.title)
    setFormCategory(article.category)
    setFormContent(article.content)
    setShowEditDialog(true)
  }

  // Open create dialog
  const openCreateDialog = () => {
    setFormTitle('')
    setFormCategory('General')
    setFormContent('')
    setShowCreateDialog(true)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0f1117]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#0f1117]">
      {/* Left Sidebar - Article List */}
      <div className="w-72 bg-[#0e1015] border-r border-white/[0.08] flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="h-14 px-4 flex items-center gap-3 border-b border-white/[0.08] flex-shrink-0">
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all flex-shrink-0"
              title="Back to Chat"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          )}
          <BookOpen className="w-5 h-5 text-teal-400" />
          <h2 className="font-semibold text-slate-100 flex-1">Wiki</h2>
          {canEdit && (
            <button
              onClick={openCreateDialog}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 transition-all"
              title="New Article"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 border-b border-white/[0.06]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-md bg-[#0f1117] border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Article List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Pinned Articles */}
            {groupedArticles.pinned.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Pin className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">Pinned</span>
                </div>
                {groupedArticles.pinned.map((article) => {
                  const catConfig = getCategoryConfig(article.category)
                  const Icon = catConfig.icon
                  return (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticleId(article.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group ${
                        selectedArticleId === article.id
                          ? 'bg-teal-500/15 text-slate-100'
                          : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: catConfig.color }} />
                      <div className="flex-1 min-w-0 text-left">
                        <span className="truncate block">{article.title}</span>
                      </div>
                      <Pin className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Categorized Articles */}
            {CATEGORIES.map((cat) => {
              const catArticles = groupedArticles.groups[cat.name]
              if (!catArticles || catArticles.length === 0) return null
              const Icon = cat.icon
              const isExpanded = expandedCategories.has(cat.name)

              return (
                <div key={cat.name} className="mb-1">
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="flex items-center gap-1.5 px-2 py-1.5 w-full hover:bg-white/[0.03] rounded-md transition-colors"
                  >
                    <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: cat.color + 'bb' }}>
                      {cat.name}
                    </span>
                    <span className="text-[11px] ml-auto" style={{ color: cat.color + '80' }}>
                      {catArticles.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-0.5 ml-1">
                      {catArticles.map((article) => {
                        const articleCatConfig = getCategoryConfig(article.category)
                        const ArticleIcon = articleCatConfig.icon
                        return (
                          <button
                            key={article.id}
                            onClick={() => setSelectedArticleId(article.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group ${
                              selectedArticleId === article.id
                                ? 'bg-teal-500/15 text-slate-100'
                                : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/[0.05]'
                            }`}
                          >
                            <ArticleIcon className="w-4 h-4 flex-shrink-0" style={{ color: articleCatConfig.color }} />
                            <span className="truncate text-left">{article.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {articles.length === 0 && !searchQuery && (
              <div className="text-center py-12 px-4">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No articles yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  {canEdit ? 'Click + to create the first article' : 'Wait for an admin to create articles'}
                </p>
              </div>
            )}

            {articles.length === 0 && searchQuery && (
              <div className="text-center py-12 px-4">
                <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No results found</p>
                <p className="text-xs text-slate-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area - Article Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedArticle ? (
          <>
            {/* Article Header */}
            <div className="px-6 py-4 border-b border-white/[0.08] bg-[#0f1117]/50 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const catConfig = getCategoryConfig(selectedArticle.category)
                      const CatIcon = catConfig.icon
                      return (
                        <Badge
                          variant="outline"
                          className="text-xs gap-1 border-white/[0.12]"
                          style={{ color: catConfig.color, borderColor: catConfig.color + '40', backgroundColor: catConfig.color + '15' }}
                        >
                          <CatIcon className="w-3 h-3" />
                          {selectedArticle.category}
                        </Badge>
                      )
                    })()}
                    {selectedArticle.isPinned && (
                      <Badge variant="outline" className="text-xs gap-1 border-amber-500/30 bg-amber-500/10 text-amber-400">
                        <Pin className="w-3 h-3" />
                        Pinned
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-slate-100">{selectedArticle.title}</h1>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>Created by <span className="text-slate-300">{selectedArticle.createdBy.username}</span></span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(selectedArticle.createdAt), { addSuffix: true })}</span>
                    {selectedArticle.lastEditedByUser && (
                      <>
                        <span>·</span>
                        <span>Edited by <span className="text-slate-300">{selectedArticle.lastEditedByUser.username}</span></span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(selectedArticle.updatedAt), { addSuffix: true })}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {canEdit && (
                    <button
                      onClick={() => handleTogglePin(selectedArticle)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                      title={selectedArticle.isPinned ? 'Unpin Article' : 'Pin Article'}
                    >
                      {selectedArticle.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => openEditDialog(selectedArticle)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 transition-all"
                      title="Edit Article"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => handleDelete(selectedArticle.id)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete Article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Article Content */}
            <ScrollArea className="flex-1 h-full">
              <div className="max-w-4xl mx-auto p-6 pb-16">
                {selectedArticle.content ? (
                  <div className="prose-custom text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {parseMessageWithMarkdown(selectedArticle.content)}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">This article has no content yet.</p>
                    {canEdit && (
                      <button
                        onClick={() => openEditDialog(selectedArticle)}
                        className="mt-3 text-sm text-teal-400 hover:text-teal-300 transition-colors"
                      >
                        Add content →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          /* No article selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">Wiki Knowledge Base</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {articles.length > 0
                  ? 'Select an article from the sidebar to read it'
                  : canEdit
                    ? 'Create your first article to start building the knowledge base for this storyline'
                    : 'No wiki articles have been created yet'
                }
              </p>
              {canEdit && articles.length === 0 && (
                <button
                  onClick={openCreateDialog}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium hover:bg-teal-500/20 hover:border-teal-500/30 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create First Article
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Article Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#0f1117] border-white/[0.08] max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-400" />
              New Wiki Article
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a new article to the storyline knowledge base
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
            <div className="space-y-2">
              <Label className="text-slate-200 text-sm">Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Article title..."
                className="bg-[#0b0d11] border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:border-teal-500/40 focus:ring-teal-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200 text-sm">Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="bg-[#0b0d11] border-white/[0.08] text-slate-200 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/[0.08]">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <SelectItem key={cat.name} value={cat.name} className="text-slate-200 focus:bg-teal-500/10 focus:text-slate-100">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: cat.color }} />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200 text-sm">Content</Label>
              <p className="text-xs text-slate-500">Supports markdown formatting: **bold**, *italic*, # headings, - lists, etc.</p>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Write your article content here..."
                className="bg-[#0b0d11] border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:border-teal-500/40 focus:ring-teal-500/20 min-h-[300px] resize-y"
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button
              variant="ghost"
              onClick={() => setShowCreateDialog(false)}
              className="text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formTitle.trim() || isSaving}
              className="bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30 hover:text-teal-300 disabled:opacity-50"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" />Create Article</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Article Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#0f1117] border-white/[0.08] max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-teal-400" />
              Edit Article
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Update the article content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
            <div className="space-y-2">
              <Label className="text-slate-200 text-sm">Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Article title..."
                className="bg-[#0b0d11] border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:border-teal-500/40 focus:ring-teal-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200 text-sm">Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="bg-[#0b0d11] border-white/[0.08] text-slate-200 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/[0.08]">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <SelectItem key={cat.name} value={cat.name} className="text-slate-200 focus:bg-teal-500/10 focus:text-slate-100">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: cat.color }} />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200 text-sm">Content</Label>
              <p className="text-xs text-slate-500">Supports markdown formatting: **bold**, *italic*, # headings, - lists, etc.</p>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Write your article content here..."
                className="bg-[#0b0d11] border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:border-teal-500/40 focus:ring-teal-500/20 min-h-[300px] resize-y"
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button
              variant="ghost"
              onClick={() => setShowEditDialog(false)}
              className="text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formTitle.trim() || isSaving}
              className="bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30 hover:text-teal-300 disabled:opacity-50"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Edit2 className="w-4 h-4 mr-2" />Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}