import { accessibleModules, type ModuleKey, type Role, type User } from '@simmy/core';

/** Where each module lives. The sidebar and the route guard both read this. */
export const MODULE_ROUTES: Record<ModuleKey, string> = {
  pos: '/pos',
  dashboard: '/dashboard',
  sales: '/sales',
  products: '/products',
  services: '/services',
  production: '/production',
  inventory: '/inventory',
  customers: '/customers',
  discounts: '/discounts',
  promotions: '/promotions',
  reports: '/reports',
  staff_reports: '/staff-reports',
  branches: '/branches',
  users: '/users',
  hr: '/hr',
  settings: '/settings',
};

type AccessUser = Pick<User, 'role' | 'canAuthorizeVoids' | 'permissions'> | null | undefined;

/** Route guard: a typed URL is allowed only for a module the user holds. */
export function canAccess(user: AccessUser, pathname: string): boolean {
  return accessibleModules(user).some((m) => {
    const route = MODULE_ROUTES[m];
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export function defaultRoute(user: AccessUser): string {
  const first = accessibleModules(user)[0];
  return first ? MODULE_ROUTES[first] : '/pos';
}

/** super_admin sees all branches' data; everyone else is pinned to their own. */
export const isGlobalRole = (role: Role | undefined) => role === 'super_admin';
