'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Loader2,
  Clock,
  Utensils,
  AlertCircle,
  Info,
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

export function SettingsView() {
  const [config, setConfig] = useState<SystemConfig>({
    STANDARD_WORK_HOURS: '8',
    DEFAULT_BREAK_MINUTES: '60',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
