'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ORDER_FLOW_STEPS } from '@/types/order-flow';

export function OrderStepper({ className }: { className?: string }) {
  const pathname = usePathname();
  const activeIndex = ORDER_FLOW_STEPS.findIndex((s) => pathname.startsWith(s.path));

  return (
    <div className={cn('flex items-center justify-between gap-1 px-1', className)}>
      {ORDER_FLOW_STEPS.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        return (
          <div key={step.id} className="flex flex-1 flex-col items-center gap-1 min-w-0">
            <div
              className={cn(
                'h-1.5 w-full rounded-full transition-colors',
                isDone || isActive ? 'bg-primary' : 'bg-muted'
              )}
            />
            <span
              className={cn(
                'text-[10px] font-medium truncate w-full text-center',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
