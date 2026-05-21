'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ShoppingCart, Search, Eye, CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    paymentStatus: 'all',
    issueStatus: 'all',
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  });
  const [orders] = useState<any[]>([]); // TODO: Fetch from backend

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      cancelled: 'destructive',
      ongoing: 'secondary',
      pending: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Operations-first order management and tracking"
        icon={ShoppingCart}
        actions={
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.paymentStatus}
              onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.issueStatus}
              onValueChange={(value) => setFilters({ ...filters, issueStatus: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Issue Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Issues</SelectItem>
                <SelectItem value="none">No Issues</SelectItem>
                <SelectItem value="open">Open Issues</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? format(filters.dateFrom, 'LLL dd') : 'Date Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: filters.dateFrom, to: filters.dateTo }}
                  onSelect={(range) => setFilters({ ...filters, dateFrom: range?.from, dateTo: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Platform Fee</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium font-mono">{order.orderNumber || order.id}</TableCell>
                    <TableCell>{order.userName || 'N/A'}</TableCell>
                    <TableCell>{order.vendorName || 'N/A'}</TableCell>
                    <TableCell>{order.category || 'N/A'}</TableCell>
                    <TableCell>₹{order.amount || 0}</TableCell>
                    <TableCell>₹{order.platformFee || 0}</TableCell>
                    <TableCell>{getStatusBadge(order.paymentStatus)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{order.createdAt ? format(new Date(order.createdAt), 'MMM dd, HH:mm') : 'N/A'}</TableCell>
                    <TableCell>
                      {order.hasIssue ? (
                        <Badge variant="destructive">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No orders found. Data will be loaded from backend.
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
