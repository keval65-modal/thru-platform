'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

type DocState = { filename?: string; uploadedAt?: string };

export function MerchantKycUpload() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState<string | null>(null);
  const [docs, setDocs] = React.useState<{
    panImage?: DocState;
    aadhaarImage?: DocState;
    shopAct?: DocState;
  }>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/merchant/kyc', { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.data) {
        setDocs({
          panImage: json.data.panImage,
          aadhaarImage: json.data.aadhaarImage,
          shopAct: json.data.shopAct,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const upload = async (docType: 'pan' | 'aadhaar' | 'shopAct', file: File) => {
    setUploading(docType);
    try {
      const form = new FormData();
      form.append('docType', docType);
      form.append('file', file);
      const res = await fetch('/api/merchant/kyc', { method: 'POST', body: form, credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Upload failed');
      }
      toast({ title: 'Uploaded', description: `${file.name} saved securely.` });
      await load();
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    } finally {
      setUploading(null);
    }
  };

  const DocBlock = ({
    title,
    description,
    docType,
    state,
  }: {
    title: string;
    description: string;
    docType: 'pan' | 'aadhaar' | 'shopAct';
    state?: DocState;
  }) => (
    <div className="space-y-2 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-base">{title}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {state?.filename ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : null}
      </div>
      {state?.filename ? (
        <p className="text-xs text-muted-foreground">
          Uploaded: {state.filename}
          {state.uploadedAt ? ` · ${new Date(state.uploadedAt).toLocaleString('en-IN')}` : ''}
        </p>
      ) : null}
      <Input
        type="file"
        accept="image/*,application/pdf"
        disabled={uploading === docType}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(docType, f);
          e.target.value = '';
        }}
      />
      {uploading === docType ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 pb-12">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to dashboard
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>KYC documents</CardTitle>
          <CardDescription>
            Upload PAN card, Shop Act, and government ID proof. Files are stored privately and visible to Thru admin
            only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DocBlock title="PAN card" description="Clear photo or PDF of PAN" docType="pan" state={docs.panImage} />
              <DocBlock
                title="Shop Act / business registration"
                description="Shop establishment or relevant business licence"
                docType="shopAct"
                state={docs.shopAct}
              />
              <DocBlock
                title="ID proof"
                description="Aadhaar, passport, or other government ID"
                docType="aadhaar"
                state={docs.aadhaarImage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
