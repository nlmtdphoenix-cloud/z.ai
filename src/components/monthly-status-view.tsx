'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3, CheckCircle2, Clock, AlertTriangle, XCircle,
  FileX, ChevronDown, ChevronUp, Send, Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/api';
import { useAppStore } from '@/store/app-store';
import { MONTHS_JA, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import { toast } from 'sonner';

interface EmpInfo {
  id: string; name: string; employeeId: string; role: string; grade: string;
  departmentName: string; divisionName: string; groupName: string;
}
interface TsInfo {
  id: string; status: string; reportType: string; currentApprovalStep: number;
  submittedAt: string | null; approvedAt: string | null; totalOvertimeHours: number;
  approver: { name: string } | null;
}
interface StatusRow {
  employee: EmpInfo;
  timesheets: TsInfo[];
  hasZenhan: boolean; hasKohan: boolean;
  allApproved: boolean; anyRejected: boolean; anyPending: boolean;
  anyDraft: boolean; notSubmitted: boolean; totalOvertime: number;
}
interface Summary {
  total: number; notSubmitted: number; draft: number;
  pending: number; approved: number; rejected: number;
}

const OVERTIME_WARN = 36;  // h — yellow warning
const OVERTIME_DANGER = 45; // h — red danger

function rowStatus(row: StatusRow): 'not_submitted' | 'draft' | 'pending' | 'approved' | 'rejected' {
  if (row.notSubmitted) return 'not_submitted';
  if (row.anyRejected)  return 'rejected';
  if (row.anyPending)   return 'pending';
  if (row.anyDraft)     return 'draft';
  return 'approved';
}

const ROW_STATUS_CONFIG = {
  not_submitted: { label: '未提出',  icon: FileX,         color: 'text-slate-500',  bg: 'bg-slate-50' },
  draft:         { label: '下書き',  icon: Clock,         color: 'text-amber-500',  bg: 'bg-amber-50/60' },
  pending:       { label: '審査中',  icon: Send,          color: 'text-blue-600',   bg: 'bg-blue-50/60' },
  approved:      { label: '承認済み', icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50/60' },
  rejected:      { label: '差戻し',  icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-50/60' },
};

export function MonthlyStatusView() {
  const { setView, setTimesheetId, setYearMonth } = useAppStore();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows]   = useState<StatusRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField]       = useState<'name' | 'dept' | 'overtime'>('dept');
  const [sortAsc, setSortAsc]           = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/reports/monthly-status?year=${year}&month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setRows(json.data.rows);
        setSummary(json.data.summary);
      } else {
        toast.error('データの取得に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleOpenTs = (ts: TsInfo, emp: EmpInfo) => {
    setTimesheetId(ts.id);
    setYearMonth(year, month);
    setView('timesheet-edit');
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc((a) => !a);
    else { setSortField(field); setSortAsc(true); }
  };

  const filtered = rows.filter((r) => filterStatus === 'all' || rowStatus(r) === filterStatus);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name')     cmp = a.employee.name.localeCompare(b.employee.name, 'ja');
    if (sortField === 'dept')     cmp = `${a.employee.departmentName}${a.employee.groupName}`.localeCompare(`${b.employee.departmentName}${b.employee.groupName}`, 'ja');
    if (sortField === 'overtime') cmp = a.totalOvertime - b.totalOvertime;
    return sortAsc ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? (sortAsc ? <ChevronUp className="size-3 inline ml-0.5" /> : <ChevronDown className="size-3 inline ml-0.5" />)
      : null;

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const exportCSV = () => {
    const STATUS_CSV: Record<string, string> = {
      not_submitted: '未提出', draft: '下書き', pending: '審査中',
      approved: '承認済み', rejected: '差戻し',
    };
    const header = ['部署', 'グループ', '氏名', 'グレード', '社員番号', '前半', '後半', '残業計(h)', '状態'];
    const csvRows = sorted.map((r) => {
      const zenTs = r.timesheets.find((t) => t.reportType === 'ZENHAN');
      const koTs  = r.timesheets.find((t) => t.reportType === 'KOHAN');
      return [
        r.employee.departmentName,
        r.employee.groupName,
        r.employee.name,
        r.employee.grade,
        r.employee.employeeId || '',
        zenTs ? STATUS_LABELS[zenTs.status] || zenTs.status : '—',
        koTs  ? STATUS_LABELS[koTs.status]  || koTs.status  : '—',
        r.totalOvertime.toFixed(1),
        STATUS_CSV[rowStatus(r)] || rowStatus(r),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const bom = '\uFEFF';
    const blob = new Blob([bom + [header.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `月次提出状況_${year}年${String(month).padStart(2, '0')}月.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">月次提出状況</h1>
        <p className="text-sm text-muted-foreground mt-1">全社員の勤務表提出状況を一覧で確認できます</p>
      </div>

      {/* Year / Month selector */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {years.map((y) => (
            <button key={y}
              onClick={() => setYear(y)}
              className="px-3 py-1.5 text-sm rounded border transition-colors"
              style={{
                borderColor: 'oklch(0.870 0.020 75)',
                background: y === year ? 'oklch(0.50 0.21 27)' : 'transparent',
                color: y === year ? 'white' : 'inherit',
              }}>{y}年</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button key={m}
              onClick={() => setMonth(m)}
              className="w-10 py-1.5 text-xs rounded border transition-colors"
              style={{
                borderColor: 'oklch(0.870 0.020 75)',
                background: m === month ? 'oklch(0.50 0.21 27)' : 'transparent',
                color: m === month ? 'white' : 'inherit',
              }}>{MONTHS_JA[m]}</button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'all',          label: '全社員',   value: summary.total,        color: 'text-foreground',  border: '' },
            { key: 'not_submitted', label: '未提出',  value: summary.notSubmitted, color: 'text-slate-500',   border: 'border-slate-200' },
            { key: 'draft',        label: '下書き',   value: summary.draft,        color: 'text-amber-600',   border: 'border-amber-200' },
            { key: 'pending',      label: '審査中',   value: summary.pending,      color: 'text-blue-600',    border: 'border-blue-200' },
            { key: 'approved',     label: '承認済み', value: summary.approved,     color: 'text-emerald-600', border: 'border-emerald-200' },
            { key: 'rejected',     label: '差戻し',   value: summary.rejected,     color: 'text-red-500',     border: 'border-red-200' },
          ].map(({ key, label, value, color, border }) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all hover:shadow-md ${filterStatus === key ? 'ring-2 ring-offset-1 ring-[oklch(0.50_0.21_27)]' : ''} ${border}`}
              onClick={() => setFilterStatus(key)}
            >
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="size-4" />
            {year}年{MONTHS_JA[month]} — {filtered.length}名
          </CardTitle>
          {!loading && sorted.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors hover:shadow-sm"
              style={{ borderColor: 'oklch(0.870 0.020 75)', color: 'oklch(0.45 0.020 58)' }}
            >
              <Download className="size-3.5" />
              CSV
            </button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">読み込み中...</div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">対象データがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('dept')}>
                      部署・グループ <SortIcon field="dept" />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('name')}>
                      氏名 <SortIcon field="name" />
                    </th>
                    <th className="text-center px-3 py-2.5 font-medium">前半</th>
                    <th className="text-center px-3 py-2.5 font-medium">後半</th>
                    <th className="text-center px-3 py-2.5 font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('overtime')}>
                      残業計 <SortIcon field="overtime" />
                    </th>
                    <th className="text-center px-3 py-2.5 font-medium">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const st = rowStatus(row);
                    const cfg = ROW_STATUS_CONFIG[st];
                    const StatusIcon = cfg.icon;
                    const zenTs = row.timesheets.find((t) => t.reportType === 'ZENHAN');
                    const koTs  = row.timesheets.find((t) => t.reportType === 'KOHAN');
                    const otWarn = row.totalOvertime >= OVERTIME_DANGER ? 'text-red-600 font-bold'
                                  : row.totalOvertime >= OVERTIME_WARN  ? 'text-amber-600 font-semibold'
                                  : 'text-muted-foreground';
                    return (
                      <tr key={row.employee.id} className={`border-b hover:bg-muted/20 transition-colors ${cfg.bg}`}>
                        <td className="px-4 py-2.5">
                          <div className="text-xs text-muted-foreground">{row.employee.departmentName}</div>
                          <div className="text-xs">{row.employee.groupName}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{row.employee.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{row.employee.grade}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">{row.employee.employeeId}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {zenTs ? (
                            <button
                              onClick={() => handleOpenTs(zenTs, row.employee)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border hover:shadow-sm transition-all"
                              style={{
                                borderColor: 'oklch(0.870 0.020 75)',
                                background: STATUS_COLORS[zenTs.status]?.includes('emerald') ? 'oklch(0.95 0.04 145)' : undefined,
                              }}
                            >
                              <span style={{ fontSize: '10px' }}>{STATUS_LABELS[zenTs.status]}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {koTs ? (
                            <button
                              onClick={() => handleOpenTs(koTs, row.employee)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border hover:shadow-sm transition-all"
                            >
                              <span style={{ fontSize: '10px' }}>{STATUS_LABELS[koTs.status]}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {row.totalOvertime > 0 ? (
                            <span className={`text-xs font-mono ${otWarn}`}>
                              {row.totalOvertime.toFixed(1)}h
                              {row.totalOvertime >= OVERTIME_DANGER && <AlertTriangle className="size-3 inline ml-1" />}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs ${cfg.color}`}>
                            <StatusIcon className="size-3.5" />
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
