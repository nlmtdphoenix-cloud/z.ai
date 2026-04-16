'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, AlertTriangle, TrendingDown, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/api';
import { toast } from 'sonner';

interface EmpInfo {
  id: string; name: string; employeeId: string; grade: string;
  departmentName: string; divisionName: string; groupName: string;
  annualLeaveGranted: number;
}
interface LeaveRow {
  employee: EmpInfo;
  granted: number;
  usedDays: number;
  remainingDays: number;
  detail: { am: number; pm: number; full: number };
}

const WARN_THRESHOLD = 5; // remaining days ≤ 5 → warn

export function LeaveBalanceView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLow, setFilterLow] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/reports/leave-balance?year=${year}`);
      if (res.ok) {
        const json = await res.json();
        setRows(json.data.rows);
      } else {
        toast.error('データの取得に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const displayed = filterLow ? rows.filter((r) => r.remainingDays <= WARN_THRESHOLD) : rows;

  const exportCSV = () => {
    const header = ['部署', 'グループ', '氏名', 'グレード', '社員番号', '付与日数', '取得済み(日)', 'AM半休', 'PM半休', '終日', '残日数', '使用率(%)'];
    const csvRows = displayed.map((r) => {
      const pct = r.granted > 0 ? ((r.usedDays / r.granted) * 100).toFixed(1) : '0.0';
      return [
        r.employee.departmentName,
        r.employee.groupName,
        r.employee.name,
        r.employee.grade,
        r.employee.employeeId || '',
        r.granted,
        r.usedDays.toFixed(1),
        r.detail.am,
        r.detail.pm,
        r.detail.full,
        r.remainingDays.toFixed(1),
        pct,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const bom = '\uFEFF';
    const blob = new Blob([bom + [header.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `年次有給残日数_${year}年.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lowCount = rows.filter((r) => r.remainingDays <= WARN_THRESHOLD).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">年次有給残日数</h1>
        <p className="text-sm text-muted-foreground mt-1">社員ごとの年次有給休暇取得状況と残日数を確認できます</p>
      </div>

      {/* Year selector + filter */}
      <div className="flex flex-wrap items-center gap-3">
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
        <button
          onClick={() => setFilterLow((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors"
          style={{
            borderColor: filterLow ? 'oklch(0.72 0.18 30)' : 'oklch(0.870 0.020 75)',
            background: filterLow ? 'oklch(0.95 0.06 30)' : 'transparent',
            color: filterLow ? 'oklch(0.44 0.18 27)' : 'inherit',
          }}
        >
          <AlertTriangle className="size-3.5" />
          残少（{WARN_THRESHOLD}日以下）のみ表示
          {lowCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: 'oklch(0.50 0.21 27)', color: 'white' }}>
              {lowCount}
            </span>
          )}
        </button>
      </div>

      {/* Summary cards */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono">{rows.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">対象社員</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono text-emerald-600">
                {(rows.reduce((s, r) => s + r.remainingDays, 0) / rows.length).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">平均残日数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono text-amber-600">
                {lowCount}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">残少（≤{WARN_THRESHOLD}日）</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono text-blue-600">
                {(rows.reduce((s, r) => s + r.usedDays, 0) / rows.length).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">平均取得日数</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarCheck className="size-4" />
            {year}年 有給残日数一覧 — {displayed.length}名
          </CardTitle>
          {!loading && displayed.length > 0 && (
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
          ) : displayed.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">対象データがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-medium">部署・グループ</th>
                    <th className="text-left px-4 py-2.5 font-medium">氏名</th>
                    <th className="text-center px-3 py-2.5 font-medium">付与日数</th>
                    <th className="text-center px-3 py-2.5 font-medium">取得済み</th>
                    <th className="text-center px-3 py-2.5 font-medium">内訳（AM/PM/終日）</th>
                    <th className="text-center px-3 py-2.5 font-medium">残日数</th>
                    <th className="text-center px-3 py-2.5 font-medium">使用率</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((row) => {
                    const pct = row.granted > 0 ? (row.usedDays / row.granted) * 100 : 0;
                    const isLow = row.remainingDays <= WARN_THRESHOLD;
                    return (
                      <tr key={row.employee.id}
                        className={`border-b hover:bg-muted/20 transition-colors ${isLow ? 'bg-amber-50/40' : ''}`}>
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
                          <span className="text-xs font-mono">{row.granted}日</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs font-mono font-semibold">{row.usedDays.toFixed(1)}日</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {row.detail.am}/{row.detail.pm}/{row.detail.full}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-sm font-bold font-mono ${
                            isLow ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {row.remainingDays.toFixed(1)}日
                            {isLow && <AlertTriangle className="size-3 inline ml-1" />}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-mono text-muted-foreground">{pct.toFixed(0)}%</span>
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  background: pct >= 80 ? 'oklch(0.50 0.21 27)' : pct >= 50 ? 'oklch(0.72 0.18 85)' : 'oklch(0.55 0.14 145)',
                                }}
                              />
                            </div>
                          </div>
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

      {/* Note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <TrendingDown className="size-3.5 shrink-0 mt-0.5" />
        <span>取得済み日数は当年の承認済み・提出中の勤務表から集計しています。AM・PM半日休暇は各0.5日として計算します。</span>
      </div>
    </div>
  );
}
