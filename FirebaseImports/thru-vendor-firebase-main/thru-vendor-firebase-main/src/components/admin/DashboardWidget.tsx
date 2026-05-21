'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface DashboardWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  href?: string;
  className?: string;
  onClick?: () => void;
}

export function DashboardWidget({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  href,
  className,
  onClick,
}: DashboardWidgetProps) {
  const content = (
    <Card
      className={cn(
        'transition-all hover:shadow-md cursor-pointer',
        onClick || href ? 'hover:border-primary/50' : '',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs mt-1', trend.isPositive ? 'text-green-600' : 'text-red-600')}>
            {trend.isPositive ? '+' : ''}{trend.value}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
