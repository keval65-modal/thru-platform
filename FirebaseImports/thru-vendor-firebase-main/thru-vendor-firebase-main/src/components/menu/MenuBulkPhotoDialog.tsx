'use client'

import { useEffect, useRef, useState } from 'react'
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
import { MenuItem } from '@/lib/supabase'
import { prepareMenuItemPhoto } from '@/lib/menu-image'
import { ImageIcon, Loader2, UploadCloud } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type PhotoAssignment = {
  item: MenuItem
  file: File
  previewUrl: string
}

type MenuBulkPhotoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: MenuItem[]
  onComplete: () => void
}

export function MenuBulkPhotoDialog({
  open,
  onOpenChange,
  items,
  onComplete,
}: MenuBulkPhotoDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [assignments, setAssignments] = useState<PhotoAssignment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)

  useEffect(() => {
    if (!open) {
      setAssignments((prev) => {
        prev.forEach((a) => URL.revokeObjectURL(a.previewUrl))
        return []
      })
      setIsUploading(false)
      setIsPreparing(false)
    }
  }, [open])

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    if (files.length !== items.length) {
      toast({
        variant: 'destructive',
        title: 'Wrong number of photos',
        description: `Select exactly ${items.length} photo(s) — one per selected item.`,
      })
      e.target.value = ''
      return
    }

    setIsPreparing(true)
    try {
      setAssignments((prev) => {
        prev.forEach((a) => URL.revokeObjectURL(a.previewUrl))
        return []
      })

      const prepared = await Promise.all(files.map((file) => prepareMenuItemPhoto(file)))
      setAssignments(
        items.map((item, index) => ({
          item,
          file: prepared[index].file,
          previewUrl: prepared[index].previewUrl,
        })),
      )
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not prepare photos',
        description: error instanceof Error ? error.message : 'Please try other images.',
      })
    } finally {
      setIsPreparing(false)
      e.target.value = ''
    }
  }

  const handleUpload = async () => {
    if (assignments.length !== items.length) {
      toast({
        variant: 'destructive',
        title: 'Photos required',
        description: `Choose ${items.length} photo(s) before uploading.`,
      })
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('itemIds', JSON.stringify(items.map((item) => item.id)))
      assignments.forEach((assignment) => {
        formData.append('images', assignment.file)
      })

      const response = await fetch('/api/menu/item-image/bulk', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload photos.')
      }

      toast({
        title: 'Photos uploaded',
        description: result.message || `Updated ${result.updated ?? items.length} item(s).`,
      })

      onOpenChange(false)
      onComplete()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload photos.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload photos for {items.length} item(s)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select {items.length} photo(s) in the same order as the items below. The first photo
            goes to the first item, and so on.
          </p>

          <ol className="space-y-2 rounded-md border p-3 text-sm max-h-40 overflow-y-auto">
            {items.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2">
                <span className="text-muted-foreground w-5 shrink-0">{index + 1}.</span>
                <span className="truncate font-medium">{item.name}</span>
              </li>
            ))}
          </ol>

          <div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={isUploading || isPreparing}
              onChange={handleFilesSelected}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isUploading || isPreparing}
              onClick={() => fileInputRef.current?.click()}
            >
              {isPreparing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {assignments.length ? 'Choose different photos' : `Choose ${items.length} photo(s)`}
            </Button>
          </div>

          {assignments.length > 0 && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {assignments.map((assignment, index) => (
                  <div key={assignment.item.id} className="space-y-1">
                    <div className="relative h-20 overflow-hidden rounded-md border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={assignment.previewUrl}
                        alt={assignment.item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {index + 1}. {assignment.item.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignments.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-muted-foreground">
              <ImageIcon className="h-8 w-8 mb-2" />
              <p className="text-sm text-center">No photos selected yet</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading || isPreparing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || isPreparing || assignments.length !== items.length}
          >
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isUploading ? 'Uploading...' : 'Upload all'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
