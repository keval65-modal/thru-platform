'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Download, FileText } from 'lucide-react';

export function MerchantAgreementView() {
  const [loading, setLoading] = React.useState(true);
  const [agreement, setAgreement] = React.useState<Record<string, unknown> | null>(null);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/merchant/legal', { credentials: 'include' });
        const json = await res.json();
        if (res.ok) {
          setAgreement(json.agreement ?? null);
          setDownloadUrl(json.downloadUrl ?? null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 pb-12">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to dashboard
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Signed merchant agreement
          </CardTitle>
          <CardDescription>Your electronically signed Thru Merchant Partner Agreement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : agreement ? (
            <>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Version:</span>{' '}
                  <span className="font-medium">{String(agreement.agreement_version)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Language:</span>{' '}
                  <span className="font-medium">{String(agreement.language)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Signed as:</span>{' '}
                  <span className="font-medium">{String(agreement.signed_name)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Signed at:</span>{' '}
                  <span className="font-medium">
                    {agreement.signed_at
                      ? new Date(String(agreement.signed_at)).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </span>
                </p>
              </div>
              {downloadUrl ? (
                <Button asChild>
                  <a href={downloadUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-2" /> Download signed PDF
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">PDF link unavailable. Try again from the dashboard.</p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">You have not signed the merchant agreement yet.</p>
              <Button asChild>
                <Link href="/merchant/agreement">Review and sign agreement</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
