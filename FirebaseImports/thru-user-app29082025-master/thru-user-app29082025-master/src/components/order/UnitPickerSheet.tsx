'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { GROCERY_UNITS } from '@/lib/grocery-unit-defaults';
import type { GroceryUnit } from '@/types/order-flow';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: GroceryUnit;
  allowedUnits?: GroceryUnit[];
  onSelect: (unit: GroceryUnit) => void;
};

export function UnitPickerSheet({ open, onOpenChange, value, allowedUnits, onSelect }: Props) {
  const units = allowedUnits?.length
    ? GROCERY_UNITS.filter((u) => allowedUnits.includes(u.value))
    : GROCERY_UNITS;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle className="text-center">Choose unit</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {units.map((unit) => (
            <button
              key={unit.value}
              type="button"
              onClick={() => {
                onSelect(unit.value);
                onOpenChange(false);
              }}
              className={cn(
                'rounded-xl py-3 text-sm font-medium transition-colors',
                value === unit.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 hover:bg-muted'
              )}
            >
              {unit.label}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
