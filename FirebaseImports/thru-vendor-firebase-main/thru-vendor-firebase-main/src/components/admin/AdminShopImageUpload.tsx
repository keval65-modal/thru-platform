'use client';

import { useRef, useState, useCallback } from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, UploadCloud, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  SHOP_IMAGE_ASPECT,
  prepareShopImageFile,
  cropShopImageFile,
  isPlaceholderShopImage,
  humanizeShopImageError,
} from '@/lib/shop-image';
import { uploadVendorShopImageByAdmin } from '@/app/(app)/admin/actions';

type AdminShopImageUploadProps = {
  vendorId: string;
  shopName: string;
  imageUrl?: string | null;
  onUploaded?: (url: string) => void;
};

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, SHOP_IMAGE_ASPECT, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export function AdminShopImageUpload({
  vendorId,
  shopName,
  imageUrl,
  onUploaded,
}: AdminShopImageUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [currentUrl, setCurrentUrl] = useState(imageUrl);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  const missingImage = isPlaceholderShopImage(currentUrl);
  const displayedImage = missingImage ? null : currentUrl;

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }, []);

  const clearCropState = () => {
    setImgSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setOriginalFile(null);
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      setPreviewObjectUrl(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      clearCropState();
      const { previewUrl, file: compressed } = await prepareShopImageFile(file);
      setPreviewObjectUrl(previewUrl);
      setImgSrc(previewUrl);
      setOriginalFile(compressed);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Image error',
        description: humanizeShopImageError(err instanceof Error ? err.message : 'Invalid image'),
      });
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!completedCrop || !imgRef.current || !originalFile) {
      toast({
        variant: 'destructive',
        title: 'Crop required',
        description: 'Select a photo and adjust the crop area first.',
      });
      return;
    }

    setIsUploading(true);
    try {
      const cropped = await cropShopImageFile(imgRef.current, completedCrop, originalFile.name);
      const formData = new FormData();
      formData.append('shopImage', cropped);

      const result = await uploadVendorShopImageByAdmin(vendorId, formData);
      if (!result.success || !result.imageUrl) {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: humanizeShopImageError(result.error || 'Unknown error'),
        });
        return;
      }

      setCurrentUrl(result.imageUrl);
      clearCropState();
      toast({ title: 'Photo saved', description: `Shop image updated for ${shopName}.` });
      onUploaded?.(result.imageUrl);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: humanizeShopImageError(err instanceof Error ? err.message : 'Unknown error'),
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="relative h-[100px] w-[150px] shrink-0 overflow-hidden rounded-md border bg-muted">
          {displayedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayedImage} alt={`${shopName} photo`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="mt-1 text-xs">No photo</span>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          {missingImage ? (
            <Badge variant="secondary">No shop photo — add one below</Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Shop photo on file. You can replace it below.</p>
          )}
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            {missingImage ? 'Add photo' : 'Replace photo'}
          </Button>
          <p className="text-xs text-muted-foreground">Cropped to 150×100 px for display in the app.</p>
        </div>
      </div>

      {imgSrc && (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-center text-sm text-muted-foreground">Adjust crop:</p>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={setCompletedCrop}
            aspect={SHOP_IMAGE_ASPECT}
          >
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxHeight: 300, maxWidth: '100%', display: 'block', margin: 'auto' }}
            />
          </ReactCrop>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={clearCropState} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleUpload} disabled={isUploading || !completedCrop}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
