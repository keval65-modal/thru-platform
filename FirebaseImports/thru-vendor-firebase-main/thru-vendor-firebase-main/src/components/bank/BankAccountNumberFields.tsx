'use client';

import * as React from 'react';
import { useWatch, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';
import {
  accountsMatch,
  maskedAccountNumberInputProps,
  normalizeAccountNumber,
} from '@/lib/bank-account';

type BankAccountNumberFieldsProps<T extends FieldValues> = {
  control: Control<T>;
  confirmInputRef?: React.RefObject<HTMLInputElement | null>;
  accountName?: FieldPath<T>;
  confirmName?: FieldPath<T>;
  confirmFullWidth?: boolean;
};

export function BankAccountNumberFields<T extends FieldValues>({
  control,
  confirmInputRef,
  accountName = 'accountNumber' as FieldPath<T>,
  confirmName = 'confirmAccountNumber' as FieldPath<T>,
  confirmFullWidth = true,
}: BankAccountNumberFieldsProps<T>) {
  const accountNumber = useWatch({ control, name: accountName });
  const confirmAccountNumber = useWatch({ control, name: confirmName });
  const matched = accountsMatch(String(accountNumber ?? ''), String(confirmAccountNumber ?? ''));

  return (
    <>
      <FormField
        control={control}
        name={accountName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Number</FormLabel>
            <FormControl>
              <Input
                name={field.name}
                ref={field.ref}
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(normalizeAccountNumber(e.target.value))}
                onInput={(e) => field.onChange(normalizeAccountNumber(e.currentTarget.value))}
                placeholder="e.g., 1234567890"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
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
        control={control}
        name={confirmName}
        render={({ field }) => (
          <FormItem className={confirmFullWidth ? 'md:col-span-2' : undefined}>
            <FormLabel>Confirm Account Number</FormLabel>
            <FormControl>
              <Input
                name={field.name}
                ref={(el) => {
                  field.ref(el);
                  if (confirmInputRef) {
                    (confirmInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                  }
                }}
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(normalizeAccountNumber(e.target.value))}
                onInput={(e) => field.onChange(normalizeAccountNumber(e.currentTarget.value))}
                placeholder="Re-enter account number"
                {...maskedAccountNumberInputProps}
              />
            </FormControl>
            {matched && (
              <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Account numbers match
              </p>
            )}
            <FormDescription className="text-xs">
              Re-enter your account number to confirm it is correct.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export function readConfirmAccountFromDom(
  ref: React.RefObject<HTMLInputElement | null>,
  fallback = ''
): string {
  const dom = normalizeAccountNumber(ref.current?.value ?? '');
  return dom || normalizeAccountNumber(fallback);
}
