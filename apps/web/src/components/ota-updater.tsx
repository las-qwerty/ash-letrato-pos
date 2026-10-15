'use client';

import { useEffect } from 'react';
import { initOtaUpdates } from '@/lib/ota';

/** Runs the over-the-air bundle check once on app start (native builds only). */
export function OtaUpdater() {
  useEffect(() => {
    void initOtaUpdates();
  }, []);
  return null;
}
