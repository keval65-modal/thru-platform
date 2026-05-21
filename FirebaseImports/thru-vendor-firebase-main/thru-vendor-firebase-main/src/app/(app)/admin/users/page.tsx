'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Eye, Download } from 'lucide-react';
import Link from 'next/link';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users] = useState<any[]>([]); // TODO: Fetch from backend

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Monitor users, spending behavior, and usage geography"
        icon={Users}
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Filter by activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active (30 days)</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="mumbai">Mumbai</SelectItem>
                <SelectItem value="delhi">Delhi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Total Spend</TableHead>
                <TableHead>Avg Order Value</TableHead>
                <TableHead>Latest Activity</TableHead>
                <TableHead>Common Area</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                    <TableCell>{user.phone || 'N/A'}</TableCell>
                    <TableCell>{user.createdAt || 'N/A'}</TableCell>
                    <TableCell>{user.totalOrders || 0}</TableCell>
                    <TableCell>₹{user.totalSpend || 0}</TableCell>
                    <TableCell>₹{user.avgOrderValue || 0}</TableCell>
                    <TableCell>{user.lastActivity || 'N/A'}</TableCell>
                    <TableCell>{user.commonArea || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={user.issueCount > 0 ? 'destructive' : 'secondary'}>
                        {user.issueCount || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/users/${user.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No users found. Data will be loaded from backend.
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
