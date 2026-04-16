'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ClipboardCheck, ChevronRight, CheckCircle2, XCircle, MessageSquare,
  Eye, Clock, FileText, Filter, Search, Loader2, BarChart3,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/api';
import {
  STATUS_LABELS, MONTHS_JA, WORK_TYPE_LABELS,
  DAY_OF_WEEK_JA, REPORT_TYPE_LABELS,
  APPROVAL_STEP_LABELS, GRADE_SHORT_LABELS,
} from '@/lib/constants';
import type { Timesheet, TimesheetEntry } from '@/lib/types';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  DRAFT:     { bg: 'oklch(0.950 0.010 78)',  border: 'oklch(0.860 0.018 75)', text: 'oklch(0.52 0.020 60)' },
  SUBMITTED: { bg: 'oklch(0.935 0.06 240)',  border: 'oklch(0.82 0.10 240)',  text: 'oklch(0.40 0.14 240)' },
  APPROVED:  { bg: 'oklch(0.930 0.07 145)',  border: 'oklch(0.80 0.12 145)',  text: 'oklch(0.36 0.16 145)' },
  REJECTED:  { bg: 'oklch(0.940 0.08 27)',   border: 'oklch(0.82 0.14 27)',   text: 'oklch(0.46 0.20 27)'  },
};

const STEP_STYLES: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: 'oklch(0.945 0.06 70)',  border: 'oklch(0.82 0.10 70)',  text: 'oklch(0.45 0.14 65)'  },
  2: { bg: 'oklch(0.940 0.06 290)', border: 'oklch(0.82 0.10 290)', text: 'oklch(0.45 0.15 285)' },
  3: { bg: 'oklch(0.940 0.07 27)',  border: 'oklch(0.82 0.14 27)',  text: 'oklch(0.44 0.18 27)'  },
};

function StatusPill({ label, style }: { label: string; style: { bg: string; border: string; text: string } }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded"
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text, fontFamily: 'var(--font-dm-mono)' }}>
      {label}
    </span>
  );
}

