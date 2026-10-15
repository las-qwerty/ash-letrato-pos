/**
 * Typed REST client for the POS backend (`/api/v1`).
 * Shared by web, desktop (Tauri), and mobile (Expo) apps.
 *
 * Token storage is injected — each app supplies its own secure store
 * (localStorage on web, Stronghold on desktop, SecureStore on mobile).
 */

export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string | null): Promise<void>;
}

export const memoryTokenStore = (): TokenStore => {
  let token: string | null = null;
  return {
    get: async () => token,
    set: async (t) => {
      token = t;
    },
  };
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface ClientOptions {
  baseUrl: string;
  tokens?: TokenStore;
}

export function createClient({ baseUrl, tokens = memoryTokenStore() }: ClientOptions) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await tokens.get();
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const json = (await res.json().catch(() => null)) as ApiResult<T> | null;

    if (!res.ok || (json && json.success === false)) {
      const err = json?.error;
      throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? res.statusText);
    }
    return (json && 'data' in json ? json.data : json) as T;
  }

  const get = <T>(path: string) => request<T>('GET', path);
  const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body);
  const patch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body);
  const del = <T>(path: string) => request<T>('DELETE', path);

  return {
    tokens,
    auth: {
      login: (email: string, password: string) =>
        post<{ token: string; user: unknown }>('/auth/login', { email, password }),
      logout: () => post('/auth/logout'),
      me: () => get('/auth/me'),
      refresh: () => post<{ token: string }>('/auth/refresh'),
      changePassword: (current: string, next: string) =>
        post('/auth/change-password', { current, next }),
      setSupervisorPin: (pin: string) => post('/auth/set-supervisor-pin', { pin }),
      verifySupervisorPin: (userId: string, pin: string) =>
        post<{ authorized: boolean }>('/auth/verify-supervisor-pin', { userId, pin }),
    },
    dashboard: {
      overview: () => get('/dashboard/overview'),
      stats: () => get('/dashboard/stats'),
      salesTrend: (days = 7) => get(`/dashboard/sales-trend?days=${days}`),
      hourlySales: () => get('/dashboard/hourly-sales'),
      topProducts: () => get('/dashboard/top-products'),
      recentTransactions: () => get('/dashboard/recent-transactions'),
      lowStock: () => get('/dashboard/low-stock'),
    },
    products: {
      list: (q?: string) => get(`/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
      getById: (id: string) => get(`/products/${id}`),
      create: (body: unknown) => post('/products', body),
      update: (id: string, body: unknown) => patch(`/products/${id}`, body),
      remove: (id: string) => del(`/products/${id}`),
    },
    categories: {
      list: () => get('/categories'),
      create: (body: unknown) => post('/categories', body),
      update: (id: string, body: unknown) => patch(`/categories/${id}`, body),
      remove: (id: string) => del(`/categories/${id}`),
    },
    inventory: {
      list: () => get('/inventory'),
      lowStock: () => get('/materials/low-stock'),
      restock: (materialId: string, qty: number) =>
        post(`/materials/${materialId}/restock`, { qty }),
      adjust: (materialId: string, qty: number, reason: string) =>
        post(`/materials/${materialId}/adjust`, { qty, reason }),
      count: (body: unknown) => post('/inventory/count', body),
    },
    customers: {
      list: () => get('/customers'),
      search: (q: string) => get(`/customers/search?q=${encodeURIComponent(q)}`),
      tiers: () => get('/customers/tiers'),
      create: (body: unknown) => post('/customers', body),
      update: (id: string, body: unknown) => patch(`/customers/${id}`, body),
    },
    sales: {
      list: () => get('/sales'),
      today: () => get('/sales/today'),
      getById: (id: string) => get(`/sales/${id}`),
      create: (body: unknown) => post('/sales', body),
      void: (id: string, reason: string, supervisorId: string, pin: string) =>
        post(`/sales/${id}/void`, { reason, supervisorId, pin }),
      refund: (id: string, amount: number, reason: string, supervisorId: string, pin: string) =>
        post(`/sales/${id}/refund`, { amount, reason, supervisorId, pin }),
      receipt: (id: string) => get(`/sales/${id}/receipt`),
    },
    discounts: {
      list: () => get('/discounts'),
      create: (body: unknown) => post('/discounts', body),
    },
    promotions: {
      list: () => get('/promotions'),
      active: () => get('/promotions/active'),
      check: (code: string, subtotal: number) =>
        post('/promotions/check', { code, subtotal }),
    },
    loyalty: {
      balance: (customerId: string) => get(`/loyalty-points?customer=${customerId}`),
      redeem: (customerId: string, points: number) =>
        post('/loyalty-points/redeem', { customerId, points }),
    },
    branches: {
      list: () => get('/branches'),
      create: (body: unknown) => post('/branches', body),
    },
    users: {
      list: () => get('/users'),
      roles: () => get('/users/roles'),
      handlers: () => get('/users/handlers'),
      create: (body: unknown) => post('/users', body),
      update: (id: string, body: unknown) => patch(`/users/${id}`, body),
    },
    settings: {
      get: (key: string) => get(`/settings/key/${key}`),
      update: (key: string, body: unknown) => patch(`/settings/key/${key}`, body),
      store: () => get('/settings/store'),
      receipt: () => get('/settings/receipt'),
      loyalty: () => get('/settings/loyalty'),
      security: () => get('/settings/security'),
      authorization: () => get('/settings/authorization'),
    },
  };
}

export type ApiClient = ReturnType<typeof createClient>;
