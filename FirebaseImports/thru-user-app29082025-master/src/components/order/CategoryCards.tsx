'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { OrderCategory } from '@/types/order-flow';
import { MEDICINE_ENABLED } from '@/types/order-flow';

const CATEGORIES: {
  id: OrderCategory;
  emoji: string;
  title: string;
  subtitle: string;
}[] = [
  { id: 'grocery', emoji: '🛒', title: 'Grocery', subtitle: 'Items for your list' },
  { id: 'food', emoji: '🍔', title: 'Food', subtitle: 'Discover on your route' },
  ...(MEDICINE_ENABLED
    ? [{ id: 'medicine' as const, emoji: '💊', title: 'Medicine', subtitle: 'Pharmacy pickup' }]
    : []),
];

type Props = {
  selected: OrderCategory[];
  onToggle: (category: OrderCategory) => void;
  activeCategory: OrderCategory | null;
  onSelectActive: (category: OrderCategory) => void;
};

export function CategoryCards({ selected, onToggle, activeCategory, onSelectActive }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {CATEGORIES.map((cat) => {
        const isSelected = selected.includes(cat.id);
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              if (!isSelected) onToggle(cat.id);
              onSelectActive(cat.id);
            }}
            className={cn(
              'rounded-2xl p-4 text-left transition-all',
              'border-2',
              isActive
                ? 'border-primary bg-primary/5 shadow-sm'
                : isSelected
                ? 'border-primary/40 bg-background'
                : 'border-transparent bg-muted/40 hover:bg-muted/60'
            )}
          >
            <span className="text-2xl">{cat.emoji}</span>
            <p className="font-semibold mt-2">{cat.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{cat.subtitle}</p>
          </button>
        );
      })}
    </div>
  );
}
