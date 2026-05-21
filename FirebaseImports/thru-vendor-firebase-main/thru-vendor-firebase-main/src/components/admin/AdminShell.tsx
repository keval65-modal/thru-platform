'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Search, Bell, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminNavItems, type AdminNavItem } from '@/config/admin-nav';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/hooks/use-session';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function AdminNavLinks({ items, currentPath }: { items: AdminNavItem[]; currentPath: string }) {
  return (
    <>
      {items.map((item) => {
        const isActive = currentPath === item.href || (item.href !== '/admin' && currentPath.startsWith(item.href));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-muted/50",
                isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          </li>
        );
      })}
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session } = useSession();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <div className="hidden border-r bg-white lg:block">
        <div className="flex h-full max-h-screen flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flame className="h-5 w-5" />
              </div>
              <span className="text-lg">Thru Admin</span>
            </Link>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav>
              <ul className="space-y-1">
                <AdminNavLinks items={adminNavItems} currentPath={pathname} />
              </ul>
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Super Admin</div>
              <div className="mt-1">{session?.email || 'Admin'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
          <div className="flex flex-1 items-center gap-4">
            {/* Mobile menu button could go here */}
            <div className="flex-1">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Quick search..."
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Super Admin</p>
                    <p className="text-xs text-muted-foreground">{session?.email || 'admin@thru.app'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 bg-muted/30 p-6">
          <ScrollArea className="h-[calc(100vh-4rem)]">
            {children}
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
