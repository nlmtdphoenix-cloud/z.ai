'use client';

import { Fragment, useEffect, useState, useCallback, useMemo } from 'react';
// motion removed for stability
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  RefreshCcw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/api';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  MONTHS_JA,
  DAY_OF_WEEK_JA,
  WORK_TYPE_LABELS,
  WORK_TYPE_COLORS,
  STANDARD_WORK_HOURS,
  DEFAULT_BREAK_MINUTES,
  isPublicHoliday,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_COLORS,
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_COLORS,
} from '@/lib/constants';
import {
  calculateWorkHours,
  calculateOvertime,
  calculateOverUnder,
  calculateMonthlyCumulative,
} from '@/lib/calculations';
import type {
  Timesheet,
  TimesheetEntry,
  WorkType,
  ReportType,
  WorkTask,
  TaskCategory,
} from '@/lib/types';
import { toast } from 'sonner';

// ---- Helpers ----

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

function isWeekend(year: number, month: number, day: number): boolean {
  const dow = getDayOfWeek(year, month, day);
  return dow === 0 || dow === 6;
}

function padDay(d: number): string {
  return String(d).padStart(2, '0');
}

// Empty entry template for a new day
function emptyEntry(day: number, workType: WorkType = 'REGULAR'): TimesheetEntry {
  return {
    id: '',
    timesheetId: '',
    day,
    workType,
    startTime: '',
    endTime: '',
    workHours: 0,
    breakMinutes: DEFAULT_BREAK_MINUTES,
    overtimeHours: 0,
    holidayWorkHours: 0,
    workContent: '',
    overUnder: 0,
    tasks: [],
  };
}

// ─── Smart Time Helpers ───
const START_TIME_OPTIONS = [
  { label: '8:30', value: '08:30' },
  { label: '9:00', value: '09:00' },
];

const END_TIME_MAP: Record<string, string> = {
  '08:30': '17:30',
  '09:00': '18:00',
};

// Check if an entry has any data that can be cleared
function hasClearData(entry: TimesheetEntry): boolean {
  if (entry.startTime || entry.endTime || entry.workContent) return true;
  if (entry.breakMinutes !== undefined && entry.breakMinutes !== 0 && entry.breakMinutes !== DEFAULT_BREAK_MINUTES) return true;
  if (entry.tasks && entry.tasks.length > 0) return true;
  return false;
}

// Empty task template
function emptyTask(): WorkTask {
  return {
    id: '',
    timesheetEntryId: '',
    project: '',
    category: 'OTHER',
    hours: 0,
    createdAt: '',
    updatedAt: '',
  };
}

// ---- Main Component ----

