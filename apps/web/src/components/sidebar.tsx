'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { initials } from '@simmy/core';
import {
  IconBox,
  IconBuilding,
  IconChart,
  IconChevronLeft,
  IconChevronRight,
  IconDashboard,
  IconGear,
  IconLock,
  IconLogout,
  IconMenu,
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

const COLLAPSED_KEY = 'nav-collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const settings = useStore((s) => s.settings);

  /** Desktop (xl+): in-flow width toggle, persisted.
   *  Below xl: icon rail stays in-flow; hamburger opens an overlay drawer. */
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
  }, []);
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);
  // Close the drawer after navigating (tablet/phone overlay).
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <>
      {drawerOpen && (
        <>
          {/* keeps the rail's space so content doesn't jump under the drawer */}
          <div className="h-screen w-16 shrink-0 xl:hidden" aria-hidden />
          <div
            className="fixed inset-0 z-40 bg-ink/40 xl:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
        </>
      )}
      <aside
        className={clsx(
          'z-50 flex h-screen shrink-0 flex-col bg-pine-950 text-pine-100 transition-[width]',
          drawerOpen ? 'fixed inset-y-0 left-0 w-60 shadow-2xl' : 'w-16',
          collapsed ? 'xl:w-16' : 'xl:w-60',
        )}
      >
        <div
          className={clsx(
            'flex items-center gap-3 px-2 pb-5 pt-6',
            drawerOpen ? 'justify-start px-5' : 'justify-center',
            !collapsed && 'xl:justify-start xl:px-5',
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="ASH LETRATO logo" className="h-8 w-8" />
          </div>
          <div
            className={clsx(
              'min-w-0 flex-1 leading-tight',
              drawerOpen ? 'block' : 'hidden',
              !collapsed && 'xl:block',
            )}
          >
            <p className="font-display text-lg font-medium tracking-tight text-white">
              ASH LETRATO
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-pine-300">
              Point of Sale
            </p>
          </div>
          {drawerOpen && (
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="rounded-md p-1.5 text-pine-300 transition hover:bg-pine-900 hover:text-white xl:hidden"
            >
              <IconChevronLeft width={18} height={18} />
            </button>
          )}
        </div>

        <nav
          className={clsx('flex-1 space-y-0.5 overflow-y-auto px-2', !collapsed && 'xl:px-3')}
          aria-label="Main"
        >
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
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
                  drawerOpen ? 'justify-start' : 'justify-center',
                  !collapsed && 'xl:justify-start',
                  active
                    ? 'bg-pine-800 font-medium text-white'
                    : 'text-pine-200/80 hover:bg-pine-900 hover:text-white',
                )}
              >
                <Icon width={18} height={18} className="shrink-0" />
                <span
                  className={clsx(
                    'truncate',
                    drawerOpen ? 'inline' : 'hidden',
                    !collapsed && 'xl:inline',
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className={clsx('border-t border-pine-900 p-2', !collapsed && 'xl:p-3')}>
          <div
            className={clsx(
              'flex items-center gap-2 rounded-lg px-1 py-2',
              drawerOpen ? 'flex-row px-2' : 'flex-col',
              !collapsed && 'xl:flex-row xl:px-2',
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-700 text-xs font-semibold text-white">
              {user ? initials(user.firstName, user.lastName) : '–'}
            </div>
            <div
              className={clsx(
                'min-w-0 flex-1 leading-tight',
                drawerOpen ? 'block' : 'hidden',
                !collapsed && 'xl:block',
              )}
            >
              <p className="truncate text-sm font-medium text-white">
                {user ? `${user.firstName} ${user.lastName}` : 'Not signed in'}
              </p>
              <p className="truncate text-[11px] capitalize text-pine-300">
                {user?.role.replace('_', ' ') ?? ''}
              </p>
            </div>
            <div className={clsx('flex gap-1', drawerOpen ? 'flex-row' : 'flex-col', !collapsed && 'xl:flex-row')}>
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                title="Menu"
                className="rounded-md p-2 text-pine-300 transition hover:bg-pine-900 hover:text-white xl:hidden"
              >
                <IconMenu width={17} height={17} />
              </button>
              <button
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
                className="hidden rounded-md p-2 text-pine-300 transition hover:bg-pine-900 hover:text-white xl:block"
              >
                {collapsed ? <IconChevronRight width={17} height={17} /> : <IconChevronLeft width={17} height={17} />}
              </button>
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
          <p
            className={clsx(
              'px-2 pt-1 text-[10px] text-pine-400/70',
              drawerOpen ? 'block' : 'hidden',
              !collapsed && 'xl:block',
            )}
          >
            {settings.storeName}
          </p>
        </div>
      </aside>
    </>
  );
}
