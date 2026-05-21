'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/hooks/use-session';
import { SupabasePlacedOrderService } from '@/lib/supabase/placed-order-service';
import type { VendorDisplayOrder } from '@/lib/orderModels';
import type { AuthenticatedSession, SessionData } from '@/types/session';

function isAuthenticatedSession(session: SessionData | null | undefined): session is AuthenticatedSession {
  return Boolean(session && session.isAuthenticated);
}

function isDeliveredForVendor(order: VendorDisplayOrder) {
  // Precise: treat as delivered only when the order is completed.
  return order.overallStatus === 'Completed';
}

function asNumber(value: any) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

export default function FinancialReportsPage() {
  const { session, isLoading } = useSession();
  const [orders, setOrders] = React.useState<VendorDisplayOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(true);

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticatedSession(session)) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setLoadingOrders(true);
    const unsubscribe = SupabasePlacedOrderService.subscribeToVendorOrders(session.uid, (fetched) => {
      const delivered = fetched.filter(isDeliveredForVendor);
      setOrders(delivered);
      setLoadingOrders(false);
    });

    return () => unsubscribe();
  }, [isLoading, session]);

  const totals = React.useMemo(() => {
    const deliveredCount = orders.length;
    const grossSales = orders.reduce((sum: number, o: VendorDisplayOrder) => sum + asNumber(o.vendorPortion?.vendorSubtotal), 0);
    return { deliveredCount, grossSales };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Report</h1>
        <p className="text-muted-foreground mt-2">
          Track delivered orders and gross sales for your shop on Thru.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Delivered orders</CardTitle>
            <CardDescription>Total number of completed orders</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {loadingOrders ? <Skeleton className="h-9 w-24" /> : totals.deliveredCount}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gross sales</CardTitle>
            <CardDescription>Sum of your portion subtotal (completed)</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {loadingOrders ? <Skeleton className="h-9 w-40" /> : `₹${totals.grossSales.toFixed(2)}`}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivered order ledger</CardTitle>
          <CardDescription>Real-time list of your completed orders</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No delivered orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Your subtotal</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => {
                    const createdAt = o.createdAt ? new Date(String(o.createdAt)) : null;
                    const dateLabel = createdAt && !Number.isNaN(createdAt.getTime()) ? format(createdAt, 'PPP p') : 'N/A';
                    return (
                      <TableRow key={o.orderId}>
                        <TableCell className="font-medium">{o.orderId}</TableCell>
                        <TableCell>{dateLabel}</TableCell>
                        <TableCell>{o.customerInfo?.name || 'N/A'}</TableCell>
                        <TableCell className="text-right">₹{asNumber(o.vendorPortion?.vendorSubtotal).toFixed(2)}</TableCell>
                        <TableCell>{o.paymentStatus}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

