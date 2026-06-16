
import type { LucideProps } from 'lucide-react';
import { LayoutDashboard, ShoppingCart, DollarSign, UserCircle, Shield, MapPin, ClipboardCheck } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<LucideProps>;
  disabled?: boolean;
  external?: boolean;
  label?: string;
}

export const mainNavItems: NavItem[] = [
  {
    title: 'Orders',
    href: '/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Onboarding',
    href: '/onboarding',
    icon: ClipboardCheck,
  },
  {
    title: 'Financial Report',
    href: '/financial-reports',
    icon: DollarSign,
  },
];

export const bottomNavItems: NavItem[] = [
    {
      title: 'Profile',
      href: '/profile',
      icon: UserCircle,
    },
    {
      title: 'Admin',
      href: '/admin',
      icon: Shield,
    }
];

export const adminNavItems: NavItem[] = [
  {
    title: 'Vendor Management',
    href: '/admin',
    icon: Shield,
  },
  {
    title: 'Shops Map',
    href: '/admin/map',
    icon: MapPin,
  },
];
