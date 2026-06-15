'use client';

import * as React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cycleUnit, formatUnitLabel, getUnitDefaults } from '@/lib/grocery-unit-defaults';
import type { GroceryListItem } from '@/types/order-flow';
import { UnitPickerSheet } from '@/components/order/UnitPickerSheet';
import { cn } from '@/lib/utils';

type Props = {
  item: GroceryListItem;
  onChange: (patch: Partial<GroceryListItem>) => void;
  onRemove: () => void;
};

export function GroceryItemRow({ item, onChange, onRemove }: Props) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const allowed = React.useMemo(() => getUnitDefaults(item.name).allowedUnits, [item.name]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{item.name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {item.quantity}
            {item.showUnit !== false ? ` ${formatUnitLabel(item.unit)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => onChange({ quantity: Math.max(1, item.quantity - 1) })}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => onChange({ quantity: item.quantity + 1 })}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {item.showUnit !== false && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              onContextMenu={(e) => {
                e.preventDefault();
                onChange({ unit: cycleUnit(item.unit, allowed) });
              }}
              className={cn(
                'ml-1 rounded-full px-2.5 py-1 text-xs font-medium',
                'bg-muted/80 text-muted-foreground hover:bg-muted'
              )}
            >
              {formatUnitLabel(item.unit)}
            </button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <UnitPickerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        value={item.unit}
        allowedUnits={allowed}
        onSelect={(unit) => onChange({ unit })}
      />
    </>
  );
}
