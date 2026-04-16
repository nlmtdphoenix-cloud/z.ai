'use client';

import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { LayoutDashboard, Clock, ClipboardCheck, Users, Building2, Settings, X, BarChart3, CalendarCheck, CalendarCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRADE_SHORT_LABELS } from '@/lib/constants';
import type { AppView } from '@/store/app-store';

interface NavItem {
  label: string;
  labelEn: string;
  view: AppView;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'ダッシュボード', labelEn: 'Dashboard',   view: 'dashboard',    icon: LayoutDashboard },
  { label: '勤務表',         labelEn: 'Timesheets',   view: 'timesheet',    icon: Clock },
  { label: '承認待ち',       labelEn: 'Approvals',    view: 'approval',     icon: ClipboardCheck, roles: ['MANAGER', 'ADMIN'] },
  { label: '月次状況',       labelEn: 'Monthly Status', view: 'monthly-status', icon: BarChart3,      roles: ['MANAGER', 'ADMIN'] },
  { label: '有給残日数',     labelEn: 'Leave Balance',  view: 'leave-balance',  icon: CalendarCheck,  roles: ['MANAGER', 'ADMIN'] },
  { label: '代休管理',       labelEn: 'Compensatory',   view: 'compensatory',   icon: CalendarCheck2, roles: ['MANAGER', 'ADMIN'] },
  { label: '社員管理',       labelEn: 'Employees',    view: 'employees',    icon: Users,          roles: ['ADMIN'] },
  { label: '組織管理',       labelEn: 'Organization', view: 'organization', icon: Building2,      roles: ['ADMIN'] },
  { label: '設定',           labelEn: 'Settings',     view: 'settings',     icon: Settings,       roles: ['ADMIN'] },
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
    setSidebarOpen(false);
  };

  const visibleItems = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(userRole));

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'oklch(0.18 0.018 52 / 0.45)', backdropFilter: 'blur(3px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-14 left-0 z-50 h-[calc(100vh-3.5rem)] w-60 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:z-20',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'oklch(0.960 0.014 78)',
          borderRight: '1px solid oklch(0.870 0.020 75)',
        }}
      >
        {/* Mobile close */}
        <div className="flex items-center justify-end px-3 pt-2 md:hidden">
          <button
            className="flex items-center justify-center w-7 h-7 rounded transition-colors"
            style={{ color: 'oklch(0.60 0.022 60)' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.880 0.018 75)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col px-2 py-3 flex-1 overflow-y-auto gap-0.5">
          {visibleItems.map((item) => {
            const isActive = currentView === item.view;
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className="relative group flex items-center gap-3 w-full px-3 py-2.5 rounded text-left transition-all duration-150"
                style={{
                  background: isActive ? 'oklch(0.992 0.004 80)' : 'transparent',
                  color: isActive ? 'oklch(0.18 0.018 52)' : 'oklch(0.55 0.022 60)',
                  boxShadow: isActive ? '0 1px 3px oklch(0.18 0.018 52 / 0.06)' : 'none',
                  border: isActive ? '1px solid oklch(0.870 0.020 75)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'oklch(0.948 0.014 78)';
                    e.currentTarget.style.color = 'oklch(0.28 0.018 55)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'oklch(0.55 0.022 60)';
                  }
                }}
              >
                {/* Vermillion active dot */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: 'oklch(0.50 0.21 27)' }} />
                )}

                <Icon className="h-4 w-4 shrink-0" />

                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-sm truncate" style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: isActive ? 500 : 400 }}>
                    {item.label}
                  </span>
                  <span className="text-[10px] mt-0.5 truncate"
                    style={{
                      color: isActive ? 'oklch(0.50 0.21 27)' : 'oklch(0.72 0.018 65)',
                      fontFamily: 'var(--font-dm-mono)',
                      letterSpacing: '0.05em',
                    }}>
                    {item.labelEn}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 my-1" style={{ height: '1px', background: 'oklch(0.870 0.020 75)' }} />

        {/* Bottom user info */}
        {user && (
          <div className="px-3 py-3">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded"
              style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)' }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-sm font-bold"
                style={{ background: 'oklch(0.50 0.21 27)', color: 'oklch(0.992 0.004 80)', fontFamily: 'var(--font-noto-serif-jp)' }}>
                {user.name?.charAt(0) || '?'}
              </div>
              <div className="flex flex-col min-w-0 gap-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-medium truncate" style={{ color: 'oklch(0.18 0.018 52)' }}>
                    {user.name}
                  </span>
                  {user.grade && (
                    <span className="hanko text-[9px] shrink-0">
                      {GRADE_SHORT_LABELS[user.grade] || user.grade}
                    </span>
                  )}
                </div>
                <span className="text-[10px] truncate"
                  style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-dm-mono)' }}>
                  {user.employeeId || ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
