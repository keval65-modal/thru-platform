'use client'

import { useState, ChangeEvent, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Plus, Save, Loader2 } from 'lucide-react'
import { MenuItem } from '@/lib/supabase'

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Partial<MenuItem>[]
  onSave: (items: Partial<MenuItem>[]) => Promise<void>
}

export function ReviewDialog({ open, onOpenChange, items: initialItems, onSave }: ReviewDialogProps) {
  const [items, setItems] = useState<Partial<MenuItem>[]>(initialItems)
  const [saving, setSaving] = useState(false)

  // Update items when initialItems prop changes
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const handleUpdateItem = (index: number, field: keyof MenuItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        name: 'New Item',
        price: 0,
        category: 'Other',
        description: '',
        is_available: true,
        is_veg: null,
      },
    ])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(items)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Extracted Menu ({items.length} items)</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4 p-1">
              {items.map((item: Partial<MenuItem>, index: number) => (
                <div key={index} className="grid grid-cols-12 gap-4 p-4 border rounded-lg items-start bg-card">
                  <div className="col-span-3 space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={item.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleUpdateItem(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleUpdateItem(index, 'price', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Category</Label>
                    <Input
                      value={item.category || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleUpdateItem(index, 'category', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Type</Label>
                    <div className="flex items-center gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300"
                          checked={item.is_veg === true || item.is_veg === null}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            if (e.target.checked) {
                              // If non-veg is also checked, set to null (both), otherwise set to true (veg only)
                              handleUpdateItem(index, 'is_veg', item.is_veg === false ? null : true)
                            } else {
                              // Unchecking veg means non-veg only
                              handleUpdateItem(index, 'is_veg', false)
                            }
                          }}
                        />
                        <span className="text-sm">Veg</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300"
                          checked={item.is_veg === false || item.is_veg === null}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            if (e.target.checked) {
                              // If veg is also checked, set to null (both), otherwise set to false (non-veg only)
                              handleUpdateItem(index, 'is_veg', item.is_veg === true ? null : false)
                            } else {
                              // Unchecking non-veg means veg only
                              handleUpdateItem(index, 'is_veg', true)
                            }
                          }}
                        />
                        <span className="text-sm">Non-Veg</span>
                      </label>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={item.description || ''}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleUpdateItem(index, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center h-full pt-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive/90"
                      onClick={() => handleDeleteItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between gap-4 border-t pt-4 mt-4">
          <Button variant="outline" onClick={handleAddItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item manually
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Menu
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