export function ApprovalView() {
  const { user } = useAuthStore();
  const { setView, setTimesheetId, setYearMonth } = useAppStore();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('SUBMITTED');
  const [myStepOnly, setMyStepOnly] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailTimesheet, setDetailTimesheet] = useState<Timesheet | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [detailEntries, setDetailEntries] = useState<TimesheetEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  type ApprovalHistoryItem = {
    id: string;
    action: string;
    comment: string;
    approvalStep: number;
    createdAt: string;
    approver?: { name?: string; grade?: string };
  };
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);

  const userApprovalStep = useMemo(() => {
    if (!user) return null;
    if (user.role === 'ADMIN') return null;
    if (user.grade === 'G2') return 2;
    if (user.grade === 'M1' || user.grade === 'M2') return 1;
    return null;
  }, [user]);

  const fetchTimesheets = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await authFetch(`/api/timesheets?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTimesheets(Array.isArray(json.data || json) ? (json.data || json) : []);
      }
    } catch { if (showLoading) toast.error('データの取得に失敗しました'); }
    finally { if (showLoading) setLoading(false); }
  }, [user, filterStatus]);

  useEffect(() => { fetchTimesheets(); }, [fetchTimesheets]);

  const filteredTimesheets = timesheets.filter((ts) => {
    if (filterStatus !== 'all' && ts.status !== filterStatus) return false;
    if (myStepOnly && filterStatus === 'SUBMITTED' && userApprovalStep !== null) {
      if (ts.currentApprovalStep !== userApprovalStep) return false;
    }
    if (searchTerm) {
      const emp = ts.employee;
      if (!emp?.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !emp?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  const handleOpenDetail = async (ts: Timesheet) => {
    setDetailTimesheet(ts);
    setComment(ts.managerComment || '');
    setApprovalHistory([]);
    setDetailOpen(true);
    try {
      const res = await authFetch(`/api/timesheets/${ts.id}/approvals`);
      if (res.ok) {
        const json = await res.json();
        setApprovalHistory(Array.isArray(json.data) ? json.data : []);
      }
    } catch {
      // history is supplementary — silent failure is acceptable
    }
  };

  const handleOpenEntriesDetail = async (ts: Timesheet) => {
    setDetailTimesheet(ts); setDetailEntries([]); setDetailLoading(true); setDetailDialogOpen(true);
    try {
      const res = await authFetch(`/api/timesheets/${ts.id}/entries`);
      if (res.ok) {
        const json = await res.json();
        setDetailEntries(Array.isArray(json.data || json) ? (json.data || json) : []);
      } else { toast.error('取得に失敗しました'); setDetailDialogOpen(false); }
    } catch { toast.error('通信エラー'); setDetailDialogOpen(false); }
    finally { setDetailLoading(false); }
  };

  const handleApprove = async () => {
    if (!user || !detailTimesheet) return;
    setProcessing(true);
    try {
      const res = await authFetch(`/api/timesheets/${detailTimesheet.id}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVED', comment, approverId: user.id }),
      });
      if (res.ok) { toast.success('承認しました'); setDetailOpen(false); setTimeout(() => { fetchTimesheets(false).catch(() => {}); }, 300); }
      else { const j = await res.json().catch(() => ({})); toast.error(j.error || '承認に失敗しました'); }
    } catch { toast.error('通信エラー'); } finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!user || !detailTimesheet) return;
    if (!comment.trim()) { toast.error('差戻理由を入力してください'); return; }
    setProcessing(true);
    try {
      const res = await authFetch(`/api/timesheets/${detailTimesheet.id}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECTED', comment: comment.trim(), approverId: user.id }),
      });
      if (res.ok) { toast.success('差戻しました'); setDetailOpen(false); setTimeout(() => { fetchTimesheets(false).catch(() => {}); }, 300); }
      else { const j = await res.json().catch(() => ({})); toast.error(j.error || '操作に失敗しました'); }
    } catch { toast.error('通信エラー'); } finally { setProcessing(false); }
  };

  const projectSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of detailEntries)
      for (const task of (entry.tasks || []))
        if (task.project?.trim()) map.set(task.project, (map.get(task.project) || 0) + (task.hours || 0));
    return [...map.entries()].map(([project, hours]) => ({ project, hours: Math.round(hours * 100) / 100 })).sort((a, b) => b.hours - a.hours);
  }, [detailEntries]);

  const projectTotalHours = projectSummary.reduce((s, p) => s + p.hours, 0);
  const detailTotals = detailEntries.reduce(
    (acc, e) => ({ workHours: acc.workHours + (e.workHours || 0), overtimeHours: acc.overtimeHours + (e.overtimeHours || 0), overUnder: acc.overUnder + (e.overUnder || 0) }),
    { workHours: 0, overtimeHours: 0, overUnder: 0 }
  );

  const submittedCount = timesheets.filter(ts => ts.status === 'SUBMITTED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'oklch(0.85 0.015 75)', borderTopColor: 'oklch(0.50 0.21 27)' }} />
          <span className="text-xs" style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-dm-mono)' }}>読み込み中</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-xs mb-1" style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-dm-mono)', letterSpacing: '0.12em' }}>APPROVALS</p>
          <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-noto-serif-jp)', color: 'oklch(0.18 0.018 52)' }}>承認管理</h1>
        </div>
        {submittedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded"
            style={{ background: 'oklch(0.952 0.055 27)', border: '1px solid oklch(0.82 0.14 27)' }}>
            <Clock className="w-3.5 h-3.5" style={{ color: 'oklch(0.50 0.21 27)' }} />
            <span className="text-sm" style={{ color: 'oklch(0.40 0.18 30)', fontFamily: 'var(--font-dm-mono)' }}>
              {submittedCount} 件の未処理
            </span>
          </div>
        )}
      </div>

      <div className="ink-line" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 px-4 py-3.5 rounded"
        style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'oklch(0.68 0.018 65)' }} />
          <input type="text" placeholder="社員名・社員番号で検索..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded outline-none"
            style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.22 0.018 52)' }}
          />
        </div>
        {userApprovalStep !== null && filterStatus === 'SUBMITTED' && (
          <button onClick={() => setMyStepOnly(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all"
            style={{
              background: myStepOnly ? 'oklch(0.18 0.018 52)' : 'oklch(0.960 0.014 78)',
              color: myStepOnly ? 'oklch(0.992 0.004 80)' : 'oklch(0.50 0.022 60)',
              border: `1px solid ${myStepOnly ? 'oklch(0.18 0.018 52)' : 'oklch(0.870 0.020 75)'}`,
            }}>
            <Filter className="w-3.5 h-3.5" />
            {myStepOnly ? '自分の承認待ちのみ' : 'すべて表示中'}
          </button>
        )}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded text-sm outline-none"
          style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.35 0.020 55)' }}>
          <option value="SUBMITTED">提出済み</option>
          <option value="APPROVED">承認済み</option>
          <option value="REJECTED">差戻し</option>
          <option value="DRAFT">下書き</option>
          <option value="all">すべて</option>
        </select>
      </div>

      {/* List */}
      {filteredTimesheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <ClipboardCheck className="w-10 h-10" style={{ color: 'oklch(0.85 0.015 75)' }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'oklch(0.55 0.020 60)', fontFamily: 'var(--font-noto-serif-jp)' }}>
              承認待ちの勤務表はありません
            </p>
            <p className="text-xs mt-1" style={{ color: 'oklch(0.70 0.018 65)' }}>新しい勤務表が提出されるとここに表示されます</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTimesheets.map((ts) => {
            const st = STATUS_STYLES[ts.status] || STATUS_STYLES.DRAFT;
            const stepSt = ts.currentApprovalStep ? STEP_STYLES[ts.currentApprovalStep] : null;
            return (
              <div key={ts.id}
                className="flex items-center gap-4 px-5 py-4 rounded cursor-pointer transition-all group"
                style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)' }}
                onClick={() => handleOpenDetail(ts)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'oklch(0.78 0.022 72)'; e.currentTarget.style.background = 'oklch(0.982 0.006 80)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'oklch(0.870 0.020 75)'; e.currentTarget.style.background = 'oklch(0.992 0.004 80)'; }}
              >
                {/* Avatar — vermillion initial */}
                <div className="flex items-center justify-center w-10 h-10 rounded shrink-0 text-sm font-bold"
                  style={{ background: 'oklch(0.50 0.21 27)', color: 'oklch(0.992 0.004 80)', fontFamily: 'var(--font-noto-serif-jp)' }}>
                  {ts.employee?.name?.charAt(0) || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: 'oklch(0.18 0.018 52)', fontFamily: 'var(--font-noto-serif-jp)' }}>
                      {ts.employee?.name || '不明'}
                    </span>
                    {ts.employee?.grade && (
                      <span className="hanko text-[9px]">{GRADE_SHORT_LABELS[ts.employee.grade] || ts.employee.grade}</span>
                    )}
                    <span className="text-xs" style={{ color: 'oklch(0.68 0.018 65)', fontFamily: 'var(--font-dm-mono)' }}>
                      {ts.employee?.employeeId}
                    </span>
                    <StatusPill label={STATUS_LABELS[ts.status] || ts.status} style={st} />
                    {ts.status === 'SUBMITTED' && ts.currentApprovalStep > 0 && stepSt && (
                      <StatusPill label={APPROVAL_STEP_LABELS[ts.currentApprovalStep] || `Step ${ts.currentApprovalStep}`} style={stepSt} />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    <span className="text-xs" style={{ color: 'oklch(0.55 0.020 60)', fontFamily: 'var(--font-noto-serif-jp)' }}>
                      {ts.year}年 {MONTHS_JA[ts.month]}
                    </span>
                    <span className="text-xs" style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-dm-mono)' }}>
                      {ts.totalWorkDays}日 · {ts.totalWorkHours.toFixed(1)}h · 残業{ts.totalOvertimeHours.toFixed(1)}h
                    </span>
                    {ts.employee?.department && (
                      <span className="text-xs" style={{ color: 'oklch(0.70 0.018 65)' }}>
                        {ts.employee.department}{ts.employee.division ? ` / ${ts.employee.division}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleOpenDetail(ts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
                    style={{ background: 'oklch(0.955 0.012 78)', color: 'oklch(0.42 0.020 58)', border: '1px solid oklch(0.870 0.020 75)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.18 0.018 52)'; e.currentTarget.style.color = 'oklch(0.992 0.004 80)'; e.currentTarget.style.borderColor = 'oklch(0.18 0.018 52)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.955 0.012 78)'; e.currentTarget.style.color = 'oklch(0.42 0.020 58)'; e.currentTarget.style.borderColor = 'oklch(0.870 0.020 75)'; }}>
                    <MessageSquare className="w-3.5 h-3.5" />審査
                  </button>
                  <button onClick={() => handleOpenEntriesDetail(ts)}
                    className="flex items-center justify-center w-8 h-8 rounded transition-all"
                    style={{ background: 'oklch(0.955 0.012 78)', color: 'oklch(0.60 0.020 60)', border: '1px solid oklch(0.870 0.020 75)' }}
                    title="詳細表示"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.920 0.016 78)'; e.currentTarget.style.color = 'oklch(0.25 0.018 52)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.955 0.012 78)'; e.currentTarget.style.color = 'oklch(0.60 0.020 60)'; }}>
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  style={{ color: 'oklch(0.78 0.018 75)' }} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Approval Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg" style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-noto-serif-jp)', fontSize: '1.4rem', fontWeight: 300, color: 'oklch(0.18 0.018 52)' }}>
              勤務表の審査
            </DialogTitle>
            <DialogDescription style={{ color: 'oklch(0.60 0.020 62)' }}>
              {detailTimesheet?.employee?.name} — {detailTimesheet?.year}年 {MONTHS_JA[detailTimesheet?.month || 0]}
            </DialogDescription>
          </DialogHeader>

          {detailTimesheet && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                {detailTimesheet.reportType && (
                  <span className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: 'oklch(0.955 0.012 78)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.50 0.020 60)', fontFamily: 'var(--font-dm-mono)' }}>
                    {REPORT_TYPE_LABELS[detailTimesheet.reportType]}
                  </span>
                )}
                {detailTimesheet.status === 'SUBMITTED' && detailTimesheet.currentApprovalStep > 0 && (() => {
                  const st = STEP_STYLES[detailTimesheet.currentApprovalStep];
                  return st ? <StatusPill label={APPROVAL_STEP_LABELS[detailTimesheet.currentApprovalStep] || ''} style={st} /> : null;
                })()}
              </div>

              {/* Step progress */}
              {detailTimesheet.status === 'SUBMITTED' && (
                <div className="flex items-center gap-1 px-3 py-2.5 rounded text-xs"
                  style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.880 0.018 75)' }}>
                  {[{ step: 1, label: 'M承認' }, { step: 2, label: 'G2承認' }, { step: 3, label: '社長承認' }].map((s, i) => {
                    const cur = detailTimesheet.currentApprovalStep;
                    return (
                      <span key={s.step} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="w-3 h-3" style={{ color: 'oklch(0.78 0.018 75)' }} />}
                        <span style={{
                          color: cur === s.step ? 'oklch(0.50 0.21 27)' : cur > s.step ? 'oklch(0.44 0.14 145)' : 'oklch(0.68 0.018 65)',
                          fontWeight: cur === s.step ? 600 : 400,
                          textDecoration: cur > s.step ? 'line-through' : 'none',
                        }}>{s.label}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '勤務日数',   value: `${detailTimesheet.totalWorkDays}日` },
                  { label: '総労働時間', value: `${detailTimesheet.totalWorkHours.toFixed(1)}h` },
                  { label: '残業時間',   value: `${detailTimesheet.totalOvertimeHours.toFixed(1)}h` },
                  { label: '休出日数',   value: `${detailTimesheet.holidayWorkDays}日` },
                  { label: '年休(午前)', value: `${detailTimesheet.annualLeaveAM}日` },
                  { label: '年休(午後)', value: `${detailTimesheet.annualLeavePM}日` },
                  { label: '年休(終日)', value: `${detailTimesheet.annualLeaveFull || 0}日` },
                  { label: '欠勤',       value: `${detailTimesheet.absenceDays}日`, warn: detailTimesheet.absenceDays > 0 },
                ].map((row) => (
                  <div key={row.label} className="rounded px-3 py-2.5 text-center"
                    style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.880 0.018 75)' }}>
                    <p className="text-[10px] mb-1" style={{ color: 'oklch(0.65 0.018 65)' }}>{row.label}</p>
                    <p className="text-base font-medium"
                      style={{ color: row.warn ? 'oklch(0.50 0.21 27)' : 'oklch(0.22 0.018 52)', fontFamily: 'var(--font-dm-mono)' }}>
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="ink-line" />

              {/* Approval history */}
              {approvalHistory.length > 0 && (
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'oklch(0.52 0.020 60)', letterSpacing: '0.06em' }}>
                    承認履歴
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {approvalHistory.map((h) => (
                      <div key={h.id} className="text-xs px-2.5 py-1.5 rounded"
                        style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.880 0.018 75)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium" style={{ color: h.action === 'REJECTED' ? 'oklch(0.46 0.20 27)' : 'oklch(0.36 0.16 145)' }}>
                            Step {h.approvalStep} · {h.action === 'REJECTED' ? '差戻' : '承認'}
                          </span>
                          <span style={{ color: 'oklch(0.55 0.020 60)', fontFamily: 'var(--font-dm-mono)' }}>
                            {new Date(h.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="mt-0.5" style={{ color: 'oklch(0.35 0.018 55)' }}>
                          {h.approver?.name ?? '不明'}{h.approver?.grade ? ` (${h.approver.grade})` : ''}
                        </div>
                        {h.comment && (
                          <div className="mt-1 italic" style={{ color: 'oklch(0.45 0.020 60)' }}>
                            「{h.comment}」
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'oklch(0.52 0.020 60)', letterSpacing: '0.06em' }}>
                  コメント / 差戻理由
                </label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="コメントを入力してください（差戻の場合は必須）"
                  rows={3} className="w-full px-3 py-2.5 rounded text-sm outline-none resize-none"
                  style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.22 0.018 52)' }}
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setDetailOpen(false)}
                  className="flex-1 py-2.5 rounded text-sm transition-all"
                  style={{ background: 'oklch(0.955 0.012 78)', color: 'oklch(0.50 0.020 60)', border: '1px solid oklch(0.870 0.020 75)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.920 0.016 78)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.955 0.012 78)'; }}>
                  キャンセル
                </button>
                <button onClick={handleReject} disabled={processing || !comment.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: 'oklch(0.940 0.08 27)', color: 'oklch(0.44 0.18 27)', border: '1px solid oklch(0.82 0.14 27)' }}
                  onMouseEnter={(e) => { if (!processing && comment.trim()) { e.currentTarget.style.background = 'oklch(0.90 0.12 27)'; e.currentTarget.style.color = 'oklch(0.35 0.22 27)'; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.940 0.08 27)'; e.currentTarget.style.color = 'oklch(0.44 0.18 27)'; }}>
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  差戻し
                </button>
                <button onClick={handleApprove} disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: 'oklch(0.18 0.018 52)', color: 'oklch(0.992 0.004 80)' }}
                  onMouseEnter={(e) => { if (!processing) e.currentTarget.style.background = 'oklch(0.50 0.21 27)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.18 0.018 52)'; }}>
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  承認
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Detail Entries Dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0"
          style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.860 0.018 75)' }}>
          {detailLoading ? (
            <>
              <DialogTitle className="sr-only">読み込み中</DialogTitle>
              <div className="flex items-center justify-center py-24 gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'oklch(0.85 0.015 75)', borderTopColor: 'oklch(0.50 0.21 27)' }} />
                <span className="text-sm" style={{ color: 'oklch(0.60 0.020 62)' }}>読み込み中...</span>
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="shrink-0 px-6 py-4 flex flex-wrap items-center gap-3 justify-between"
                style={{ borderBottom: '1px solid oklch(0.870 0.020 75)', background: 'oklch(0.968 0.010 78)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-9 h-9 rounded border-2 shrink-0"
                    style={{ borderColor: 'oklch(0.50 0.21 27)', color: 'oklch(0.50 0.21 27)' }}>
                    <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-noto-serif-jp)' }}>勤</span>
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base font-medium leading-tight truncate"
                      style={{ color: 'oklch(0.18 0.018 52)', fontFamily: 'var(--font-noto-serif-jp)', fontWeight: 400 }}>
                      {detailTimesheet?.employee?.name || '不明'} — {detailTimesheet?.year}年 {MONTHS_JA[detailTimesheet?.month || 0]}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-0.5" style={{ color: 'oklch(0.60 0.020 62)' }}>
                      {detailTimesheet?.employee?.department}
                      {detailTimesheet?.employee?.division ? ` / ${detailTimesheet.employee.division}` : ''}
                      {detailTimesheet?.employee?.employeeId && (
                        <code className="ml-1 text-[10px]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                          {detailTimesheet.employee.employeeId}
                        </code>
                      )}
                    </DialogDescription>
                  </div>
                </div>
                {detailEntries.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0 mr-8">
                    <span className="px-3 py-1.5 rounded text-sm"
                      style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.50 0.21 27)', fontFamily: 'var(--font-dm-mono)' }}>
                      {detailTotals.workHours.toFixed(1)} h
                    </span>
                    <span className="px-3 py-1.5 rounded text-sm"
                      style={{
                        background: detailTotals.overUnder < 0 ? 'oklch(0.940 0.08 27)' : 'oklch(0.992 0.004 80)',
                        border: `1px solid ${detailTotals.overUnder < 0 ? 'oklch(0.82 0.14 27)' : 'oklch(0.870 0.020 75)'}`,
                        color: detailTotals.overUnder < 0 ? 'oklch(0.44 0.18 27)' : detailTotals.overUnder > 0 ? 'oklch(0.40 0.14 240)' : 'oklch(0.60 0.020 60)',
                        fontFamily: 'var(--font-dm-mono)',
                      }}>
                      {detailTotals.overUnder !== 0 ? `${detailTotals.overUnder > 0 ? '+' : ''}${detailTotals.overUnder.toFixed(1)}` : '±0.0'}
                    </span>
                  </div>
                )}
              </div>

              {/* Project summary */}
              {projectSummary.length > 0 && (
                <div className="shrink-0 px-6 py-3"
                  style={{ borderBottom: '1px solid oklch(0.880 0.018 75)', background: 'oklch(0.975 0.008 80)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-3.5 h-3.5" style={{ color: 'oklch(0.50 0.21 27)' }} />
                    <span className="text-xs font-medium" style={{ color: 'oklch(0.40 0.020 55)' }}>プロジェクト別集計</span>
                    <span className="text-xs ml-auto" style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-dm-mono)' }}>
                      {projectSummary.length}件 · {projectTotalHours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {projectSummary.map((item) => {
                      const pct = projectTotalHours > 0 ? (item.hours / projectTotalHours) * 100 : 0;
                      return (
                        <div key={item.project}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="truncate" style={{ color: 'oklch(0.50 0.020 58)' }} title={item.project}>{item.project}</span>
                            <span className="ml-1 shrink-0" style={{ color: 'oklch(0.50 0.21 27)', fontFamily: 'var(--font-dm-mono)' }}>{item.hours.toFixed(1)}h</span>
                          </div>
                          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.880 0.018 75)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: 'oklch(0.50 0.21 27)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="min-w-max w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ background: 'oklch(0.960 0.014 78)', borderBottom: '1px solid oklch(0.870 0.020 75)' }}>
                      {['日', '曜', '勤務区分', '始業', '終業', '労働', '過不足', '業務内容', '作業内容'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-medium"
                          style={{ color: 'oklch(0.55 0.020 60)', whiteSpace: 'nowrap', borderRight: '1px solid oklch(0.900 0.016 75)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detailEntries.map((entry) => {
                      const dow = new Date(detailTimesheet!.year, detailTimesheet!.month - 1, entry.day).getDay();
                      const isWeekend = dow === 0 || dow === 6;
                      return (
                        <tr key={entry.id}
                          style={{ borderBottom: '1px solid oklch(0.920 0.012 78)', background: isWeekend ? 'oklch(0.975 0.008 80)' : 'oklch(0.992 0.004 80)' }}>
                          <td className="px-3 py-2 text-center font-medium"
                            style={{ color: 'oklch(0.22 0.018 52)', fontFamily: 'var(--font-dm-mono)', width: 40, borderRight: '1px solid oklch(0.920 0.012 78)' }}>
                            {entry.day}
                          </td>
                          <td className="px-3 py-2 text-center"
                            style={{ color: isWeekend ? 'oklch(0.50 0.21 27)' : 'oklch(0.65 0.018 65)', width: 36, fontFamily: 'var(--font-dm-mono)', borderRight: '1px solid oklch(0.920 0.012 78)' }}>
                            {DAY_OF_WEEK_JA[dow]}
                          </td>
                          <td className="px-3 py-2" style={{ width: 100, borderRight: '1px solid oklch(0.920 0.012 78)' }}>
                            {entry.workType ? (
                              <span className="text-[11px] px-1.5 py-0.5 rounded"
                                style={{ background: 'oklch(0.955 0.012 78)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.45 0.020 58)', fontFamily: 'var(--font-dm-mono)' }}>
                                {WORK_TYPE_LABELS[entry.workType]}
                              </span>
                            ) : <span style={{ color: 'oklch(0.78 0.018 75)' }}>—</span>}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ color: 'oklch(0.52 0.020 58)', fontFamily: 'var(--font-dm-mono)', width: 56, borderRight: '1px solid oklch(0.920 0.012 78)' }}>
                            {entry.startTime || '—'}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ color: 'oklch(0.52 0.020 58)', fontFamily: 'var(--font-dm-mono)', width: 56, borderRight: '1px solid oklch(0.920 0.012 78)' }}>
                            {entry.endTime || '—'}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ color: 'oklch(0.50 0.21 27)', fontFamily: 'var(--font-dm-mono)', width: 60, borderRight: '1px solid oklch(0.920 0.012 78)' }}>
                            {entry.workHours ? entry.workHours.toFixed(1) : '—'}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ width: 60, fontFamily: 'var(--font-dm-mono)', borderRight: '1px solid oklch(0.920 0.012 78)' }}>
                            {entry.overUnder !== undefined && entry.overUnder !== null ? (
                              <span style={{ color: entry.overUnder < 0 ? 'oklch(0.50 0.21 27)' : entry.overUnder > 0 ? 'oklch(0.40 0.14 240)' : 'oklch(0.65 0.018 65)' }}>
                                {entry.overUnder > 0 ? '+' : ''}{entry.overUnder.toFixed(1)}
                              </span>
                            ) : <span style={{ color: 'oklch(0.78 0.018 75)' }}>—</span>}
                          </td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'oklch(0.60 0.018 65)', minWidth: 110, borderRight: '1px solid oklch(0.920 0.012 78)' }}>
                            {entry.tasks && entry.tasks.length > 0
                              ? [...new Set(entry.tasks.map(t => t.category).filter(Boolean))].join(', ')
                              : '—'}
                          </td>
                          <td className="px-3 py-2" style={{ minWidth: 240 }}>
                            {entry.tasks && entry.tasks.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {entry.tasks.map((task, ti) => (
                                  <span key={ti} className="text-[10px] px-1.5 py-0.5 rounded"
                                    style={{ background: 'oklch(0.955 0.012 78)', border: '1px solid oklch(0.880 0.018 75)', color: 'oklch(0.50 0.020 58)' }}>
                                    {task.project}{task.hours ? ` ${task.hours}h` : ''}
                                  </span>
                                ))}
                              </div>
                            ) : <span style={{ color: 'oklch(0.78 0.018 75)' }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {detailEntries.length > 0 && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid oklch(0.860 0.018 75)', background: 'oklch(0.960 0.014 78)' }}>
                        <td colSpan={5} className="px-3 py-2 text-xs font-medium" style={{ color: 'oklch(0.55 0.020 60)' }}>合計</td>
                        <td className="px-3 py-2 text-center text-xs font-bold"
                          style={{ color: 'oklch(0.50 0.21 27)', fontFamily: 'var(--font-dm-mono)' }}>
                          {detailTotals.workHours.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-bold"
                          style={{ color: detailTotals.overUnder < 0 ? 'oklch(0.50 0.21 27)' : 'oklch(0.40 0.14 240)', fontFamily: 'var(--font-dm-mono)' }}>
                          {detailTotals.overUnder > 0 ? '+' : ''}{detailTotals.overUnder.toFixed(1)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
