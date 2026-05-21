import type { LucideProps } from 'lucide-react';
import {
  LayoutDashboard,
  MapPin,
  Store,
  Users,
  ShoppingCart,
  DollarSign,
  Receipt,
  FileText,
  HelpCircle,
  Bell,
  BarChart3,
  FileSearch,
  Settings,
} from 'lucide-react';

export interface AdminNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<LucideProps>;
  badge?: string | number;
  disabled?: boolean;
}

export const adminNavItems: AdminNavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Map / Coverage',
    href: '/admin/map',
    icon: MapPin,
  },
  {
    title: 'Shops',
    href: '/admin/shops',
    icon: Store,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Finance',
    href: '/admin/finance',
    icon: DollarSign,
  },
  {
    title: 'Settlements',
    href: '/admin/settlements',
    icon: Receipt,
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: FileText,
  },
  {
    title: 'Support / Issues',
    href: '/admin/issues',
    icon: HelpCircle,
    badge: '3',
  },
  {
    title: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Agreements',
    href: '/admin/agreements',
    icon: FileText,
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: FileSearch,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];
