'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { FileText, Download, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('revenue');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const reportTypes = [
    { value: 'revenue', label: 'Revenue Report' },
    { value: 'settlement', label: 'Settlement Report' },
    { value: 'vendor-earnings', label: 'Vendor-wise Earnings' },
    { value: 'category', label: 'Category-wise Report' },
    { value: 'area-performance', label: 'Area-wise Performance' },
    { value: 'expense', label: 'Expense Report' },
    { value: 'tax-expense', label: 'Tax-friendly Expense Summary' },
    { value: 'user-spend', label: 'User Spend Report' },
    { value: 'order-issues', label: 'Order Issues Report' },
  ];

  const handleExport = () => {
    // TODO: Implement CSV/PDF export
    console.log('Exporting report:', reportType, dateRange);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate operational and financial reports"
        icon={FileText}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Select report type and date range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
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
            </div>

            <Button onClick={handleExport} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Generate & Export Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
            <CardDescription>Summary of selected report</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Report preview will be displayed here. Select a report type and date range to generate.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reports</CardTitle>
          <CardDescription>Pre-configured reports for common use cases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <Button variant="outline" className="justify-start">
              Today's Revenue Summary
            </Button>
            <Button variant="outline" className="justify-start">
              This Week's Settlements
            </Button>
            <Button variant="outline" className="justify-start">
              Monthly Expense Report
            </Button>
            <Button variant="outline" className="justify-start">
              Vendor Performance
            </Button>
            <Button variant="outline" className="justify-start">
              Category Analysis
            </Button>
            <Button variant="outline" className="justify-start">
              Issue Resolution Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
