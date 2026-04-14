'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ClipboardCheck,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Eye,
  Clock,
  FileText,
  Filter,
  Search,
  Loader2,
  Send,
  X,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/api';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  MONTHS_JA,
  WORK_TYPE_LABELS,
  WORK_TYPE_COLORS,
  DAY_OF_WEEK_JA,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_COLORS,
  TASK_CATEGORY_COLORS,
} from '@/lib/constants';
import type { Timesheet, TimesheetEntry } from '@/lib/types';
import { toast } from 'sonner';

export function ApprovalView() {
  const { user } = useAuthStore();
  const { setView, setTimesheetId, setYearMonth } = useAppStore();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('SUBMITTED');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailTimesheet, setDetailTimesheet] = useState<Timesheet | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  // Detail entries dialog state
  const [detailEntries, setDetailEntries] = useState<TimesheetEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchTimesheets = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.set('status', filterStatus);
      }
      const res = await authFetch(`/api/timesheets?${params}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        // Filter out the current user's own timesheets
        const all = Array.isArray(data) ? data : [];
        setTimesheets(all);
      }
    } catch {
      if (showLoading) toast.error('データの取得に失敗しました');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user, filterStatus]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  const filteredTimesheets = timesheets.filter((ts) => {
    if (filterStatus !== 'all' && ts.status !== filterStatus) return false;
    if (searchTerm) {
      const emp = ts.employee;
      if (
        !emp?.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !emp?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
    }
    return true;
  });

  const handleOpenDetail = (ts: Timesheet) => {
    setDetailTimesheet(ts);
    setComment(ts.managerComment || '');
    setDetailOpen(true);
  };

  const handleOpenEntriesDetail = async (ts: Timesheet) => {
    setDetailTimesheet(ts);
    setDetailEntries([]);
    setDetailLoading(true);
    setDetailDialogOpen(true);
    try {
      const res = await authFetch(`/api/timesheets/${ts.id}/entries`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setDetailEntries(Array.isArray(data) ? data : []);
      } else {
        toast.error('勤務表エントリの取得に失敗しました');
        setDetailDialogOpen(false);
      }
    } catch {
      toast.error('通信エラーが発生しました');
      setDetailDialogOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewTimesheet = (ts: Timesheet) => {
    setTimesheetId(ts.id);
    setYearMonth(ts.year, ts.month);
    setView('timesheet-edit');
  };

  const handleApprove = async () => {
    if (!user || !detailTimesheet) return;
    setProcessing(true);
    try {
      const res = await authFetch(`/api/timesheets/${detailTimesheet.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVED',
          comment,
          approverId: user.id,
        }),
      });

      if (res.ok) {
        toast.success('承認しました');
        setDetailOpen(false);
        // Use setTimeout with proper error handling to avoid unhandled rejection
        setTimeout(() => {
          fetchTimesheets(false).catch(() => {});
        }, 300);
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || '承認に失敗しました');
      }
    } catch (err) {
      console.error('Approve error:', err);
      toast.error('通信エラーが発生しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!user || !detailTimesheet) return;
    if (!comment.trim()) {
      toast.error('差戻理由を入力してください');
      return;
    }
    setProcessing(true);
    try {
      const res = await authFetch(`/api/timesheets/${detailTimesheet.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECTED',
          comment: comment.trim(),
          approverId: user.id,
        }),
      });

      if (res.ok) {
        toast.success('差戻しました');
        setDetailOpen(false);
        // Use setTimeout with proper error handling to avoid unhandled rejection
        setTimeout(() => {
          fetchTimesheets(false).catch(() => {});
        }, 300);
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || '操作に失敗しました');
      }
    } catch (err) {
      console.error('Reject error:', err);
      toast.error('通信エラーが発生しました');
    } finally {
      setProcessing(false);
    }
  };

  // Compute project summary from entries
  const projectSummary = useMemo(() => {
    const projectMap = new Map<string, number>();
    for (const entry of detailEntries) {
      if (!entry.tasks || entry.tasks.length === 0) continue;
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
  }, [detailEntries]);

  const projectTotalHours = projectSummary.reduce((sum, p) => sum + p.hours, 0);

  // Compute totals for the detail entries footer
  const detailTotals = detailEntries.reduce(
    (acc, entry) => ({
      workHours: acc.workHours + (entry.workHours || 0),
      overtimeHours: acc.overtimeHours + (entry.overtimeHours || 0),
      overUnder: acc.overUnder + (entry.overUnder || 0),
    }),
    { workHours: 0, overtimeHours: 0, overUnder: 0 },
  );

  const submittedCount = timesheets.filter((ts) => ts.status === 'SUBMITTED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">承認待ち</h1>
          <p className="text-sm text-muted-foreground mt-1">
            提出された勤務表を確認・承認・差戻します
          </p>
        </div>
        {submittedCount > 0 && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1">
            <Clock className="size-3.5 mr-1" />
            {submittedCount}件の未処理
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="社員名・社員番号で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <Filter className="size-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUBMITTED">提出済</SelectItem>
                <SelectItem value="APPROVED">承認済</SelectItem>
                <SelectItem value="REJECTED">差戻し</SelectItem>
                <SelectItem value="DRAFT">下書き</SelectItem>
                <SelectItem value="all">すべて</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timesheet List */}
      {filteredTimesheets.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardCheck className="size-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-muted-foreground">承認待ちの勤務表はありません</h3>
          <p className="text-sm text-muted-foreground mt-1">
            新しい勤務表が提出されるとここに表示されます
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTimesheets.map((ts) => (
            <div key={ts.id}>
              <Card className="hover:shadow-md transition-all hover:border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar className="size-12 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {ts.employee?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenDetail(ts)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{ts.employee?.name || '不明'}</h3>
                        <span className="text-xs text-muted-foreground">{ts.employee?.employeeId}</span>
                        <Badge className={`${STATUS_COLORS[ts.status]} text-xs`}>
                          {STATUS_LABELS[ts.status]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span>
                          {ts.year}年{MONTHS_JA[ts.month]}
                        </span>
                        <span>勤務 {ts.totalWorkDays}日</span>
                        <span>総労働 {ts.totalWorkHours.toFixed(1)}h</span>
                        <span>残業 {ts.totalOvertimeHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                        <span>{ts.employee?.department}</span>
                        <span>{ts.employee?.division}</span>
                        {ts.employee?.group && <span>{ts.employee.group}</span>}
                      </div>
                      {ts.submittedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          提出日: {new Date(ts.submittedAt).toLocaleDateString('ja-JP')}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleOpenDetail(ts)}
                      >
                        <MessageSquare className="size-3.5 mr-1" />
                        審査
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEntriesDetail(ts)}
                        title="詳細表示"
                      >
                        <Eye className="size-4" />
                      </Button>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Approval / Review Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5" />
              勤務表の審査
            </DialogTitle>
            <DialogDescription>
              {detailTimesheet?.employee?.name} — {detailTimesheet?.year}年
              {MONTHS_JA[detailTimesheet?.month || 0]}
            </DialogDescription>
          </DialogHeader>

          {detailTimesheet && (
            <div className="space-y-4">
              {/* Report Type Badge */}
              {detailTimesheet.reportType && (
                <div className="flex items-center gap-2">
                  <Badge className={`${REPORT_TYPE_COLORS[detailTimesheet.reportType]} text-xs border`}>
                    {REPORT_TYPE_LABELS[detailTimesheet.reportType]}
                  </Badge>
                </div>
              )}

              {/* Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">勤務日数</p>
                  <p className="text-lg font-bold">{detailTimesheet.totalWorkDays}<span className="text-sm font-normal">日</span></p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">総労働時間</p>
                  <p className="text-lg font-bold">{detailTimesheet.totalWorkHours.toFixed(1)}<span className="text-sm font-normal">h</span></p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">残業時間</p>
                  <p className="text-lg font-bold">{detailTimesheet.totalOvertimeHours.toFixed(1)}<span className="text-sm font-normal">h</span></p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">年休(午前)</p>
                  <p className="text-lg font-bold">{detailTimesheet.annualLeaveAM}<span className="text-sm font-normal">日</span></p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">年休(午後)</p>
                  <p className="text-lg font-bold">{detailTimesheet.annualLeavePM}<span className="text-sm font-normal">日</span></p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">年休(終日)</p>
                  <p className="text-lg font-bold">{detailTimesheet.annualLeaveFull || 0}<span className="text-sm font-normal">日</span></p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">休出</p>
                  <p className="text-lg font-bold">{detailTimesheet.holidayWorkDays}<span className="text-sm font-normal">日</span></p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">特休</p>
                  <p className="text-lg font-bold">{detailTimesheet.specialLeave}<span className="text-sm font-normal">日</span></p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">欠勤</p>
                  <p className="text-lg font-bold text-destructive">{detailTimesheet.absenceDays}<span className="text-sm font-normal">日</span></p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">休出時間</p>
                  <p className="text-lg font-bold">{detailTimesheet.holidayWorkHours.toFixed(1)}<span className="text-sm font-normal">h</span></p>
                </div>
              </div>

              <Separator />

              {/* Comment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">コメント / 差戻理由</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="コメントを入力してください（差戻の場合は必須）"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDetailOpen(false)}
              className="flex-1 sm:flex-initial"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !comment.trim()}
              className="flex-1 sm:flex-initial"
            >
              {processing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              差戻し
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1 sm:flex-initial"
            >
              {processing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              承認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Entries Dialog (Day-by-day) */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[1400px] max-w-[98vw] max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">
          {detailLoading ? (
            <>
              {/* Screen-reader title during loading */}
              <DialogTitle className="sr-only">勤務表詳細を読み込み中</DialogTitle>
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">読み込み中...</span>
              </div>
            </>
          ) : (
            <>
              {/* ── Header ── */}
              <DialogHeader className="shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 shrink-0">
                      <FileText className="size-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-base font-bold leading-tight truncate">
                        {detailTimesheet?.employee?.name || '不明'}
                        <span className="font-normal text-muted-foreground mx-1.5">—</span>
                        {detailTimesheet?.year}年{MONTHS_JA[detailTimesheet?.month || 0]} 勤務表
                      </DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        {detailTimesheet?.reportType && (
                          <Badge className={`${REPORT_TYPE_COLORS[detailTimesheet.reportType]} text-[10px] px-1.5 py-0 leading-4 border`}>
                            {REPORT_TYPE_LABELS[detailTimesheet.reportType]}
                          </Badge>
                        )}
                        {detailTimesheet?.employee?.department && (
                          <span className="text-xs text-muted-foreground">
                            {detailTimesheet.employee.department}{detailTimesheet.employee.division ? ` ${detailTimesheet.employee.division}` : ''}
                          </span>
                        )}
                        {detailTimesheet?.employee?.employeeId && (
                          <span className="text-xs text-muted-foreground font-mono">{detailTimesheet.employee.employeeId}</span>
                        )}
                      </DialogDescription>
                    </div>
                  </div>
                  {/* Stats row */}
                  {detailEntries.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="grid grid-cols-2 gap-x-1.5 gap-y-1">
                        <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1">
                          <Clock className="size-3 text-muted-foreground" />
                          <span className="text-sm font-bold tabular-nums">{detailTotals.workHours.toFixed(1)}</span>
                          <span className="text-[10px] text-muted-foreground leading-none">時間</span>
                        </div>
                        <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${detailTotals.overUnder < 0 ? 'bg-red-50' : detailTotals.overUnder > 0 ? 'bg-blue-50' : 'bg-muted/50'}`}>
                          <span className={`text-sm font-bold tabular-nums ${detailTotals.overUnder < 0 ? 'text-red-600' : detailTotals.overUnder > 0 ? 'text-blue-600' : ''}`}>
                            {detailTotals.overUnder !== 0 ? `${detailTotals.overUnder > 0 ? '+' : ''}${detailTotals.overUnder.toFixed(1)}` : '±0.0'}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-none">過不足</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DialogHeader>

              {/* ── Project Summary ── */}
              {projectSummary.length > 0 && (
                <div className="shrink-0 mt-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-3.5 text-primary" />
                      <span className="text-xs font-semibold">プロジェクト別集計</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{projectSummary.length}件 · 合計 {projectTotalHours.toFixed(1)}h</span>
                  </div>
                  <div className="px-4 py-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1.5">
                      {projectSummary.map((item) => {
                        const pct = projectTotalHours > 0 ? (item.hours / projectTotalHours) * 100 : 0;
                        return (
                          <div key={item.project} className="group">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs truncate" title={item.project}>{item.project}</span>
                              <span className="text-xs font-mono font-semibold text-muted-foreground tabular-nums ml-2 shrink-0">
                                {item.hours.toFixed(1)}h
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/50 rounded-full transition-all"
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Day-by-day Table ── */}
              <div className="flex-1 min-h-0 mt-4 overflow-auto">
                <Table className="text-sm w-full" containerClassName="overflow-visible">
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableHead className="w-[44px] text-center font-semibold py-2.5 px-1.5">日</TableHead>
                      <TableHead className="w-[40px] text-center font-semibold py-2.5 px-1">曜</TableHead>
                      <TableHead className="w-[100px] font-semibold py-2.5 px-2">勤務区分</TableHead>
                      <TableHead className="w-[56px] text-center font-semibold py-2.5 px-1">始業</TableHead>
                      <TableHead className="w-[56px] text-center font-semibold py-2.5 px-1">終業</TableHead>
                      <TableHead className="w-[60px] text-center font-semibold py-2.5 px-1">労働</TableHead>
                      <TableHead className="w-[60px] text-center font-semibold py-2.5 px-1">過不足</TableHead>
                      <TableHead className="min-w-[110px] font-semibold py-2.5 px-2">業務内容</TableHead>
                      <TableHead className="min-w-[240px] font-semibold py-2.5 px-2">作業内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailEntries.map((entry) => {
                      const dayOfWeek = new Date(
                        detailTimesheet!.year,
                        detailTimesheet!.month - 1,
                        entry.day,
                      ).getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      const hasTasks = entry.tasks && entry.tasks.length > 0;

                      return (
                        <TableRow
                          key={entry.id}
                          className={`${isWeekend ? 'bg-blue-50/50 hover:bg-blue-50/70' : 'hover:bg-muted/20'} border-b border-border/50`}
                        >
                          <TableCell className="text-center font-semibold tabular-nums py-2 px-1.5">
                            {entry.day}
                          </TableCell>
                          <TableCell className={`text-center py-2 px-1 ${isWeekend ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                            {DAY_OF_WEEK_JA[dayOfWeek]}
                          </TableCell>
                          <TableCell className="py-2 px-2">
                            {entry.workType ? (
                              <Badge
                                variant="outline"
                                className={`${WORK_TYPE_COLORS[entry.workType]} text-[11px] px-1.5 py-0 leading-5`}
                              >
                                {WORK_TYPE_LABELS[entry.workType]}
                              </Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums py-2 px-1">
                            {entry.startTime || '—'}
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums py-2 px-1">
                            {entry.endTime || '—'}
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums font-medium py-2 px-1">
                            {entry.workHours > 0 ? entry.workHours.toFixed(1) : '—'}
                          </TableCell>
                          <TableCell className={`text-center font-mono tabular-nums py-2 px-1 ${(entry.overUnder || 0) < 0 ? 'text-red-600 font-medium' : (entry.overUnder || 0) > 0 ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                            {(entry.overUnder || 0) !== 0 ? entry.overUnder.toFixed(1) : '—'}
                          </TableCell>
                          <TableCell className="py-2 px-2 text-xs leading-5">
                            {entry.workContent || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="py-2 px-2">
                            {hasTasks ? (
                              <div className="flex flex-wrap gap-1">
                                {entry.tasks!.map((task) => (
                                  <Badge
                                    key={task.id}
                                    variant="outline"
                                    className={`${TASK_CATEGORY_COLORS[task.category] || 'bg-gray-50 text-gray-700 border-gray-200'} text-[11px] px-1.5 py-0 leading-5`}
                                    title={`${task.project} — ${task.hours}h`}
                                  >
                                    {task.project.length > 12 ? task.project.substring(0, 12) + '…' : task.project}
                                    <span className="ml-1 font-mono opacity-50 text-[10px]">{task.hours}h</span>
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {detailEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                          エントリがありません
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {detailEntries.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30 hover:bg-muted/30 font-semibold border-t-2 border-muted-foreground/20">
                        <TableCell colSpan={5} className="text-right text-sm">
                          合計
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {detailTotals.workHours.toFixed(1)}h
                        </TableCell>
                        <TableCell className={`text-center font-mono text-sm ${detailTotals.overUnder < 0 ? 'text-red-600' : detailTotals.overUnder > 0 ? 'text-blue-600' : ''}`}>
                          {detailTotals.overUnder !== 0 ? `${detailTotals.overUnder > 0 ? '+' : ''}${detailTotals.overUnder.toFixed(1)}h` : '—'}
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>

              {/* ── Footer ── */}
              <div className="border-t" />
              <div className="shrink-0 py-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailDialogOpen(false)}
                >
                  閉じる
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
