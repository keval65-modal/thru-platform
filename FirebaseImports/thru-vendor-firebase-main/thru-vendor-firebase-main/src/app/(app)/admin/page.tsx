'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DashboardWidget } from '@/components/admin/DashboardWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Store,
  Users,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  FileText,
  Receipt,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllVendors } from './actions';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalShops: 0,
    pendingKyc: 0,
    approvedShops: 0,
    rejectedKyc: 0,
    activeUsers: 0,
    totalUsers: 0,
    ongoingOrders: 0,
    completedToday: 0,
    ordersWithIssues: 0,
    todayGmv: 0,
    todayEarnings: 0,
    pendingSettlements: 0,
    totalExpenses: 0,
    openIssues: 0,
  });

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        // Fetch vendors data
        const vendorsResult = await getAllVendors();
        if (vendorsResult.vendors) {
          const vendors = vendorsResult.vendors;
          setStats({
            totalShops: vendors.length,
            pendingKyc: vendors.filter((v: any) => !v.kycStatus || v.kycStatus === 'PENDING').length,
            approvedShops: vendors.filter((v: any) => v.kycStatus === 'APPROVED').length,
            rejectedKyc: vendors.filter((v: any) => v.kycStatus === 'REJECTED').length,
            activeUsers: 0, // TODO: Fetch from users table
            totalUsers: 0, // TODO: Fetch from users table
            ongoingOrders: 0, // TODO: Fetch from orders table
            completedToday: 0, // TODO: Fetch from orders table
            ordersWithIssues: 0, // TODO: Fetch from issues table
            todayGmv: 0, // TODO: Calculate from orders
            todayEarnings: 0, // TODO: Calculate platform fees
            pendingSettlements: 0, // TODO: Fetch from settlements table
            totalExpenses: 0, // TODO: Fetch from expenses table
            openIssues: 3, // TODO: Fetch from issues table
          });
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Command center for Thru operations, finance, and growth"
        icon={TrendingUp}
        actions={
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-[280px] justify-start text-left font-normal')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <div className="relative max-w-sm">
              <Input type="search" placeholder="Quick search..." className="w-64" />
            </div>
          </>
        }
      />

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardWidget
          title="Total Shops"
          value={stats.totalShops}
          icon={Store}
          href="/admin/shops"
        />
        <DashboardWidget
          title="Pending KYC"
          value={stats.pendingKyc}
          icon={Clock}
          href="/admin/shops?filter=kyc_pending"
          className="border-orange-200 bg-orange-50/50"
        />
        <DashboardWidget
          title="Approved Shops"
          value={stats.approvedShops}
          icon={CheckCircle2}
          href="/admin/shops?filter=approved"
          className="border-green-200 bg-green-50/50"
        />
        <DashboardWidget
          title="Rejected / Resubmission"
          value={stats.rejectedKyc}
          icon={XCircle}
          href="/admin/shops?filter=rejected"
          className="border-red-200 bg-red-50/50"
        />
        <DashboardWidget
          title="Active Users"
          value={stats.activeUsers}
          subtitle="Last 30 days"
          icon={Users}
          href="/admin/users"
        />
        <DashboardWidget
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          href="/admin/users"
        />
        <DashboardWidget
          title="Ongoing Orders"
          value={stats.ongoingOrders}
          icon={ShoppingCart}
          href="/admin/orders?status=ongoing"
        />
        <DashboardWidget
          title="Completed Today"
          value={stats.completedToday}
          icon={CheckCircle2}
          href="/admin/orders?status=completed&date=today"
        />
        <DashboardWidget
          title="Orders with Issues"
          value={stats.ordersWithIssues}
          icon={AlertTriangle}
          href="/admin/issues"
          className="border-red-200 bg-red-50/50"
        />
        <DashboardWidget
          title="Today's GMV"
          value={`₹${stats.todayGmv.toLocaleString()}`}
          icon={DollarSign}
          href="/admin/finance"
        />
        <DashboardWidget
          title="Today's Thru Earnings"
          value={`₹${stats.todayEarnings.toLocaleString()}`}
          subtitle="Platform fees"
          icon={TrendingUp}
          href="/admin/finance"
          className="border-primary/20 bg-primary/5"
        />
        <DashboardWidget
          title="Pending Settlements"
          value={`₹${stats.pendingSettlements.toLocaleString()}`}
          icon={Receipt}
          href="/admin/settlements?status=pending"
        />
        <DashboardWidget
          title="Total Expenses"
          value={`₹${stats.totalExpenses.toLocaleString()}`}
          subtitle="This month"
          icon={DollarSign}
          href="/admin/finance/expenses"
        />
        <DashboardWidget
          title="Open Issues"
          value={stats.openIssues}
          icon={HelpCircle}
          href="/admin/issues?status=open"
          className="border-red-200 bg-red-50/50"
        />
      </div>

      {/* Additional Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>High Grossing Vendors</CardTitle>
            <CardDescription>Top 5 vendors by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Data will be loaded from backend</p>
              {/* TODO: Add vendor list */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage Snapshot</CardTitle>
            <CardDescription>Shops by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Data will be loaded from backend</p>
              {/* TODO: Add category breakdown */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href="/admin/shops?action=add">Add New Shop</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/settlements?action=process">Process Settlements</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/reports?type=revenue">Generate Revenue Report</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/issues?priority=high">Review High Priority Issues</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
