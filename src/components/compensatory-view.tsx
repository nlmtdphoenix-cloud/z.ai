'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarCheck2, Download, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/api';
import { MONTHS_JA } from '@/lib/constants';
import { toast } from 'sonner';

interface EmpInfo {
  id: string; name: string; employeeId: string; grade: string;
  departmentName: string; divisionName: string; groupName: string;
}
interface CompRow {
  employee: EmpInfo;
  asOf: { year: number; month: number; reportType: string } | null;
  compensatoryCurrent: number;
  compensatoryNext: number;
  compensatoryAfter: number;
  total: number;
}

export function CompensatoryView() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows]   = useState<CompRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHas, setFilterHas] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/reports/compensatory?year=${year}&month=${month}`);
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
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const displayed = filterHas ? rows.filter((r) => r.total > 0) : rows;
  const hasCount = rows.filter((r) => r.total > 0).length;

  const exportCSV = () => {
    const header = ['部署', 'グループ', '氏名', 'グレード', '社員番号', '補翌前(日)', '補翌(日)', '補翌々(日)', '合計(日)', '基準勤務表'];
    const csvRows = displayed.map((r) => {
      const asOf = r.asOf ? `${r.asOf.year}/${r.asOf.month}${r.asOf.reportType === 'ZENHAN' ? '前' : '後'}` : '—';
      return [
        r.employee.departmentName,
        r.employee.groupName,
        r.employee.name,
        r.employee.grade,
        r.employee.employeeId || '',
        r.compensatoryCurrent.toFixed(1),
        r.compensatoryNext.toFixed(1),
        r.compensatoryAfter.toFixed(1),
        r.total.toFixed(1),
        asOf,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const bom = '\uFEFF';
    const blob = new Blob([bom + [header.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `代休残日数_${year}年${String(month).padStart(2, '0')}月.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">代休残日数管理</h1>
        <p className="text-sm text-muted-foreground mt-1">補代・補翌・補翌々の残日数を社員ごとに確認できます</p>
      </div>

      {/* Selectors */}
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
        <button
          onClick={() => setFilterHas((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors"
          style={{
            borderColor: filterHas ? 'oklch(0.72 0.18 30)' : 'oklch(0.870 0.020 75)',
            background: filterHas ? 'oklch(0.95 0.06 30)' : 'transparent',
            color: filterHas ? 'oklch(0.44 0.18 27)' : 'inherit',
          }}
        >
          残あり（&gt;0日）のみ表示
          {hasCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: 'oklch(0.50 0.21 27)', color: 'white' }}>
              {hasCount}
            </span>
          )}
        </button>
      </div>

      {/* Summary */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono">{hasCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">代休残あり社員</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono text-blue-600">
                {rows.reduce((s, r) => s + r.total, 0).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">全社合計残日数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono text-amber-600">
                {rows.reduce((s, r) => s + r.compensatoryAfter, 0).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">補翌々（期限最短）</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarCheck2 className="size-4" />
            {year}年{MONTHS_JA[month]}時点 — {displayed.length}名
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
            <div className="py-16 text-center text-sm text-muted-foreground">代休残日数のある社員はいません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-medium">部署・グループ</th>
                    <th className="text-left px-4 py-2.5 font-medium">氏名</th>
                    <th className="text-center px-3 py-2.5 font-medium">補翌前</th>
                    <th className="text-center px-3 py-2.5 font-medium">補翌</th>
                    <th className="text-center px-3 py-2.5 font-medium">補翌々</th>
                    <th className="text-center px-3 py-2.5 font-medium font-semibold">合計</th>
                    <th className="text-center px-3 py-2.5 font-medium">基準</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((row) => (
                    <tr key={row.employee.id}
                      className={`border-b hover:bg-muted/20 transition-colors ${row.total > 0 ? 'bg-blue-50/30' : ''}`}>
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
                        <span className={`text-xs font-mono ${row.compensatoryCurrent > 0 ? 'text-blue-600 font-semibold' : 'text-muted-foreground/40'}`}>
                          {row.compensatoryCurrent > 0 ? `${row.compensatoryCurrent.toFixed(1)}日` : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-mono ${row.compensatoryNext > 0 ? 'text-amber-600 font-semibold' : 'text-muted-foreground/40'}`}>
                          {row.compensatoryNext > 0 ? `${row.compensatoryNext.toFixed(1)}日` : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-mono ${row.compensatoryAfter > 0 ? 'text-red-600 font-bold' : 'text-muted-foreground/40'}`}>
                          {row.compensatoryAfter > 0 ? `${row.compensatoryAfter.toFixed(1)}日` : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-sm font-bold font-mono ${row.total > 0 ? 'text-blue-700' : 'text-muted-foreground/40'}`}>
                          {row.total > 0 ? `${row.total.toFixed(1)}日` : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {row.asOf ? (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {row.asOf.year}/{row.asOf.month}{row.asOf.reportType === 'ZENHAN' ? '前' : '後'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="size-3.5 shrink-0 mt-0.5" />
        <span>
          補翌前＝当月分代休、補翌＝翌月繰越、補翌々＝翌々月繰越。
          「補翌々」は期限が最も短く優先取得が必要です。各値は直近の勤務表から取得しています。
        </span>
      </div>
    </div>
  );
}
