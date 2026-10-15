'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);

  useEffect(() => {
    router.replace(user ? '/pos' : '/login');
  }, [user, router]);

  return null;
}
