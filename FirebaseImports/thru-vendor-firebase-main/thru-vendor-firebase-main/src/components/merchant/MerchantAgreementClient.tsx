'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildAgreementForLanguage, resolveAgreementLanguage } from '@/agreements';
import type { AgreementTemplateVars } from '@/agreements/types';

type Props = {
  ownerName: string;
  shopName: string;
  phone: string;
  address: string;
  preferredLanguage: string | null;
};

export function MerchantAgreementClient({
  ownerName,
  shopName,
  phone,
  address,
  preferredLanguage,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const lang = resolveAgreementLanguage(preferredLanguage || 'en');
  const dateFormatted = React.useMemo(
    () => new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' }).format(new Date()),
    []
  );
  const vars: AgreementTemplateVars = React.useMemo(
    () => ({
      ownerName,
      shopName,
      phone,
      address,
      dateFormatted,
    }),
    [ownerName, shopName, phone, address, dateFormatted]
  );
  const doc = React.useMemo(() => buildAgreementForLanguage(lang, vars), [lang, vars]);

  const [confirmedRead, setConfirmedRead] = React.useState(false);
  const [signedName, setSignedName] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  const handleCancelRegistration = async () => {
    if (
      !window.confirm(
        'Cancel registration? Your shop account will be removed and you can sign up again with the same phone number.'
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch('/api/merchant/registration/abandon', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Could not cancel',
          description: data.error || 'Please try again or contact support.',
        });
        setCancelling(false);
        return;
      }
      toast({
        title: 'Registration cancelled',
        description: 'You can sign up again when ready.',
      });
      router.push(typeof data.redirect === 'string' ? data.redirect : '/signup');
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e instanceof Error ? e.message : 'Network error',
      });
      setCancelling(false);
    }
  };

  const handleContinue = async () => {
    if (!confirmedRead) {
      toast({
        variant: 'destructive',
        title: 'Confirmation required',
        description: 'Please confirm that you have read and agree to the Merchant Partner Agreement.',
      });
      return;
    }
    if (!signedName.trim()) {
      toast({ variant: 'destructive', title: 'Signature required', description: 'Type your full legal name.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant/agreement/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmedRead: true, signedName: signedName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Could not complete signing',
          description: data.error || 'Please try again.',
        });
        setSubmitting(false);
        return;
      }
      toast({ title: 'Onboarding complete', description: 'Your signed agreement has been saved.' });
      router.push(typeof data.redirect === 'string' ? data.redirect : '/orders');
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e?.message || 'Network error',
      });
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-muted p-4 sm:p-6 md:p-8 pb-24">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center sm:text-left">
          <div className="mx-auto sm:mx-0 mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">Merchant agreement</CardTitle>
          <CardDescription>
            One more step to finish signup. Review the agreement below, then sign digitally to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-background p-4 sm:p-5 max-h-[55vh] sm:max-h-[50vh] overflow-y-auto text-sm leading-relaxed">
            <h2 className="text-lg font-semibold mb-3">{doc.title}</h2>
            {doc.sections.map((s) => (
              <section key={s.heading} className="mb-4">
                <h3 className="font-medium text-foreground mb-1">{s.heading}</h3>
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="text-muted-foreground mb-2 last:mb-0">
                    {p}
                  </p>
                ))}
              </section>
            ))}
            <p className="text-xs text-muted-foreground border-t pt-3 mt-2">{doc.whatsappConsentStatement}</p>
          </div>

          <div className="space-y-4 rounded-md border p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              <Checkbox
                id="confirm-read"
                checked={confirmedRead}
                onCheckedChange={(v) => setConfirmedRead(v === true)}
                className="mt-1"
              />
              <Label htmlFor="confirm-read" className="text-sm font-normal leading-snug cursor-pointer">
                I confirm that I have read and agree to the Merchant Partner Agreement.
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signed-name">Type your full legal name</Label>
              <Input
                id="signed-name"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder={ownerName}
                autoComplete="name"
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Registered owner name: <span className="font-medium text-foreground">{ownerName}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={submitting || cancelling}
                onClick={handleContinue}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={submitting || cancelling}
                onClick={handleCancelRegistration}
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Cancel registration
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Need help? Contact Thru support. You can also download a copy of your signed PDF from{' '}
            <span className="font-medium">Legal documents</span> on your dashboard after signing.
          </p>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Leaving without signing? Use <span className="font-medium">Cancel registration</span> so you can sign up
        again with the same phone number.
      </p>
    </main>
  );
}
