'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Users, Store, ShoppingCart } from 'lucide-react';

export default function AnalyticsPage() {
  const [dateFilter, setDateFilter] = useState('month');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Insight-driven analytics and performance metrics"
        icon={BarChart3}
        actions={
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors Today</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Vendors with orders today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Users who placed orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0</div>
            <p className="text-xs text-muted-foreground">Mean order value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Customer Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">Customers with 2+ orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders by Area</CardTitle>
            <CardDescription>Geographic distribution of orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Chart will be displayed here</p>
            {/* TODO: Add chart component */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Order Volume</CardTitle>
            <CardDescription>Top vendors by order count</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Chart will be displayed here</p>
            {/* TODO: Add chart component */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardDescription>Order completion vs cancellation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Chart will be displayed here</p>
            {/* TODO: Add chart component */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issue Rate</CardTitle>
            <CardDescription>Orders with issues over time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Chart will be displayed here</p>
            {/* TODO: Add chart component */}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Average Fulfillment Time</p>
              <p className="text-2xl font-bold">0 min</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cancellation Rate</p>
              <p className="text-2xl font-bold">0%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Issue Rate</p>
              <p className="text-2xl font-bold">0%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
