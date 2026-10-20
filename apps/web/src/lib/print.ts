const CLONE_CLS = 'print-clone';
const SOURCE_SEL = '.receipt-print, .print-sheet';

/**
 * Prints via a clone appended to <body>. The real receipt lives inside a
 * fixed-position, overflow-clipped modal — in print, that truncates anything
 * taller than the viewport, so multi-item sales lost their tail items.
 * A top-level clone sits in normal document flow and paginates fully.
 * Installed once at boot (components/ota-updater.tsx); cleanup on afterprint.
 */
export function installPrintClone() {
  const onBefore = () => {
    document.querySelectorAll(`.${CLONE_CLS}`).forEach((n) => n.remove());
    const src = document.querySelector(SOURCE_SEL);
    if (!src) return;
    const clone = src.cloneNode(true) as HTMLElement;
    clone.classList.add(CLONE_CLS);
    document.body.appendChild(clone);
  };
  const onAfter = () => {
    document.querySelectorAll(`.${CLONE_CLS}`).forEach((n) => n.remove());
  };
  window.addEventListener('beforeprint', onBefore);
  window.addEventListener('afterprint', onAfter);
  return () => {
    window.removeEventListener('beforeprint', onBefore);
    window.removeEventListener('afterprint', onAfter);
  };
}
