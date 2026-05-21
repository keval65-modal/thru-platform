
export enum VendorType {
  SOLE_PROPRIETOR = 'SOLE_PROPRIETOR',
  PARTNERSHIP = 'PARTNERSHIP',
  PRIVATE_LIMITED = 'PRIVATE_LIMITED',
  INDIVIDUAL = 'INDIVIDUAL',
}

export enum BusinessCategory {
  GROCERY = 'GROCERY',
  MEDICINE = 'MEDICINE',
  TAKEOUT_FOOD = 'TAKEOUT_FOOD',
  ALCOHOL = 'ALCOHOL',
  GIFTS = 'GIFTS',
  PET_SUPPLIES = 'PET_SUPPLIES',
  OTHER = 'OTHER',
}

export enum KycStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface KycDocument {
  id: string;
  type: string; // e.g., 'pan', 'aadhaar', 'gst'
  url: string;
  filename: string;
  status: KycStatus;
  rejectionReason?: string;
  uploadedAt: Date;
}

export interface KycState {
  vendorType: VendorType | null;
  categories: BusinessCategory[];
  currentStep: number;
  
  // Phase 1
  panNumber?: string;
  panImage?: KycDocument;
  aadhaarNumber?: string;
  aadhaarImage?: KycDocument;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankProof?: KycDocument;
  
  // Phase 2 (Business)
  // Sole Proprietor
  shopAct?: KycDocument;
  udyam?: KycDocument;
  gst?: KycDocument;
  tradeLicense?: KycDocument;
  
  // Partnership
  firmPan?: KycDocument;
  partnershipDeed?: KycDocument;
  authLetter?: KycDocument;
  partnerPanAadhaar?: KycDocument[]; // Multiple uploads potentially
  firmBankProof?: KycDocument;
  
  // Pvt Ltd
  incorporationCert?: KycDocument;
  companyPan?: KycDocument;
  moaAoa?: KycDocument;
  boardResolution?: KycDocument;
  signatoryPanAadhaar?: KycDocument;
  companyBankProof?: KycDocument;
  
  // Individual
  // Reuses panImage, aadhaarImage above, plus:
  addressProof?: KycDocument;
  personalBankProof?: KycDocument;
  
  // Phase 2 Status
  businessKycStatus: KycStatus;

  // Category Licenses
  drugLicense?: KycDocument;
  fssaiLicense?: KycDocument;
  exciseLicense?: KycDocument;

  // Phase 3 (Advanced)
  liveSelfie?: KycDocument;
  shopGeotagged?: KycDocument;
  inStorePhoto?: KycDocument;
  advancedKycStatus: KycStatus;
}

export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  [VendorType.SOLE_PROPRIETOR]: 'Sole Proprietor / Local Shop',
  [VendorType.PARTNERSHIP]: 'Partnership Firm',
  [VendorType.PRIVATE_LIMITED]: 'Private Limited / LLP / OPC',
  [VendorType.INDIVIDUAL]: 'Individual Service Provider',
};

export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  [BusinessCategory.GROCERY]: 'Grocery',
  [BusinessCategory.MEDICINE]: 'Medicine',
  [BusinessCategory.TAKEOUT_FOOD]: 'Takeout Food',
  [BusinessCategory.ALCOHOL]: 'Alcohol',
  [BusinessCategory.GIFTS]: 'Gifts',
  [BusinessCategory.PET_SUPPLIES]: 'Pet Supplies',
  [BusinessCategory.OTHER]: 'Other',
};
