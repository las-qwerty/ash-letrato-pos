'use client';

import { Badge, PageHeader, Stat } from '@/components/ui';
import { useStore } from '@/lib/store';

const tierRows = [
  { tier: 'Silver', spend: '₱10,000+', discount: 3, points: '1.25×' },
  { tier: 'Gold', spend: '₱40,000+', discount: 5, points: '1.5×' },
  { tier: 'Platinum', spend: '₱80,000+', discount: 8, points: '2×' },
];

export default function DiscountsPage() {
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);
  const sales = useStore((s) => s.sales);
  const statutory = sales.filter((s) => s.vatExempt);
  const statutoryTotal = statutory.reduce((a, s) => a + s.discountTotal, 0);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Discounts" sub="Statutory discounts and membership tier perks" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="SC/PWD rate" value={`${settings.seniorPwdDiscountPct}%`} hint="plus VAT exemption" />
        <Stat label="Statutory sales" value={statutory.length} hint="transactions with SC/PWD" />
        <Stat label="Discounts given" value={`₱${statutoryTotal.toFixed(0)}`} hint="all time" />
        <Stat label="Eligible members" value={customers.filter((c) => c.isSeniorCitizen || c.isPwd).length} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="border-b border-stone-100 px-5 py-3.5 font-display text-lg font-medium">
            Statutory discounts
          </h2>
          <table className="w-full">
            <tbody>
              <tr className="border-b border-stone-100">
                <td className="td font-medium">Senior citizen</td>
                <td className="td text-stone-500">20% + VAT exempt, on presentation of OSCA ID</td>
                <td className="td text-right"><Badge tone="pine">active</Badge></td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="td font-medium">PWD</td>
                <td className="td text-stone-500">20% + VAT exempt, on presentation of PWD ID</td>
                <td className="td text-right"><Badge tone="pine">active</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="border-b border-stone-100 px-5 py-3.5 font-display text-lg font-medium">
            Membership tiers
          </h2>
          <table className="w-full">
            <thead className="border-b border-stone-200 bg-paper/60">
              <tr>
                <th className="th">Tier</th>
                <th className="th">Lifetime spend</th>
                <th className="th text-right">Discount</th>
                <th className="th text-right">Points</th>
                <th className="th text-right">Members</th>
              </tr>
            </thead>
            <tbody>
              {tierRows.map((t) => (
                <tr key={t.tier} className="border-b border-stone-100 last:border-0">
                  <td className="td font-medium">{t.tier}</td>
                  <td className="td text-stone-500">{t.spend}</td>
                  <td className="td text-right tabular-nums">{t.discount}%</td>
                  <td className="td text-right tabular-nums">{t.points}</td>
                  <td className="td text-right tabular-nums text-stone-500">
                    {customers.filter((c) => c.tier === t.tier.toLowerCase()).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
