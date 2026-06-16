'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';

type PreciseLocationRequiredModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onOpenSettings: () => void | Promise<void>;
  isRetrying?: boolean;
};

export function PreciseLocationRequiredModal({
  open,
  onOpenChange,
  onRetry,
  onOpenSettings,
  isRetrying = false,
}: PreciseLocationRequiredModalProps) {
  const isNative = Capacitor.isNativePlatform();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">Precise location</DialogTitle>
          <DialogDescription className="text-base text-foreground">
            Please enable precise location for better pickup accuracy.
          </DialogDescription>
        </DialogHeader>
        {!isNative && (
          <p className="text-sm text-muted-foreground">
            In your browser, allow location for this site and avoid approximate-only / reduced accuracy
            modes if your device offers them.
          </p>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {isNative && (
            <Button type="button" className="w-full" onClick={() => void onOpenSettings()}>
              Open location settings
            </Button>
          )}
          <Button type="button" variant="secondary" className="w-full" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? 'Checking…' : 'I’ve enabled it — check again'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
