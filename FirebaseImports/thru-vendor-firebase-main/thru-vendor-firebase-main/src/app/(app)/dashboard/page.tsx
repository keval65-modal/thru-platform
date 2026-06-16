
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, ShieldAlert, BadgeCheck, FileText, Download, Utensils } from "lucide-react";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { getKycData } from "@/lib/kyc-service";
import { KycStatus } from "@/types/kyc";
import type { OnboardingSummary } from '@/lib/onboarding-service';
import { ProfileCompletionCard } from '@/components/onboarding/ProfileCompletionCard';
import type { AuthenticatedSession, SessionData } from '@/types/session';
import { isMenuUploadEnabled } from '@/lib/vendor-features';

function isAuthenticatedSession(session: SessionData | null | undefined): session is AuthenticatedSession {
  return Boolean(session && session.isAuthenticated);
}

export default function DashboardPage() {
  const { session, isLoading } = useSession();
  const [kycStatus, setKycStatus] = useState<{ basic: KycStatus, business: KycStatus } | null>(null);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [onboarding, setOnboarding] = useState<OnboardingSummary | null>(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [legal, setLegal] = useState<{
    agreement: Record<string, unknown> | null;
    downloadUrl: string | null;
  } | null>(null);
  const [loadingLegal, setLoadingLegal] = useState(true);

  useEffect(() => {
    if (isAuthenticatedSession(session)) {
      getKycData(session.uid)
        .then((data) => {
            if (data) {
                // Determine overall statuses - keeping it simple
                // Real logic would be more complex or provided by backend
                setKycStatus({
                    basic: (data.panImage?.status === KycStatus.APPROVED && data.aadhaarImage?.status === KycStatus.APPROVED) ? KycStatus.APPROVED : (data.panImage ? KycStatus.SUBMITTED : KycStatus.PENDING),
                    business: data.businessKycStatus || KycStatus.PENDING
                });
            } else {
                setKycStatus({ basic: KycStatus.PENDING, business: KycStatus.PENDING });
            }
        })
        .finally(() => setLoadingKyc(false));
    } else if (!isLoading) {
        setLoadingKyc(false);
    }
  }, [session, isLoading]);

  useEffect(() => {
    if (isAuthenticatedSession(session)) {
      fetch('/api/merchant/onboarding', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setOnboarding(data))
        .catch((e) => console.error('[dashboard] onboarding summary error', e))
        .finally(() => setLoadingOnboarding(false));
    } else if (!isLoading) {
      setLoadingOnboarding(false);
    }
  }, [session, isLoading]);

  useEffect(() => {
    if (isAuthenticatedSession(session)) {
      fetch('/api/merchant/legal', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setLegal({
              agreement: data.agreement ?? null,
              downloadUrl: data.downloadUrl ?? null,
            });
          } else {
            setLegal(null);
          }
        })
        .catch(() => setLegal(null))
        .finally(() => setLoadingLegal(false));
    } else if (!isLoading) {
      setLoadingLegal(false);
    }
  }, [session, isLoading]);

  if (isLoading || loadingKyc || loadingOnboarding || loadingLegal) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!session?.isAuthenticated) {
    // This state should ideally not be reached due to the layout's redirect logic
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>
            Could not load session. Please try logging in again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isKycComplete = kycStatus?.basic === KycStatus.APPROVED && kycStatus?.business === KycStatus.APPROVED;
  const hasBlockingOnboarding = onboarding?.hasBlockingIssues;

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-6 flex justify-between items-center flex-wrap gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {session.ownerName}!</h1>
           <p className="text-muted-foreground mt-2">Here's a quick overview of your shop, <span className="font-semibold">{session.shopName}</span>.</p>
        </div>
        {(!isKycComplete || hasBlockingOnboarding) && (
            <Button asChild variant="default" className="bg-amber-600 hover:bg-amber-700 text-white">
                <Link href="/dashboard">
                    <ShieldAlert className="w-4 h-4 mr-2" /> Complete onboarding
                </Link>
            </Button>
        )}
      </div>

      {onboarding && onboarding.hasBlockingIssues && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5"/> Action Required: Complete onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-4">
              Your profile is incomplete. Finish the highlighted steps to unlock payouts and avoid missed orders.
            </p>
            <Button asChild size="sm" variant="outline" className="border-red-600 text-red-700 hover:bg-red-100">
              <Link href="/onboarding">View onboarding checklist <ArrowRight className="w-4 h-4 ml-1"/></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isKycComplete && (
        <Card className="border-amber-200 bg-amber-50">
           <CardHeader className="pb-2">
               <CardTitle className="text-amber-800 flex items-center gap-2">
                   <ShieldAlert className="w-5 h-5"/> Action Required: Identity Verification
               </CardTitle>
           </CardHeader>
           <CardContent>
               <p className="text-sm text-amber-700 mb-4">
                   Your account verification is pending. You must complete the KYC process to unlock all features and receive payouts.
               </p>
               <Button asChild size="sm" variant="outline" className="border-amber-600 text-amber-700 hover:bg-amber-100">
                   <Link href="/kyc">Continue KYC Process <ArrowRight className="w-4 h-4 ml-1"/></Link>
               </Button>
           </CardContent>
        </Card>
      )}
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Legal documents
            </CardTitle>
            <CardDescription>Signed merchant partner agreement and related records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {legal?.agreement ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Version <span className="font-medium text-foreground">{String(legal.agreement.agreement_version)}</span>
                  {' · '}
                  Language <span className="font-medium text-foreground">{String(legal.agreement.language)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Signed at{' '}
                  <span className="font-medium text-foreground">
                    {legal.agreement.signed_at
                      ? new Date(String(legal.agreement.signed_at)).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </span>
                </p>
                {legal.downloadUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={legal.downloadUrl} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download signed PDF
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Download link unavailable. Try again shortly.</p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Complete your merchant partner agreement to generate your signed PDF.
                </p>
                <Button asChild size="sm">
                  <Link href="/merchant/agreement">Review &amp; sign agreement</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {onboarding && (
          <div className="md:col-span-2">
            <ProfileCompletionCard summary={onboarding} />
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Manage Orders</CardTitle>
            <CardDescription>View new, preparing, and ready-for-pickup orders.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground mb-4">
              Keep track of incoming customer orders and update their status as you process them.
            </p>
            <Button asChild>
              <Link href="/orders">View Orders <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        {isMenuUploadEnabled(session.storeCategory) && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Menu</CardTitle>
              <CardDescription>Add menu items manually or upload a PDF to import your menu.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Keep your menu up to date so customers can browse and order from your store.
              </p>
              <Button asChild>
                <Link href="/menu">Go to Menu <Utensils className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div>
        <SalesChart vendorId={session.uid} />
      </div>

    </div>
  );
}
