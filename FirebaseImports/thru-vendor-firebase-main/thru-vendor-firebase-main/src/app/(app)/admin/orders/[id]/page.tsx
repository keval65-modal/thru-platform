'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, ArrowLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order] = useState<any>(null); // TODO: Fetch from backend

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader title="Order Details" description={`Order ID: ${orderId}`} icon={ShoppingCart} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Order Created</p>
                <p className="text-xs text-muted-foreground">{order?.createdAt || 'N/A'}</p>
              </div>
            </div>
            {/* Timeline items will be added here */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order Amount</span>
              <span className="text-sm font-medium">₹{order?.amount || 0}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform Fee</span>
              <span className="text-sm font-medium">₹{order?.platformFee || 0}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="text-sm font-bold">₹{order?.totalAmount || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">User information will be displayed here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Vendor information will be displayed here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
