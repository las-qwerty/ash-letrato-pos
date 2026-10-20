'use client';

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { clampPct, inRange, nonNeg } from '@simmy/core';
import { Field, PageHeader } from '@/components/ui';
import { checkForUpdate, getOtaStatus } from '@/lib/ota';
import { useStore } from '@/lib/store';
import clsx from 'clsx';

const tabs = [
  { id: 'store', label: 'Store' },
  { id: 'receipt', label: 'Receipt' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'security', label: 'Security' },
  { id: 'data', label: 'Data' },
] as const;

type Tab = (typeof tabs)[number]['id'];

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [tab, setTab] = useState<Tab>('store');
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState(settings);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...draft,
      vatRate: clampPct(draft.vatRate),
      seniorPwdDiscountPct: clampPct(draft.seniorPwdDiscountPct),
      loyaltyEarnRate: nonNeg(draft.loyaltyEarnRate),
      loyaltyRedeemValue: nonNeg(draft.loyaltyRedeemValue),
      autoLockMinutes: inRange(draft.autoLockMinutes, 0, 120) ? draft.autoLockMinutes : 5,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportBackup = () => {
    const payload = useStore.getState().exportData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ash-letrato-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setImportMsg({ ok: false, text: 'That file is too large to be a valid backup (max 20 MB).' });
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      setImportMsg({ ok: false, text: 'That file is not readable JSON.' });
      return;
    }
    if (
      !window.confirm(
        'Replace ALL data on this device with the backup? Products, sales, staff, customers and settings will be overwritten. This cannot be undone.',
      )
    ) {
      return;
    }
    const err = useStore.getState().importData(raw);
    if (err) {
      setImportMsg({ ok: false, text: err });
    } else {
      setDraft(useStore.getState().settings);
      setImportMsg({ ok: true, text: 'Backup imported — this device now mirrors that data.' });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Settings" sub="Store identity, receipts, loyalty, and authorization" />

      <div className="mb-5 flex gap-1 border-b border-stone-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition',
              tab === t.id
                ? 'border-pine-700 text-pine-800'
                : 'border-transparent text-stone-500 hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={save} className="max-w-xl space-y-4">
        {tab === 'store' && (
          <div className="card space-y-4 p-5">
            <Field label="Store name">
              <input className="input" value={draft.storeName} onChange={(e) => set('storeName', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="TIN">
                <input className="input" value={draft.tin} onChange={(e) => set('tin', e.target.value)} />
              </Field>
              <Field label="Phone">
                <input className="input" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
            </div>
            <Field label="Address line 1">
              <input className="input" value={draft.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} />
            </Field>
            <Field label="Address line 2">
              <input className="input" value={draft.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} />
            </Field>
            <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-stone-200 pt-4">
              <span>
                <span className="block text-sm font-medium">Production module</span>
                <span className="mt-0.5 block text-xs text-stone-500">
                  Job tickets and machine counters for print work. Off hides it from everyone.
                </span>
              </span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-pine-700"
                checked={draft.productionEnabled}
                onChange={(e) => set('productionEnabled', e.target.checked)}
              />
            </label>
          </div>
        )}

        {tab === 'receipt' && (
          <div className="card space-y-4 p-5">
            <Field label="Receipt footer">
              <textarea
                className="input min-h-[4rem] resize-none"
                value={draft.receiptFooter}
                onChange={(e) => set('receiptFooter', e.target.value)}
              />
            </Field>
            <Field label="VAT rate (%)">
              <input
                className="input w-32"
                type="number"
                min={0}
                step="0.01"
                value={draft.vatRate}
                onChange={(e) => set('vatRate', parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Notary / document-stamp fee (₱)">
              <input
                className="input w-32"
                type="number"
                min={0}
                step="0.01"
                value={draft.notaryFee}
                onChange={(e) => set('notaryFee', Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </Field>
            <p className="text-xs text-stone-500">
              Prices are treated as VAT-inclusive. SC/PWD sales are issued VAT-exempt.
              The notary fee is added per unit on services flagged “charges notary fee”.
            </p>
          </div>
        )}

        {tab === 'loyalty' && (
          <div className="card space-y-4 p-5">
            <Field label="Points earned per ₱1">
              <input
                className="input w-32"
                type="number"
                min={0}
                step="0.01"
                value={draft.loyaltyEarnRate}
                onChange={(e) => set('loyaltyEarnRate', parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Peso value per point">
              <input
                className="input w-32"
                type="number"
                min={0}
                step="0.001"
                value={draft.loyaltyRedeemValue}
                onChange={(e) => set('loyaltyRedeemValue', parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="SC/PWD discount (%)">
              <input
                className="input w-32"
                type="number"
                min={0}
                max={100}
                value={draft.seniorPwdDiscountPct}
                onChange={(e) => set('seniorPwdDiscountPct', parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-4">
            <div className="card space-y-4 p-5">
              <Field label="Auto-lock register after idle (minutes)">
                <input
                  className="input w-32"
                  type="number"
                  min={0}
                  max={120}
                  value={draft.autoLockMinutes}
                  onChange={(e) => set('autoLockMinutes', Math.max(0, parseInt(e.target.value) || 0))}
                />
              </Field>
              <p className="text-xs leading-relaxed text-stone-500">
                On a shared till the register drops to the PIN screen after this long
                without input. Set 0 to disable. Staff PINs are managed per-person
                on the <strong>Staff</strong> page — supervisor PINs authorize voids &amp; refunds.
              </p>
            </div>

            <div className="card border-clay/30 p-5">
              <p className="text-sm font-medium text-clay">Reset demo data</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                Wipes all sales, products, customers and settings on this device and
                restores the original demo dataset. Only affects local storage.
              </p>
              <button
                type="button"
                className="btn-danger mt-3 !py-1.5 text-xs"
                onClick={() => {
                  if (window.confirm('Reset all demo data? This cannot be undone.')) {
                    useStore.getState().resetDemo();
                    setDraft(useStore.getState().settings);
                  }
                }}
              >
                Reset to seed data
              </button>
            </div>
          </div>
        )}

        {tab === 'data' && (
          <div className="card space-y-4 p-5">
            <div>
              <p className="text-sm font-medium">Backup this device</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                Downloads every product, service, sale, customer, staff member and setting as a
                single file. Send it with the installer and the other device can load your exact
                data — or keep it as a safety copy.
              </p>
              <button type="button" className="btn-secondary mt-3 !py-1.5 text-xs" onClick={exportBackup}>
                Export data (.json)
              </button>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <p className="text-sm font-medium">Restore from a backup</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                Loads a backup file from another ASH LETRATO POS install. Everything on this
                device is replaced — a confirm prompt protects against accidents.
              </p>
              <button
                type="button"
                className="btn-secondary mt-3 !py-1.5 text-xs"
                onClick={() => fileRef.current?.click()}
              >
                Import backup…
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => void onImportFile(e)}
              />
              {importMsg && (
                <p
                  role="alert"
                  className={clsx(
                    'mt-3 rounded-lg px-3 py-2 text-sm',
                    importMsg.ok ? 'bg-pine-50 text-pine-800' : 'bg-clay/10 text-clay',
                  )}
                >
                  {importMsg.text}
                </p>
              )}
            </div>

            {Capacitor.isNativePlatform() && <UpdatePanel />}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary">Save settings</button>
          {saved && <span className="text-sm font-medium text-pine-700">Saved ✓</span>}
        </div>
      </form>
    </div>
  );
}

function UpdatePanel() {
  const [info, setInfo] = useState({ bundle: '…', status: '…', at: '' });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setInfo(getOtaStatus());
  }, []);

  const check = async () => {
    setChecking(true);
    await checkForUpdate();
    setInfo(getOtaStatus());
    setChecking(false);
  };

  return (
    <div className="border-t border-stone-200 pt-4">
      <p className="text-sm font-medium">App updates</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        This device checks for updates on launch and in the background. Downloaded updates apply
        automatically — the app reloads itself a few seconds after the download finishes.
      </p>
      <dl className="mt-3 space-y-1 text-xs text-stone-600">
        <div className="flex justify-between gap-4">
          <dt className="text-stone-400">Running bundle</dt>
          <dd className="font-mono">{info.bundle}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-400">Last check</dt>
          <dd className="text-right">{info.status}</dd>
        </div>
        {info.at && (
          <div className="flex justify-between gap-4">
            <dt className="text-stone-400">Checked at</dt>
            <dd>{new Date(info.at).toLocaleString()}</dd>
          </div>
        )}
      </dl>
      <button
        type="button"
        className="btn-secondary mt-3 !py-1.5 text-xs"
        onClick={() => void check()}
        disabled={checking}
      >
        {checking ? 'Checking…' : 'Check for updates now'}
      </button>
    </div>
  );
}
