'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type ManageCategoriesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: string[]
  itemCounts: Record<string, number>
  initialEditCategory?: string | null
  onCategoriesChange: (categories: string[]) => void
}

export function ManageCategoriesDialog({
  open,
  onOpenChange,
  categories,
  itemCounts,
  initialEditCategory = null,
  onCategoriesChange,
}: ManageCategoriesDialogProps) {
  const { toast } = useToast()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setNewCategoryName('')
      setEditingCategory(null)
      setEditingName('')
      setIsSaving(false)
      return
    }

    if (initialEditCategory) {
      setEditingCategory(initialEditCategory)
      setEditingName(initialEditCategory)
    }
  }, [open, initialEditCategory])

  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter a category name.' })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add category.')
      }
      onCategoriesChange(result.categories ?? [])
      setNewCategoryName('')
      toast({ title: 'Category added', description: result.message })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not add category',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRenameCategory = async (oldName: string) => {
    const newName = editingName.trim()
    if (!newName) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter a category name.' })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/menu/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to rename category.')
      }
      onCategoriesChange(result.categories ?? [])
      setEditingCategory(null)
      setEditingName('')
      toast({ title: 'Category renamed', description: result.message })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not rename category',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCategory = async (name: string) => {
    if ((itemCounts[name] ?? 0) > 0) {
      toast({
        variant: 'destructive',
        title: 'Category in use',
        description: 'Move or delete all items in this category first.',
      })
      return
    }

    if (!confirm(`Remove empty category "${name}"?`)) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/menu/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete category.')
      }
      onCategoriesChange(result.categories ?? [])
      toast({ title: 'Category removed', description: result.message })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not delete category',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-category">Add category</Label>
            <div className="flex gap-2">
              <Input
                id="new-category"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Appetizers, Tandoori"
                disabled={isSaving}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleAddCategory()
                  }
                }}
              />
              <Button type="button" onClick={handleAddCategory} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your categories</Label>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed p-4 text-center">
                No categories yet. Add one above or assign categories when creating menu items.
              </p>
            ) : (
              <ul className="space-y-2">
                {categories.map((category) => {
                  const isEditing = editingCategory === category
                  const count = itemCounts[category] ?? 0

                  return (
                    <li
                      key={category}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      {isEditing ? (
                        <>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            disabled={isSaving}
                            className="h-8"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                void handleRenameCategory(category)
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRenameCategory(category)}
                            disabled={isSaving}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCategory(null)
                              setEditingName('')
                            }}
                            disabled={isSaving}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{category}</p>
                            <p className="text-xs text-muted-foreground">
                              {count} item{count === 1 ? '' : 's'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingCategory(category)
                              setEditingName(category)
                            }}
                            disabled={isSaving}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCategory(category)}
                            disabled={isSaving || count > 0}
                            title={count > 0 ? 'Category has menu items' : 'Delete empty category'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
