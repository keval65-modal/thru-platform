'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Store,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
  FileText,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { getVendorForEditing } from '../../actions';
import { AdminShopImageUpload } from '@/components/admin/AdminShopImageUpload';
import Link from 'next/link';

export default function ShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.id as string;
  const [shop, setShop] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadShop() {
      setIsLoading(true);
      try {
        const result = await getVendorForEditing(shopId);
        if (result.vendor) {
          setShop(result.vendor);
        }
      } catch (error) {
        console.error('Error loading shop:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (shopId) {
      loadShop();
    }
  }, [shopId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="space-y-6">
        <PageHeader title="Shop Not Found" icon={Store} />
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">The shop you're looking for doesn't exist.</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/admin/shops">Back to Shops</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/shops">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={shop.shopName || 'Shop Details'}
          description={`Shop ID: ${shopId}`}
          icon={Store}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kyc">KYC & Documents</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="history">History & Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shop Photo</CardTitle>
              <CardDescription>
                Add or replace the photo shown to customers on the map and in listings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminShopImageUpload
                vendorId={shopId}
                shopName={shop.shopName || 'Shop'}
                imageUrl={shop.shopImageUrl}
                onUploaded={(url) => setShop((prev: typeof shop) => ({ ...prev, shopImageUrl: url }))}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Shop Name</label>
                  <p className="text-sm font-medium">{shop.shopName || 'N/A'}</p>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner Name</label>
                  <p className="text-sm font-medium">{shop.ownerName || 'N/A'}</p>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <Badge className="mt-1">{shop.storeCategory || 'N/A'}</Badge>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={shop.isActiveOnThru ? 'default' : 'secondary'}>
                      {shop.isActiveOnThru ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{shop.email || 'N/A'}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm">{shop.phone || 'N/A'}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-sm">{shop.address || 'N/A'}</p>
                    {shop.city && <p className="text-sm text-muted-foreground">{shop.city}</p>}
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Coordinates</label>
                  <p className="text-sm font-mono">
                    {shop.latitude && shop.longitude
                      ? `${shop.latitude}, ${shop.longitude}`
                      : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registration Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Registration Date</label>
                    <p className="text-sm">
                      {shop.createdAt ? format(new Date(shop.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Onboarding Source</label>
                  <p className="text-sm">{shop.onboardingSource || 'Direct'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Orders</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="text-sm font-medium">₹0</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Thru Earnings</span>
                  <span className="text-sm font-medium">₹0</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Settlement Due</span>
                  <span className="text-sm font-medium">₹0</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KYC Tab */}
        <TabsContent value="kyc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>KYC Status</CardTitle>
              <CardDescription>Review and manage KYC verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant={getKycBadgeVariant(shop.kycStatus || 'PENDING')} className="text-base px-3 py-1">
                    {shop.kycStatus || 'PENDING'}
                  </Badge>
                </div>
                <Button asChild>
                  <Link href={`/admin/kyc/${shopId}`}>Review KYC</Link>
                </Button>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Documents</label>
                <p className="text-sm text-muted-foreground mt-1">Document uploads will be shown here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
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

        {/* Financial Tab */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Financial details will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Audit History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Audit trail will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getKycBadgeVariant(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'default';
    case 'REJECTED':
      return 'destructive';
    case 'PENDING':
      return 'secondary';
    default:
      return 'outline';
  }
}
