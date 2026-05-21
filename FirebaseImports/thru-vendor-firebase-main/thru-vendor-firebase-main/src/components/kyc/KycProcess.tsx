
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VendorTypeSelection } from './VendorTypeSelection';
import { CategorySelection } from './CategorySelection';
import { BasicKyc } from './BasicKyc';
import { BusinessKyc } from './BusinessKyc';
import { LicenseUpload } from './LicenseUpload';
import { AdvancedKyc } from './AdvancedKyc';
import { KycStatusDashboard } from './KycDashboard';
import { KycState, VendorType, BusinessCategory, KycStatus, KycDocument } from '@/types/kyc';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useSession } from '@/hooks/use-session';
import { uploadKycDocument } from '@/lib/storage';
import { saveKycData, getKycData } from '@/lib/kyc-service';

// Initial State
const initialState: KycState = {
  vendorType: null,
  categories: [],
  currentStep: 1,
  businessKycStatus: KycStatus.PENDING,
  advancedKycStatus: KycStatus.PENDING,
};

export function KycProcess() {
  const [state, setState] = React.useState<KycState>(initialState);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const { session } = useSession();

  // Load existing data
  React.useEffect(() => {
    if (session?.isAuthenticated && session.uid) {
        getKycData(session.uid).then(data => {
            if (data) {
                setState(prev => ({ ...prev, ...data }));
            }
        }).finally(() => setLoading(false));
    } else if (session?.isAuthenticated === false) {
        setLoading(false);
    }
  }, [session]);

  const handleUpdate = (field: keyof KycState, value: any) => {
    setState((prev: KycState) => {
        const newState = { ...prev, [field]: value };
        // Debounce save or save immediately? keeping it simple for now, maybe save on step change
        return newState;
    });
  };

  const handleDocumentUpload = async (field: keyof KycState, file: File) => {
    if (!session?.isAuthenticated || !session.uid) {
        toast({ title: "Error", description: "You must be logged in to upload documents.", variant: "destructive" });
        return;
    }

    try {
        toast({ title: "Uploading...", description: "Please wait while we upload your document." });
        const url = await uploadKycDocument(session.uid, file, field);
        
        const doc: KycDocument = {
            id: Math.random().toString(36).substr(2, 9),
            type: field as string,
            url: url,
            filename: file.name,
            status: KycStatus.SUBMITTED,
            uploadedAt: new Date()
        };
        
        handleUpdate(field, doc);
        
        // Auto-save state after upload
        await saveKycData(session.uid, { [field]: doc });

        toast({
            title: "File Uploaded",
            description: `${file.name} has been uploaded successfully.`,
        });
    } catch (error) {
        console.error("Upload error:", error);
        toast({ title: "Upload Failed", description: "Could not upload document. Please try again.", variant: "destructive" });
    }
  };

  const saveProgress = async () => {
      if (session?.isAuthenticated && session.uid) {
          try {
              await saveKycData(session.uid, state);
              toast({ title: "Progress Saved", description: "Your application has been saved." });
          } catch (e) {
              toast({ title: "Error Saving", description: "Could not save progress.", variant: "destructive" });
          }
      }
  };

  const calculateProgress = () => {
    return (state.currentStep / 7) * 100;
  };

  const nextStep = async () => {
    let next = state.currentStep + 1;

    // Logic to skip step 5 if no licenses needed
    if (state.currentStep === 4) {
       const needsLicense = state.categories.some((c: BusinessCategory) => 
         [BusinessCategory.MEDICINE, BusinessCategory.TAKEOUT_FOOD, BusinessCategory.GROCERY, BusinessCategory.ALCOHOL].includes(c)
       );
       if (!needsLicense) {
         next = 6;
       }
    }
    
    // Save on step transition
    if (session?.isAuthenticated && session.uid) {
        // Update current step in DB
        await saveKycData(session.uid, { ...state, currentStep: next });
    }

    if (state.currentStep === 6) {
        toast({
            title: "KYC Information Submitted",
            description: "Your information has been submitted for review.",
        });
        if (session?.isAuthenticated && session.uid) {
             // Mark basic status submitted if all done
             // In reality backend function triggers this, but we can optimistically set
             // businessKycStatus to SUBMITTED if needed
             await saveKycData(session.uid, { businessKycStatus: KycStatus.SUBMITTED });
        }
    }

    setState((prev: KycState) => ({ ...prev, currentStep: Math.min(next, 7) }));
  };

  const prevStep = () => {
    let prev = state.currentStep - 1;
     if (state.currentStep === 6) {
       const needsLicense = state.categories.some((c: BusinessCategory) => 
         [BusinessCategory.MEDICINE, BusinessCategory.TAKEOUT_FOOD, BusinessCategory.GROCERY, BusinessCategory.ALCOHOL].includes(c)
       );
       if (!needsLicense) {
         prev = 4;
       }
    }
    setState((prevState: KycState) => ({ ...prevState, currentStep: Math.max(prev, 1) }));
  };

  const canProceed = () => {
    switch (state.currentStep) {
      case 1: return !!state.vendorType;
      case 2: return state.categories.length > 0;
      case 3: 
        // Require documents + text fields
        // Simplification for now: check docs + non-empty strings
        return !!(state.panImage && state.aadhaarImage && state.bankProof && state.panNumber && state.aadhaarNumber && state.bankAccountNumber && state.bankIfsc);
      case 4: 
        if (state.vendorType === VendorType.SOLE_PROPRIETOR) return !!(state.shopAct || state.udyam || state.gst || state.tradeLicense);
        if (state.vendorType === VendorType.PARTNERSHIP) return !!(state.firmPan && state.partnershipDeed && state.authLetter && state.firmBankProof);
        if (state.vendorType === VendorType.PRIVATE_LIMITED) return !!(state.incorporationCert && state.companyPan && state.gst && state.moaAoa && state.boardResolution && state.companyBankProof);
        if (state.vendorType === VendorType.INDIVIDUAL) return !!(state.addressProof && state.personalBankProof);
        return false;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <VendorTypeSelection selectedType={state.vendorType} onSelect={(t) => handleUpdate('vendorType', t)} />;
      case 2:
        return <CategorySelection 
                  selectedCategories={state.categories} 
                  onToggle={(c) => {
                    const current = state.categories;
                    const updated = current.includes(c) ? current.filter((i: BusinessCategory) => i !== c) : [...current, c];
                    handleUpdate('categories', updated);
                  }} 
               />;
      case 3:
        return <BasicKyc data={state} onUpdate={handleUpdate} onUpload={handleDocumentUpload} />;
      case 4:
        return <BusinessKyc data={state} onUpload={handleDocumentUpload} />;
      case 5:
        return <LicenseUpload data={state} onUpload={handleDocumentUpload} />;
      case 6:
        return <AdvancedKyc data={state} onUpload={handleDocumentUpload} />;
      case 7:
        return <KycStatusDashboard data={state} onEdit={(step: number) => setState((prev: KycState) => ({...prev, currentStep: step}))} />;
      default:
        return null;
    }
  };

  if (loading) {
      return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!session?.isAuthenticated) {
      return (
          <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
              <h2 className="text-xl font-semibold">Please Log In</h2>
              <p>You need to be logged in to complete KYC.</p>
              {/* Add Link to login or similar */}
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {state.currentStep < 7 && (
        <div className="mb-8 space-y-2">
           <div className="flex justify-between text-sm text-muted-foreground">
             <span>Step {state.currentStep} of 6</span>
             <span>{Math.round(calculateProgress())}% Completed</span>
           </div>
           <Progress value={calculateProgress()} className="h-2" />
        </div>
      )}

      {renderStep()}

      {state.currentStep < 7 && (
        <div className="mt-8 flex justify-between pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={state.currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={saveProgress}>
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button 
                onClick={nextStep} 
                disabled={!canProceed()}
                className="bg-primary hover:bg-primary/90"
            >
                {state.currentStep === 6 ? 'Submit Verification' : 'Next Step'} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
