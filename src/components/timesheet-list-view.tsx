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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
  const [currentPage, setCurrentPage] = useState(1);
  const nowDate = new Date();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createYear, setCreateYear] = useState(nowDate.getFullYear());
  const [createMonth, setCreateMonth] = useState(nowDate.getMonth() + 1);
  const [creating, setCreating] = useState(false);

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
    setCreating(true);
    try {
      const res = await authFetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: user.id, year: createYear, month: createMonth }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status === 409) {
          toast.error(`${createYear}年${MONTHS_JA[createMonth]}の勤務表は既に存在します`);
        } else {
          toast.error(json.error || '作成に失敗しました');
        }
        return;
      }

      const json = await res.json();
      const ts = json.data || json;
      setCreateDialogOpen(false);
      setTimesheetId(ts.id);
      setYearMonth(ts.year, ts.month);
      setView('timesheet-edit');
      toast.success('勤務表を作成しました');
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setCreating(false);
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

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTimesheets.length / PAGE_SIZE));
  const pagedTimesheets = filteredTimesheets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" />
          新規作成
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>勤務表の新規作成</DialogTitle>
            <DialogDescription>対象の年月を選択してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Year selector */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground tracking-wide">年</p>
              <div className="flex gap-1.5">
                {[nowDate.getFullYear() - 1, nowDate.getFullYear(), nowDate.getFullYear() + 1].map((y) => (
                  <button key={y}
                    onClick={() => setCreateYear(y)}
                    className="flex-1 py-2 text-sm rounded border transition-colors"
                    style={{
                      borderColor: 'oklch(0.870 0.020 75)',
                      background: y === createYear ? 'oklch(0.50 0.21 27)' : 'transparent',
                      color: y === createYear ? 'white' : 'inherit',
                    }}>{y}年</button>
                ))}
              </div>
            </div>
            {/* Month selector */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground tracking-wide">月</p>
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <button key={m}
                    onClick={() => setCreateMonth(m)}
                    className="py-1.5 text-xs rounded border transition-colors"
                    style={{
                      borderColor: 'oklch(0.870 0.020 75)',
                      background: m === createMonth ? 'oklch(0.50 0.21 27)' : 'transparent',
                      color: m === createMonth ? 'white' : 'inherit',
                    }}>{m}月</button>
                ))}
              </div>
            </div>
            <p className="text-center text-sm font-medium" style={{ color: 'oklch(0.18 0.018 52)' }}>
              {createYear}年{MONTHS_JA[createMonth]}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleCreateTimesheet} disabled={creating}>
              {creating ? <Clock className="size-4 animate-spin" /> : <Plus className="size-4" />}
              作成する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="検索..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
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
            <Select value={String(yearFilter)} onValueChange={(v) => { setYearFilter(Number(v)); setCurrentPage(1); }}>
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
          {pagedTimesheets.map((ts) => (
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
                        {ts.reportType && (ts.reportType === 'ZENHAN' || ts.reportType === 'KOHAN') && (
                          <Badge className={`${REPORT_TYPE_COLORS[ts.reportType]} text-xs border`}>
                            {REPORT_TYPE_LABELS[ts.reportType]}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {filteredTimesheets.length}件中 {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTimesheets.length)}件
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>前へ</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === currentPage ? 'default' : 'outline'}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>次へ</Button>
          </div>
        </div>
      )}
    </div>
  );
}
