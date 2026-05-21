
import React from 'react';
import { FileUploadCard } from './components/FileUploadCard';
import { KycState, VendorType } from '@/types/kyc';

interface BusinessKycProps {
  data: Partial<KycState>;
  onUpload: (field: keyof KycState, file: File) => Promise<void>;
}

export function BusinessKyc({ data, onUpload }: BusinessKycProps) {
  const renderFields = () => {
    switch (data.vendorType) {
      case VendorType.SOLE_PROPRIETOR:
        return (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg text-primary">Sole Proprietor / Local Shop Documents</h3>
            <p className="text-sm text-muted-foreground">Please upload ANY ONE of the following:</p>
            
            <div className="grid gap-4 sm:grid-cols-2">
                <FileUploadCard
                title="Shop Act / Gumasta"
                document={data.shopAct}
                onFileSelect={(f) => onUpload('shopAct', f)}
                />
                <FileUploadCard
                title="Udyam (MSME) Registration"
                document={data.udyam}
                onFileSelect={(f) => onUpload('udyam', f)}
                />
                <FileUploadCard
                title="GST Certificate"
                document={data.gst}
                onFileSelect={(f) => onUpload('gst', f)}
                />
                <FileUploadCard
                title="Trade License"
                document={data.tradeLicense}
                onFileSelect={(f) => onUpload('tradeLicense', f)}
                />
            </div>
          </div>
        );

      case VendorType.PARTNERSHIP:
        return (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg text-primary">Partnership Firm Documents</h3>
            <FileUploadCard title="Firm PAN Card" document={data.firmPan} onFileSelect={(f) => onUpload('firmPan', f)} required />
            <FileUploadCard title="Partnership Deed" document={data.partnershipDeed} onFileSelect={(f) => onUpload('partnershipDeed', f)} required />
            <FileUploadCard title="GST Certificate (Optional)" document={data.gst} onFileSelect={(f) => onUpload('gst', f)} />
            <FileUploadCard title="Authorization Letter" document={data.authLetter} onFileSelect={(f) => onUpload('authLetter', f)} required />
            <FileUploadCard title="Firm Bank Proof" document={data.firmBankProof} onFileSelect={(f) => onUpload('firmBankProof', f)} required />
          </div>
        );

      case VendorType.PRIVATE_LIMITED:
        return (
           <div className="space-y-6">
            <h3 className="font-semibold text-lg text-primary">Private Limited / LLP / OPC Documents</h3>
            <FileUploadCard title="Certificate of Incorporation" document={data.incorporationCert} onFileSelect={(f) => onUpload('incorporationCert', f)} required />
            <FileUploadCard title="Company PAN" document={data.companyPan} onFileSelect={(f) => onUpload('companyPan', f)} required />
            <FileUploadCard title="GST Certificate" document={data.gst} onFileSelect={(f) => onUpload('gst', f)} required />
            <FileUploadCard title="MOA + AOA / LLP Agreement" document={data.moaAoa} onFileSelect={(f) => onUpload('moaAoa', f)} required />
            <FileUploadCard title="Board Resolution / Authorization" document={data.boardResolution} onFileSelect={(f) => onUpload('boardResolution', f)} required />
            <FileUploadCard title="Company Bank Proof" document={data.companyBankProof} onFileSelect={(f) => onUpload('companyBankProof', f)} required />
          </div>
        );

      case VendorType.INDIVIDUAL:
         return (
           <div className="space-y-6">
            <h3 className="font-semibold text-lg text-primary">Individual Service Provider</h3>
            <p className="text-sm text-muted-foreground">Your Personal PAN/Aadhaar (from Step 1) will be used.</p>
            <FileUploadCard title="Address Proof" description="Utility Bill, Rent Agreement, etc." document={data.addressProof} onFileSelect={(f) => onUpload('addressProof', f)} required />
            <FileUploadCard title="Personal Bank Account Proof" document={data.personalBankProof} onFileSelect={(f) => onUpload('personalBankProof', f)} required />
          </div>
         );
      
      default:
        return <p>Please select a vendor type first.</p>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Business Verification</h2>
        <p className="text-muted-foreground">Help us verify your business entity.</p>
      </div>
      {renderFields()}
    </div>
  );
}
