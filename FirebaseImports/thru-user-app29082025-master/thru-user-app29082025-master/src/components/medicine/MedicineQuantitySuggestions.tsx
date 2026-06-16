'use client';

import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type {
  MedicineDosageSuggestion,
  MedicineQuantitySuggestion,
} from '@/lib/medicine-quantity-search';
import { useMedicineQuantitySuggestions } from '@/hooks/useMedicineQuantitySuggestions';
import { cn } from '@/lib/utils';

type Props = {
  medicineName: string;
  selectedStrength?: string;
  selectedPackLabel?: string;
  onSelectStrength?: (suggestion: MedicineDosageSuggestion) => void;
  onSelectPack: (suggestion: MedicineQuantitySuggestion) => void;
  className?: string;
};

function SuggestionChip({
  label,
  isSelected,
  isPopular,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  isPopular?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors',
        isSelected
          ? 'border-primary bg-primary/10 text-primary font-medium'
          : 'border-border bg-muted/40 hover:bg-muted'
      )}
    >
      {label}
      {isPopular && (
        <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
          common
        </Badge>
      )}
    </button>
  );
}

export function MedicineQuantitySuggestions({
  medicineName,
  selectedStrength,
  selectedPackLabel,
  onSelectStrength,
  onSelectPack,
  className,
}: Props) {
  const { strengths, packSizes, loading } = useMedicineQuantitySuggestions(medicineName);

  if (medicineName.trim().length < 2) return null;

  const showStrengths = strengths.length > 0 && onSelectStrength;

  return (
    <div className={cn('space-y-2', className)}>
      {loading && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Searching available options…
        </p>
      )}

      {!loading && showStrengths && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Dosage strength</p>
          <div className="flex flex-wrap gap-1.5">
            {strengths.map((suggestion) => (
              <SuggestionChip
                key={suggestion.value}
                label={suggestion.label}
                isSelected={selectedStrength === suggestion.label}
                isPopular={suggestion.isPopular}
                onClick={() => onSelectStrength(suggestion)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && packSizes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Pack size</p>
          <div className="flex flex-wrap gap-1.5">
            {packSizes.map((suggestion) => (
              <SuggestionChip
                key={`${suggestion.label}-${suggestion.quantity}`}
                label={suggestion.label}
                isSelected={selectedPackLabel === suggestion.label}
                isPopular={suggestion.isPopular}
                onClick={() => onSelectPack(suggestion)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && !showStrengths && packSizes.length === 0 && (
        <p className="text-xs text-muted-foreground">Enter a medicine name to see available options.</p>
      )}
    </div>
  );
}
