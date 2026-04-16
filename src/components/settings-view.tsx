'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Loader2,
  Clock,
  AlertCircle,
  Info,
  CalendarDays,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

interface SystemConfig {
  STANDARD_WORK_HOURS: string;
  DEFAULT_BREAK_MINUTES: string;
}

interface HolidayRecord {
  id: string;
  year: number;
  month: number;
  day: number;
  name: string;
}

export function SettingsView() {
  const [config, setConfig] = useState<SystemConfig>({
    STANDARD_WORK_HOURS: '8',
    DEFAULT_BREAK_MINUTES: '60',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Holiday management state
  const currentYear = new Date().getFullYear();
  const [holidayYear, setHolidayYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ month: '', day: '', name: '' });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data.STANDARD_WORK_HOURS || data.DEFAULT_BREAK_MINUTES) {
          setConfig({
            STANDARD_WORK_HOURS: data.STANDARD_WORK_HOURS || config.STANDARD_WORK_HOURS,
            DEFAULT_BREAK_MINUTES: data.DEFAULT_BREAK_MINUTES || config.DEFAULT_BREAK_MINUTES,
          });
        }
      }
    } catch {
      toast.error('設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success('設定を保存しました');
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

  const handleReset = () => {
    setConfig({
      STANDARD_WORK_HOURS: '8',
      DEFAULT_BREAK_MINUTES: '60',
    });
    toast.info('デフォルト値にリセットしました（保存はしていません）');
  };

  const fetchHolidays = useCallback(async (year: number) => {
    setHolidayLoading(true);
    try {
      const res = await authFetch(`/api/holidays?year=${year}`);
      if (res.ok) {
        const json = await res.json();
        setHolidays(json.data || []);
      }
    } catch { /* silent */ } finally {
      setHolidayLoading(false);
    }
  }, []);

  useEffect(() => { fetchHolidays(holidayYear); }, [holidayYear, fetchHolidays]);

  const handleAddHoliday = async () => {
    const m = parseInt(newHoliday.month, 10);
    const d = parseInt(newHoliday.day, 10);
    if (!m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      toast.error('月・日を正しく入力してください');
      return;
    }
    try {
      const res = await authFetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: holidayYear, month: m, day: d, name: newHoliday.name }),
      });
      if (res.ok) {
        toast.success('祝日を追加しました');
        setNewHoliday({ month: '', day: '', name: '' });
        fetchHolidays(holidayYear);
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || '追加に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      const res = await authFetch(`/api/holidays/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('祝日を削除しました');
        setHolidays((prev) => prev.filter((h) => h.id !== id));
      }
    } catch {
      toast.error('通信エラーが発生しました');
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">システム設定</h1>
        <p className="text-sm text-muted-foreground mt-1">
          勤務時間報告システムの全社設定を管理します
        </p>
      </div>

      {/* Work Hours Settings */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              勤務時間設定
            </CardTitle>
            <CardDescription>
              標準勤務時間と休憩時間の設定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="standard-hours" className="flex items-center gap-2">
                  標準勤務時間
                  <span className="text-xs text-muted-foreground font-normal">（時間/日）</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="standard-hours"
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={config.STANDARD_WORK_HOURS}
                    onChange={(e) => setConfig({ ...config, STANDARD_WORK_HOURS: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">時間</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  1日あたりの標準勤務時間です。残業計算の基準になります。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="break-minutes" className="flex items-center gap-2">
                  デフォルト休憩時間
                  <span className="text-xs text-muted-foreground font-normal">（分/日）</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="break-minutes"
                    type="number"
                    min="0"
                    max="480"
                    step="15"
                    value={config.DEFAULT_BREAK_MINUTES}
                    onChange={(e) => setConfig({ ...config, DEFAULT_BREAK_MINUTES: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">分</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  1日あたりのデフォルト休憩時間です。実労働時間 = 勤務時間 - 休憩時間。
                </p>
              </div>
            </div>

            <Separator />

            {/* Info box */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="size-4 text-muted-foreground" />
                計算方法について
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>・実労働時間 = 終業時間 - 始業時間 - 休憩時間</p>
                <p>・残業時間 = max(0, 実労働時間 - 標準勤務時間)</p>
                <p>・過不足 = 実労働時間 - 標準勤務時間（マイナスも表示）</p>
                <p>・当月累計過不足 = 各営業日の過不足を日順に累計</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                保存
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="size-4" />
                デフォルトに戻す
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holiday Management */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              祝日管理
            </CardTitle>
            <CardDescription>
              システムに登録されている祝日の確認・追加・削除ができます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Year selector */}
            <div className="flex items-center gap-2">
              <Label>対象年</Label>
              <div className="flex gap-1">
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <Button
                    key={y}
                    variant={y === holidayYear ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHolidayYear(y)}
                  >
                    {y}年
                  </Button>
                ))}
              </div>
            </div>

            {/* Add new holiday */}
            <div className="flex items-end gap-2 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs">月</Label>
                <Input
                  type="number" min={1} max={12} placeholder="月"
                  value={newHoliday.month}
                  onChange={(e) => setNewHoliday((p) => ({ ...p, month: e.target.value }))}
                  className="w-16 h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">日</Label>
                <Input
                  type="number" min={1} max={31} placeholder="日"
                  value={newHoliday.day}
                  onChange={(e) => setNewHoliday((p) => ({ ...p, day: e.target.value }))}
                  className="w-16 h-8 text-sm"
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">祝日名</Label>
                <Input
                  placeholder="例：元日"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday((p) => ({ ...p, name: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <Button size="sm" onClick={handleAddHoliday} className="h-8">
                <Plus className="size-3.5 mr-1" />
                追加
              </Button>
            </div>

            <Separator />

            {/* Holiday list */}
            {holidayLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {holidayYear}年の祝日が登録されていません
              </p>
            ) : (
              <div className="grid gap-1.5">
                {holidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/40 group">
                    <span className="text-sm">
                      <span className="font-mono text-muted-foreground mr-2">{h.month}/{String(h.day).padStart(2, '0')}</span>
                      {h.name || '（名称なし）'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteHoliday(h.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5" />
              システム情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">システム名</span>
                <span className="font-medium">勤務時間報告システム</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">バージョン</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">データベース</span>
                <span className="font-medium">PostgreSQL (Prisma ORM)</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">フレームワーク</span>
                <span className="font-medium">Next.js 16 + TypeScript</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
