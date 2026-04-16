'use client';

import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { LogOut, Menu } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';
import type { AppView } from '@/store/app-store';

const VIEW_TITLES: Record<AppView, string> = {
  login: 'ログイン',
  dashboard: 'ダッシュボード',
  timesheet: '勤務表一覧',
  'timesheet-edit': '勤務表編集',
  approval: '承認管理',
  employees: '社員管理',
  organization: '組織管理',
  settings: '設定',
  'monthly-status': '月次提出状況',
  'leave-balance': '年次有給残日数',
  compensatory: '代休残日数管理',
};

const VIEW_EN: Record<AppView, string> = {
  login: '',
  dashboard: 'Dashboard',
  timesheet: 'Timesheets',
  'timesheet-edit': 'Edit',
  approval: 'Approvals',
  employees: 'Employees',
  organization: 'Organization',
  settings: 'Settings',
  'monthly-status': 'Monthly Status',
  'leave-balance': 'Leave Balance',
  compensatory: 'Compensatory',
};

export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentView = useAppStore((s) => s.currentView);
  const setView = useAppStore((s) => s.setView);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const handleLogout = () => { logout(); setView('login'); };
  const userInitial = user?.name ? user.name.charAt(0) : '?';
  const roleLabel = user ? (ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role) : '';

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center px-4 md:px-6"
      style={{
        background: 'oklch(0.992 0.004 80)',
        borderBottom: '1px solid oklch(0.880 0.018 75)',
      }}
    >
      {/* Vermillion top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'oklch(0.50 0.21 27)' }} />

      {/* Mobile hamburger */}
      <button
        className="md:hidden shrink-0 flex items-center justify-center w-8 h-8 rounded transition-colors mr-3"
        style={{ color: 'oklch(0.52 0.022 60)' }}
        onClick={toggleSidebar}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.940 0.016 78)'; e.currentTarget.style.color = 'oklch(0.18 0.018 52)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'oklch(0.52 0.022 60)'; }}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Left: hanko mark + app name */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 border-2 rounded-sm"
          style={{ borderColor: 'oklch(0.50 0.21 27)', color: 'oklch(0.50 0.21 27)' }}>
          <span className="text-[11px] font-bold leading-none"
            style={{ fontFamily: 'var(--font-noto-serif-jp)' }}>勤</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'oklch(0.18 0.018 52)', fontFamily: 'var(--font-noto-serif-jp)' }}>
            勤務時間報告
          </span>
          <span style={{ color: 'oklch(0.78 0.018 75)' }}>/</span>
          <span className="text-xs" style={{ color: 'oklch(0.60 0.022 60)', fontFamily: 'var(--font-dm-mono)', letterSpacing: '0.06em' }}>
            {VIEW_EN[currentView]}
          </span>
        </div>
      </div>

      {/* Center breadcrumb (mobile) */}
      <div className="flex-1 flex items-center justify-center sm:hidden">
        <span className="text-sm font-medium" style={{ color: 'oklch(0.18 0.018 52)', fontFamily: 'var(--font-noto-serif-jp)' }}>
          {VIEW_TITLES[currentView]}
        </span>
      </div>

      <div className="hidden sm:flex flex-1" />

      {/* Right: user + logout */}
      {user && (
        <div className="flex items-center gap-3 shrink-0">
          {/* User info pill */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded"
            style={{ background: 'oklch(0.955 0.012 78)', border: '1px solid oklch(0.870 0.020 75)' }}>
            <div className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0"
              style={{ background: 'oklch(0.50 0.21 27)', color: 'oklch(0.992 0.004 80)', fontFamily: 'var(--font-noto-serif-jp)' }}>
              {userInitial}
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-medium" style={{ color: 'oklch(0.18 0.018 52)' }}>{user.name}</span>
              <span className="text-[10px] mt-0.5" style={{ color: 'oklch(0.60 0.022 60)', fontFamily: 'var(--font-dm-mono)' }}>{roleLabel}</span>
            </div>
          </div>

          {/* Mobile avatar */}
          <div className="sm:hidden flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
            style={{ background: 'oklch(0.50 0.21 27)', color: 'oklch(0.992 0.004 80)' }}>
            {userInitial}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-8 h-8 rounded transition-all duration-150"
            style={{ color: 'oklch(0.68 0.022 60)' }}
            title="ログアウト"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.94 0.08 27)'; e.currentTarget.style.color = 'oklch(0.50 0.21 27)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'oklch(0.68 0.022 60)'; }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </header>
  );
}
