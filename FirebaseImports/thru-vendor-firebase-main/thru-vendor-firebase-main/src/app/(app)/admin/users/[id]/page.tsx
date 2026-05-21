'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Users, ArrowLeft, Phone, Mail, MapPin, ShoppingCart, DollarSign, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const [user] = useState<any>(null); // TODO: Fetch from backend

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader title="User Profile" description={`User ID: ${userId}`} icon={Users} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="issues">Issues & Complaints</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm font-medium">{user?.name || 'N/A'}</p>
                </div>
                <Separator />
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm">{user?.phone || 'N/A'}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{user?.email || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Orders</span>
                  <span className="text-sm font-medium">{user?.totalOrders || 0}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Spend</span>
                  <span className="text-sm font-medium">₹{user?.totalSpend || 0}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Order Value</span>
                  <span className="text-sm font-medium">₹{user?.avgOrderValue || 0}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Repeat Order Rate</span>
                  <span className="text-sm font-medium">{user?.repeatRate || 0}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Saved locations will be displayed here</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Order history will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>Issues & Complaints</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Issues raised by this user will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
