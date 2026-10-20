import { toast } from './toast';

/**
 * Tauri desktop self-update via the official updater plugin — the desktop
 * shell is not Capacitor, so the mobile OTA path no-ops there. On launch this
 * checks the desktop-latest release manifest, downloads the signed update,
 * installs silently (installMode: quiet), and relaunches.
 * No-ops outside Tauri (browser, Capacitor WebViews).
 */
export async function initDesktopUpdates() {
  if (!('__TAURI_INTERNALS__' in window)) return;
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return;
    toast(`Update ${update.version} available — downloading…`);
    await update.downloadAndInstall();
    toast('Update installed — restarting…');
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } catch {
    // Offline, no updater manifest yet, or plugin missing — run on.
  }
}
