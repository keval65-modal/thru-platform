'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { isValidIfscFormat, type IfscLookupResult } from '@/lib/ifsc';

type IfscLookupFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onResolved?: (result: IfscLookupResult) => void;
  disabled?: boolean;
  id?: string;
};

export function IfscLookupField({
  value,
  onChange,
  onResolved,
  disabled,
  id = 'ifscCode',
}: IfscLookupFieldProps) {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'verified' | 'error'>('idle');
  const [message, setMessage] = React.useState('');
  const [verifiedIfsc, setVerifiedIfsc] = React.useState('');

  const verify = React.useCallback(async () => {
    const code = value.trim().toUpperCase();
    if (!code) {
      setStatus('error');
      setMessage('Enter an IFSC code to verify.');
      return;
    }
    if (!isValidIfscFormat(code)) {
      setStatus('error');
      setMessage('Invalid format. Example: SBIN0001234');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`/api/ifsc/${encodeURIComponent(code)}`);
      const json = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(json.error || 'IFSC not found.');
        setVerifiedIfsc('');
        return;
      }
      const result = json as IfscLookupResult;
      setStatus('verified');
      setVerifiedIfsc(result.ifsc);
      setMessage([result.bank, result.branch, result.city].filter(Boolean).join(' · '));
      onResolved?.(result);
    } catch {
      setStatus('error');
      setMessage('Could not verify IFSC. Check your connection and try again.');
      setVerifiedIfsc('');
    }
  }, [value, onResolved]);

  React.useEffect(() => {
    const code = value.trim().toUpperCase();
    if (verifiedIfsc && code !== verifiedIfsc) {
      setStatus('idle');
      setMessage('');
      setVerifiedIfsc('');
    }
  }, [value, verifiedIfsc]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="e.g., SBIN0001234"
          className="uppercase flex-1"
          maxLength={11}
          disabled={disabled}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          onClick={verify}
          disabled={disabled || status === 'loading'}
          className="shrink-0"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Verify'
          )}
        </Button>
      </div>
      {status === 'verified' && (
        <p className="text-xs text-green-700 dark:text-green-400 flex items-start gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Verified: {message}</span>
        </p>
      )}
      {status === 'error' && message && (
        <p className="text-xs text-destructive flex items-start gap-1">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{message}</span>
        </p>
      )}
      {status === 'idle' && (
        <p className="text-xs text-muted-foreground">
          Enter your 11-character IFSC and click Verify to auto-fill bank details.
        </p>
      )}
    </div>
  );
}
