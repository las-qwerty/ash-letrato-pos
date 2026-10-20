'use client';

import { useEffect } from 'react';
import { initOtaUpdates } from '@/lib/ota';
import { initDesktopUpdates } from '@/lib/desktop-update';
import { installPrintClone } from '@/lib/print';

/** Runs the update check once on app start — Capgo OTA on mobile, the Tauri
 *  updater on desktop — and installs the print-clone listener everywhere. */
export function OtaUpdater() {
  useEffect(() => {
    void initOtaUpdates();
    void initDesktopUpdates();
    return installPrintClone();
  }, []);
  return null;
}
