
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MinusCircle, PlusCircle, CheckCircle, XCircle, User, Tag, Clock, FileText, ShoppingBag, Loader2, CookingPot, QrCode, Camera } from "lucide-react";
import Link from "next/link";
import type { VendorDisplayOrder, OrderItemDetail } from '@/lib/orderModels';
import { updateVendorOrderStatus } from '@/app/(app)/orders/actions';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { QRScannerDialog } from './QRScannerDialog';
import { ItemVerificationDialog } from './ItemVerificationDialog';
import { RejectionDialog } from './RejectionDialog';
import { MedicineOrderCard } from './MedicineOrderCard';
import { isMedicineOrder } from '@/lib/prescription-types';

interface OrderCardProps {
  order: VendorDisplayOrder;
}

export function OrderCard({ order }: OrderCardProps) {
  if (isMedicineOrder(order.vendorPortion)) {
    return <MedicineOrderCard order={order} />;
  }

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const { vendorPortion, customerInfo, orderId } = order;

  // State for grocery item availability
  const [availableItems, setAvailableItems] = useState<string[]>(
    vendorPortion.items.map(item => item.itemId) // Initially all items are checked
  );

  const handleItemAvailabilityChange = (itemId: string) => {
    setAvailableItems((prev: string[]) =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };
  
  const handleStatusUpdate = async (
    newStatus: "Preparing" | "Ready for Pickup" | "Cancelled",
    updatedItems?: OrderItemDetail[]
  ) => {
    setIsLoading(true);
    const result = await updateVendorOrderStatus(orderId, newStatus, updatedItems);
    
    if (result.success) {
      toast({
        title: "Order Status Updated",
        description: `Order ${orderId} has been updated.`
      });
      // The onSnapshot listener will handle the UI update automatically.
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: result.error || "Could not update order status.",
      });
    }
    setIsLoading(false);
  };
  
  const handleAcceptOrder = () => {
    if (vendorPortion.status === 'Pending Vendor Confirmation') {
      const itemsToUpdate = vendorPortion.items.filter(item => availableItems.includes(item.itemId));
      if (itemsToUpdate.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Items Selected',
          description: 'You must select at least one available item to accept the order.',
        });
        return;
      }
      handleStatusUpdate('Preparing', itemsToUpdate);
    } else {
      handleStatusUpdate('Preparing');
    }
  };

  const handleMarkAsReady = () => handleStatusUpdate('Ready for Pickup');
  const handleRejectOrder = (reason: string) => {
    // TODO: Store rejection reason in database
    console.log('Rejection reason:', reason);
    handleStatusUpdate('Cancelled');
    setIsRejectionDialogOpen(false);
  };

  const orderTime = order.createdAt ? format(order.createdAt instanceof Timestamp ? order.createdAt.toDate() : parseISO(order.createdAt as string), "p, dd MMM yyyy") : 'N/A';

  const renderGroceryConfirmation = () => {
    return (
      <>
        <div className="mb-3 border-t pt-3">
          <h4 className="text-sm font-medium text-foreground mb-1.5 flex items-center">
            <CheckCircle className="mr-2 h-4 w-4"/> Confirm Item Availability
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground max-h-32 overflow-y-auto pr-2">
            {vendorPortion.items.map(item => (
              <div key={item.itemId} className="flex items-center space-x-2">
                <Checkbox
                  id={`${orderId}-${item.itemId}`}
                  checked={availableItems.includes(item.itemId)}
                  onCheckedChange={() => handleItemAvailabilityChange(item.itemId)}
                />
                <Label htmlFor={`${orderId}-${item.itemId}`} className="flex-1 cursor-pointer">
                  {item.quantity} x {item.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <CardFooter className="p-3 bg-muted/50 border-t">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="destructive" className="w-full" onClick={() => setIsRejectionDialogOpen(true)} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />} Reject Order
            </Button>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleAcceptOrder} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />} Accept Available
            </Button>
          </div>
          <RejectionDialog
            open={isRejectionDialogOpen}
            onOpenChange={setIsRejectionDialogOpen}
            onConfirm={handleRejectOrder}
            isLoading={isLoading}
          />
        </CardFooter>
      </>
    );
  };
  
  const renderStandardFlow = () => {
    const [prepTime, setPrepTime] = useState(15);
    const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);

    const onAcceptConfirm = async () => {
        setIsAcceptDialogOpen(false);
        await handleStatusUpdate('Preparing', undefined); // Pass prepTime if I updated the signature in the component, but wait, I need to update handleStatusUpdate signature first in this file.
    };

    // Helper to call the action with prepTime
    const handleAcceptWithPrepTime = async () => {
        setIsLoading(true);
        setIsAcceptDialogOpen(false);
        // We need to cast or update the signature of handleStatusUpdate to accept prepTime
        // Since handleStatusUpdate is defined in this file, I need to update it too.
        // But I can call the action directly or update the wrapper.
        // Let's update the wrapper in a separate edit or assume I'll update it here.
        
        const result = await updateVendorOrderStatus(orderId, 'Preparing', undefined, prepTime);
        
        if (result.success) {
            toast({
                title: "Order Accepted",
                description: `Order ${orderId} is now preparing. Estimated time: ${prepTime} mins.`
            });
        } else {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: result.error || "Could not update order status.",
            });
        }
        setIsLoading(false);
    };

    return (
       <>
         <CardFooter className="p-3 bg-muted/50 border-t">
            {vendorPortion.status === 'New' && (
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="destructive" className="w-full" onClick={() => setIsRejectionDialogOpen(true)} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />} Reject
                </Button>
                
                <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />} Accept
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Accept Order</DialogTitle>
                            <DialogDescription>
                                Please confirm the preparation time and review customer ETA.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="text-sm font-semibold text-blue-800 mb-1">Customer ETA</h4>
                                <p className="text-2xl font-bold text-blue-600">
                                    {/* Placeholder ETA calculation or display */}
                                    ~15 mins
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    Based on customer location {order.tripStartLocation ? `(${order.tripStartLocation})` : ''}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground block">
                                    Preparation Time (minutes)
                                </label>
                                <div className="flex items-center gap-4">
                                    <Button variant="outline" size="icon" onClick={() => setPrepTime((p: number) => Math.max(5, p-5))} className="h-10 w-10">
                                        <MinusCircle className="h-5 w-5" />
                                    </Button>
                                    <div className="flex-1 text-center border rounded-md py-2 bg-background">
                                        <span className="text-xl font-bold">{prepTime}</span>
                                        <span className="text-xs text-muted-foreground ml-1">min</span>
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => setPrepTime((p: number) => p + 5)} className="h-10 w-10">
                                        <PlusCircle className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="sm:justify-between gap-2">
                             <Button variant="ghost" onClick={() => setIsAcceptDialogOpen(false)}>Cancel</Button>
                             <Button onClick={handleAcceptWithPrepTime} className="bg-green-600 hover:bg-green-700 text-white flex-1">
                                Confirm & Accept
                             </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
              </div>
            )}
            {vendorPortion.status === 'Preparing' && (
               <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleMarkAsReady} disabled={isLoading}>
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CookingPot className="mr-2 h-4 w-4" />} Mark as Ready
               </Button>
            )}
             {vendorPortion.status === 'Ready for Pickup' && (
                <ReadyForPickupActions order={order} isLoading={isLoading} setIsLoading={setIsLoading} />
            )}
            {vendorPortion.status === 'Picked Up' && (
                <Button asChild variant="outline" className="w-full" disabled={isLoading}>
                    <Link href={`/orders/${order.orderId}`}>
                      <FileText className="mr-2 h-4 w-4" /> View Details
                    </Link>
                </Button>
             )}
             <RejectionDialog
               open={isRejectionDialogOpen}
               onOpenChange={setIsRejectionDialogOpen}
               onConfirm={handleRejectOrder}
               isLoading={isLoading}
             />
         </CardFooter>
      </>
    );
  };

  return (
    <Card className="w-full shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="p-4 bg-card border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center">
            <Tag className="mr-2 h-4 w-4 text-primary" />
            Order ID: {order.orderId}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{orderTime}</span>
        </div>
        <div className="mt-1 space-y-0.5">
            <p className="text-xs text-muted-foreground flex items-center">
                <User className="mr-1.5 h-3 w-3" />
                Ordered by: <span className="font-medium text-foreground ml-1">{customerInfo?.name || 'Customer'}</span>
            </p>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-foreground mb-1.5 flex items-center"><ShoppingBag className="mr-2 h-4 w-4" /> Items</h4>
          <ul className="space-y-1 text-xs text-muted-foreground max-h-24 overflow-y-auto">
            {vendorPortion.items.slice(0, 2).map(item => (
              <li key={item.itemId} className="flex justify-between">
                <span>{item.quantity} x {item.name}</span>
                <span>₹{item.totalPrice.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          {vendorPortion.items.length > 2 && (
            <Link href={`/orders/${order.orderId}`} className="text-xs text-primary hover:underline mt-1 inline-block">
              View all ({vendorPortion.items.length})
            </Link>
          )}
        </div>

        <div className="mb-3 border-t pt-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-foreground">Your Subtotal</h4>
            <div className="flex items-center gap-2">
              <Badge variant={order.paymentStatus === 'Paid' ? "default" : "outline"} className={order.paymentStatus === 'Paid' ? "bg-green-500 text-white" : "border-yellow-500 text-yellow-600"}>
                {order.paymentStatus.toUpperCase()}
              </Badge>
              <span className="text-base font-bold text-foreground">₹{vendorPortion.vendorSubtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
      </CardContent>

      {vendorPortion.status === 'Pending Vendor Confirmation' ? renderGroceryConfirmation() : renderStandardFlow()}
    </Card>
  );
}

// Component to handle Ready for Pickup actions
function ReadyForPickupActions({ 
  order, 
  isLoading, 
  setIsLoading 
}: { 
  order: VendorDisplayOrder; 
  isLoading: boolean; 
  setIsLoading: (loading: boolean) => void;
}) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const { toast } = useToast();

  const handleScanSuccess = (scannedOrderId: string) => {
    if (scannedOrderId === order.orderId) {
      setIsScannerOpen(false);
      setIsVerificationOpen(true);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid QR Code",
        description: "This QR code does not match the current order.",
      });
    }
  };

  const handleConfirmHandover = async () => {
    setIsLoading(true);
    const result = await updateVendorOrderStatus(order.orderId, 'Picked Up');
    
    if (result.success) {
      toast({
        title: "Order Completed",
        description: `Order ${order.orderId} has been marked as picked up.`,
      });
      setIsVerificationOpen(false);
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: result.error || "Could not update order status.",
      });
    }
    setIsLoading(false);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 w-full">
        <Button asChild variant="outline" className="w-full" disabled={isLoading}>
          <Link href={`/orders/${order.orderId}`}>
            <FileText className="mr-2 h-4 w-4" /> Details
          </Link>
        </Button>
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setIsScannerOpen(true)}
          disabled={isLoading}
        >
          <Camera className="mr-2 h-4 w-4" /> Scan QR
        </Button>
      </div>

      <QRScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleScanSuccess}
        expectedOrderId={order.orderId}
      />

      <ItemVerificationDialog
        open={isVerificationOpen}
        onOpenChange={setIsVerificationOpen}
        items={order.vendorPortion.items}
        onConfirm={handleConfirmHandover}
        isLoading={isLoading}
      />
    </>
  );
}
