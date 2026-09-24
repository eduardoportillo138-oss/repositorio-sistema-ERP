// ============================================
// Endpoints de API Centralizados
// ============================================

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  USERS: '/users',
  COMPANIES: '/companies',
  BRANCHES: '/branches',
  CUSTOMERS: '/customers',
  SUPPLIERS: '/suppliers',
  PRODUCTS: '/products',
  CATEGORIES: '/categories',
  WAREHOUSES: '/warehouses',
  INVENTORY: '/inventory',
  INVENTORY_MOVEMENTS: '/inventory/movements',
  SALES: '/sales',
  SALES_ORDERS: '/sales-orders',
  QUOTES: '/quotes',
  PURCHASES: '/purchases',
  PURCHASE_ORDERS: '/purchase-orders',
  INVOICES: '/invoices',
  PAYMENTS: '/payments',
  ACCOUNTS_RECEIVABLE: '/finance/accounts-receivable',
  ACCOUNTS_PAYABLE: '/finance/accounts-payable',
  EMPLOYEES: '/hr/employees',
  PROJECTS: '/projects',
  REPORTS: '/reports',
  DASHBOARD: '/reports/dashboard',
  AUDIT: '/audit',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',
} as const;

export function buildUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${API_ENDPOINTS[endpoint as keyof typeof API_ENDPOINTS] || endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  return url;
}
