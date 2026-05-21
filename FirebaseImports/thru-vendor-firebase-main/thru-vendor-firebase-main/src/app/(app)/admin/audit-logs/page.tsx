'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSearch, Search } from 'lucide-react';

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [logs] = useState<any[]>([]); // TODO: Fetch from backend

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track critical admin actions across the system"
        icon={FileSearch}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="settlement">Settlement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Previous Value</TableHead>
                <TableHead>New Value</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.timestamp || 'N/A'}</TableCell>
                    <TableCell>{log.adminName || 'N/A'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded bg-muted">{log.action || 'N/A'}</span>
                    </TableCell>
                    <TableCell>{log.entity || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs">{log.entityId || 'N/A'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {log.previousValue || 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{log.newValue || 'N/A'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {log.notes || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No audit logs found. Data will be loaded from backend.
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
