'use client';

import { useCallback, useState, useEffect } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminGetMerchantLegalBundle, adminSearchMerchants, type AdminMerchantRow } from './actions';
import { Loader2, Download, FileText, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAgreementsPage() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<AdminMerchantRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<AdminMerchantRow | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof adminGetMerchantLegalBundle>> | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const runSearch = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await adminSearchMerchants(query);
      setRows(r);
      if (r.length === 1) {
        setSelected(r[0]);
      }
    } catch (e: any) {
      console.error(e);
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const r = await adminSearchMerchants('');
        if (!cancelled) {
          setRows(r);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDetail = useCallback(async (m: AdminMerchantRow) => {
    setSelected(m);
    setLoadingDetail(true);
    try {
      const d = await adminGetMerchantLegalBundle(m.id);
      setDetail(d);
    } catch (e) {
      console.error(e);
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Agreements & consent" description="Search merchants, review signed agreements, consent logs, and audit entries." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" /> Merchant search
          </CardTitle>
          <CardDescription>Filter the loaded directory by shop name, owner, or phone.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Search by shop, owner, or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          </div>
          <Button type="button" onClick={runSearch} disabled={loadingList}>
            {loadingList ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Search
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
            <CardDescription>{rows.length} merchant(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[360px] pr-3">
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => loadDetail(r)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted ${
                        selected?.id === r.id ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="font-medium">{r.name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{r.owner_name}</div>
                      <div className="text-xs text-muted-foreground">{r.phone}</div>
                    </button>
                  </li>
                ))}
                {!rows.length && !loadingList && (
                  <p className="text-sm text-muted-foreground">Run a search to load merchants.</p>
                )}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Agreement & consent
            </CardTitle>
            <CardDescription>
              {selected ? `${selected.name} (${selected.id.slice(0, 8)}…)` : 'Select a merchant'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDetail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {!loadingDetail && detail && (
              <ScrollArea className="h-[360px] pr-3 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Signed agreement</h4>
                  {detail.agreement ? (
                    <div className="text-sm space-y-1 rounded-md border p-3 bg-muted/40">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">v{detail.agreement.agreement_version}</Badge>
                        <Badge variant="outline">{detail.agreement.language}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Signed name:</span>{' '}
                        {detail.agreement.signed_name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Signed at:</span>{' '}
                        {detail.agreement.signed_at
                          ? format(new Date(detail.agreement.signed_at), 'PPpp')
                          : '—'}
                      </div>
                      <div className="break-all text-xs text-muted-foreground">
                        Hash: {detail.agreement.agreement_hash}
                      </div>
                      {detail.downloadUrl && (
                        <Button asChild size="sm" variant="outline" className="mt-2">
                          <a href={detail.downloadUrl} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No signed agreement on file.</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">KYC documents</h4>
                  {detail.kycDocuments?.length ? (
                    <ul className="text-sm space-y-2 mb-4">
                      {detail.kycDocuments.map((doc: { label: string; filename: string; url: string | null }) => (
                        <li key={doc.label} className="rounded border p-2 flex items-center justify-between gap-2">
                          <span>
                            {doc.label}: <span className="text-muted-foreground">{doc.filename}</span>
                          </span>
                          {doc.url ? (
                            <Button asChild size="sm" variant="outline">
                              <a href={doc.url} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">No KYC documents uploaded.</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">WhatsApp template sends</h4>
                  {detail.whatsappSends?.length ? (
                    <ul className="text-xs space-y-2 mb-4">
                      {detail.whatsappSends.map((w: {
                        id: string;
                        template_name: string;
                        status: string;
                        meta_message_id: string | null;
                        phone_number: string;
                        created_at: string;
                        api_response?: { error?: { message?: string; error_user_msg?: string } };
                      }) => (
                        <li key={w.id} className="rounded border p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{w.template_name}</span>
                            <Badge
                              variant={
                                w.status === 'sent'
                                  ? 'default'
                                  : w.status === 'failed'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {w.status}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground mt-1">
                            {w.created_at ? format(new Date(w.created_at), 'PPpp') : '—'} · …
                            {String(w.phone_number || '').slice(-4)}
                          </div>
                          {w.meta_message_id && (
                            <div className="text-muted-foreground break-all">Meta ID: {w.meta_message_id}</div>
                          )}
                          {w.status === 'failed' && w.api_response?.error?.message && (
                            <div className="text-destructive mt-1 break-all">
                              {w.api_response.error.error_user_msg || w.api_response.error.message}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">
                      No outbound WhatsApp rows — check Vercel env (META_*), templates, and WABA test numbers.
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">WhatsApp consent log</h4>
                  {detail.consents.length ? (
                    <ul className="text-xs space-y-2">
                      {detail.consents.map((c: any) => (
                        <li key={c.id} className="rounded border p-2">
                          <div>WhatsApp: {c.whatsapp_consent ? 'yes' : 'no'}</div>
                          <div className="text-muted-foreground">
                            {c.consented_at ? format(new Date(c.consented_at), 'PPpp') : '—'}
                          </div>
                          <div className="text-muted-foreground break-all">IP: {c.ip_address || '—'}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No consent rows.</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Signing audit</h4>
                  {detail.audits.length ? (
                    <ul className="text-xs space-y-2">
                      {detail.audits.map((a: any) => (
                        <li key={a.id} className="rounded border p-2">
                          <div className="font-medium">{a.action}</div>
                          <div className="text-muted-foreground">
                            {a.created_at ? format(new Date(a.created_at), 'PPpp') : '—'}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No audit entries.</p>
                  )}
                </div>
              </ScrollArea>
            )}
            {!loadingDetail && !detail && selected && (
              <p className="text-sm text-muted-foreground">Unable to load details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
