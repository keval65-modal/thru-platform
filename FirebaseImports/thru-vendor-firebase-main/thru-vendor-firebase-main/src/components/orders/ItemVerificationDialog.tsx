import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package } from 'lucide-react';
import type { OrderItemDetail } from '@/lib/orderModels';

interface ItemVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: OrderItemDetail[];
  onConfirm: () => void;
  isLoading: boolean;
}

export function ItemVerificationDialog({ 
  open, 
  onOpenChange, 
  items, 
  onConfirm, 
  isLoading 
}: ItemVerificationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Verify Items
          </DialogTitle>
          <DialogDescription>
            Please verify you are handing over the following items to the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto space-y-2 py-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                {item.details && (
                  <p className="text-xs text-muted-foreground">{item.details}</p>
                )}
              </div>
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                {item.quantity}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white flex-1"
          >
            {isLoading ? (
              "Processing..."
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Handover
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
