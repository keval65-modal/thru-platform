'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle,
  XCircle,
  User,
  Tag,
  ShoppingBag,
  Loader2,
  Pill,
  FileImage,
} from 'lucide-react';
import type { VendorDisplayOrder, OrderItemDetail } from '@/lib/orderModels';
import { submitMedicineVendorReview, updateVendorOrderStatus } from '@/app/(app)/orders/actions';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { RejectionDialog } from './RejectionDialog';

interface MedicineOrderCardProps {
  order: VendorDisplayOrder;
}

export function MedicineOrderCard({ order }: MedicineOrderCardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const { vendorPortion, customerInfo, orderId } = order;
  const prescription = vendorPortion.prescription;

  const [lineItems, setLineItems] = useState<OrderItemDetail[]>(() =>
    vendorPortion.items.map((item) => ({
      ...item,
      available: item.available !== false,
      pricePerItem: item.pricePerItem ?? 0,
      totalPrice: item.totalPrice ?? 0,
    }))
  );

  const updateLine = (itemId: string, patch: Partial<OrderItemDetail>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;
        const next = { ...item, ...patch };
        if (patch.pricePerItem !== undefined || patch.quantity !== undefined) {
          next.totalPrice = (next.pricePerItem ?? 0) * next.quantity;
        }
        return next;
      })
    );
  };

  const quotedSubtotal = lineItems
    .filter((i) => i.available !== false)
    .reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);

  const handleAcceptWithQuote = async () => {
    const available = lineItems.filter((i) => i.available !== false);
    if (available.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No medicines available',
        description: 'Mark at least one item available or reject the order.',
      });
      return;
    }
    const missingPrice = available.some((i) => !i.pricePerItem || i.pricePerItem <= 0);
    if (missingPrice) {
      toast({
        variant: 'destructive',
        title: 'Set prices',
        description: 'Enter a price for each available medicine before accepting.',
      });
      return;
    }

    setIsLoading(true);
    const normalized = lineItems.map((i) => ({
      ...i,
      name: i.available === false && i.alternativeName ? i.alternativeName : i.name,
      totalPrice: i.available === false ? 0 : (i.pricePerItem ?? 0) * i.quantity,
    }));
    const result = await submitMedicineVendorReview(orderId, normalized, quotedSubtotal);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Quote sent to customer',
        description: `Order ${orderId} — total ₹${quotedSubtotal.toFixed(2)}`,
      });
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
  };

  const handleReject = async (reason: string) => {
    setIsLoading(true);
    console.log('Rejection reason:', reason);
    const result = await updateVendorOrderStatus(orderId, 'Cancelled');
    setIsLoading(false);
    setIsRejectionDialogOpen(false);
    if (result.success) {
      toast({ title: 'Order rejected', description: orderId });
    }
  };

  const orderTime = order.createdAt
    ? format(
        order.createdAt instanceof Timestamp ? order.createdAt.toDate() : parseISO(order.createdAt as string),
        'p, dd MMM yyyy'
      )
    : 'N/A';

  const isPending = vendorPortion.status === 'Pending Vendor Confirmation' || vendorPortion.status === 'New';

  return (
    <Card className="w-full shadow-lg rounded-lg overflow-hidden border-red-200/50">
      <CardHeader className="p-4 bg-red-50/50 border-b">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Pill className="h-4 w-4 text-red-600" />
            Medicine · {orderId}
          </CardTitle>
          <Badge variant="outline">Rx order</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">
          <User className="mr-1 h-3 w-3" />
          {customerInfo?.name || 'Customer'} · {orderTime}
        </p>
        {prescription?.prescriptionDate && (
          <p className="text-xs text-muted-foreground">
            Prescription date: {prescription.prescriptionDate}
            {prescription.dateValid ? ' (valid)' : ' (check validity)'}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {prescription?.imageDataUri && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
              <FileImage className="h-4 w-4" /> Prescription
            </h4>
            <img
              src={prescription.imageDataUri}
              alt="Prescription"
              className="max-h-48 rounded border object-contain w-full bg-muted"
            />
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <ShoppingBag className="h-4 w-4" /> Requested medicines
          </h4>
          <div className="space-y-3">
            {lineItems.map((item) => (
              <div key={item.itemId} className="border rounded-md p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`avail-${orderId}-${item.itemId}`}
                    checked={item.available !== false}
                    onCheckedChange={(c) => updateLine(item.itemId, { available: c === true })}
                  />
                  <Label htmlFor={`avail-${orderId}-${item.itemId}`} className="font-medium flex-1">
                    {item.quantity}× {item.name}
                  </Label>
                </div>
                {item.details && <p className="text-xs text-muted-foreground pl-6">{item.details}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                  <div>
                    <Label className="text-xs">Alternative (if substituting)</Label>
                    <Input
                      placeholder="e.g. brand substitute"
                      value={item.alternativeName ?? ''}
                      onChange={(e) => updateLine(item.itemId, { alternativeName: e.target.value })}
                      disabled={item.available === false}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Price (₹) per unit</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.pricePerItem || ''}
                      onChange={(e) =>
                        updateLine(item.itemId, {
                          pricePerItem: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={item.available === false}
                    />
                  </div>
                </div>
                {item.available === false && (
                  <p className="text-xs text-destructive pl-6">Marked not available</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {isPending && (
          <div className="flex justify-between items-center border-t pt-3">
            <span className="font-semibold">Quote total</span>
            <span className="text-lg font-bold">₹{quotedSubtotal.toFixed(2)}</span>
          </div>
        )}

        {!isPending && (
          <div className="flex justify-between items-center">
            <span className="font-semibold">Subtotal</span>
            <span className="font-bold">₹{vendorPortion.vendorSubtotal.toFixed(2)}</span>
          </div>
        )}
      </CardContent>

      {isPending ? (
        <CardFooter className="p-3 bg-muted/50 border-t grid grid-cols-2 gap-2">
          <Button variant="destructive" onClick={() => setIsRejectionDialogOpen(true)} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
            Reject
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => void handleAcceptWithQuote()}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Accept &amp; send quote
          </Button>
          <RejectionDialog
            open={isRejectionDialogOpen}
            onOpenChange={setIsRejectionDialogOpen}
            onConfirm={handleReject}
            isLoading={isLoading}
          />
        </CardFooter>
      ) : (
        <CardFooter className="p-3 border-t">
          <Button asChild variant="outline" className="w-full">
            <Link href={`/orders/${orderId}`}>
              <Tag className="mr-2 h-4 w-4" /> View order {orderId}
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
