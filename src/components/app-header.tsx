'use client';

import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, LogOut, Menu } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';
import type { AppView } from '@/store/app-store';

const VIEW_TITLES: Record<AppView, string> = {
  login: 'ログイン',
  dashboard: 'ダッシュボード',
  timesheet: '勤務表',
  'timesheet-edit': '勤務表編集',
  approval: '承認待ち',
  employees: '社員管理',
  departments: '組織管理',
  settings: '設定',
};

export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentView = useAppStore((s) => s.currentView);
  const setView = useAppStore((s) => s.setView);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const handleLogout = () => {
    logout();
    setView('login');
  };

  const userInitial = user?.name ? user.name.charAt(0) : '?';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 md:px-6">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">メニュー</span>
      </Button>

      {/* Left: App icon + title */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
          <Clock className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm hidden sm:inline">
          勤務時間報告システム
        </span>
      </div>

      {/* Center: Current view title */}
      <div className="flex-1 flex items-center justify-center">
        <h2 className="text-sm font-medium text-muted-foreground">
          {VIEW_TITLES[currentView] || ''}
        </h2>
      </div>

      {/* Right: User info + logout */}
      <div className="flex items-center gap-3 shrink-0">
        {user && (
          <>
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-tight">
                  {user.name}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 w-fit">
                  {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                </Badge>
              </div>
            </div>

            {/* Mobile: just avatar */}
            <Avatar className="h-7 w-7 sm:hidden">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {userInitial}
              </AvatarFallback>
            </Avatar>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8"
              title="ログアウト"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">ログアウト</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
