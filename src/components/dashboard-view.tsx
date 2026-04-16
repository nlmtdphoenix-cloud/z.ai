'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, Activity, TrendingUp, Calendar, Plus, Edit, ArrowRight, Eye, FileText, ClipboardCheck, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/api';
import { STATUS_LABELS, MONTHS_JA } from '@/lib/constants';
import type { Timesheet } from '@/lib/types';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dow = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][date.getDay()];
  return `${year}年${month}月${day}日　${dow}`;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  DRAFT:     { bg: 'oklch(0.950 0.010 78)',  border: 'oklch(0.860 0.018 75)', text: 'oklch(0.52 0.020 60)' },
  SUBMITTED: { bg: 'oklch(0.935 0.06 240)',  border: 'oklch(0.82 0.10 240)',  text: 'oklch(0.40 0.14 240)' },
  APPROVED:  { bg: 'oklch(0.930 0.07 145)',  border: 'oklch(0.80 0.12 145)',  text: 'oklch(0.36 0.16 145)' },
  REJECTED:  { bg: 'oklch(0.940 0.08 27)',   border: 'oklch(0.82 0.14 27)',   text: 'oklch(0.46 0.20 27)'  },
};

export function DashboardView() {
  const { user } = useAuthStore();
  const { setView, setTimesheetId, setYearMonth } = useAppStore();
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
  const [recentTimesheets, setRecentTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [overtimeAlerts, setOvertimeAlerts] = useState<{ name: string; hours: number }[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<{ granted: number; usedDays: number; remainingDays: number } | null>(null);
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const fetchCurrentTimesheet = useCallback(async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({ employeeId: user.id, year: String(currentYear), month: String(currentMonth), includeEntries: 'true' });
      const res = await authFetch(`/api/timesheets?${params}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setCurrentTimesheet(Array.isArray(data) && data.length > 0 ? data[0] : null);
      }
    } catch { /* silent */ }
  }, [user, currentYear, currentMonth]);

  const fetchRecentTimesheets = useCallback(async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({ employeeId: user.id, limit: '4' });
      const res = await authFetch(`/api/timesheets?${params}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setRecentTimesheets(Array.isArray(data) ? data.slice(0, 4) : []);
      }
    } catch { /* silent */ }
  }, [user]);

  const fetchLeaveBalance = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch(`/api/me/leave-balance?year=${currentYear}`);
      if (res.ok) {
        const json = await res.json();
        setLeaveBalance(json.data);
      }
    } catch { /* silent */ }
  }, [user, currentYear]);

  const fetchOvertimeAlerts = useCallback(async () => {
    if (!user || !isManager) return;
    try {
      const res = await authFetch(`/api/reports/monthly-status?year=${currentYear}&month=${currentMonth}`);
      if (res.ok) {
        const json = await res.json();
        const rows: Array<{ employee: { name: string }; totalOvertime: number }> = json.data?.rows || [];
        setOvertimeAlerts(
          rows
            .filter((r) => r.totalOvertime >= 45)
            .sort((a, b) => b.totalOvertime - a.totalOvertime)
            .slice(0, 5)
            .map((r) => ({ name: r.employee.name, hours: r.totalOvertime }))
        );
      }
    } catch { /* silent */ }
  }, [user, isManager, currentYear, currentMonth]);

  const fetchPendingApprovals = useCallback(async () => {
    if (!user || !isManager) return;
    try {
      const res = await authFetch('/api/timesheets?status=SUBMITTED');
      if (res.ok) {
        const json = await res.json();
        const data: Array<{ currentApprovalStep?: number }> = json.data || json;
        const all = Array.isArray(data) ? data : [];
        const userStep = user.role === 'ADMIN' ? null : user.grade === 'G2' ? 2 : (user.grade === 'M1' || user.grade === 'M2') ? 1 : null;
        setPendingApprovals(userStep === null ? all.length : all.filter(ts => ts.currentApprovalStep === userStep).length);
      }
    } catch { /* silent */ }
  }, [user, isManager]);

  useEffect(() => {
    Promise.all([fetchCurrentTimesheet(), fetchRecentTimesheets(), fetchPendingApprovals(), fetchOvertimeAlerts(), fetchLeaveBalance()]).finally(() => setLoading(false));
  }, [fetchCurrentTimesheet, fetchRecentTimesheets, fetchPendingApprovals, fetchOvertimeAlerts, fetchLeaveBalance]);

  const handleCreateTimesheet = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const res = await authFetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: user.id, year: currentYear, month: currentMonth }),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setTimesheetId(data.id); setYearMonth(currentYear, currentMonth); setView('timesheet-edit');
      }
    } catch { /* silent */ } finally { setCreating(false); }
  };

  const handleEditTimesheet = () => {
    if (!currentTimesheet) return;
    setTimesheetId(currentTimesheet.id); setYearMonth(currentTimesheet.year, currentTimesheet.month); setView('timesheet-edit');
  };

  const annualLeaveTotal = currentTimesheet
    ? currentTimesheet.annualLeaveAM + currentTimesheet.annualLeavePM + (currentTimesheet.annualLeaveFull || 0) : 0;

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

  const statCards = [
    { label: '勤務日数',     value: currentTimesheet ? String(currentTimesheet.totalWorkDays) : '0',          unit: '日', icon: Clock },
    { label: '総労働時間',   value: currentTimesheet ? currentTimesheet.totalWorkHours.toFixed(1) : '0.0',     unit: 'h',  icon: Activity },
    { label: '残業時間',     value: currentTimesheet ? currentTimesheet.totalOvertimeHours.toFixed(1) : '0.0', unit: 'h',  icon: TrendingUp },
    { label: '有給残日数',   value: leaveBalance ? String(leaveBalance.remainingDays) : '—',                   unit: leaveBalance ? '日' : '', icon: Calendar,
      sub: leaveBalance ? `${currentYear}年 取得${leaveBalance.usedDays}/${leaveBalance.granted}日` : undefined,
      warn: leaveBalance ? leaveBalance.remainingDays <= 5 : false },
  ];

  return (
    <div className="space-y-6 fade-up">

      {/* ── Welcome ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-xs mb-1.5" style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-dm-mono)', letterSpacing: '0.12em' }}>
            {formatDate(now)}
          </p>
          <h1 className="text-3xl font-light leading-tight"
            style={{ fontFamily: 'var(--font-noto-serif-jp)', color: 'oklch(0.18 0.018 52)', letterSpacing: '0.01em' }}>
            ようこそ、{user?.name ?? ''}さん
          </h1>
        </div>
        <span className="text-sm px-3 py-1 rounded"
          style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.40 0.020 58)', fontFamily: 'var(--font-dm-mono)' }}>
          {currentYear}年 {MONTHS_JA[currentMonth]}
        </span>
      </div>

      {/* Ink divider */}
      <div className="ink-line" />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 fade-up fade-up-1">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label}
              className="rounded px-5 py-4"
              style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs" style={{ color: 'oklch(0.65 0.018 65)' }}>{card.label}</p>
                <Icon className="w-3.5 h-3.5" style={{ color: 'oklch(0.50 0.21 27)' }} />
              </div>
              <p className="text-3xl font-light"
                style={{ color: ('warn' in card && card.warn) ? 'oklch(0.65 0.18 60)' : 'oklch(0.18 0.018 52)', fontFamily: 'var(--font-dm-mono)', letterSpacing: '-0.02em' }}>
                {card.value}
                <span className="text-sm ml-1 font-normal" style={{ color: 'oklch(0.65 0.018 65)' }}>{card.unit}</span>
              </p>
              {'sub' in card && card.sub && (
                <p className="text-[10px] mt-1 font-mono" style={{ color: 'oklch(0.72 0.018 65)' }}>{card.sub}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Pending approvals banner ── */}
      {isManager && pendingApprovals > 0 && (
        <button
          onClick={() => setView('approval')}
          className="w-full flex items-center gap-4 px-5 py-4 rounded text-left transition-all duration-150 fade-up fade-up-2"
          style={{ background: 'oklch(0.952 0.055 27)', border: '1px solid oklch(0.82 0.14 27)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.930 0.075 27)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.952 0.055 27)'; }}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded shrink-0"
            style={{ background: 'oklch(0.50 0.21 27)', color: 'oklch(0.992 0.004 80)' }}>
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'oklch(0.36 0.18 30)', fontFamily: 'var(--font-noto-serif-jp)' }}>
              承認待ちの勤務表があります
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0.15 30)', fontFamily: 'var(--font-dm-mono)' }}>
              {pendingApprovals} 件が承認を待っています
            </p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'oklch(0.60 0.15 30)' }} />
        </button>
      )}

      {/* ── Overtime alert banner ── */}
      {isManager && overtimeAlerts.length > 0 && (
        <button
          onClick={() => setView('monthly-status')}
          className="w-full flex items-start gap-4 px-5 py-4 rounded text-left transition-all duration-150 fade-up fade-up-2"
          style={{ background: 'oklch(0.950 0.06 85)', border: '1px solid oklch(0.82 0.12 80)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.935 0.07 85)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.950 0.06 85)'; }}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded shrink-0 mt-0.5"
            style={{ background: 'oklch(0.65 0.18 60)', color: 'oklch(0.992 0.004 80)' }}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'oklch(0.36 0.14 55)', fontFamily: 'var(--font-noto-serif-jp)' }}>
              残業45時間超の社員がいます（{MONTHS_JA[currentMonth]}）
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {overtimeAlerts.map((a) => (
                <span key={a.name} className="text-xs font-mono" style={{ color: 'oklch(0.50 0.15 55)' }}>
                  {a.name} <span style={{ color: 'oklch(0.50 0.21 27)', fontWeight: 600 }}>{a.hours.toFixed(1)}h</span>
                </span>
              ))}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 mt-2.5" style={{ color: 'oklch(0.60 0.12 60)' }} />
        </button>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 fade-up fade-up-3">

        {/* Current timesheet */}
        <div className="lg:col-span-2 rounded overflow-hidden"
          style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)' }}>

          {/* Card header */}
          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid oklch(0.880 0.018 75)', background: 'oklch(0.960 0.014 78)' }}>
            <span className="text-sm font-medium" style={{ color: 'oklch(0.22 0.018 52)', fontFamily: 'var(--font-noto-serif-jp)' }}>
              今月の勤務表
            </span>
            {currentTimesheet && (() => {
              const st = STATUS_STYLES[currentTimesheet.status] || STATUS_STYLES.DRAFT;
              return (
                <span className="text-[10px] px-2 py-0.5 rounded"
                  style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.text, fontFamily: 'var(--font-dm-mono)' }}>
                  {STATUS_LABELS[currentTimesheet.status]}
                </span>
              );
            })()}
          </div>

          {currentTimesheet ? (
            <div className="px-5 py-4 space-y-3.5">
              {[
                { label: '勤務日数',   value: `${currentTimesheet.totalWorkDays} 日` },
                { label: '総労働時間', value: `${currentTimesheet.totalWorkHours.toFixed(1)} h` },
                { label: '残業時間',   value: `${currentTimesheet.totalOvertimeHours.toFixed(1)} h` },
                { label: '休出日数',   value: `${currentTimesheet.holidayWorkDays} 日` },
              ].map((row, i) => (
                <div key={row.label}>
                  {i > 0 && <div className="mb-3.5" style={{ height: '1px', background: 'oklch(0.920 0.012 78)' }} />}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'oklch(0.60 0.020 62)' }}>{row.label}</span>
                    <span className="text-sm font-medium"
                      style={{ color: 'oklch(0.22 0.018 52)', fontFamily: 'var(--font-dm-mono)' }}>
                      {row.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 flex flex-col items-center gap-3">
              <FileText className="w-8 h-8" style={{ color: 'oklch(0.82 0.018 75)' }} />
              <p className="text-sm text-center" style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-noto-serif-jp)' }}>
                今月の勤務表はまだありません
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="px-4 pb-4 pt-1 flex gap-2"
            style={{ borderTop: '1px solid oklch(0.920 0.012 78)' }}>
            {!currentTimesheet && (
              <button
                onClick={handleCreateTimesheet}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded text-sm font-medium transition-all disabled:opacity-60"
                style={{ background: 'oklch(0.18 0.018 52)', color: 'oklch(0.992 0.004 80)' }}
                onMouseEnter={(e) => { if (!creating) e.currentTarget.style.background = 'oklch(0.50 0.21 27)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.18 0.018 52)'; }}
              >
                <Plus className="w-3.5 h-3.5" />
                {creating ? '作成中...' : '今月の勤務表を作成'}
              </button>
            )}
            {currentTimesheet && currentTimesheet.status === 'DRAFT' && (
              <button onClick={handleEditTimesheet}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded text-sm font-medium transition-all"
                style={{ background: 'oklch(0.18 0.018 52)', color: 'oklch(0.992 0.004 80)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.50 0.21 27)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.18 0.018 52)'; }}>
                <Edit className="w-3.5 h-3.5" />編集
              </button>
            )}
            {currentTimesheet && currentTimesheet.status !== 'DRAFT' && (
              <button onClick={handleEditTimesheet}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded text-sm transition-all"
                style={{ background: 'oklch(0.948 0.014 78)', color: 'oklch(0.40 0.020 58)', border: '1px solid oklch(0.870 0.020 75)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.920 0.016 78)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.948 0.014 78)'; }}>
                <Eye className="w-3.5 h-3.5" />表示
              </button>
            )}
            <button onClick={() => setView('timesheet')}
              className="flex items-center justify-center gap-1 px-3 py-2.5 rounded text-sm transition-all"
              style={{ background: 'oklch(0.948 0.014 78)', color: 'oklch(0.55 0.020 60)', border: '1px solid oklch(0.870 0.020 75)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.920 0.016 78)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.948 0.014 78)'; }}>
              <FileText className="w-3.5 h-3.5" />一覧
            </button>
          </div>
        </div>

        {/* Recent timesheets */}
        <div className="lg:col-span-3 rounded overflow-hidden"
          style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)' }}>

          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid oklch(0.880 0.018 75)', background: 'oklch(0.960 0.014 78)' }}>
            <span className="text-sm font-medium" style={{ color: 'oklch(0.22 0.018 52)', fontFamily: 'var(--font-noto-serif-jp)' }}>
              最近の勤務表
            </span>
            <button onClick={() => setView('timesheet')}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'oklch(0.65 0.018 65)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'oklch(0.50 0.21 27)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'oklch(0.65 0.018 65)'; }}>
              すべて表示 <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div>
            {recentTimesheets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <FileText className="w-8 h-8" style={{ color: 'oklch(0.85 0.015 75)' }} />
                <p className="text-sm" style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-noto-serif-jp)' }}>
                  勤務表がまだありません
                </p>
              </div>
            ) : (
              recentTimesheets.map((ts, idx) => {
                const st = STATUS_STYLES[ts.status] || STATUS_STYLES.DRAFT;
                return (
                  <button key={ts.id}
                    onClick={() => { setTimesheetId(ts.id); setYearMonth(ts.year, ts.month); setView('timesheet-edit'); }}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors group"
                    style={{ borderTop: idx > 0 ? '1px solid oklch(0.920 0.012 78)' : 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.968 0.010 78)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Month number */}
                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded shrink-0"
                      style={{ background: 'oklch(0.955 0.012 78)', border: '1px solid oklch(0.870 0.020 75)' }}>
                      <span className="text-sm font-bold leading-none"
                        style={{ color: 'oklch(0.50 0.21 27)', fontFamily: 'var(--font-dm-mono)' }}>
                        {String(ts.month).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] mt-0.5"
                        style={{ color: 'oklch(0.70 0.018 65)', fontFamily: 'var(--font-noto-serif-jp)' }}>月</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'oklch(0.22 0.018 52)', fontFamily: 'var(--font-noto-serif-jp)' }}>
                        {ts.year}年 {MONTHS_JA[ts.month]}
                      </p>
                      <p className="text-xs mt-0.5"
                        style={{ color: 'oklch(0.60 0.018 65)', fontFamily: 'var(--font-dm-mono)' }}>
                        {ts.totalWorkDays}日 · {ts.totalWorkHours.toFixed(1)}h · 残業 {ts.totalOvertimeHours.toFixed(1)}h
                      </p>
                    </div>

                    {/* Status */}
                    <span className="text-[10px] px-2 py-0.5 rounded shrink-0"
                      style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.text, fontFamily: 'var(--font-dm-mono)' }}>
                      {STATUS_LABELS[ts.status]}
                    </span>

                    <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                      style={{ color: 'oklch(0.78 0.018 75)' }} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
