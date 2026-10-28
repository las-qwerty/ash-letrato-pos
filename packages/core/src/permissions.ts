import type { Role, User } from './types';

export const MODULE_KEYS = [
  'pos',
  'dashboard',
  'sales',
  'products',
  'services',
  'production',
  'inventory',
  'customers',
  'discounts',
  'promotions',
  'reports',
  'staff_reports',
  'branches',
  'users',
  'hr',
  'settings',
] as const;

export const FEATURE_KEYS = ['void_refund', 'membership', 'customer_history', 'rewards', 'stock_adjust'] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type Permission = ModuleKey | FeatureKey;

export const PERMISSION_LABELS: Record<Permission, string> = {
  pos: 'Point of Sale',
  dashboard: 'Dashboard',
  sales: 'Transactions',
  products: 'Products',
  services: 'Services',
  production: 'Production',
  inventory: 'Inventory',
  customers: 'Customers',
  discounts: 'Discounts',
  promotions: 'Promotions',
  reports: 'Reports',
  staff_reports: 'Staff sales & commission',
  branches: 'Branches',
  users: 'Staff accounts',
  hr: 'HR & payroll',
  settings: 'Settings',
  void_refund: 'Authorize voids & refunds',
  membership: 'Issue & renew membership cards',
  customer_history: 'View customer purchase history',
  rewards: 'Manage staff rewards',
  stock_adjust: 'Record damaged, wasted or missing stock',
};

const MANAGER_MODULES: ModuleKey[] = [
  'pos',
  'dashboard',
  'sales',
  'products',
  'services',
  'production',
  'inventory',
  'customers',
  'discounts',
  'promotions',
  'reports',
  'staff_reports',
];

export const ROLE_DEFAULTS: Record<Role, Permission[]> = {
  super_admin: [...MODULE_KEYS, ...FEATURE_KEYS],
  manager: [...MANAGER_MODULES, 'membership', 'customer_history', 'stock_adjust'],
  cashier: ['pos', 'sales', 'customers'],
  handler: ['pos', 'production'],
};

type AccessUser = Pick<User, 'role' | 'canAuthorizeVoids' | 'permissions'>;

/**
 * What a staff member may use. The owner always has everything. Anyone else
 * gets their explicit grants when set, otherwise the role defaults — with
 * void/refund rights following the legacy canAuthorizeVoids flag.
 */
export function effectivePermissions(user: AccessUser | null | undefined): Set<Permission> {
  if (!user) return new Set();
  if (user.role === 'super_admin') return new Set<Permission>([...MODULE_KEYS, ...FEATURE_KEYS]);
  if (user.permissions) return new Set(user.permissions);
  const base = ROLE_DEFAULTS[user.role];
  return new Set<Permission>(user.canAuthorizeVoids ? [...base, 'void_refund'] : base);
}

export function hasPermission(user: AccessUser | null | undefined, permission: Permission): boolean {
  return effectivePermissions(user).has(permission);
}

/** Modules the user may open, in sidebar order. */
export function accessibleModules(user: AccessUser | null | undefined): ModuleKey[] {
  const granted = effectivePermissions(user);
  return MODULE_KEYS.filter((m) => granted.has(m));
}

/** Keeps the legacy supervisor flag in step with the explicit void/refund grant. */
export const grantsVoids = (permissions: Permission[]) => permissions.includes('void_refund');
