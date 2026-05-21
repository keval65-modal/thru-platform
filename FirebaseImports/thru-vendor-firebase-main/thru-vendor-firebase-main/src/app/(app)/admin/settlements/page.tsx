'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Search, Eye, Download, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SettlementsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [settlements] = useState<any[]>([]); // TODO: Fetch from backend

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      settled: 'default',
      pending: 'secondary',
      processing: 'outline',
      failed: 'destructive',
      'on hold': 'outline',
    };
    return <Badge variant={variants[status.toLowerCase()] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlements"
        description="Track vendor payouts and settlement cycles"
        icon={Receipt}
        actions={
          <>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Process Settlements
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Settlement Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="on hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Settlements Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Total Collected</TableHead>
                <TableHead>Platform Fees</TableHead>
                <TableHead>Net Payable</TableHead>
                <TableHead>Settlement Cycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Settlement Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.length > 0 ? (
                settlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell className="font-medium">{settlement.vendorName || 'N/A'}</TableCell>
                    <TableCell>₹{settlement.totalCollected || 0}</TableCell>
                    <TableCell>₹{settlement.platformFees || 0}</TableCell>
                    <TableCell className="font-medium">₹{settlement.netPayable || 0}</TableCell>
                    <TableCell>{settlement.cycle || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                    <TableCell>{settlement.settlementDate || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs">{settlement.reference || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/settlements/${settlement.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No settlements found. Data will be loaded from backend.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Platform Fee Configuration:</p>
            <p>Current platform fee: ₹10 per order (configurable in Settings)</p>
            <p className="mt-2">Net Payable = Total Collected - Platform Fees</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
