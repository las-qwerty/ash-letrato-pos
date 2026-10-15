'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { initials } from '@simmy/core';
import {
  IconBox,
  IconBuilding,
  IconChart,
  IconDashboard,
  IconGear,
  IconLock,
  IconLogout,
  IconShield,
  IconPercent,
  IconPos,
  IconPrint,
  IconReceipt,
  IconRuler,
  IconTag,
  IconUsers,
} from './icons';

const nav = [
  { href: '/pos', label: 'Point of Sale', icon: IconPos },
  { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { href: '/sales', label: 'Transactions', icon: IconReceipt },
  { href: '/products', label: 'Products', icon: IconTag },
  { href: '/services', label: 'Services', icon: IconRuler },
  { href: '/production', label: 'Production', icon: IconPrint },
  { href: '/inventory', label: 'Inventory', icon: IconBox },
  { href: '/customers', label: 'Customers', icon: IconUsers },
  { href: '/discounts', label: 'Discounts', icon: IconPercent },
  { href: '/promotions', label: 'Promotions', icon: IconTag },
  { href: '/reports', label: 'Reports', icon: IconChart },
  { href: '/branches', label: 'Branches', icon: IconBuilding },
  { href: '/users', label: 'Staff', icon: IconShield },
  { href: '/hr', label: 'HR & Payroll', icon: IconUsers },
  { href: '/settings', label: 'Settings', icon: IconGear },
];

/** Which routes each role may open — cashiers/handlers get the till-facing set. */
const roleNav: Record<string, string[]> = {
  super_admin: nav.map((n) => n.href),
  manager: nav.map((n) => n.href),
  cashier: ['/pos', '/sales', '/production', '/customers'],
  handler: ['/pos', '/production'],
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const settings = useStore((s) => s.settings);

  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col bg-pine-950 text-pine-100 xl:w-60">
      <div className="flex items-center justify-center gap-3 px-2 pb-5 pt-6 xl:justify-start xl:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="ASH LETRATO logo" className="h-8 w-8" />
        </div>
        <div className="hidden leading-tight xl:block">
          <p className="font-display text-lg font-medium tracking-tight text-white">
            ASH LETRATO
          </p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-pine-300">
            Point of Sale
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 xl:px-3" aria-label="Main">
        {nav
          .filter((n) => (roleNav[user?.role ?? 'cashier'] ?? []).includes(n.href))
          .map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm transition xl:justify-start',
                active
                  ? 'bg-pine-800 font-medium text-white'
                  : 'text-pine-200/80 hover:bg-pine-900 hover:text-white',
              )}
            >
              <Icon width={18} height={18} />
              <span className="hidden xl:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-pine-900 p-2 xl:p-3">
        <div className="flex flex-col items-center gap-2 rounded-lg px-1 py-2 xl:flex-row xl:px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-700 text-xs font-semibold text-white">
            {user ? initials(user.firstName, user.lastName) : '–'}
          </div>
          <div className="hidden min-w-0 flex-1 leading-tight xl:block">
            <p className="truncate text-sm font-medium text-white">
              {user ? `${user.firstName} ${user.lastName}` : 'Not signed in'}
            </p>
            <p className="truncate text-[11px] capitalize text-pine-300">
              {user?.role.replace('_', ' ') ?? ''}
            </p>
          </div>
          <div className="flex flex-col gap-1 xl:flex-row">
            <button
              onClick={() => {
                useStore.getState().lock();
                router.push('/lock');
              }}
              aria-label="Lock register"
              title="Lock register"
              className="rounded-md p-2 text-pine-300 transition hover:bg-pine-900 hover:text-white"
            >
              <IconLock width={17} height={17} />
            </button>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-md p-2 text-pine-300 transition hover:bg-pine-900 hover:text-white"
            >
              <IconLogout width={17} height={17} />
            </button>
          </div>
        </div>
        <p className="hidden px-2 pt-1 text-[10px] text-pine-400/70 xl:block">{settings.storeName}</p>
      </div>
    </aside>
  );
}
