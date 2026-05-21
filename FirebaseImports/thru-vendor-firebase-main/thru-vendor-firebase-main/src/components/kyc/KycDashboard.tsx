
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Assuming Button import
import { Badge } from "@/components/ui/badge"; // Check if Badge exists, otherwise use span
import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import { KycState, KycStatus as StatusEnum } from '@/types/kyc';

// Simple Badge component fallback if not exists
const StatusBadge = ({ status }: { status?: StatusEnum }) => {
  if (!status) return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">Pending</span>;
  
  switch (status) {
    case StatusEnum.APPROVED:
      return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Approved</span>;
    case StatusEnum.REJECTED:
      return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center gap-1"><XCircle className="w-3 h-3"/> Rejected</span>;
    case StatusEnum.SUBMITTED:
      return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3"/> Submitted</span>;
    default:
      return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">Pending</span>;
  }
};

interface KycStatusDashboardProps {
  data: Partial<KycState>;
  onEdit: (step: number) => void;
}

export function KycStatusDashboard({ data, onEdit }: KycStatusDashboardProps) {
  // Mock statuses for now based on data presence
  let basicStatus = StatusEnum.PENDING;
  if (data.panImage && data.aadhaarImage && data.bankProof) {
    if (data.panImage.status === StatusEnum.REJECTED || data.aadhaarImage.status === StatusEnum.REJECTED || data.bankProof.status === StatusEnum.REJECTED) {
      basicStatus = StatusEnum.REJECTED;
    } else if (data.panImage.status === StatusEnum.APPROVED && data.aadhaarImage.status === StatusEnum.APPROVED && data.bankProof.status === StatusEnum.APPROVED) {
        basicStatus = StatusEnum.APPROVED;
    } else {
      basicStatus = StatusEnum.SUBMITTED;
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">KYC Status</h2>
        <p className="text-muted-foreground">Track the status of your verification documents.</p>
      </div>

      <div className="grid gap-4">
        {/* Basic KYC */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Phase 1: Basic KYC</CardTitle>
            <StatusBadge status={basicStatus} />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mt-2">
              Identity and Bank details. Required to start setting up store.
            </div>
             {basicStatus === StatusEnum.REJECTED && (
              <Button variant="outline" size="sm" className="mt-4 text-destructive border-destructive hover:bg-destructive/10" onClick={() => onEdit(3)}>
                Re-upload Rejected Documents
              </Button>
            )}
             {basicStatus === StatusEnum.PENDING && (
               <Button variant="link" size="sm" className="mt-2 px-0 text-primary" onClick={() => onEdit(3)}>
                Complete Now
              </Button>
             )}
          </CardContent>
        </Card>

        {/* Business KYC */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Phase 2: Business KYC</CardTitle>
             <StatusBadge status={data.businessKycStatus || StatusEnum.PENDING} />
          </CardHeader>
          <CardContent>
             <div className="text-sm text-muted-foreground mt-2">
              Registration and Legal documents. Required for payouts.
            </div>
             {data.businessKycStatus === StatusEnum.REJECTED && (
              <Button variant="outline" size="sm" className="mt-4 text-destructive border-destructive hover:bg-destructive/10" onClick={() => onEdit(4)}>
                Fix Issues
              </Button>
            )}
             {data.businessKycStatus === StatusEnum.PENDING && (
               <Button variant="link" size="sm" className="mt-2 px-0 text-primary" onClick={() => onEdit(4)}>
                Start Verification
              </Button>
             )}
          </CardContent>
        </Card>

        {/* Advanced KYC */}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Phase 3: Advanced KYC</CardTitle>
             <StatusBadge status={data.advancedKycStatus || StatusEnum.PENDING} />
          </CardHeader>
          <CardContent>
             <div className="text-sm text-muted-foreground mt-2">
              Shop photos and verification. Unlocks higher limits.
            </div>
             {(!data.advancedKycStatus || data.advancedKycStatus === StatusEnum.PENDING) && (
               <Button variant="link" size="sm" className="mt-2 px-0 text-primary" onClick={() => onEdit(6)}>
                Complete Optional Steps
              </Button>
             )}
          </CardContent>
        </Card>
      </div>

       <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
         <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0"/>
         <div className="text-sm text-blue-800">
           <p className="font-medium">Information</p>
           <p>Documents are typically verified within 24-48 hours. You will be notified via email/SMS upon status change.</p>
         </div>
       </div>

    </div>
  );
}
