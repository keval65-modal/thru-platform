'use client';

import * as React from 'react';
import { Info, Route } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const MAX_DETOUR_MIN_KM = 0.5;
export const MAX_DETOUR_MAX_KM = 20;
export const MAX_DETOUR_STEP_KM = 0.5;

function formatDetourKm(km: number): string {
  return Number.isInteger(km) ? String(km) : km.toFixed(1);
}

function detourHint(km: number): string {
  if (km <= 2) return 'Stays very close to your route';
  if (km <= 5) return 'A few convenient stops along the way';
  if (km <= 10) return 'More shops and restaurants to pick from';
  return 'Widest search — maximum options';
}

type Props = {
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

export function MaxDetourSlider({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-gradient-to-b from-muted/30 to-muted/10 p-3.5 space-y-3',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Route className="h-4 w-4 text-primary shrink-0" aria-hidden />
            <Label className="text-sm font-semibold text-foreground">How far off-route?</Label>
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Learn more about max detour"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                  We only suggest stops within this distance from your driving route. Think of it as
                  a corridor around your path — tighter means fewer stops but a quicker trip; wider
                  means more grocery, food, and pharmacy options along the way.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Maximum distance you&apos;re willing to divert from your direct route to pick up groceries,
            food, or other stops.
          </p>
        </div>
        <div
          className="shrink-0 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1.5 text-center min-w-[3.25rem]"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="text-xl font-bold tabular-nums text-primary leading-none">
            {formatDetourKm(value)}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mt-0.5">
            km
          </span>
        </div>
      </div>

      <Slider
        value={[value]}
        min={MAX_DETOUR_MIN_KM}
        max={MAX_DETOUR_MAX_KM}
        step={MAX_DETOUR_STEP_KM}
        onValueChange={(vals) => onChange(vals[0] ?? value)}
        className={cn(
          'py-3 touch-pan-y',
          '[&>span:first-child]:h-2.5',
          '[&_[role=slider]]:h-7 [&_[role=slider]]:w-7',
          '[&_[role=slider]]:shadow-md [&_[role=slider]]:border-primary',
          '[&_[role=slider]]:transition-transform [&_[role=slider]]:active:scale-110'
        )}
        aria-label="Maximum detour distance in kilometers"
      />

      <div className="space-y-1">
        <p className="text-xs text-center text-muted-foreground font-medium">{detourHint(value)}</p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wide">
          <span>{MAX_DETOUR_MIN_KM} km · strict</span>
          <span>{MAX_DETOUR_MAX_KM} km · flexible</span>
        </div>
      </div>
    </div>
  );
}
