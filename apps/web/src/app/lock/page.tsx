'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { initials, type User } from '@simmy/core';
import { useStore } from '@/lib/store';
import clsx from 'clsx';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function LockPage() {
  const router = useRouter();
  const users = useStore((s) => s.users);
  const currentUser = useStore((s) => s.currentUser);
  const unlock = useStore((s) => s.unlock);
  const logout = useStore((s) => s.logout);
  const [selected, setSelected] = useState<User | null>(currentUser);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const verifying = useRef(false);

  // Cooldown countdown after too many failed attempts.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Landing on this page means "lock the till" — set the flag so a refresh
  // can't bypass the PIN screen by going back.
  useEffect(() => {
    useStore.getState().lock();
  }, []);

  // If somehow nobody is signed in at all, go to full login.
  useEffect(() => {
    if (!currentUser) router.replace('/login');
  }, [currentUser, router]);

  useEffect(() => {
    if (!selected || pin.length !== 4 || cooldown > 0 || verifying.current) return;
    verifying.current = true;
    void unlock(selected.id, pin).then((ok) => {
      if (ok) {
        router.replace('/pos');
        return;
      }
      setAttempts((a) => {
        const next = a + 1;
        // Store-level lockout wins — it escalates (30s→60s→…) and persists
        // across remounts; the local counter is just the fast-path UI.
        const storeUntil = useStore.getState().pinFailures[selected.id]?.until ?? 0;
        const storeCooldown = Math.max(0, Math.ceil((storeUntil - Date.now()) / 1000));
        if (next >= MAX_ATTEMPTS || storeCooldown > 0)
          setCooldown(Math.max(LOCKOUT_SECONDS, storeCooldown));
        return next >= MAX_ATTEMPTS ? 0 : next;
      });
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
        verifying.current = false;
      }, 450);
    });
  }, [pin, selected, cooldown, unlock, router]);

  const key = (d: string) => {
    if (pin.length >= 4 || cooldown > 0) return;
    setPin((p) => p + d);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-pine-950 p-6">
      <div className="w-full max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="ASH LETRATO logo" className="mx-auto h-14 w-14 rounded-2xl bg-white p-1" />
        <p className="mt-3 font-display text-xl font-medium text-white">ASH LETRATO POS</p>
        <p className="mt-1 text-sm text-pine-300">
          {cooldown > 0
            ? `Too many attempts — try again in ${cooldown}s`
            : selected
              ? 'Enter your PIN to open the register'
              : 'Who’s at the register?'}
        </p>

        {!selected ? (
          <div className="mt-8 grid grid-cols-3 gap-3">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-pine-900 p-5 transition hover:bg-pine-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pine-400"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pine-700 font-display text-lg font-medium text-white">
                  {initials(u.firstName, u.lastName)}
                </span>
                <span className="text-sm font-medium text-white">{u.firstName}</span>
                <span className="text-[10px] uppercase tracking-wide text-pine-400">
                  {u.role.replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pine-700 font-display text-lg font-medium text-white">
              {initials(selected.firstName, selected.lastName)}
            </div>
            <p className="mt-2 font-medium text-white">
              {selected.firstName} {selected.lastName}
            </p>

            {/* PIN dots */}
            <div
              className={clsx(
                'mt-5 flex justify-center gap-3',
                error && 'animate-pulse',
              )}
              aria-label={`${pin.length} of 4 digits entered`}
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={clsx(
                    'h-3.5 w-3.5 rounded-full transition',
                    pin.length > i
                      ? error
                        ? 'bg-clay'
                        : 'bg-pine-300'
                      : 'bg-pine-800',
                  )}
                />
              ))}
            </div>

            {/* Keypad */}
            <div
              className={clsx(
                'mx-auto mt-6 grid max-w-[240px] grid-cols-3 gap-2',
                cooldown > 0 && 'pointer-events-none opacity-40',
              )}
            >
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <PinKey key={d} onPress={() => key(d)}>
                  {d}
                </PinKey>
              ))}
              <PinKey onPress={() => { setSelected(null); setPin(''); }} label="Back">‹</PinKey>
              <PinKey onPress={() => key('0')}>0</PinKey>
              <PinKey onPress={() => setPin((p) => p.slice(0, -1))} label="Delete">⌫</PinKey>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            logout();
            router.replace('/login');
          }}
          className="mt-8 text-xs text-pine-400 underline-offset-2 hover:text-pine-200 hover:underline"
        >
          Sign in with email instead
        </button>
      </div>
    </div>
  );
}

function PinKey({
  children,
  onPress,
  label,
}: {
  children: string;
  onPress: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onPress}
      aria-label={label ?? `Digit ${children}`}
      className="flex h-16 items-center justify-center rounded-xl bg-pine-900 text-xl font-medium text-white transition hover:bg-pine-800 active:bg-pine-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pine-400"
    >
      {children}
    </button>
  );
}
