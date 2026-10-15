import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

/** Stable URL — CI republishes both files under the fixed `ota-latest` tag. */
const MANIFEST_URL =
  'https://github.com/las-qwerty/ash-letrato-pos/releases/download/ota-latest/app-version.json';
const VERSION_KEY = 'ota-version';

interface OtaManifest {
  version: string;
  url: string;
}

/**
 * Call once at app start. Confirms the currently-running bundle is healthy
 * (otherwise the plugin rolls back to the built-in bundle), then checks for a
 * newer bundle and stages it for the NEXT cold start — never reloads mid-shift.
 * No-ops in browsers/PWA and silently when offline.
 */
export async function initOtaUpdates() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch {
    /* plugin only exists in native builds */
  }

  try {
    const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { version, url } = (await res.json()) as OtaManifest;
    if (!version || !url) return;
    if (version === localStorage.getItem(VERSION_KEY)) return;

    const bundle = await CapacitorUpdater.download({ url, version });
    await CapacitorUpdater.next({ id: bundle.id });
    localStorage.setItem(VERSION_KEY, version);
  } catch {
    /* offline or release not published yet — bundled app keeps working */
  }
}
