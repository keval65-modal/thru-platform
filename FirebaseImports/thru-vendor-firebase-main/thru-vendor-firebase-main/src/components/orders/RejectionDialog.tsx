import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { XCircle, Loader2 } from 'lucide-react';

interface RejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}

const REJECTION_REASONS = [
  "Out of stock",
  "Store closing soon",
  "Unable to fulfill order",
  "Item unavailable",
  "Other"
];

export function RejectionDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  isLoading 
}: RejectionDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  const handleConfirm = () => {
    const reason = selectedReason === "Other" ? customReason : selectedReason;
    if (reason.trim()) {
      onConfirm(reason);
      // Reset state
      setSelectedReason("");
      setCustomReason("");
    }
  };

  const isValid = selectedReason && (selectedReason !== "Other" || customReason.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Reject Order
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this order. This will be shared with the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {REJECTION_REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason} id={reason} />
                  <Label htmlFor={reason} className="font-normal cursor-pointer">
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Please specify</Label>
              <Textarea
                id="custom-reason"
                placeholder="Enter reason for rejection..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!isValid || isLoading}
            variant="destructive"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Confirm Rejection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
