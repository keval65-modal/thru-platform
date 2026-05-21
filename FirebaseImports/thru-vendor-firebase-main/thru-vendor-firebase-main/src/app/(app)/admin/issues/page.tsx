'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle, Search, Eye, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function IssuesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    source: 'all',
    type: 'all',
  });
  const [issues] = useState<any[]>([]); // TODO: Fetch from backend

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      open: 'destructive',
      'in progress': 'secondary',
      resolved: 'default',
      closed: 'outline',
      escalated: 'destructive',
    };
    return <Badge variant={variants[status.toLowerCase()] || 'outline'}>{status}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline',
    };
    return <Badge variant={colors[severity.toLowerCase()] || 'outline'}>{severity}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support / Issues"
        description="Track and manage complaints and operational problems"
        icon={HelpCircle}
        actions={
          <Button>
            <AlertTriangle className="mr-2 h-4 w-4" />
            New Issue
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
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.severity} onValueChange={(value) => setFilters({ ...filters, severity: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.source} onValueChange={(value) => setFilters({ ...filters, source: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Issue Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="order">Order Issue</SelectItem>
                <SelectItem value="payment">Payment Issue</SelectItem>
                <SelectItem value="delivery">Delivery Issue</SelectItem>
                <SelectItem value="quality">Quality Issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue ID</TableHead>
                <TableHead>Linked Order</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Raised Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.length > 0 ? (
                issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-mono text-xs">{issue.id}</TableCell>
                    <TableCell>
                      {issue.orderId ? (
                        <Link href={`/admin/orders/${issue.orderId}`} className="text-primary hover:underline">
                          {issue.orderId}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.source || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{issue.type || 'N/A'}</TableCell>
                    <TableCell>{getSeverityBadge(issue.severity || 'low')}</TableCell>
                    <TableCell>{getStatusBadge(issue.status)}</TableCell>
                    <TableCell>{issue.assignedAdmin || 'Unassigned'}</TableCell>
                    <TableCell>{issue.raisedDate || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/issues/${issue.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No issues found. Data will be loaded from backend.
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
