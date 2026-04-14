'use client';

import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { LoginPage } from '@/components/login-page';
import { DashboardView } from '@/components/dashboard-view';
import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { TimesheetListView } from '@/components/timesheet-list-view';
import { TimesheetEditView } from '@/components/timesheet-edit-view';
import { ApprovalView } from '@/components/approval-view';
import { EmployeesView } from '@/components/employees-view';
import { OrganizationView } from '@/components/organization-view';
import { SettingsView } from '@/components/settings-view';
import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentView = useAppStore((s) => s.currentView);

  // Show login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Render authenticated app layout
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto md:ml-64">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
            <ViewRouter view={currentView} />
          </div>
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

function ViewRouter({ view }: { view: string }) {
  switch (view) {
    case 'dashboard':
      return <DashboardView />;
    case 'timesheet':
      return <TimesheetListView />;
    case 'timesheet-edit':
      return <TimesheetEditView />;
    case 'approval':
      return <ApprovalView />;
    case 'employees':
      return <EmployeesView />;
    case 'organization':
      return <OrganizationView />;
    case 'settings':
      return <SettingsView />;
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
  }
}
