'use client';

import * as React from 'react';
import { ChevronDown, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cycleUnit, formatUnitLabel, getUnitDefaults } from '@/lib/grocery-unit-defaults';
import type { GroceryListItem } from '@/types/order-flow';
import { UnitPickerSheet } from '@/components/order/UnitPickerSheet';
import { cn } from '@/lib/utils';

type Props = {
  item: GroceryListItem;
  onChange: (patch: Partial<GroceryListItem>) => void;
  onRemove: () => void;
  /** Cart sheet: prominent remove + stacked controls */
  variant?: 'inline' | 'cart';
};

export function GroceryItemRow({ item, onChange, onRemove, variant = 'inline' }: Props) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const allowed = React.useMemo(() => getUnitDefaults(item.name).allowedUnits, [item.name]);

  const qtyControls = (
    <div className="flex items-center rounded-full border border-border/90 bg-muted/30 p-0.5 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
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
        className="h-8 w-8 rounded-full"
        onClick={() => onChange({ quantity: item.quantity + 1 })}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
      {item.showUnit !== false && (
        <>
          <span className="mx-0.5 h-5 w-px bg-border/90" aria-hidden />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            onContextMenu={(e) => {
              e.preventDefault();
              onChange({ unit: cycleUnit(item.unit, allowed) });
            }}
            aria-label={`Change unit, currently ${formatUnitLabel(item.unit)}`}
            aria-haspopup="dialog"
            className={cn(
              'inline-flex h-8 items-center gap-0.5 rounded-full pl-2.5 pr-1.5',
              'border border-primary/35 bg-primary/8 text-xs font-semibold text-foreground',
              'hover:border-primary/50 hover:bg-primary/12 active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35'
            )}
          >
            <span>{formatUnitLabel(item.unit)}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
          </button>
        </>
      )}
    </div>
  );

  const removeButton = (
    <Button
      type="button"
      variant={variant === 'cart' ? 'outline' : 'ghost'}
      size={variant === 'cart' ? 'sm' : 'icon'}
      className={cn(
        variant === 'cart'
          ? 'shrink-0 h-8 px-2.5 text-destructive border-destructive/30 hover:bg-destructive/10'
          : 'h-9 w-9 rounded-full text-muted-foreground hover:text-destructive'
      )}
      onClick={onRemove}
      aria-label="Remove item"
    >
      <Trash2 className={cn('h-4 w-4', variant === 'cart' && 'mr-1')} />
      {variant === 'cart' ? 'Remove' : null}
    </Button>
  );

  return (
    <>
      <div
        className={cn(
          variant === 'cart' && 'py-3 border-b border-border/40 last:border-0'
        )}
      >
        {variant === 'cart' ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {item.quantity}
                  {item.showUnit !== false ? ` ${formatUnitLabel(item.unit)}` : ''}
                </p>
              </div>
              {removeButton}
            </div>
            <div className="flex justify-start">{qtyControls}</div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{item.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {item.quantity}
                {item.showUnit !== false ? ` ${formatUnitLabel(item.unit)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {qtyControls}
              {removeButton}
            </div>
          </div>
        )}
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
