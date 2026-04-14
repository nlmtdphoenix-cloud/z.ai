'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  Activity,
  TrendingUp,
  Calendar,
  Plus,
  Edit,
  ArrowRight,
  Eye,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/api';
import { STATUS_LABELS, STATUS_COLORS, MONTHS_JA } from '@/lib/constants';
import type { Timesheet } from '@/lib/types';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${year}年${month}月${day}日（${dayOfWeek}）`;
}

export function DashboardView() {
  const { user } = useAuthStore();
  const { setView, setTimesheetId, setYearMonth } = useAppStore();
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
  const [recentTimesheets, setRecentTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const fetchCurrentTimesheet = useCallback(async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({
        employeeId: user.id,
        year: String(currentYear),
        month: String(currentMonth),
        includeEntries: 'true',
      });
      const res = await authFetch(`/api/timesheets?${params}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setCurrentTimesheet(Array.isArray(data) && data.length > 0 ? data[0] : null);
      }
    } catch {
      // silently fail
    }
  }, [user, currentYear, currentMonth]);

  const fetchRecentTimesheets = useCallback(async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({
        employeeId: user.id,
        limit: '3',
      });
      const res = await authFetch(`/api/timesheets?${params}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setRecentTimesheets(Array.isArray(data) ? data.slice(0, 3) : []);
      }
    } catch {
      // silently fail
    }
  }, [user]);

  const fetchPendingApprovals = useCallback(async () => {
    if (!user || !isManager) return;
    try {
      const res = await authFetch('/api/timesheets?status=SUBMITTED');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setPendingApprovals(Array.isArray(data) ? data.length : 0);
      }
    } catch { /* silent */ }
  }, [user, isManager]);

  useEffect(() => {
    Promise.all([fetchCurrentTimesheet(), fetchRecentTimesheets(), fetchPendingApprovals()]).finally(() => {
      setLoading(false);
    });
  }, [fetchCurrentTimesheet, fetchRecentTimesheets, fetchPendingApprovals]);

  const handleCreateTimesheet = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const res = await authFetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.id,
          year: currentYear,
          month: currentMonth,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setTimesheetId(data.id);
        setYearMonth(currentYear, currentMonth);
        setView('timesheet-edit');
      }
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleEditTimesheet = () => {
    if (!currentTimesheet) return;
    setTimesheetId(currentTimesheet.id);
    setYearMonth(currentTimesheet.year, currentTimesheet.month);
    setView('timesheet-edit');
  };

  const handleViewTimesheet = (ts: Timesheet) => {
    setTimesheetId(ts.id);
    setYearMonth(ts.year, ts.month);
    setView('timesheet-edit');
  };

  const annualLeaveTotal = currentTimesheet
    ? currentTimesheet.annualLeaveAM + currentTimesheet.annualLeavePM + (currentTimesheet.annualLeaveFull || 0)
    : 0;

  const statCards = [
    {
      label: '今月の勤務日数',
      value: currentTimesheet ? String(currentTimesheet.totalWorkDays) : '0',
      unit: '日',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: '今月の総労働時間',
      value: currentTimesheet ? currentTimesheet.totalWorkHours.toFixed(1) : '0.0',
      unit: '時間',
      icon: Activity,
      color: 'bg-emerald-50 text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: '残業時間',
      value: currentTimesheet ? currentTimesheet.totalOvertimeHours.toFixed(1) : '0.0',
      unit: '時間',
      icon: TrendingUp,
      color: 'bg-amber-50 text-amber-600',
      iconBg: 'bg-amber-100',
    },
    {
      label: '有給休暇',
      value: String(annualLeaveTotal),
      unit: '日',
      icon: Calendar,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            ようこそ、{user?.name ?? ''}さん
          </h1>
          <p className="text-muted-foreground mt-1">{formatDate(now)}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {currentYear}年{MONTHS_JA[currentMonth]}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label}>
            <Card className={`${card.color} border-0 shadow-sm`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className={`${card.iconBg} rounded-full p-2.5 flex items-center justify-center shrink-0`}
                >
                  <card.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium opacity-70">{card.label}</p>
                  <p className="text-2xl font-bold mt-0.5">
                    {card.value}
                    <span className="text-sm font-normal ml-1">{card.unit}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Manager: Pending Approvals Alert */}
      {isManager && pendingApprovals > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 cursor-pointer hover:bg-amber-50 transition-colors" onClick={() => setView('approval')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2.5 flex items-center justify-center shrink-0">
              <ClipboardCheck className="size-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">承認待ちの勤務表があります</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {pendingApprovals}件の勤務表が承認を待っています
              </p>
            </div>
            <ArrowRight className="size-4 text-amber-400 shrink-0" />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {!currentTimesheet && (
          <Button onClick={handleCreateTimesheet} disabled={creating}>
            {creating ? (
              <span className="animate-pulse">作成中...</span>
            ) : (
              <>
                <Plus className="size-4" />
                今月の勤務表を作成
              </>
            )}
          </Button>
        )}
        {currentTimesheet && currentTimesheet.status === 'DRAFT' && (
          <Button onClick={handleEditTimesheet}>
            <Edit className="size-4" />
            勤務表を編集
          </Button>
        )}
        {currentTimesheet && currentTimesheet.status !== 'DRAFT' && (
          <Button variant="outline" onClick={handleEditTimesheet}>
            <Eye className="size-4" />
            勤務表を表示
          </Button>
        )}
        <Button variant="outline" onClick={() => setView('timesheet')}>
          <FileText className="size-4" />
          勤務表一覧
        </Button>
      </div>

      {/* Current Timesheet Status */}
      {currentTimesheet && (
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">今月の勤務表ステータス</CardTitle>
                <Badge className={STATUS_COLORS[currentTimesheet.status]}>
                  {STATUS_LABELS[currentTimesheet.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">勤務日数</p>
                <p className="font-semibold">{currentTimesheet.totalWorkDays}日</p>
              </div>
              <div>
                <p className="text-muted-foreground">総労働時間</p>
                <p className="font-semibold">{currentTimesheet.totalWorkHours.toFixed(1)}時間</p>
              </div>
              <div>
                <p className="text-muted-foreground">残業時間</p>
                <p className="font-semibold">{currentTimesheet.totalOvertimeHours.toFixed(1)}時間</p>
              </div>
              <div>
                <p className="text-muted-foreground">休出日数</p>
                <p className="font-semibold">{currentTimesheet.holidayWorkDays}日</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">最近の勤務表</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('timesheet')}>
                すべて表示
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTimesheets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">勤務表がまだありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTimesheets.map((ts) => (
                  <button
                    key={ts.id}
                    onClick={() => handleViewTimesheet(ts)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-10 rounded-lg bg-muted">
                        <FileText className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {ts.year}年{MONTHS_JA[ts.month]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          勤務 {ts.totalWorkDays}日 / {ts.totalWorkHours.toFixed(1)}時間
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[ts.status]}>
                        {STATUS_LABELS[ts.status]}
                      </Badge>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


