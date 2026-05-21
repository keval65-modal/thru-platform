'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Receipt, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function FinancePage() {
  const [dateFilter, setDateFilter] = useState('month');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Revenue overview and expense tracking"
        icon={DollarSign}
      />

      <Tabs defaultValue="revenue" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="revenue">Revenue Overview</TabsTrigger>
            <TabsTrigger value="expenses">Expense Tracker</TabsTrigger>
          </TabsList>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Revenue Overview */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GMV</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹0</div>
                <p className="text-xs text-muted-foreground">Gross Merchandise Value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Thru Earnings</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹0</div>
                <p className="text-xs text-muted-foreground">Platform fees collected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendor Payouts Due</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹0</div>
                <p className="text-xs text-muted-foreground">Pending settlements</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Settlements</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹0</div>
                <p className="text-xs text-muted-foreground">Total settled</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Grossing Vendors</CardTitle>
                <CardDescription>Vendors by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Data will be loaded from backend</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>Revenue by category</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Data will be loaded from backend</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expense Tracker */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Expense Tracker</CardTitle>
                <CardDescription>Track company expenses for tax reporting</CardDescription>
              </div>
              <Button asChild>
                <Link href="/admin/finance/expenses/new">Add Expense</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Expense entries will be displayed here</p>
              {/* TODO: Add expense table with filters */}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹0</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Breakdown will be shown here</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Export</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Export for Tax
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
