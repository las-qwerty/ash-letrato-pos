import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

/** Stable URLs — CI republishes both files on the `ota` branch (raw = no redirects). */
const MANIFEST_URL =
  'https://raw.githubusercontent.com/las-qwerty/ash-letrato-pos/ota/app-version.json';
const VERSION_KEY = 'ota-version';
const STATUS_KEY = 'ota-status';

interface OtaManifest {
  version: string;
  url: string;
}

export interface OtaStatus {
  bundle: string; // installed bundle version, 'built-in' when none downloaded yet
  status: string; // human-readable last check result
  at: string; // ISO time of last check
}

export function getOtaStatus(): OtaStatus {
  return {
    bundle: localStorage.getItem(VERSION_KEY) || 'built-in',
    status: localStorage.getItem(STATUS_KEY) || 'not checked yet',
    at: localStorage.getItem(`${STATUS_KEY}-at`) || '',
  };
}

function setStatus(msg: string) {
  localStorage.setItem(STATUS_KEY, msg);
  localStorage.setItem(`${STATUS_KEY}-at`, new Date().toISOString());
}

function toast(msg: string) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText =
    'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;' +
    'background:#1d232d;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;' +
    'box-shadow:0 8px 24px rgba(0,0,0,.4);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

/**
 * One check cycle: fetch manifest, download newer bundle, then swap into it
 * immediately — set() reloads the app and destroys the JS context, so all
 * state must be persisted before that call. Returns a status string (also
 * persisted for the Settings UI).
 */
export async function checkForUpdate(): Promise<string> {
  try {
    const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      setStatus(`manifest unreachable (HTTP ${res.status})`);
      return 'error';
    }
    const { version, url } = (await res.json()) as OtaManifest;
    if (!version || !url) {
      setStatus('manifest malformed');
      return 'error';
    }
    if (version === localStorage.getItem(VERSION_KEY)) {
      setStatus(`up to date (${version})`);
      return 'up-to-date';
    }

    setStatus(`downloading ${version}…`);
    const bundle = await CapacitorUpdater.download({ url, version });
    localStorage.setItem(VERSION_KEY, version);
    setStatus(`update ${version} installed — reloading`);
    toast('Update installed — reloading…');
    await new Promise((r) => setTimeout(r, 2500));
    await CapacitorUpdater.set({ id: bundle.id });
    return 'downloaded';
  } catch (e) {
    setStatus(`failed: ${e instanceof Error ? e.message : String(e)}`);
    return 'error';
  }
}

/**
 * Call once at app start. Confirms the currently-running bundle is healthy
 * (otherwise the plugin rolls back to the built-in bundle), records which
 * bundle actually booted — so a rollback can't masquerade as "up to date" —
 * then runs an update check and re-checks whenever the app returns to the
 * foreground. No-ops in browsers/PWA and silently when offline.
 */
export async function initOtaUpdates() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await CapacitorUpdater.notifyAppReady();
    const { bundle } = await CapacitorUpdater.current();
    if (bundle?.version) localStorage.setItem(VERSION_KEY, bundle.version);
  } catch {
    /* plugin only exists in native builds */
  }

  await checkForUpdate();

  // Re-check when the app comes back to the foreground — a "relaunch"
  // from recents shouldn't require a full cold start to pick up updates.
  try {
    await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void checkForUpdate();
    });
  } catch {
    /* listener registration is best-effort */
  }
}
// OTA channel: bundles publish to the 'ota' branch (raw.githubusercontent.com) — see .github/workflows/ota.yml
