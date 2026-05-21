'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

export default function WhatsAppConsentPage() {
  const [loading, setLoading] = useState(true);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    fetch('/api/merchant/onboarding', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const item = data?.checklist?.find((c: { key: string }) => c.key === 'whatsappConsent');
        setConsented(Boolean(item?.completed));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-lg mx-auto p-4 pb-12 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to dashboard
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp consent</CardTitle>
          <CardDescription>Operational updates and settlement notifications from Thru.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : consented ? (
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <p>
                You agreed to receive onboarding updates, operational alerts, order notifications, and account-related
                communication from Thru on WhatsApp when you registered your shop.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              We could not find a consent record. If you registered recently, complete signup again or contact Thru
              support.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
