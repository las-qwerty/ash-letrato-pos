'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('admin@ashletrato.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // slight delay so the button state is visible
    setTimeout(() => {
      void login(email, password).then((ok) => {
        if (ok) {
          router.replace('/pos');
        } else {
          setError('Invalid credentials. Use the demo account, or a staff email + PIN.');
          setBusy(false);
        }
      });
    }, 250);
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-[42%] flex-col justify-between bg-pine-950 p-10 text-pine-100 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="ASH LETRATO logo" className="h-9 w-9" />
          </div>
          <p className="font-display text-xl font-medium text-white">ASH LETRATO POS</p>
        </div>

        <div>
          <p className="font-display text-4xl font-medium leading-snug tracking-tight text-white">
            The counter,
            <br />
            <em className="text-pine-300">beautifully</em> simple.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-pine-300">
            Sales, inventory, customers and receipts for ASH LETRATO, INC. —
            on the counter, in your pocket, everywhere.
          </p>
        </div>

        <p className="text-xs text-pine-400">ASH LETRATO, INC. · Digital Printing Services</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="font-display text-2xl font-medium">ASH LETRATO POS</p>
          </div>

          <h1 className="font-display text-2xl font-medium tracking-tight">
            Sign in to your register
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Enter your staff credentials to open a shift.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full !py-2.5">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white/60 p-4 text-xs leading-relaxed text-stone-500">
            <p className="font-medium text-stone-600">Demo account</p>
            <p className="mt-1">
              Email <code className="rounded bg-stone-100 px-1">admin@ashletrato.com</code> ·
              Password <code className="rounded bg-stone-100 px-1">letrato123</code>
            </p>
            <p className="mt-1">
              Register PINs — Simone <code className="rounded bg-stone-100 px-1">2468</code> ·
              Maria <code className="rounded bg-stone-100 px-1">1357</code> ·
              Jonas <code className="rounded bg-stone-100 px-1">1122</code>
            </p>
            <p className="mt-1">
              Staff can also sign in here with their own email + 4-digit PIN.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
