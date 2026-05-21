
import * as React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadCard } from './components/FileUploadCard';
import { KycState, KycDocument } from '@/types/kyc';

interface BasicKycProps {
  data: Partial<KycState>;
  onUpdate: (field: keyof KycState, value: any) => void;
  onUpload: (field: keyof KycState, file: File) => Promise<void>;
}

export function BasicKyc({ data, onUpdate, onUpload }: BasicKycProps) {
  const [panError, setPanError] = React.useState('');
  const [aadhaarError, setAadhaarError] = React.useState('');
  const [ifscError, setIfscError] = React.useState('');

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Basic Verification</h2>
        <p className="text-muted-foreground">We need a few documents to verify your identity.</p>
      </div>

      <div className="space-y-6">
        {/* PAN Section */}
        <div className="space-y-4">
          <Label className="text-base">PAN Card Details</Label>
          <div className="grid gap-2">
            <Label htmlFor="panNumber">PAN Number</Label>
            <Input 
              id="panNumber" 
              placeholder="ABCDE1234F" 
              className="uppercase"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value.toUpperCase();
                // Simple regex for PAN: [A-Z]{5}[0-9]{4}[A-Z]{1}
                if (val.length === 10 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val)) {
                  setPanError('Invalid PAN Format');
                } else {
                  setPanError('');
                }
                onUpdate('panNumber', val);
              }}
            />
            {panError && <p className="text-xs text-destructive">{panError}</p>}
          </div>
          <FileUploadCard
            title="Upload PAN Card"
            description="Clear image of your PAN card (JPG/PNG/PDF)"
            document={data.panImage}
            onFileSelect={(file) => onUpload('panImage', file)}
            required
          />
        </div>

        {/* Aadhaar Section */}
        <div className="space-y-4">
          <Label className="text-base">Aadhaar Verification</Label>
          <div className="grid gap-2">
            <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
            <Input 
              id="aadhaarNumber" 
              placeholder="12 digit number" 
              type="number"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                 const val = e.target.value;
                 if (val.length > 0 && val.length !== 12) {
                   setAadhaarError('Aadhaar must be 12 digits');
                 } else {
                   setAadhaarError('');
                 }
                 onUpdate('aadhaarNumber', val);
              }}
            />
             {aadhaarError && <p className="text-xs text-destructive">{aadhaarError}</p>}
          </div>
          <FileUploadCard
            title="Upload Aadhaar Card"
            description="Masked Aadhaar preferred (First 8 digits hidden)"
            document={data.aadhaarImage}
            onFileSelect={(file) => onUpload('aadhaarImage', file)}
            required
          />
        </div>

        {/* Bank Details Section */}
        <div className="space-y-4">
          <Label className="text-base">Bank Account Verification</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" type="password" placeholder="Account Number" onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate('bankAccountNumber', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifscCode">IFSC Code</Label>
              <Input 
                id="ifscCode" 
                placeholder="SBIN0001234" 
                className="uppercase"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                   const val = e.target.value.toUpperCase();
                   // Basic IFSC: 4 chars, 0, 6 chars
                   if (val.length === 11 && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(val)) {
                     setIfscError('Invalid IFSC Format');
                   } else {
                     setIfscError('');
                   }
                   onUpdate('bankIfsc', val);
                }}
              />
              {ifscError && <p className="text-xs text-destructive">{ifscError}</p>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Upload Cancelled Cheque OR Bank Passbook (1st Page) OR Bank Confirmation Letter
          </p>
          <FileUploadCard
            title="Bank Proof Document"
            document={data.bankProof}
            onFileSelect={(file) => onUpload('bankProof', file)}
            required
          />
        </div>
      </div>
    </div>
  );
}
