/** Shop display image dimensions (signup + profile). */
export const SHOP_IMAGE_WIDTH = 150;
export const SHOP_IMAGE_HEIGHT = 100;
export const SHOP_IMAGE_ASPECT = SHOP_IMAGE_WIDTH / SHOP_IMAGE_HEIGHT;

/** Reject very large camera originals before loading into memory. */
export const MAX_SHOP_IMAGE_INPUT_BYTES = 12 * 1024 * 1024; // 12 MB

export type PreparedShopImage = {
  previewUrl: string;
  file: File;
};

function loadImageElement(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read this image. Try another photo.'));
    img.src = objectUrl;
  });
}

/**
 * Downscale camera/gallery photos before preview + crop.
 * Avoids huge base64 strings in React state (can trigger browser "storage full" errors on mobile).
 */
export async function prepareShopImageFile(file: File): Promise<PreparedShopImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, or WebP).');
  }
  if (file.size > MAX_SHOP_IMAGE_INPUT_BYTES) {
    throw new Error('Image is too large. Please choose a photo under 12 MB or take a new one.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not process this image in your browser.');
    }
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.88);
    });
    if (!blob) {
      throw new Error('Could not compress this image. Try another photo.');
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'shop';
    const compressed = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    const previewUrl = URL.createObjectURL(blob);
    return { previewUrl, file: compressed };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function humanizeShopImageError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('storage is full') || m.includes('quotaexceeded')) {
    return 'Your browser could not hold this photo in memory. We compressed large images automatically — try again, or pick a smaller photo.';
  }
  if (m.includes('bucket not found') || m.includes('bucket')) {
    return 'Shop image storage is not set up yet. Please contact support or try again later.';
  }
  if (m.includes('quota') || m.includes('limit') || m.includes('exceeded')) {
    return 'Cloud storage limit reached. Please contact support.';
  }
  if (m.includes('payload too large') || m.includes('entity too large')) {
    return 'Image upload was too large. Use a smaller photo or retake at lower resolution.';
  }
  return message;
}
