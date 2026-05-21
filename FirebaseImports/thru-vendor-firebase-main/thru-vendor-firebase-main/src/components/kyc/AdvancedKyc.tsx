
import React from 'react';
import { FileUploadCard } from './components/FileUploadCard';
import { KycState } from '@/types/kyc';

interface AdvancedKycProps {
  data: Partial<KycState>;
  onUpload: (field: keyof KycState, file: File) => Promise<void>;
}

export function AdvancedKyc({ data, onUpload }: AdvancedKycProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Advanced Verification</h2>
        <p className="text-muted-foreground">Optional but recommended to increase trust and unlock higher payouts.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FileUploadCard
          title="Live Selfie"
          description="Face match with Aadhaar"
          acceptedFormats={['.jpg', '.png']}
          document={data.liveSelfie}
          onFileSelect={(f) => onUpload('liveSelfie', f)}
        />
        <FileUploadCard
          title="Geotagged Shop Photo"
          description="Photo of shop front with signboard"
           acceptedFormats={['.jpg', '.png']}
          document={data.shopGeotagged}
          onFileSelect={(f) => onUpload('shopGeotagged', f)}
        />
        <FileUploadCard
          title="In-Store Photo"
          description="Photo inside the shop with you present"
           acceptedFormats={['.jpg', '.png']}
          document={data.inStorePhoto}
          onFileSelect={(f) => onUpload('inStorePhoto', f)}
        />
      </div>
    </div>
  );
}
