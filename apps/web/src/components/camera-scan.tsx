'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal, Field } from '@/components/ui';
import { IconCamera } from '@/components/icons';

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => Detector;
  }
}

/**
 * Camera barcode scan modal — uses the native BarcodeDetector API
 * (Chrome/Edge, Android tablets). Falls back to manual code entry where
 * camera or detection support is unavailable.
 */
export function CameraScan({
  open,
  onClose,
  onScan,
  title = 'Scan barcode',
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const [status, setStatus] = useState<'starting' | 'live' | 'manual'>('starting');
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let alive = true;
    let timer: number | undefined;
    setStatus('starting');
    setError(null);

    const emit = (code: string) => {
      // Ignore re-detection of the same code within 1s (double-fire guard).
      const now = Date.now();
      if (lastRef.current?.code === code && now - lastRef.current.at < 1000) return;
      lastRef.current = { code, at: now };
      onScan(code);
    };

    const start = async () => {
      if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
        setStatus('manual');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
        });
      } catch {
        setStatus('manual');
        setError('Camera unavailable or permission denied — enter the code manually.');
        return;
      }
      if (!alive || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
      setStatus('live');
      const detector = new window.BarcodeDetector({
        formats: ['code_128', 'ean_13', 'qr_code'],
      });
      const tick = async () => {
        if (!alive || !videoRef.current || videoRef.current.readyState < 2) {
          timer = window.setTimeout(tick, 250);
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          const hit = codes.find((c) => c.rawValue);
          if (hit) {
            emit(hit.rawValue);
            timer = window.setTimeout(tick, 350); // brief pause after a hit
            return;
          }
        } catch {
          /* frame not ready */
        }
        timer = window.setTimeout(tick, 250);
      };
      void tick();
    };
    void start();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open, onScan]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manual.trim();
    if (code) {
      onScan(code);
      setManual('');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl bg-ink">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} muted playsInline className="h-56 w-full object-cover" />
          {status === 'starting' && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
              Starting camera…
            </p>
          )}
          {status === 'live' && (
            <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-dashed border-white/50" />
          )}
        </div>
        {status === 'live' && (
          <p className="text-center text-xs text-stone-500">
            <IconCamera width={12} height={12} className="mr-1 inline -translate-y-px" />
            Hold the barcode inside the frame — scans repeat safely once per second.
          </p>
        )}
        {error && <p className="rounded-lg bg-brass-50 px-3 py-2 text-sm text-brass-700">{error}</p>}
        {status === 'manual' && (
          <form onSubmit={submitManual} className="space-y-3">
            <Field label="Barcode / SKU">
              <input
                className="input"
                autoFocus
                placeholder="Type or paste the code…"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
            </Field>
            <button type="submit" className="btn-primary w-full">
              Use code
            </button>
          </form>
        )}
        <button className="btn-secondary w-full" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
