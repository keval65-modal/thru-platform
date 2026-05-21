'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Store, Search, Filter, Download, Eye, Edit, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getAllVendors } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ShopsPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    kycStatus: 'all',
    activeStatus: 'all',
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  });

  const fetchShops = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAllVendors();
      if (result.vendors) {
        setShops(result.vendors);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to load shops' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load shops' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const filteredShops = shops.filter((shop) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !shop.shopName?.toLowerCase().includes(query) &&
        !shop.ownerName?.toLowerCase().includes(query) &&
        !shop.email?.toLowerCase().includes(query) &&
        !shop.phone?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (filters.category !== 'all' && shop.storeCategory !== filters.category) return false;
    if (filters.kycStatus !== 'all' && shop.kycStatus !== filters.kycStatus) return false;
    if (filters.activeStatus !== 'all') {
      const isActive = shop.isActiveOnThru;
      if (filters.activeStatus === 'active' && !isActive) return false;
      if (filters.activeStatus === 'inactive' && isActive) return false;
    }
    return true;
  });

  const handleExport = () => {
    // TODO: Implement CSV export
    toast({ title: 'Export', description: 'CSV export functionality will be implemented' });
  };

  const getKycBadgeVariant = (status: string) => {
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
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shops Management"
        description="Manage all registered vendors and shops"
        icon={Store}
        actions={
          <>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button asChild>
              <Link href="/admin/shops/new">Add New Shop</Link>
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search shops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="grocery">Grocery</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.kycStatus} onValueChange={(value) => setFilters({ ...filters, kycStatus: value })}>
              <SelectTrigger>
                <SelectValue placeholder="KYC Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.activeStatus}
              onValueChange={(value) => setFilters({ ...filters, activeStatus: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? format(filters.dateFrom, 'LLL dd, y') : 'Date Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: filters.dateFrom, to: filters.dateTo }}
                  onSelect={(range) =>
                    setFilters({ ...filters, dateFrom: range?.from, dateTo: range?.to })
                  }
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Shops Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Phone / WhatsApp</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShops.length > 0 ? (
                filteredShops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">{shop.shopName || 'N/A'}</TableCell>
                    <TableCell>{shop.ownerName || 'N/A'}</TableCell>
                    <TableCell>{shop.storeCategory || 'N/A'}</TableCell>
                    <TableCell>{shop.phone || 'N/A'}</TableCell>
                    <TableCell>{shop.city || shop.locality || 'N/A'}</TableCell>
                    <TableCell>
                      {shop.createdAt ? format(new Date(shop.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getKycBadgeVariant(shop.kycStatus || 'PENDING')}>
                        {shop.kycStatus || 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={shop.isActiveOnThru ? 'default' : 'secondary'}>
                        {shop.isActiveOnThru ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>0</TableCell>
                    <TableCell>₹0</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/shops/${shop.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/shops/${shop.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No shops found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
