'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  Filter,
  Eye,
  Edit3,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/api';
import { STATUS_LABELS, STATUS_COLORS, MONTHS_JA, REPORT_TYPE_LABELS, REPORT_TYPE_COLORS } from '@/lib/constants';
import type { Timesheet } from '@/lib/types';
import { toast } from 'sonner';

export function TimesheetListView() {
  const { user } = useAuthStore();
  const { setView, setTimesheetId, setYearMonth } = useAppStore();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

  const fetchTimesheets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ employeeId: user.id });
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const res = await authFetch(`/api/timesheets?${params}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setTimesheets(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('勤務表の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user, filterStatus]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  const filteredTimesheets = timesheets.filter((ts) => {
    if (yearFilter && ts.year !== yearFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const monthLabel = MONTHS_JA[ts.month] || '';
      const statusLabel = STATUS_LABELS[ts.status] || '';
      return (
        `${ts.year}${monthLabel}`.toLowerCase().includes(term) ||
        statusLabel.toLowerCase().includes(term) ||
        (ts.reportType || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleCreateTimesheet = async () => {
    if (!user) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const res = await authFetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: user.id, year, month }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status === 409) {
          toast.error(`${MONTHS_JA[month]}の勤務表は既に存在します`);
        } else {
          toast.error(json.error || '作成に失敗しました');
        }
        return;
      }

      const json = await res.json();
      const ts = json.data || json;
      setTimesheetId(ts.id);
      setYearMonth(ts.year, ts.month);
      setView('timesheet-edit');
      toast.success('勤務表を作成しました');
    } catch {
      toast.error('通信エラーが発生しました');
    }
  };

  const handleViewTimesheet = (ts: Timesheet) => {
    setTimesheetId(ts.id);
    setYearMonth(ts.year, ts.month);
    setView('timesheet-edit');
  };

  const handleDeleteTimesheet = async (e: React.MouseEvent, ts: Timesheet) => {
    e.stopPropagation();
    if (!confirm(`この勤務表（${ts.year}年${MONTHS_JA[ts.month]}）を削除しますか？`)) return;

    try {
      const res = await authFetch(`/api/timesheets/${ts.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('削除しました');
        fetchTimesheets();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || '削除に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    }
  };

  const years = Array.from(new Set(timesheets.map((ts) => ts.year))).sort((a, b) => b - a);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Clock className="size-3.5" />;
      case 'SUBMITTED': return <Send className="size-3.5" />;
      case 'APPROVED': return <CheckCircle2 className="size-3.5" />;
      case 'REJECTED': return <XCircle className="size-3.5" />;
      default: return <AlertCircle className="size-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">勤務表一覧</h1>
          <p className="text-sm text-muted-foreground mt-1">
            月次勤務表の作成・確認・提出を行います
          </p>
        </div>
        <Button onClick={handleCreateTimesheet}>
          <Plus className="size-4" />
          新規作成
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="DRAFT">下書き</SelectItem>
                <SelectItem value="SUBMITTED">提出済</SelectItem>
                <SelectItem value="APPROVED">承認済</SelectItem>
                <SelectItem value="REJECTED">差戻し</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(yearFilter)} onValueChange={(v) => setYearFilter(Number(v))}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="年度" />
              </SelectTrigger>
              <SelectContent>
                {years.length > 0 ? (
                  years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
                  ))
                ) : (
                  <SelectItem value={String(new Date().getFullYear())}>{new Date().getFullYear()}年</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timesheet List */}
      {filteredTimesheets.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="size-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-muted-foreground">勤務表がありません</h3>
          <p className="text-sm text-muted-foreground mt-1">
            「新規作成」ボタンから今月の勤務表を作成しましょう
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTimesheets.map((ts) => (
            <div key={ts.id}>
              <Card
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/20"
                onClick={() => handleViewTimesheet(ts)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="flex items-center justify-center size-12 rounded-xl bg-primary/5 text-primary shrink-0">
                      <FileText className="size-6" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">
                          {ts.year}年{MONTHS_JA[ts.month]}
                        </h3>
                        <Badge className={`${STATUS_COLORS[ts.status]} text-xs`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(ts.status)}
                            {STATUS_LABELS[ts.status]}
                          </span>
                        </Badge>
                        {ts.reportType && ts.reportType === 'HALF' && (
                          <Badge className={`${REPORT_TYPE_COLORS.HALF} text-xs border`}>
                            {REPORT_TYPE_LABELS.HALF}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                        <span>勤務 {ts.totalWorkDays}日</span>
                        <span>総労働 {ts.totalWorkHours.toFixed(1)}h</span>
                        <span>残業 {ts.totalOvertimeHours.toFixed(1)}h</span>
                        {ts.annualLeaveAM > 0 && <span>年休(午前) {ts.annualLeaveAM}日</span>}
                        {ts.annualLeavePM > 0 && <span>年休(午後) {ts.annualLeavePM}日</span>}
                        {ts.holidayWorkDays > 0 && <span>休出 {ts.holidayWorkDays}日</span>}
                        {ts.absenceDays > 0 && <span className="text-destructive">欠勤 {ts.absenceDays}日</span>}
                      </div>
                      {/* Manager comment for rejected */}
                      {ts.status === 'REJECTED' && ts.managerComment && (
                        <p className="text-xs text-destructive mt-1">
                          差戻理由: {ts.managerComment}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {ts.status === 'DRAFT' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewTimesheet(ts);
                          }}
                          title="編集"
                        >
                          <Edit3 className="size-4" />
                        </Button>
                      )}
                      {(ts.status === 'DRAFT') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => handleDeleteTimesheet(e, ts)}
                          title="削除"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
