'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Employee } from '@/lib/types';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const setView = useAppStore((s) => s.setView);

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    if (!loginEmail.trim()) { setError('メールアドレスを入力してください'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `ログインに失敗しました (${res.status})`); return;
      }
      const data = await res.json();
      const { token, ...userFields } = data;
      login(userFields as Employee, token);
      setView('dashboard');
    } catch { setError('ネットワークエラーが発生しました'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'oklch(0.975 0.008 80)' }}>

      {/* ── Left: decorative panel ────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[44%] relative overflow-hidden"
        style={{ background: 'oklch(0.18 0.018 52)' }}
      >
        {/* Washi grid pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="oklch(0.975 0.008 80)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Vertical red accent stripe */}
        <div className="absolute right-0 top-0 bottom-0 w-[3px]"
          style={{ background: 'oklch(0.50 0.21 27)' }} />

        {/* Top corner mark */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3">
            {/* Hanko-style square mark */}
            <div className="w-9 h-9 flex items-center justify-center border-2 rounded-sm"
              style={{ borderColor: 'oklch(0.50 0.21 27)', color: 'oklch(0.50 0.21 27)' }}>
              <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-noto-serif-jp)' }}>勤</span>
            </div>
            <span className="text-xs tracking-[0.3em]"
              style={{ color: 'oklch(0.65 0.015 70)', fontFamily: 'var(--font-dm-mono)' }}>
              CrasCAD Inc.
            </span>
          </div>
        </div>

        {/* Center calligraphy-style title */}
        <div className="relative z-10 px-12 pb-4">
          {/* Vertical Japanese title */}
          <div className="flex gap-6 items-start">
            {/* Vertical text column */}
            <div className="flex flex-col items-center gap-1">
              {['勤', '務', '時', '間', '報', '告'].map((c, i) => (
                <span key={i} className="text-3xl font-light leading-none"
                  style={{ color: 'oklch(0.90 0.005 75)', fontFamily: 'var(--font-noto-serif-jp)', letterSpacing: '0.05em' }}>
                  {c}
                </span>
              ))}
            </div>
            <div className="flex flex-col items-center gap-1 mt-6">
              {['シ', 'ス', 'テ', 'ム'].map((c, i) => (
                <span key={i} className="text-3xl font-light leading-none"
                  style={{ color: 'oklch(0.90 0.005 75)', fontFamily: 'var(--font-noto-serif-jp)', letterSpacing: '0.05em' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Horizontal red underline accent */}
          <div className="mt-8 w-12 h-0.5" style={{ background: 'oklch(0.50 0.21 27)' }} />
          <p className="mt-3 text-xs tracking-widest"
            style={{ color: 'oklch(0.52 0.018 65)', fontFamily: 'var(--font-dm-mono)', letterSpacing: '0.2em' }}>
            WORK HOURS REPORT
          </p>
        </div>

        {/* Bottom info */}
        <div className="relative z-10 px-12 pb-12 space-y-3">
          <div className="w-full h-px" style={{ background: 'oklch(0.30 0.015 55)' }} />
          <p className="text-xs" style={{ color: 'oklch(0.42 0.015 65)', fontFamily: 'var(--font-dm-mono)' }}>
            © 2026 CrasCAD Inc.
          </p>
        </div>
      </div>

      {/* ── Right: login form ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-[360px] fade-up">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center border-2 rounded-sm"
              style={{ borderColor: 'oklch(0.50 0.21 27)', color: 'oklch(0.50 0.21 27)' }}>
              <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-noto-serif-jp)' }}>勤</span>
            </div>
            <span className="text-sm font-medium" style={{ color: 'oklch(0.18 0.018 52)', fontFamily: 'var(--font-noto-serif-jp)' }}>
              勤務時間報告システム
            </span>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h2 className="text-4xl font-light mb-2"
              style={{ fontFamily: 'var(--font-noto-serif-jp)', color: 'oklch(0.18 0.018 52)', letterSpacing: '-0.01em' }}>
              ログイン
            </h2>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: 'oklch(0.50 0.21 27)' }} />
              <span className="text-xs tracking-widest" style={{ color: 'oklch(0.50 0.21 27)', fontFamily: 'var(--font-dm-mono)' }}>
                SIGN IN
              </span>
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleLogin(email, password); }}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label className="block mb-1.5 text-xs font-medium"
                style={{ color: 'oklch(0.40 0.020 58)', letterSpacing: '0.08em' }}>
                メールアドレス
              </label>
              <div className="vermillion-focus rounded"
                style={{ border: '1px solid oklch(0.86 0.018 75)', background: 'oklch(0.992 0.004 80)' }}>
                <input
                  type="email"
                  placeholder="email@crascad.co.jp"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={loading}
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none disabled:opacity-50 rounded"
                  style={{ color: 'oklch(0.18 0.018 52)', fontFamily: 'var(--font-dm-sans)' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block mb-1.5 text-xs font-medium"
                style={{ color: 'oklch(0.40 0.020 58)', letterSpacing: '0.08em' }}>
                パスワード
              </label>
              <div className="vermillion-focus rounded"
                style={{ border: '1px solid oklch(0.86 0.018 75)', background: 'oklch(0.992 0.004 80)' }}>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none disabled:opacity-50 rounded"
                  style={{ color: 'oklch(0.18 0.018 52)', fontFamily: 'var(--font-dm-mono)' }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded text-xs"
                style={{ background: 'oklch(0.96 0.06 27)', border: '1px solid oklch(0.85 0.12 27)', color: 'oklch(0.44 0.18 27)' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded transition-all duration-200 disabled:opacity-60 mt-2"
              style={{ background: 'oklch(0.18 0.018 52)', color: 'oklch(0.975 0.008 80)' }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = 'oklch(0.50 0.21 27)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.18 0.018 52)'; }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />ログイン中...</>
                : 'ログイン'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid oklch(0.88 0.018 75)' }}>
            <p className="text-xs text-center" style={{ color: 'oklch(0.65 0.018 65)' }}>
              デモ用パスワード:{' '}
              <code className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: 'oklch(0.940 0.016 78)', color: 'oklch(0.50 0.21 27)', fontFamily: 'var(--font-dm-mono)' }}>
                password123
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
