'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, Plus } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications] = useState<any[]>([]); // TODO: Fetch from backend

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Internal communication center for admin announcements"
        icon={Bell}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Notification
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>Latest notifications sent to vendors and users</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <TableRow key={notif.id}>
                      <TableCell>{notif.type || 'N/A'}</TableCell>
                      <TableCell>{notif.target || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={notif.status === 'sent' ? 'default' : 'secondary'}>
                          {notif.status || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>{notif.sentAt || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No notifications found. Data will be loaded from backend.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Templates</CardTitle>
            <CardDescription>Pre-configured notification templates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Bell className="mr-2 h-4 w-4" />
              KYC Reminder
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Bell className="mr-2 h-4 w-4" />
              Settlement Notification
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Bell className="mr-2 h-4 w-4" />
              Onboarding Reminder
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Bell className="mr-2 h-4 w-4" />
              Issue Resolution Update
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Bell className="mr-2 h-4 w-4" />
              Operational Announcement
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