export function TimesheetEditView() {
  const { user } = useAuthStore();
  const { setView, selectedTimesheetId, selectedYear, selectedMonth } = useAppStore();

  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportTypeSaving, setReportTypeSaving] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const year = selectedYear;
  const month = selectedMonth;
  const daysInMonth = getDaysInMonth(year, month);

  // ---- Fetch timesheet & entries ----
  const fetchTimesheet = useCallback(async () => {
    if (!selectedTimesheetId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/timesheets/${selectedTimesheetId}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setTimesheet(data);
        setEntries(
          (data.entries || []).map((e: TimesheetEntry) => ({
            ...e,
            tasks: e.tasks || [],
          }))
        );
      } else {
        toast.error('勤務表の取得に失敗しました');
        setView('timesheet');
      }
    } catch {
      toast.error('通信エラーが発生しました');
      setView('timesheet');
    } finally {
      setLoading(false);
    }
  }, [selectedTimesheetId, setView]);

  useEffect(() => {
    fetchTimesheet();
  }, [fetchTimesheet]);

  // ---- Lookup map for entries by day ----
  const entryMap = useMemo(() => {
    const map = new Map<number, TimesheetEntry>();
    for (const e of entries) {
      map.set(e.day, e);
    }
    return map;
  }, [entries]);

  // ---- Get or create entry for a day ----
  const getOrCreateEntry = (day: number): TimesheetEntry => {
    const existing = entryMap.get(day);
    if (existing) return existing;

    // Determine default work type based on day
    const dow = getDayOfWeek(year, month, day);
    const isHol = isWeekend(year, month, day) || isPublicHoliday(year, month, day);
    const defaultType: WorkType = isHol ? 'PUBLIC_HOLIDAY' : 'REGULAR';
    return emptyEntry(day, defaultType);
  };

  // ---- Update a single field of an entry ----
  const updateEntryField = (day: number, field: keyof TimesheetEntry, value: unknown) => {
    setEntries((prev) => {
      const existing = prev.find((e) => e.day === day);
      let updated: TimesheetEntry;

      if (existing) {
        updated = { ...existing, [field]: value };
      } else {
        updated = { ...emptyEntry(day), [field]: value };
      }

      // Recalculate computed fields when time changes
      if (field === 'startTime' || field === 'endTime' || field === 'breakMinutes' || field === 'workType') {
        // Auto-fill endTime when startTime is set
        if (field === 'startTime' && String(value)) {
          const autoEnd = END_TIME_MAP[String(value)];
          if (autoEnd) updated.endTime = autoEnd;
        }

        const startTime = String(updated.startTime || '');
        const endTime = String(updated.endTime || '');
        const breakMin = Number(updated.breakMinutes) || 0;
        const workH = calculateWorkHours(startTime, endTime, breakMin);
        const over = calculateOverUnder(workH);
        const overtime = calculateOvertime(workH);
        const holWorkH = updated.workType === 'HOLIDAY_WORK' ? workH : 0;

        updated.workHours = workH;
        updated.overtimeHours = overtime;
        updated.holidayWorkHours = holWorkH;
        updated.overUnder = over;

        // If work type is non-working, zero out times
        if (updated.workType === 'PUBLIC_HOLIDAY' || updated.workType === 'ANNUAL_LEAVE_FULL' || updated.workType === 'ABSENCE' || updated.workType === 'SPECIAL_LEAVE' || updated.workType === 'COMPENSATORY_LEAVE') {
          updated.workHours = 0;
          updated.overtimeHours = 0;
          updated.holidayWorkHours = 0;
          updated.overUnder = 0;
          updated.breakMinutes = 0;
        } else if (updated.workType === 'REGULAR' || updated.workType === 'HOLIDAY_WORK') {
          // Reset break to default when switching back to a working type
          if (!existing || existing.workType !== updated.workType) {
            if (!updated.breakMinutes || updated.breakMinutes === 0) {
              updated.breakMinutes = DEFAULT_BREAK_MINUTES;
            }
          }
        }
      }

      // Merge into array
      const idx = prev.findIndex((e) => e.day === day);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  };

  // ---- Clear a single row's time data ----
  const clearEntryTimes = useCallback((day: number) => {
    setEntries((prev) => {
      const existing = prev.find((e) => e.day === day);
      if (existing) {
        // Entry exists in array — update it
        return prev.map((entry) => {
          if (entry.day !== day) return entry;
          return {
            ...entry,
            startTime: '',
            endTime: '',
            breakMinutes: DEFAULT_BREAK_MINUTES,
            workHours: 0,
            overtimeHours: 0,
            holidayWorkHours: 0,
            overUnder: 0,
            workContent: '',
            tasks: [],
          };
        });
      }
      // Entry not in array — nothing to clear
      return prev;
    });
  }, []);

  // ---- Report Type change handler ----
  const handleReportTypeChange = async (value: string) => {
    if (!selectedTimesheetId || value === timesheet?.reportType) return;
    setReportTypeSaving(true);
    try {
      const res = await authFetch(`/api/timesheets/${selectedTimesheetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: value }),
      });
      if (res.ok) {
        toast.success('報告種別を変更しました');
        setTimesheet((prev) => (prev ? { ...prev, reportType: value as ReportType } : prev));
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || '変更に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setReportTypeSaving(false);
    }
  };

  // ---- Toggle day expansion for tasks ----
  const toggleDayExpanded = (day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  // ---- Task management ----
  const addTask = (day: number) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.day === day);
      if (idx < 0) {
        const newEntry = { ...emptyEntry(day), tasks: [emptyTask()] };
        return [...prev, newEntry];
      }
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        tasks: [...(next[idx].tasks || []), emptyTask()],
      };
      return next;
    });
    // Auto-expand
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.add(day);
      return next;
    });
  };

  const removeTask = (day: number, taskIndex: number) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.day === day);
      if (idx < 0) return prev;
      const next = [...prev];
      const entry = next[idx];
      const tasks = [...(entry.tasks || [])];
      tasks.splice(taskIndex, 1);
      next[idx] = { ...entry, tasks };
      return next;
    });
  };

  const updateTaskField = (day: number, taskIndex: number, field: keyof WorkTask, value: unknown) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.day === day);
      if (idx < 0) return prev;
      const next = [...prev];
      const entry = next[idx];
      const tasks = [...(entry.tasks || [])];
      tasks[taskIndex] = { ...tasks[taskIndex], [field]: value };
      next[idx] = { ...entry, tasks };
      return next;
    });
  };

  // ---- Task hours sum for a day ----
  const getTaskHoursSum = (day: number): number => {
    const entry = entryMap.get(day);
    if (!entry || !entry.tasks) return 0;
    return entry.tasks.reduce((sum, t) => sum + (t.hours || 0), 0);
  };

  // ---- Summary calculations ----
  const summary = useMemo(() => {
    let totalWorkDays = 0;
    let totalOvertimeHours = 0;
    let annualLeaveAM = 0;
    let annualLeavePM = 0;
    let annualLeaveFull = 0;
    let holidayWorkDays = 0;
    let holidayWorkHours = 0;
    let specialLeave = 0;
    let absenceDays = 0;
    let totalWorkHours = 0;

    for (const e of entries) {
      switch (e.workType) {
        case 'REGULAR':
          if (e.workHours > 0) totalWorkDays += 1;
          totalWorkHours += e.workHours;
          totalOvertimeHours += e.overtimeHours;
          break;
        case 'HOLIDAY_WORK':
          holidayWorkDays += 1;
          holidayWorkHours += e.holidayWorkHours;
          totalWorkHours += e.workHours;
          totalWorkDays += 1;
          break;
        case 'ANNUAL_LEAVE_FULL':
          annualLeaveFull += 1;
          break;
        case 'ANNUAL_LEAVE_AM':
          annualLeaveAM += 1;
          break;
        case 'ANNUAL_LEAVE_PM':
          annualLeavePM += 1;
          break;
        case 'SPECIAL_LEAVE':
          specialLeave += 1;
          break;
        case 'ABSENCE':
          absenceDays += 1;
          break;
        default:
          break;
      }
    }

    return {
      totalWorkDays: Math.round(totalWorkDays * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      annualLeaveAM,
      annualLeavePM,
      annualLeaveFull,
      holidayWorkDays,
      holidayWorkHours: Math.round(holidayWorkHours * 100) / 100,
      specialLeave,
      absenceDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
    };
  }, [entries]);

  // ---- Project summary ----
  const projectSummary = useMemo(() => {
    const projectMap = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.tasks) continue;
      for (const task of entry.tasks) {
        if (!task.project || task.project.trim() === '') continue;
        const current = projectMap.get(task.project) || 0;
        projectMap.set(task.project, current + (task.hours || 0));
      }
    }
    const result: { project: string; hours: number }[] = [];
    for (const [project, hours] of projectMap.entries()) {
      result.push({ project, hours: Math.round(hours * 100) / 100 });
    }
    result.sort((a, b) => b.hours - a.hours);
    return result;
  }, [entries]);

  // ---- Save entries ----
  const handleSave = async () => {
    if (!selectedTimesheetId) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/timesheets/${selectedTimesheetId}/entries`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (res.ok) {
        toast.success('保存しました');
        fetchTimesheet();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || '保存に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // ---- Submit for approval ----
  const handleSubmit = async () => {
    if (!selectedTimesheetId) return;
    setSubmitting(true);
    try {
      // Save entries first
      const saveRes = await authFetch(`/api/timesheets/${selectedTimesheetId}/entries`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (!saveRes.ok) {
        const json = await saveRes.json().catch(() => ({}));
        toast.error(json.error || '保存に失敗しました');
        setSubmitting(false);
        return;
      }

      // Then submit
      const subRes = await authFetch(`/api/timesheets/${selectedTimesheetId}/submit`, {
        method: 'POST',
      });
      if (subRes.ok) {
        toast.success('提出しました');
        setConfirmOpen(false);
        fetchTimesheet();
      } else {
        const json = await subRes.json().catch(() => ({}));
        toast.error(json.error || '提出に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Resubmit from REJECTED ----
  const handleResubmit = async () => {
    if (!selectedTimesheetId) return;
    setSubmitting(true);
    try {
      // Save entries
      const saveRes = await authFetch(`/api/timesheets/${selectedTimesheetId}/entries`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (!saveRes.ok) {
        const saveJson = await saveRes.json().catch(() => ({}));
        toast.error(saveJson.error || '保存に失敗しました');
        return;
      }

      // Reset to DRAFT first then submit
      const resetRes = await authFetch(`/api/timesheets/${selectedTimesheetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DRAFT', managerComment: '' }),
      });
      if (!resetRes.ok) {
        const resetJson = await resetRes.json().catch(() => ({}));
        toast.error(resetJson.error || 'ステータスのリセットに失敗しました');
        return;
      }

      const subRes = await authFetch(`/api/timesheets/${selectedTimesheetId}/submit`, {
        method: 'POST',
      });
      if (subRes.ok) {
        toast.success('再提出しました');
        fetchTimesheet();
      } else {
        const subJson = await subRes.json().catch(() => ({}));
        toast.error(subJson.error || '提出に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = timesheet?.status !== 'DRAFT' && timesheet?.status !== 'REJECTED';
  const isDraft = timesheet?.status === 'DRAFT';
  const status = timesheet?.status || 'DRAFT';
  const reportType = timesheet?.reportType || 'FULL';

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!timesheet) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="size-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-muted-foreground">勤務表が見つかりません</p>
        <Button variant="outline" className="mt-4" onClick={() => setView('timesheet')}>
          戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('timesheet')}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">
                {year}年{MONTHS_JA[month]} 勤務表
              </h1>
              {/* Feature 1: Report Type Badge */}
              <Badge className={`${REPORT_TYPE_COLORS[reportType as ReportType]} text-xs px-2.5 py-1`}>
                {REPORT_TYPE_LABELS[reportType as ReportType]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {timesheet.employee?.name}
              </span>
              <span className="text-xs text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground">
                {timesheet.employee?.employeeId}
              </span>
              <span className="text-xs text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground">
                {timesheet.employee?.department}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Feature 1: Report Type Selector */}
          {isDraft && (
            <Select
              value={reportType}
              onValueChange={handleReportTypeChange}
              disabled={reportTypeSaving || !isDraft}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                {reportTypeSaving ? (
                  <Loader2 className="size-3 animate-spin mr-1" />
                ) : null}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Badge className={`${STATUS_COLORS[status]} text-xs px-2.5 py-1`}>
            {STATUS_LABELS[status]}
          </Badge>
          {!isReadOnly && (
            <>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                保存
              </Button>
              <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={saving}>
                <Send className="size-4" />
                提出する
              </Button>
            </>
          )}
          {status === 'REJECTED' && (
            <Button size="sm" onClick={handleResubmit} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
              再提出
            </Button>
          )}
          {status === 'APPROVED' && (
            <div className="flex items-center gap-1 text-emerald-600 text-sm">
              <CheckCircle2 className="size-4" />
              <span className="font-medium">承認済み</span>
            </div>
          )}
          {status === 'SUBMITTED' && (
            <div className="flex items-center gap-1 text-amber-600 text-sm">
              <Clock className="size-4" />
              <span className="font-medium">審査中</span>
            </div>
          )}
        </div>
      </div>


      {/* Rejected comment */}
      {status === 'REJECTED' && timesheet.managerComment && (
        <div>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">差戻理由</p>
                  <p className="text-sm text-red-600 mt-1">{timesheet.managerComment}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2 text-center">
            <SummaryItem label="勤務日数" value={String(summary.totalWorkDays)} unit="日" />
            <SummaryItem label="総労働" value={summary.totalWorkHours.toFixed(1)} unit="h" highlight />
            <SummaryItem label="残業" value={summary.totalOvertimeHours.toFixed(1)} unit="h" warning={summary.totalOvertimeHours > 0} />
            <SummaryItem label="年休(午前)" value={String(summary.annualLeaveAM)} unit="日" />
            <SummaryItem label="年休(午後)" value={String(summary.annualLeavePM)} unit="日" />
            <SummaryItem label="年休(終日)" value={String(summary.annualLeaveFull)} unit="日" />
            <SummaryItem label="休出" value={String(summary.holidayWorkDays)} unit="日" />
            <SummaryItem label="休出時間" value={summary.holidayWorkHours.toFixed(1)} unit="h" />
            <SummaryItem label="特休" value={String(summary.specialLeave)} unit="日" />
            <SummaryItem label="欠勤" value={String(summary.absenceDays)} unit="日" danger={summary.absenceDays > 0} />
          </div>
        </CardContent>
      </Card>

      {/* Daily entries table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="size-4" />
            日別勤務実績
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="sticky left-0 bg-muted/30 z-10 px-3 py-2.5 text-center w-12 font-medium text-muted-foreground text-xs">日</th>
                  <th className="px-2 py-2.5 text-center w-10 font-medium text-muted-foreground text-xs">曜</th>
                  <th className="px-2 py-2.5 text-center w-28 font-medium text-muted-foreground text-xs">勤務区分</th>
                  <th className="px-2 py-2.5 text-center w-20 font-medium text-muted-foreground text-xs">始業</th>
                  <th className="px-2 py-2.5 text-center w-20 font-medium text-muted-foreground text-xs">終業</th>
                  <th className="px-2 py-2.5 text-center w-16 font-medium text-muted-foreground text-xs">休憩</th>
                  <th className="px-2 py-2.5 text-center w-16 font-medium text-muted-foreground text-xs">労働(H)</th>
                  <th className="px-2 py-2.5 text-center w-16 font-medium text-muted-foreground text-xs">過不足</th>
                  <th className="px-2 py-2.5 text-center w-16 font-medium text-muted-foreground text-xs">累計</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs min-w-[180px]">業務内容</th>
                  <th className="px-2 py-2.5 text-center w-10 font-medium text-muted-foreground text-xs">作業</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const entry = getOrCreateEntry(day);
                  const dow = getDayOfWeek(year, month, day);
                  const weekend = dow === 0 || dow === 6;
                  const isNonWork = entry.workType === 'PUBLIC_HOLIDAY' || entry.workType === 'ANNUAL_LEAVE_FULL' || entry.workType === 'ABSENCE' || entry.workType === 'SPECIAL_LEAVE' || entry.workType === 'COMPENSATORY_LEAVE';
                  const cumulative = calculateMonthlyCumulative(entries, day);
                  const rowClass = weekend ? 'bg-muted/10' : '';
                  const dowClass = weekend ? 'text-red-500 font-medium' : 'text-muted-foreground';
                  const hasTasks = entry.workHours > 0 && (entry.tasks || []).length > 0;
                  const isExpanded = expandedDays.has(day);
                  const taskHoursSum = getTaskHoursSum(day);
                  const taskHoursExceeded = entry.workHours > 0 && taskHoursSum > entry.workHours;

                  return (
                    <Fragment key={day}>
                      <tr className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${rowClass}`}>
                        {/* Day */}
                        <td className={`sticky left-0 z-10 px-3 py-2 text-center font-medium ${rowClass} ${weekend ? 'bg-muted/10' : 'bg-white'}`}>
                          {padDay(day)}
                        </td>
                        {/* Day of week */}
                        <td className={`px-2 py-2 text-center ${dowClass}`}>
                          {DAY_OF_WEEK_JA[dow]}
                        </td>
                        {/* Work type */}
                        <td className="px-2 py-2">
                          <Select
                            value={entry.workType}
                            onValueChange={(v) => updateEntryField(day, 'workType', v)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger className={`h-8 text-xs px-2 ${WORK_TYPE_COLORS[entry.workType as WorkType] || ''}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(WORK_TYPE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key} className="text-xs">
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        {/* Start time */}
                        <td className="px-2 py-2">
                          <Popover>
                            <PopoverTrigger asChild disabled={isReadOnly || isNonWork}>
                              <Input
                                type="time"
                                step="60"
                                value={entry.startTime}
                                onChange={(e) => updateEntryField(day, 'startTime', e.target.value)}
                                disabled={isReadOnly || isNonWork}
                                className="h-8 text-xs text-center px-1 cursor-pointer"
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-1.5" align="start">
                              <div className="flex gap-1">
                                {START_TIME_OPTIONS.map((t) => (
                                  <button
                                    key={t.value}
                                    className="text-xs px-3 py-1.5 rounded-md hover:bg-muted text-center transition-colors font-medium"
                                    onClick={() => updateEntryField(day, 'startTime', t.value)}
                                  >
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        {/* End time */}
                        <td className="px-2 py-2">
                          <Input
                            type="time"
                            step="60"
                            value={entry.endTime}
                            onChange={(e) => updateEntryField(day, 'endTime', e.target.value)}
                            disabled={isReadOnly || isNonWork}
                            className="h-8 text-xs text-center px-1"
                          />
                        </td>
                        {/* Break */}
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={entry.breakMinutes || 0}
                            onChange={(e) => updateEntryField(day, 'breakMinutes', parseInt(e.target.value) || 0)}
                            disabled={isReadOnly || isNonWork}
                            className="h-8 text-xs text-center px-1"
                            min={0}
                            step={15}
                          />
                        </td>
                        {/* Work hours */}
                        <td className={`px-2 py-2 text-center font-mono text-xs ${entry.workHours > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                          {entry.workHours > 0 ? entry.workHours.toFixed(1) : ''}
                        </td>
                        {/* Over/Under */}
                        <td className={`px-2 py-2 text-center font-mono text-xs ${entry.overUnder > 0 ? 'text-red-600 font-medium' : entry.overUnder < 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                          {entry.workHours > 0 ? (entry.overUnder > 0 ? '+' : '') + entry.overUnder.toFixed(1) : ''}
                        </td>
                        {/* Cumulative */}
                        <td className={`px-2 py-2 text-center font-mono text-xs ${cumulative > 0 ? 'text-red-600' : cumulative < 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                          {cumulative !== 0 ? (cumulative > 0 ? '+' : '') + cumulative.toFixed(1) : ''}
                        </td>
                        {/* Work content */}
                        <td className="px-2 py-2">
                          <Input
                            value={entry.workContent}
                            onChange={(e) => updateEntryField(day, 'workContent', e.target.value)}
                            disabled={isReadOnly}
                            placeholder="業務内容..."
                            className="h-8 text-xs"
                          />
                        </td>
                        {/* Task toggle button */}
                        <td className="px-2 py-2 text-center">
                          {entry.workHours > 0 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${hasTasks ? 'text-blue-600' : 'text-muted-foreground'}`}
                              onClick={() => toggleDayExpanded(day)}
                              disabled={isReadOnly}
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </td>
                        {/* Clear row */}
                        <td className="px-1 py-2">
                          {!isReadOnly && hasClearData(entry) ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50"
                              onClick={() => clearEntryTimes(day)}
                              title="クリア"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                      {/* Feature 2: Expanded task rows */}
                        {isExpanded && entry.workHours > 0 && (
                          <tr
                            key={`tasks-${day}`}
                            className="border-b last:border-0"
                          >
                            <td colSpan={11} className="p-0">
                              <div className="bg-blue-50/40 px-4 py-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <ClipboardList className="size-3.5" />
                                    作業タスク ({padDay(day)}日)
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {taskHoursExceeded && (
                                      <span className="text-xs text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="size-3" />
                                        タスク合計({taskHoursSum.toFixed(1)}h)が労働時間({entry.workHours.toFixed(1)}h)を超えています
                                      </span>
                                    )}
                                    {!isReadOnly && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs px-2"
                                        onClick={() => addTask(day)}
                                      >
                                        <Plus className="size-3 mr-0.5" />
                                        タスク追加
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {(!entry.tasks || entry.tasks.length === 0) ? (
                                  <p className="text-xs text-muted-foreground py-2 text-center">
                                    タスクがありません。「タスク追加」で追加してください。
                                  </p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {entry.tasks.map((task, tIdx) => (
                                      <div key={task.id || tIdx} className="flex items-center gap-2 bg-white rounded-md border px-2 py-1.5">
                                        {/* Category select */}
                                        <Select
                                          value={task.category}
                                          onValueChange={(v) => updateTaskField(day, tIdx, 'category', v)}
                                          disabled={isReadOnly}
                                        >
                                          <SelectTrigger className={`h-7 w-[100px] text-xs px-1.5 flex-shrink-0 ${TASK_CATEGORY_COLORS[task.category as TaskCategory] || ''}`}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(TASK_CATEGORY_LABELS).map(([key, label]) => (
                                              <SelectItem key={key} value={key} className="text-xs">
                                                {label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        {/* Project name input */}
                                        <Input
                                          value={task.project}
                                          onChange={(e) => updateTaskField(day, tIdx, 'project', e.target.value)}
                                          disabled={isReadOnly}
                                          placeholder="プロジェクト名..."
                                          className="h-7 text-xs flex-1 min-w-[120px]"
                                        />
                                        {/* Hours input */}
                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                          <Input
                                            type="number"
                                            value={task.hours || 0}
                                            onChange={(e) => updateTaskField(day, tIdx, 'hours', parseFloat(e.target.value) || 0)}
                                            disabled={isReadOnly}
                                            className="h-7 text-xs text-center w-16"
                                            min={0}
                                            step={0.5}
                                          />
                                          <span className="text-[10px] text-muted-foreground">h</span>
                                        </div>
                                        {/* Delete button */}
                                        {!isReadOnly && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-red-600 flex-shrink-0"
                                            onClick={() => removeTask(day, tIdx)}
                                          >
                                            <Trash2 className="size-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-medium">
                  <td colSpan={6} className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                    当月合計
                  </td>
                  <td className="px-2 py-2.5 text-center text-xs font-mono">
                    {summary.totalWorkHours.toFixed(1)}
                  </td>
                  <td className={`px-2 py-2.5 text-center text-xs font-mono ${summary.totalOvertimeHours > 0 ? 'text-red-600' : ''}`}>
                    {summary.totalOvertimeHours > 0 ? '+' + summary.totalOvertimeHours.toFixed(1) : '0.0'}
                  </td>
                  <td />
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="p-3 space-y-2">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const entry = getOrCreateEntry(day);
                  const dow = getDayOfWeek(year, month, day);
                  const weekend = dow === 0 || dow === 6;
                  const isNonWork = entry.workType === 'PUBLIC_HOLIDAY' || entry.workType === 'ANNUAL_LEAVE_FULL' || entry.workType === 'ABSENCE' || entry.workType === 'SPECIAL_LEAVE' || entry.workType === 'COMPENSATORY_LEAVE';
                  const dowClass = weekend ? 'text-red-500 font-medium' : 'text-muted-foreground';
                  const isExpanded = expandedDays.has(day);
                  const hasTasks = entry.workHours > 0 && (entry.tasks || []).length > 0;
                  const taskHoursSum = getTaskHoursSum(day);
                  const taskHoursExceeded = entry.workHours > 0 && taskHoursSum > entry.workHours;

                  return (
                    <div key={day} className={`rounded-lg border p-3 space-y-2 ${weekend ? 'bg-muted/20' : 'bg-white'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{padDay(day)}</span>
                          <span className={`text-xs ${dowClass}`}>（{DAY_OF_WEEK_JA[dow]}）</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isReadOnly && hasClearData(entry) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50"
                              onClick={() => clearEntryTimes(day)}
                              title="クリア"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                          {entry.workHours > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${hasTasks ? 'text-blue-600' : 'text-muted-foreground'}`}
                              onClick={() => toggleDayExpanded(day)}
                              disabled={isReadOnly}
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </Button>
                          )}
                          <Select
                            value={entry.workType}
                            onValueChange={(v) => updateEntryField(day, 'workType', v)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger className={`h-7 text-xs px-2 w-24 ${WORK_TYPE_COLORS[entry.workType as WorkType] || ''}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(WORK_TYPE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key} className="text-xs">
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {!isNonWork && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-muted-foreground">始業</label>
                            <Popover>
                              <PopoverTrigger asChild disabled={isReadOnly}>
                                <Input type="time" step="60" value={entry.startTime} onChange={(e) => updateEntryField(day, 'startTime', e.target.value)} disabled={isReadOnly} className="h-7 text-xs cursor-pointer" />
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-1.5" align="start">
                                <div className="flex gap-1">
                                  {START_TIME_OPTIONS.map((t) => (
                                    <button
                                      key={t.value}
                                      className="text-xs px-3 py-1.5 rounded-md hover:bg-muted text-center transition-colors font-medium"
                                      onClick={() => updateEntryField(day, 'startTime', t.value)}
                                    >
                                      {t.label}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-muted-foreground">終業</label>
                            <Input type="time" step="60" value={entry.endTime} onChange={(e) => updateEntryField(day, 'endTime', e.target.value)} disabled={isReadOnly} className="h-7 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-muted-foreground">休憩(分)</label>
                            <Input type="number" value={entry.breakMinutes || 0} onChange={(e) => updateEntryField(day, 'breakMinutes', parseInt(e.target.value) || 0)} disabled={isReadOnly} className="h-7 text-xs" min={0} />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        {entry.workHours > 0 && (
                          <>
                            <span className="font-mono">労働: <strong>{entry.workHours.toFixed(1)}h</strong></span>
                            <span className={`font-mono ${entry.overUnder > 0 ? 'text-red-600' : entry.overUnder < 0 ? 'text-blue-600' : ''}`}>
                              過不足: {entry.overUnder > 0 ? '+' : ''}{entry.overUnder.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>
                      <Textarea
                        value={entry.workContent}
                        onChange={(e) => updateEntryField(day, 'workContent', e.target.value)}
                        disabled={isReadOnly}
                        placeholder="業務内容..."
                        className="text-xs min-h-[32px] py-1 px-2"
                        rows={1}
                      />

                      {/* Feature 2: Mobile task section */}
                        {isExpanded && entry.workHours > 0 && (
                          <div className="overflow-hidden">
                            <div className="bg-blue-50/40 rounded-md border px-2.5 py-2 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                  <ClipboardList className="size-3" />
                                  作業タスク
                                </span>
                                {!isReadOnly && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5"
                                    onClick={() => addTask(day)}
                                  >
                                    <Plus className="size-3 mr-0.5" />
                                    追加
                                  </Button>
                                )}
                              </div>
                              {taskHoursExceeded && (
                                <div className="flex items-center gap-1 text-[10px] text-red-600">
                                  <AlertTriangle className="size-3" />
                                  タスク合計({taskHoursSum.toFixed(1)}h)が労働時間を超過
                                </div>
                              )}
                              {(!entry.tasks || entry.tasks.length === 0) ? (
                                <p className="text-[10px] text-muted-foreground text-center py-1">
                                  タスクがありません
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {entry.tasks.map((task, tIdx) => (
                                    <div key={task.id || tIdx} className="space-y-1 bg-white rounded border p-2">
                                      <div className="flex items-center gap-1.5">
                                        <Select
                                          value={task.category}
                                          onValueChange={(v) => updateTaskField(day, tIdx, 'category', v)}
                                          disabled={isReadOnly}
                                        >
                                          <SelectTrigger className={`h-6 text-[10px] px-1.5 w-20 flex-shrink-0 ${TASK_CATEGORY_COLORS[task.category as TaskCategory] || ''}`}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(TASK_CATEGORY_LABELS).map(([key, label]) => (
                                              <SelectItem key={key} value={key} className="text-xs">
                                                {label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          value={task.project}
                                          onChange={(e) => updateTaskField(day, tIdx, 'project', e.target.value)}
                                          disabled={isReadOnly}
                                          placeholder="プロジェクト名"
                                          className="h-6 text-[10px] flex-1"
                                        />
                                        <Input
                                          type="number"
                                          value={task.hours || 0}
                                          onChange={(e) => updateTaskField(day, tIdx, 'hours', parseFloat(e.target.value) || 0)}
                                          disabled={isReadOnly}
                                          className="h-6 text-[10px] text-center w-14"
                                          min={0}
                                          step={0.5}
                                        />
                                        <span className="text-[9px] text-muted-foreground">h</span>
                                        {!isReadOnly && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-red-600"
                                            onClick={() => removeTask(day, tIdx)}
                                          >
                                            <Trash2 className="size-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Feature 3: Project Summary Section */}
      {projectSummary.length > 0 && (
        <div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="size-4" />
                プロジェクト別集計
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">プロジェクト</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs w-24">合計時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectSummary.map((item, idx) => (
                      <tr
                        key={item.project}
                        className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                      >
                        <td className="px-4 py-2.5 text-xs">{item.project}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-medium">
                          {item.hours.toFixed(1)}<span className="text-muted-foreground ml-0.5">h</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/30 font-medium">
                      <td className="px-4 py-2.5 text-xs">合計</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {projectSummary.reduce((sum, p) => sum + p.hours, 0).toFixed(1)}<span className="text-muted-foreground ml-0.5">h</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom summary for mobile */}
      <div className="md:hidden">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">総労働時間</p>
                <p className="font-bold text-lg">{summary.totalWorkHours.toFixed(1)}<span className="text-xs font-normal ml-0.5">h</span></p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">残業時間</p>
                <p className={`font-bold text-lg ${summary.totalOvertimeHours > 0 ? 'text-red-600' : ''}`}>{summary.totalOvertimeHours.toFixed(1)}<span className="text-xs font-normal ml-0.5">h</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-5" />
              勤務表の提出確認
            </DialogTitle>
            <DialogDescription>
              {year}年{MONTHS_JA[month]}の勤務表を提出しますか？
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
            <p>勤務日数: {summary.totalWorkDays}日</p>
            <p>総労働時間: {summary.totalWorkHours.toFixed(1)}時間</p>
            <p>残業時間: {summary.totalOvertimeHours.toFixed(1)}時間</p>
            <p>報告種別: {REPORT_TYPE_LABELS[reportType as ReportType]}</p>
            {projectSummary.length > 0 && (
              <p>登録タスク: {projectSummary.length}プロジェクト</p>
            )}
            {summary.absenceDays > 0 && <p className="text-destructive">欠勤: {summary.absenceDays}日</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              提出する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Sub-components ----

function SummaryItem({
  label,
  value,
  unit,
  highlight,
  warning,
  danger,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/30 px-2 py-2">
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? 'text-emerald-600' : warning ? 'text-amber-600' : danger ? 'text-red-600' : ''}`}>
        {value}
        <span className="text-[10px] font-normal ml-0.5">{unit}</span>
      </p>
    </div>
  );
}
