'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { useStore } from '@/lib/store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const locked = useStore((s) => s.locked);
  const [ready, setReady] = useState(false);

  // wait one tick for persisted session to hydrate
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login');
    else if (locked) router.replace('/lock');
  }, [ready, user, locked, router]);

  // Auto-lock the till after N idle minutes (shared-device safety).
  const autoLockMinutes = useStore((s) => s.settings.autoLockMinutes);
  useEffect(() => {
    if (!ready || !user || locked || !autoLockMinutes) return;
    let timer = setTimeout(fire, autoLockMinutes * 60_000);
    function fire() {
      useStore.getState().lock();
      router.push('/lock');
    }
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(fire, autoLockMinutes * 60_000);
    };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [ready, user, locked, autoLockMinutes, router]);

  if (!ready || !user || locked) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-pine-200 border-t-pine-700" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
