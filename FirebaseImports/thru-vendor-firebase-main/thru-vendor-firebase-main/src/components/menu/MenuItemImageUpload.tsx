'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageIcon, Loader2, UploadCloud, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { prepareMenuItemPhoto } from '@/lib/menu-image'

type MenuItemImageUploadProps = {
  value: string
  onChange: (url: string) => void
  itemId?: string
  disabled?: boolean
}

export function MenuItemImageUpload({
  value,
  onChange,
  itemId,
  disabled = false,
}: MenuItemImageUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const previewUrl = localPreview || value || null

  const clearLocalPreview = () => {
    if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      clearLocalPreview()
      const { previewUrl: compressedPreview, file: compressed } = await prepareMenuItemPhoto(file)
      setLocalPreview(compressedPreview)

      const formData = new FormData()
      formData.append('image', compressed)
      if (itemId) {
        formData.append('itemId', itemId)
      }

      const response = await fetch('/api/menu/item-image', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload image.')
      }

      onChange(result.url)
      clearLocalPreview()
      toast({ title: 'Photo uploaded', description: 'Menu item image saved.' })
    } catch (error) {
      clearLocalPreview()
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload image.',
      })
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleRemove = () => {
    clearLocalPreview()
    onChange('')
  }

  return (
    <div className="space-y-2">
      <Label>Item photo</Label>
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-muted">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Menu item" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
              <span className="mt-1 text-[10px]">No photo</span>
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {previewUrl ? 'Replace photo' : 'Upload photo'}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start px-0 text-destructive hover:text-destructive"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              <X className="mr-1 h-4 w-4" />
              Remove photo
            </Button>
          )}
          <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. Max 8 MB.</p>
        </div>
      </div>
    </div>
  )
}
