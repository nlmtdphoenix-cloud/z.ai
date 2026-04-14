'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, AlertCircle } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/constants';

const DEMO_ACCOUNTS = [
  { name: '管理者', email: 'admin@company.com', role: 'ADMIN' as const },
  { name: 'マネージャー', email: 'manager@company.com', role: 'MANAGER' as const },
  { name: '田中 次郎', email: 'tanaka@company.com', role: 'EMPLOYEE' as const },
  { name: '佐藤 花子', email: 'suzuki@company.com', role: 'EMPLOYEE' as const },
];

const ROLE_BADGE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 hover:bg-red-100',
  MANAGER: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  EMPLOYEE: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
};

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const setView = useAppStore((s) => s.setView);

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    if (!loginEmail.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `ログインに失敗しました (${res.status})`);
        return;
      }

      const data = await res.json();
      const { token, ...userFields } = data;
      const user: Employee = userFields;
      login(user, token);
      setView('dashboard');
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
    handleLogin(demoEmail, 'demo123');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg shadow-primary/20">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            勤務時間報告システム
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Work Hours Report System
          </p>
        </div>

        {/* Login Card */}
        <div>
          <Card className="shadow-lg shadow-black/5 border-border/50">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg">ログイン</CardTitle>
              <CardDescription>
                メールアドレスとパスワードを入力してください
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="email@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    disabled={loading}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="パスワード"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      ログイン中...
                    </>
                  ) : (
                    'ログイン'
                  )}
                </Button>
              </CardContent>
            </form>
            <CardFooter className="pt-0 pb-1">
              <p className="text-xs text-muted-foreground text-center w-full">
                パスワード: demo123
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* Demo Accounts */}
        <div className="mt-6">
          <p className="text-sm font-medium text-muted-foreground text-center mb-3">
            デモアカウント
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleDemoClick(account.email)}
                disabled={loading}
                className="flex flex-col items-start gap-1.5 rounded-lg border border-border/50 bg-white p-3 text-left transition-colors hover:bg-accent/50 hover:border-border disabled:opacity-50"
              >
                <span className="text-sm font-medium text-foreground truncate w-full">
                  {account.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${ROLE_BADGE_COLORS[account.role] || ''}`}
                  >
                    {ROLE_LABELS[account.role]}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {account.email}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground/60">
            &copy; 2026 CrasCAD Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
