/** Lightweight in-app toast — no dependency, works inside every shell. */
export function toast(msg: string) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText =
    'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;' +
    'background:#1d232d;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;' +
    'box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:90vw;text-align:center;';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}
