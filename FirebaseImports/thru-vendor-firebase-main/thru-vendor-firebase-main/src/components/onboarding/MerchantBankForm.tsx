'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { isValidIfscFormat } from '@/lib/ifsc';
import { maskedAccountNumberInputProps, normalizeAccountNumber } from '@/lib/bank-account';
import { IfscLookupField } from '@/components/bank/IfscLookupField';

const schema = z
  .object({
    accountHolderName: z.string().min(2, 'Required'),
    accountNumber: z.string().min(6, 'Required'),
    confirmAccountNumber: z.string().min(6, 'Required'),
    ifscCode: z.string().min(5, 'Required'),
    bankName: z.string().min(2, 'Required'),
    branchName: z.string().optional(),
    upiId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const accountNumber = normalizeAccountNumber(data.accountNumber);
    const confirmAccountNumber = normalizeAccountNumber(data.confirmAccountNumber);
    if (!confirmAccountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmAccountNumber'],
        message: 'Please re-enter your account number in the confirm field.',
      });
    } else if (accountNumber !== confirmAccountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmAccountNumber'],
        message: 'Account numbers do not match.',
      });
    }
    if (!isValidIfscFormat(data.ifscCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ifscCode'],
        message: 'Invalid IFSC format (e.g. SBIN0001234).',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function MerchantBankForm() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountHolderName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
      upiId: '',
    },
  });

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/merchant/bank', { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) return;
        const row = json.bankAccount;
        const legacy = json.legacyBankDetails;
        if (row) {
          form.reset({
            accountHolderName: row.account_holder_name || '',
            accountNumber: row.account_number || '',
            confirmAccountNumber: row.account_number || '',
            ifscCode: row.ifsc_code || '',
            bankName: row.bank_name || '',
            branchName: '',
            upiId: row.upi_id || '',
          });
        } else if (legacy) {
          form.reset({
            accountHolderName: legacy.account_holder_name || '',
            accountNumber: legacy.account_number || '',
            confirmAccountNumber: legacy.account_number || '',
            ifscCode: legacy.ifsc_code || '',
            bankName: legacy.bank_name || '',
            branchName: legacy.branch_name || '',
            upiId: legacy.upi_id || '',
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [form]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const res = await fetch('/api/merchant/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Save failed');
      }
      toast({ title: 'Saved', description: 'Payout details updated.' });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 pb-12">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to dashboard
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Bank account & UPI</CardTitle>
          <CardDescription>
            Add the account and UPI ID where Thru will send your settlements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="accountHolderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account holder name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(normalizeAccountNumber(e.target.value))}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          data-lpignore="true"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Enter your account number as shown on your bank statement.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmAccountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm account number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(normalizeAccountNumber(e.target.value))}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          placeholder="Re-enter account number"
                          {...maskedAccountNumberInputProps}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Re-enter your account number to confirm it is correct.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ifscCode"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>IFSC code</FormLabel>
                        <FormControl>
                          <IfscLookupField
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            onResolved={(result) => {
                              form.setValue('bankName', result.bank, { shouldValidate: true });
                              if (result.branch) {
                                form.setValue('branchName', result.branch, { shouldValidate: true });
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="branchName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="upiId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UPI ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="name@bank" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save payout details
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
