export const MAX_MENU_PAGE_INPUT_BYTES = 12 * 1024 * 1024
export const MAX_MENU_PAGES = 10
export const SUPPORTED_MENU_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type PreparedMenuPageImage = {
  previewUrl: string
  file: File
}

function loadImageElement(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read this photo. Try another shot.'))
    img.src = objectUrl
  })
}

/** Compress camera/gallery menu photos before upload (keeps text legible for vision OCR). */
export async function prepareMenuPageImage(file: File): Promise<PreparedMenuPageImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, or WebP).')
  }
  if (file.size > MAX_MENU_PAGE_INPUT_BYTES) {
    throw new Error('Photo is too large. Please use an image under 12 MB.')
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImageElement(objectUrl)
    const maxEdge = 2048
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not process this photo in your browser.')
    }
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    })
    if (!blob) {
      throw new Error('Could not compress this photo. Try another shot.')
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'menu-page'
    const compressed = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
    const previewUrl = URL.createObjectURL(blob)
    return { previewUrl, file: compressed }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function fileToDataUri(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  const mimeType = file.type || 'image/jpeg'
  return `data:${mimeType};base64,${base64}`
}

const MAX_MENU_ITEM_INPUT_BYTES = 8 * 1024 * 1024

/** Compress a food photo before upload (smaller than menu-page OCR images). */
export async function prepareMenuItemPhoto(file: File): Promise<PreparedMenuPageImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, or WebP).')
  }
  if (file.size > MAX_MENU_ITEM_INPUT_BYTES) {
    throw new Error('Photo is too large. Please use an image under 8 MB.')
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImageElement(objectUrl)
    const maxEdge = 1024
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not process this photo in your browser.')
    }
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    })
    if (!blob) {
      throw new Error('Could not compress this photo. Try another image.')
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'menu-item'
    const compressed = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
    const previewUrl = URL.createObjectURL(blob)
    return { previewUrl, file: compressed }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
