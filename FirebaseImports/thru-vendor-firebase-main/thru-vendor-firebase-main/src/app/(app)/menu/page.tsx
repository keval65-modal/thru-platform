'use client'

import { useState, useEffect, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MenuItem } from '@/lib/supabase'
import { Plus, Edit, Trash2, Loader2, UploadCloud, Camera, X, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSession } from '@/hooks/use-session'
import { isMenuUploadEnabled } from '@/lib/vendor-features'
import {
  MAX_MENU_PAGES,
  prepareMenuPageImage,
  fileToDataUri,
} from '@/lib/menu-image'
import Link from 'next/link'
import { MenuItemImageUpload } from '@/components/menu/MenuItemImageUpload'

// Fallback vendor ID for local testing (real session ID overrides this)
const VENDOR_ID = '8c027b0f-394c-4c3e-a20c-56ad675366d2'
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024

const CATEGORIES = [
  'Starters',
  'Mains',
  'Desserts',
  'Drinks',
  'Snacks',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Other'
]

type MenuPagePhoto = {
  id: string
  previewUrl: string
  file: File
  label: string
}

type PageScanResult = {
  pageNumber: number
  fileName: string
  isReadable: boolean
  readabilityIssue?: string
  itemsFound: number
}

export default function MenuPage() {
  const { toast } = useToast()
  const { session, isLoading: sessionLoading } = useSession()
  const activeVendorId = session?.id ?? VENDOR_ID
  const menuAllowed = isMenuUploadEnabled(session?.storeCategory)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    is_veg: false,
    is_available: true,
    preparation_time: ''
  })
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false)
  const [selectedMenuFile, setSelectedMenuFile] = useState<File | null>(null)
  const [menuPagePhotos, setMenuPagePhotos] = useState<MenuPagePhoto[]>([])
  const [uploadingMenu, setUploadingMenu] = useState(false)
  const [uploadingCameraMenu, setUploadingCameraMenu] = useState(false)
  const [replaceExistingMenu, setReplaceExistingMenu] = useState(true)
  const [replaceExistingCameraMenu, setReplaceExistingCameraMenu] = useState(true)
  const [lastScanResults, setLastScanResults] = useState<PageScanResult[] | null>(null)

  useEffect(() => {
    if (sessionLoading) return
    if (!menuAllowed) {
      setLoading(false)
      return
    }
    loadMenuItems()
  }, [sessionLoading, activeVendorId])

  useEffect(() => {
    if (!isUploadDialogOpen) {
      setSelectedMenuFile(null)
      setReplaceExistingMenu(true)
      setUploadingMenu(false)
    }
  }, [isUploadDialogOpen])

  useEffect(() => {
    if (!isCameraDialogOpen) {
      setMenuPagePhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
        return []
      })
      setReplaceExistingCameraMenu(true)
      setUploadingCameraMenu(false)
      setLastScanResults(null)
    }
  }, [isCameraDialogOpen])

  const loadMenuItems = async () => {
    try {
      if (!activeVendorId) return
      setLoading(true)
      const response = await fetch('/api/menu/items')
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to load menu items')
      }
      const payload = await response.json()
      setMenuItems(payload.items || [])
    } catch (error) {
      console.error('Error loading menu items:', error)
      toast({
        title: 'Error',
        description: 'Failed to load menu items',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMenuUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!menuAllowed) {
      toast({
        title: 'Not available for your store type',
        description: 'Menu upload is only available for Restaurants, Cafes, and Bakeries.',
        variant: 'destructive',
      })
      return
    }

    if (!activeVendorId) {
      toast({
        title: 'Vendor not detected',
        description: 'Please refresh and try again.',
        variant: 'destructive'
      })
      return
    }

    if (!selectedMenuFile) {
      toast({
        title: 'No file selected',
        description: 'Please choose a PDF before uploading.',
        variant: 'destructive'
      })
      return
    }

    if (selectedMenuFile.size > MAX_UPLOAD_SIZE_BYTES) {
      toast({
        title: 'File too large',
        description: 'Please upload a PDF smaller than 25 MB.',
        variant: 'destructive'
      })
      return
    }

    try {
      setUploadingMenu(true)

      const formData = new FormData()
      formData.append('menuPdf', selectedMenuFile)
      formData.append('replaceExisting', String(replaceExistingMenu))

      const response = await fetch('/api/menu/upload', {
        method: 'POST',
        body: formData,
      })

      let result: any = null
      let fallbackBody = ''
      try {
        result = await response.json()
      } catch {
        fallbackBody = await response.text()
      }

      if (!response.ok) {
        throw new Error(result?.error || fallbackBody || 'Unable to process menu. Please try again.')
      }

      toast({
        title: 'Menu imported',
        description: result?.message || `Added ${result?.inserted ?? 0} new items.`
      })

      setIsUploadDialogOpen(false)
      setSelectedMenuFile(null)
      await loadMenuItems()
    } catch (error: any) {
      console.error('Error uploading menu PDF:', error)
      toast({
        title: 'Upload failed',
        description: error?.message || 'Unable to process this menu right now.',
        variant: 'destructive'
      })
    } finally {
      setUploadingMenu(false)
    }
  }

  const addMenuPagePhotos = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (!fileArray.length) return

    const remainingSlots = MAX_MENU_PAGES - menuPagePhotos.length
    if (remainingSlots <= 0) {
      toast({
        title: 'Page limit reached',
        description: `You can add up to ${MAX_MENU_PAGES} pages per scan.`,
        variant: 'destructive',
      })
      return
    }

    const toAdd = fileArray.slice(0, remainingSlots)
    if (fileArray.length > remainingSlots) {
      toast({
        title: 'Some photos skipped',
        description: `Only ${remainingSlots} more page(s) can be added (max ${MAX_MENU_PAGES}).`,
      })
    }

    try {
      const prepared = await Promise.all(toAdd.map((file) => prepareMenuPageImage(file)))
      setMenuPagePhotos((prev) => [
        ...prev,
        ...prepared.map((item, index) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          previewUrl: item.previewUrl,
          file: item.file,
          label: `Page ${prev.length + index + 1}`,
        })),
      ])
    } catch (error: any) {
      toast({
        title: 'Could not add photo',
        description: error?.message || 'Please try another image.',
        variant: 'destructive',
      })
    }
  }

  const removeMenuPagePhoto = (id: string) => {
    setMenuPagePhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      const next = prev.filter((p) => p.id !== id)
      return next.map((p, index) => ({ ...p, label: `Page ${index + 1}` }))
    })
  }

  const handleCameraMenuUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!menuAllowed) {
      toast({
        title: 'Not available for your store type',
        description: 'Menu upload is only available for Restaurants, Cafes, and Bakeries.',
        variant: 'destructive',
      })
      return
    }

    if (!activeVendorId) {
      toast({
        title: 'Vendor not detected',
        description: 'Please refresh and try again.',
        variant: 'destructive',
      })
      return
    }

    if (!menuPagePhotos.length) {
      toast({
        title: 'No photos added',
        description: 'Take or upload at least one menu page photo.',
        variant: 'destructive',
      })
      return
    }

    try {
      setUploadingCameraMenu(true)
      setLastScanResults(null)

      const pages = await Promise.all(
        menuPagePhotos.map(async (photo, index) => ({
          pageNumber: index + 1,
          fileName: photo.label,
          dataUri: await fileToDataUri(photo.file),
        })),
      )

      const response = await fetch('/api/menu/upload-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages,
          replaceExisting: replaceExistingCameraMenu,
        }),
      })

      let result: any = null
      let fallbackBody = ''
      try {
        result = await response.json()
      } catch {
        fallbackBody = await response.text()
      }

      if (result?.pageResults) {
        setLastScanResults(result.pageResults)
      }

      if (!response.ok) {
        const unreadable = Array.isArray(result?.unreadablePages) ? result.unreadablePages : []
        const detail =
          unreadable.length > 0
            ? unreadable
                .map((p: PageScanResult) => `Page ${p.pageNumber}: ${p.readabilityIssue ?? 'Not readable'}`)
                .join(' ')
            : result?.error || fallbackBody

        throw new Error(detail || 'Unable to process menu photos.')
      }

      if (result?.warning) {
        toast({
          title: 'Menu imported with warnings',
          description: result.message,
        })
      } else {
        toast({
          title: 'Menu imported',
          description: result?.message || `Added ${result?.inserted ?? 0} new items.`,
        })
      }

      setIsCameraDialogOpen(false)
      await loadMenuItems()
    } catch (error: any) {
      console.error('Error uploading menu photos:', error)
      toast({
        title: 'Scan failed',
        description: error?.message || 'Unable to process these photos right now.',
        variant: 'destructive',
      })
    } finally {
      setUploadingCameraMenu(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!menuAllowed) {
      toast({
        title: 'Not available for your store type',
        description: 'Menu management is only available for Restaurants, Cafes, and Bakeries.',
        variant: 'destructive',
      })
      return
    }
    
    try {
      if (!activeVendorId) {
        toast({
          title: 'Vendor not detected',
          description: 'Please refresh and try again.',
          variant: 'destructive'
        })
        return
      }

      const itemData = {
        vendor_id: activeVendorId,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category: formData.category || null,
        image_url: formData.image_url || null,
        is_veg: formData.is_veg,
        is_available: formData.is_available,
        preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null
      }

      if (editingItem) {
        const response = await fetch('/api/menu/items', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingItem.id, ...itemData }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || 'Failed to update menu item')
        }
        toast({
          title: 'Success',
          description: 'Menu item updated successfully'
        })
      } else {
        const response = await fetch('/api/menu/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || 'Failed to create menu item')
        }
        toast({
          title: 'Success',
          description: 'Menu item added successfully'
        })
      }

      setIsDialogOpen(false)
      resetForm()
      loadMenuItems()
    } catch (error) {
      console.error('Error saving menu item:', error)
      toast({
        title: 'Error',
        description: 'Failed to save menu item',
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category || '',
      image_url: item.image_url || '',
      is_veg: item.is_veg,
      is_available: item.is_available,
      preparation_time: item.preparation_time?.toString() || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return

    try {
      const response = await fetch(`/api/menu/items?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to delete menu item')
      }
      toast({
        title: 'Success',
        description: 'Menu item deleted successfully'
      })
      loadMenuItems()
    } catch (error) {
      console.error('Error deleting menu item:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete menu item',
        variant: 'destructive'
      })
    }
  }

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/menu/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_available: !currentStatus }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to update availability')
      }
      loadMenuItems()
    } catch (error) {
      console.error('Error toggling availability:', error)
      toast({
        title: 'Error',
        description: 'Failed to update availability',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image_url: '',
      is_veg: false,
      is_available: true,
      preparation_time: ''
    })
    setEditingItem(null)
  }

  const groupedItems = menuItems.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {!menuAllowed && !sessionLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Menu upload is not available</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Menu upload is enabled only for <strong>Restaurants</strong>, <strong>Cafes</strong>, and{' '}
              <strong>Bakeries</strong>.
            </p>
            <Button asChild variant="outline">
              <Link href="/orders">Go to Orders</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Menu Management</h1>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Add'} Menu Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="price">Price (₹) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <MenuItemImageUpload
                  key={editingItem?.id ?? 'new'}
                  value={formData.image_url}
                  onChange={(url) => setFormData({ ...formData, image_url: url })}
                  itemId={editingItem?.id}
                />

                <div>
                  <Label htmlFor="preparation_time">Preparation Time (minutes)</Label>
                  <Input
                    id="preparation_time"
                    type="number"
                    value={formData.preparation_time}
                    onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_veg"
                    checked={formData.is_veg}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_veg: checked })}
                  />
                  <Label htmlFor="is_veg">Vegetarian</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_available"
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                  />
                  <Label htmlFor="is_available">Available</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingItem ? 'Update' : 'Add'} Item
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload Menu PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Menu PDF</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleMenuUpload} className="space-y-4">
                <div>
                  <Label htmlFor="menuPdf">Menu PDF</Label>
                  <Input
                    id="menuPdf"
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => setSelectedMenuFile(event.target.files?.[0] ?? null)}
                    disabled={uploadingMenu}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedMenuFile
                      ? `${selectedMenuFile.name} (${(selectedMenuFile.size / (1024 * 1024)).toFixed(2)} MB)`
                      : 'Upload a clear PDF (max 25 MB).'}
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Replace existing menu</p>
                    <p className="text-xs text-muted-foreground">
                      Delete your current menu items before importing the new list.
                    </p>
                  </div>
                  <Switch
                    checked={replaceExistingMenu}
                    onCheckedChange={setReplaceExistingMenu}
                    disabled={uploadingMenu}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                    disabled={uploadingMenu}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!selectedMenuFile || uploadingMenu}>
                    {uploadingMenu ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="mr-2 h-4 w-4" />
                    )}
                    {uploadingMenu ? 'Scanning...' : 'Scan & Import'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Camera className="mr-2 h-4 w-4" />
                Scan Menu Photos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Scan Menu with Camera</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCameraMenuUpload} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Photograph each page of your menu. Add multiple pages for multi-page menus — we use AI vision to read items and flag any page that is not clear enough.
                </p>

                <div className="flex flex-wrap gap-2">
                  <div>
                    <Input
                      id="menuCameraCapture"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={uploadingCameraMenu || menuPagePhotos.length >= MAX_MENU_PAGES}
                      onChange={(event) => {
                        const files = event.target.files
                        if (files?.length) void addMenuPagePhotos(files)
                        event.target.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={uploadingCameraMenu || menuPagePhotos.length >= MAX_MENU_PAGES}
                      onClick={() => document.getElementById('menuCameraCapture')?.click()}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Take Photo
                    </Button>
                  </div>
                  <div>
                    <Input
                      id="menuGalleryPick"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      disabled={uploadingCameraMenu || menuPagePhotos.length >= MAX_MENU_PAGES}
                      onChange={(event) => {
                        const files = event.target.files
                        if (files?.length) void addMenuPagePhotos(files)
                        event.target.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingCameraMenu || menuPagePhotos.length >= MAX_MENU_PAGES}
                      onClick={() => document.getElementById('menuGalleryPick')?.click()}
                    >
                      Add from Gallery
                    </Button>
                  </div>
                </div>

                {menuPagePhotos.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Pages ({menuPagePhotos.length}/{MAX_MENU_PAGES})</Label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {menuPagePhotos.map((photo) => (
                        <div key={photo.id} className="relative rounded-md border overflow-hidden">
                          <img
                            src={photo.previewUrl}
                            alt={photo.label}
                            className="h-28 w-full object-cover"
                          />
                          <div className="flex items-center justify-between gap-1 p-2 text-xs">
                            <span className="font-medium truncate">{photo.label}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              disabled={uploadingCameraMenu}
                              onClick={() => removeMenuPagePhoto(photo.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No pages yet. Take a photo or pick images from your gallery.
                  </div>
                )}

                {lastScanResults && lastScanResults.some((p) => !p.isReadable) && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Some pages were not readable
                    </div>
                    <ul className="text-xs text-amber-900 space-y-1 list-disc pl-4">
                      {lastScanResults
                        .filter((p) => !p.isReadable)
                        .map((p) => (
                          <li key={p.pageNumber}>
                            {p.fileName}: {p.readabilityIssue ?? 'Retake this page in better lighting.'}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Replace existing menu</p>
                    <p className="text-xs text-muted-foreground">
                      Delete current items before importing from these photos.
                    </p>
                  </div>
                  <Switch
                    checked={replaceExistingCameraMenu}
                    onCheckedChange={setReplaceExistingCameraMenu}
                    disabled={uploadingCameraMenu}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCameraDialogOpen(false)}
                    disabled={uploadingCameraMenu}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!menuPagePhotos.length || uploadingCameraMenu}>
                    {uploadingCameraMenu ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    {uploadingCameraMenu ? 'Scanning pages...' : 'Scan & Import'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      )}

      {menuAllowed && loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : menuAllowed && menuItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No menu items yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Item
            </Button>
          </CardContent>
        </Card>
      ) : menuAllowed ? (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{item.name}</h4>
                          {item.is_veg && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              VEG
                            </span>
                          )}
                          {!item.is_available && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                              UNAVAILABLE
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                        <p className="text-lg font-bold mt-2">₹{item.price}</p>
                        {item.preparation_time && (
                          <p className="text-xs text-muted-foreground">
                            {item.preparation_time} mins
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={() =>
                            toggleAvailability(item.id, item.is_available)
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
