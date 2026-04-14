import { create } from 'zustand';

export type AppView = 'login' | 'dashboard' | 'timesheet' | 'timesheet-edit' | 'approval' | 'employees' | 'organization' | 'settings';

interface AppState {
  currentView: AppView;
  selectedTimesheetId: string | null;
  selectedYear: number;
  selectedMonth: number;
  sidebarOpen: boolean;
  setView: (view: AppView) => void;
  setTimesheetId: (id: string | null) => void;
  setYearMonth: (year: number, month: number) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'login',
  selectedTimesheetId: null,
  selectedYear: 2026,
  selectedMonth: 2,
  sidebarOpen: false,
  setView: (view) => set({ currentView: view }),
  setTimesheetId: (id) => set({ selectedTimesheetId: id }),
  setYearMonth: (year, month) => set({ selectedYear: year, selectedMonth: month }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
