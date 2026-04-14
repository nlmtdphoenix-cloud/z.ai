'use client';

import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Clock,
  ClipboardCheck,
  Users,
  Building2,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppView } from '@/store/app-store';

interface NavItem {
  label: string;
  emoji: string;
  view: AppView;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'ダッシュボード',
    emoji: '📊',
    view: 'dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: '勤務表',
    emoji: '📋',
    view: 'timesheet',
    icon: <Clock className="h-4 w-4" />,
  },
  {
    label: '承認待ち',
    emoji: '✅',
    view: 'approval',
    icon: <ClipboardCheck className="h-4 w-4" />,
    roles: ['MANAGER', 'ADMIN'],
  },
  {
    label: '社員管理',
    emoji: '👥',
    view: 'employees',
    icon: <Users className="h-4 w-4" />,
    roles: ['ADMIN'],
  },
  {
    label: '組織管理',
    emoji: '🏢',
    view: 'organization',
    icon: <Building2 className="h-4 w-4" />,
    roles: ['ADMIN'],
  },
  {
    label: '設定',
    emoji: '⚙️',
    view: 'settings',
    icon: <Settings className="h-4 w-4" />,
    roles: ['ADMIN'],
  },
];

export function AppSidebar() {
  const user = useAuthStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setView = useAppStore((s) => s.setView);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  const userRole = user?.role || 'EMPLOYEE';

  const handleNavClick = (view: AppView) => {
    setView(view);
    // Close sidebar on mobile after navigation
    setSidebarOpen(false);
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-14 left-0 z-50 h-[calc(100vh-3.5rem)] w-64 border-r bg-white transition-transform duration-200 ease-in-out md:translate-x-0 md:z-20',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <ScrollArea className="h-full">
          <div className="flex flex-col h-full">
            {/* Mobile close button */}
            <div className="flex items-center justify-end p-2 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">閉じる</span>
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 px-3 py-2">
              {visibleItems.map((item) => {
                const isActive = currentView === item.view;
                return (
                  <Button
                    key={item.view}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'justify-start gap-3 h-10 px-3 font-normal',
                      isActive && 'font-medium bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary'
                    )}
                    onClick={() => handleNavClick(item.view)}
                  >
                    {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
                    <span className="text-sm">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </Button>
                );
              })}
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom user info (desktop only) */}
            <div className="hidden md:block p-4 border-t">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                  {user?.name?.charAt(0) || '?'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {user?.name || ''}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user?.employeeId || ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
