'use client'

import { useState, useEffect } from 'react'
import { Folder, Plus, Settings, Trash2, ChevronRight, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface PersonaFolder {
  id: string
  name: string
  description?: string | null
  color: string
  icon?: string | null
  position: number
  _count?: { personas: number }
}

interface PersonaFolderManagerProps {
  userId: string
  selectedFolderId?: string | null
  onSelectFolder: (folderId: string | null) => void
  onFoldersChange?: () => void
}

const DEFAULT_COLORS = [
  '#ffffff', '#94a3b8', '#f97316', '#eab308', '#22c55e', 
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#f43f5e'
]

const DEFAULT_ICONS = ['📁', '⭐', '🎭', '🌟', '💫', '🔮', '✨', '🎨', '🎪', '🎯']

export function PersonaFolderManager({ 
  userId, 
  selectedFolderId, 
  onSelectFolder, 
  onFoldersChange 
}: PersonaFolderManagerProps) {
  const [folders, setFolders] = useState<PersonaFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editFolder, setEditFolder] = useState<PersonaFolder | null>(null)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0])
  const [newIcon, setNewIcon] = useState(DEFAULT_ICONS[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadFolders()
  }, [])

  const loadFolders = async () => {
    try {
      const res = await fetch('/api/folders')
      const data = await res.json()
      setFolders(data.folders || [])
    } catch (error) {
      console.error('Error loading folders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          color: newColor,
          icon: newIcon
        })
      })
      const data = await res.json()
      if (data.folder) {
        setFolders([...folders, data.folder])
        setCreateOpen(false)
        resetForm()
        onFoldersChange?.()
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editFolder || !newName.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/folders/${editFolder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          color: newColor,
          icon: newIcon
        })
      })
      const data = await res.json()
      if (data.folder) {
        setFolders(folders.map(f => f.id === editFolder.id ? data.folder : f))
        setEditFolder(null)
        resetForm()
        onFoldersChange?.()
      }
    } catch (error) {
      console.error('Error updating folder:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (folderId: string) => {
    if (!confirm('Delete this folder? Personas in this folder will be moved to "All".')) return

    try {
      await fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
      setFolders(folders.filter(f => f.id !== folderId))
      if (selectedFolderId === folderId) {
        onSelectFolder(null)
      }
      onFoldersChange?.()
    } catch (error) {
      console.error('Error deleting folder:', error)
    }
  }

  const resetForm = () => {
    setNewName('')
    setNewDescription('')
    setNewColor(DEFAULT_COLORS[0])
    setNewIcon(DEFAULT_ICONS[0])
  }

  const openEdit = (folder: PersonaFolder) => {
    setEditFolder(folder)
    setNewName(folder.name)
    setNewDescription(folder.description || '')
    setNewColor(folder.color)
    setNewIcon(folder.icon || DEFAULT_ICONS[0])
  }

  return (
    <div className="space-y-2">
      {/* All Personas (no folder) */}
      <button
        onClick={() => onSelectFolder(null)}
        className={cn(
          "w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left",
          selectedFolderId === null 
            ? "bg-primary/10 text-primary" 
            : "hover:bg-muted"
        )}
      >
        <Folder className="w-4 h-4" />
        <span className="flex-1 font-medium">All Personas</span>
      </button>

      {/* Folder List */}
      <ScrollArea className="max-h-64">
        <div className="space-y-1">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={cn(
                "group flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer",
                selectedFolderId === folder.id 
                  ? "bg-primary/10" 
                  : "hover:bg-muted"
              )}
              onClick={() => onSelectFolder(folder.id)}
            >
              <span className="text-lg">{folder.icon || '📁'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{folder.name}</p>
                <p className="text-xs text-muted-foreground">
                  {folder._count?.personas || 0} personas
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                    <Settings className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(folder)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDelete(folder.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Create Folder Button */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        New Folder
      </Button>

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen || !!editFolder} onOpenChange={(open) => {
        if (!open) {
          setCreateOpen(false)
          setEditFolder(null)
          resetForm()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editFolder ? 'Edit Folder' : 'Create Folder'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Folder name..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What's this folder for?"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-transform",
                      newColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewIcon(icon)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform",
                      newIcon === icon 
                        ? "bg-primary text-primary-foreground scale-110" 
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateOpen(false)
              setEditFolder(null)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button onClick={editFolder ? handleUpdate : handleCreate} disabled={saving || !newName.trim()}>
              {saving ? 'Saving...' : editFolder ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
