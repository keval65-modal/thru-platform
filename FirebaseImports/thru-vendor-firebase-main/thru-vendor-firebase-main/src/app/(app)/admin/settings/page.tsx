'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Settings, Save } from 'lucide-react';

export default function SettingsPage() {
  const [platformFee, setPlatformFee] = useState('10');
  const [categories, setCategories] = useState(['Restaurant', 'Grocery', 'Pharmacy', 'Retail']);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="System-level configuration and preferences"
        icon={Settings}
        actions={
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Platform Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Fee Configuration</CardTitle>
            <CardDescription>Set the platform fee per order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platform-fee">Platform Fee (₹)</Label>
              <Input
                id="platform-fee"
                type="number"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current fee: ₹{platformFee} per order. This will be deducted from vendor payouts.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Shop Categories</CardTitle>
            <CardDescription>Manage available shop types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{category}</span>
                  <Button variant="ghost" size="sm">
                    Remove
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2">
                Add Category
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settlement Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Settlement Settings</CardTitle>
            <CardDescription>Configure settlement cycles and defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Settlement Cycle</Label>
              <p className="text-sm text-muted-foreground mt-1">Weekly (configurable per vendor)</p>
            </div>
            <Separator />
            <div>
              <Label>Default Processing Days</Label>
              <p className="text-sm text-muted-foreground mt-1">2-3 business days</p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Templates</CardTitle>
            <CardDescription>Manage notification templates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Notification templates can be configured here. This feature will be expanded in future updates.
            </p>
          </CardContent>
        </Card>

        {/* Admin Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Profile</CardTitle>
            <CardDescription>Your admin account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value="admin@thru.app" disabled />
            </div>
            <div>
              <Label>Role</Label>
              <Input value="Super Admin" disabled />
            </div>
            <Button variant="outline" className="w-full">
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Platform health and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <span className="text-sm text-green-600">Connected</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Payment Gateway</span>
              <span className="text-sm text-green-600">Active</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Notification Service</span>
              <span className="text-sm text-green-600">Active</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
