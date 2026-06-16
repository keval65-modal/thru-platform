'use client';

import * as React from 'react';

import type {
  MedicineDosageSuggestion,
  MedicineQuantitySuggestion,
} from '@/lib/medicine-quantity-search';

export function useMedicineQuantitySuggestions(medicineName: string) {
  const [strengths, setStrengths] = React.useState<MedicineDosageSuggestion[]>([]);
  const [packSizes, setPackSizes] = React.useState<MedicineQuantitySuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const trimmed = medicineName.trim();
    if (trimmed.length < 2) {
      setStrengths([]);
      setPackSizes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/medicine/quantity-suggestions?name=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setStrengths(data.strengths ?? []);
          setPackSizes(data.packSizes ?? data.suggestions ?? []);
        } else {
          setStrengths([]);
          setPackSizes([]);
        }
      } catch {
        if (!cancelled) {
          setStrengths([]);
          setPackSizes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [medicineName]);

  return { strengths, packSizes, loading };
}
