import type { Role } from '@simmy/core';

/**
 * Single source of truth for role-based access.
 * The sidebar hides what a role can't use; the app layout enforces the same
 * matrix so a typed URL can't bypass it.
 */
export const ROLE_NAV: Record<Role, string[]> = {
  super_admin: [
    '/pos',
    '/dashboard',
    '/sales',
    '/products',
    '/services',
    '/production',
    '/inventory',
    '/customers',
    '/discounts',
    '/promotions',
    '/reports',
    '/branches',
    '/users',
    '/hr',
    '/settings',
  ],
  // Runs a branch end-to-end but can't touch staff accounts, payroll, or store config.
  manager: [
    '/pos',
    '/dashboard',
    '/sales',
    '/products',
    '/services',
    '/production',
    '/inventory',
    '/customers',
    '/discounts',
    '/promotions',
    '/reports',
  ],
  cashier: ['/pos', '/sales', '/customers'],
  handler: ['/pos', '/production'],
};

export function canAccess(role: Role | undefined, pathname: string): boolean {
  const allowed = ROLE_NAV[role ?? 'cashier'] ?? [];
  return allowed.some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

export function defaultRoute(role: Role | undefined): string {
  return (ROLE_NAV[role ?? 'cashier'] ?? ['/pos'])[0] ?? '/pos';
}

/** super_admin sees all branches' data; everyone else is pinned to their own. */
export const isGlobalRole = (role: Role | undefined) => role === 'super_admin';
