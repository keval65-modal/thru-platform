
'use client'

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { TrendingUp } from 'lucide-react'
import { SupabasePlacedOrderService } from '@/lib/supabase/placed-order-service';
import type { VendorDisplayOrder } from '@/lib/orderModels';
import { Skeleton } from '@/components/ui/skeleton';

type ChartRow = { month: string; sales: number };

const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig

function asNumber(value: any) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getLastNMonths(n: number) {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: monthKey(d),
      label: d.toLocaleString(undefined, { month: 'long' }),
    });
  }
  return months;
}

function aggregateSalesLast6Months(orders: VendorDisplayOrder[]): ChartRow[] {
  const months = getLastNMonths(6);
  const totals = new Map(months.map((m) => [m.key, 0]));

  for (const o of orders) {
    if (o.overallStatus !== 'Completed') continue;
    const d = o.createdAt ? new Date(String(o.createdAt)) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    const key = monthKey(d);
    if (!totals.has(key)) continue;
    totals.set(key, (totals.get(key) || 0) + asNumber(o.vendorPortion?.vendorSubtotal));
  }

  return months.map((m) => ({ month: m.label, sales: totals.get(m.key) || 0 }));
}

export function SalesChart({ vendorId }: { vendorId: string }) {
  const [chartData, setChartData] = React.useState<ChartRow[]>(() =>
    getLastNMonths(6).map((m) => ({ month: m.label, sales: 0 }))
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    const unsubscribe = SupabasePlacedOrderService.subscribeToVendorOrders(vendorId, (orders) => {
      setChartData(aggregateSalesLast6Months(orders));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [vendorId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Sales Overview
        </CardTitle>
        <CardDescription>Gross sales for the last 6 months (completed orders).</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-[240px] w-full" />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => String(value).slice(0, 3)}
                  />
                  <YAxis />
                  <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                  />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
              </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
