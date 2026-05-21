
import React from 'react';
import { FileUploadCard } from './components/FileUploadCard';
import { KycState, BusinessCategory } from '@/types/kyc';

interface LicenseUploadProps {
  data: Partial<KycState>;
  onUpload: (field: keyof KycState, file: File) => Promise<void>;
}

export function LicenseUpload({ data, onUpload }: LicenseUploadProps) {
  const categories = data.categories || [];

  const requiredLicenses = [];

  if (categories.includes(BusinessCategory.MEDICINE)) {
    requiredLicenses.push({ field: 'drugLicense', title: 'Drug License', category: 'Medicine' });
  }
  if (categories.includes(BusinessCategory.TAKEOUT_FOOD) || categories.includes(BusinessCategory.GROCERY)) {
    // FSSAI is usually relevant for Grocery too, let's include it if Grocery or Food
    requiredLicenses.push({ field: 'fssaiLicense', title: 'FSSAI License', category: 'Food/Grocery' });
  }
  if (categories.includes(BusinessCategory.ALCOHOL)) {
    requiredLicenses.push({ field: 'exciseLicense', title: 'State Excise License', category: 'Alcohol' });
  }

  if (requiredLicenses.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">No additional licenses required</h2>
        <p className="text-muted-foreground">Based on your selected categories, you can proceed to the next step.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Category Licenses</h2>
        <p className="text-muted-foreground">Required to legally sell specific categories on Thru.</p>
      </div>

      <div className="space-y-6">
        {requiredLicenses.map((req) => (
          <div key={req.field} className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{req.category} Category</h4>
            <FileUploadCard
              title={req.title}
              document={data[req.field as keyof KycState] as any}
              onFileSelect={(f) => onUpload(req.field as keyof KycState, f)}
              required
            />
          </div>
        ))}
      </div>
    </div>
  );
}
