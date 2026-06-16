'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { OrderCategory } from '@/types/order-flow';
import { MEDICINE_ENABLED } from '@/types/order-flow';

const CATEGORIES: {
  id: OrderCategory;
  emoji: string;
  title: string;
}[] = [
  { id: 'grocery', emoji: '🛒', title: 'Grocery' },
  { id: 'food', emoji: '🍔', title: 'Food' },
  ...(MEDICINE_ENABLED ? [{ id: 'medicine' as const, emoji: '💊', title: 'Medicine' }] : []),
];

type Props = {
  selected: OrderCategory[];
  activeCategory: OrderCategory | null;
  onToggle: (category: OrderCategory) => void;
  onSelectActive: (category: OrderCategory) => void;
};

export function FloatingCategoryTabs({
  selected,
  activeCategory,
  onToggle,
  onSelectActive,
}: Props) {
  return (
    <div
      className={cn(
        'sticky top-[3.25rem] z-30 -mx-4 px-4 py-2.5',
        'bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm'
      )}
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
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
                'shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                'border-2',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : isSelected
                    ? 'border-primary/50 bg-primary/5 text-foreground'
                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              <span aria-hidden>{cat.emoji}</span>
              {cat.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
