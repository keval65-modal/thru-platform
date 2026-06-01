'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { adminGetOrderDetail } from '../actions';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = decodeURIComponent(params.id as string);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await adminGetOrderDetail(orderId);
        setOrder(data as Record<string, unknown> | null);
      } catch (e) {
        console.error(e);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const portions = (order?.vendor_portions as Record<string, unknown>[]) ?? [];
  const first = portions[0] as {
    vendorName?: string;
    orderType?: string;
    prescription?: { imageDataUri?: string; prescriptionDate?: string };
    items?: { name: string; quantity: number; pricePerItem: number; totalPrice: number }[];
  } | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader title="Order Details" description={`Order: ${orderId}`} icon={ShoppingCart} />
      </div>

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : !order ? (
        <p className="text-muted-foreground">Order not found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order number</span>
                <span className="font-mono font-medium">{String(order.order_id)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge>{String(order.overall_status)}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <Badge variant="outline">{String(order.payment_status)}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {order.created_at
                    ? format(new Date(String(order.created_at)), 'PPpp')
                    : '—'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Grand total</span>
                <span>₹{parseFloat(String(order.grand_total ?? 0)).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendor</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>{first?.vendorName ?? '—'}</p>
              {first?.orderType === 'medicine' && <Badge className="mt-2">Medicine / Rx</Badge>}
            </CardContent>
          </Card>

          {first?.prescription?.imageDataUri && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Prescription</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={first.prescription.imageDataUri}
                  alt="Prescription"
                  className="max-h-64 rounded border object-contain"
                />
                {first.prescription.prescriptionDate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Date: {first.prescription.prescriptionDate}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(first?.items ?? []).map((item, i) => (
                  <li key={i} className="flex justify-between border-b pb-2">
                    <span>
                      {item.quantity}× {item.name}
                    </span>
                    <span>₹{(item.totalPrice ?? 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
