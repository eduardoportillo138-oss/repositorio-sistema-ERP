// ============================================
// Constantes Compartidas del ERP
// ============================================

// API
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Roles del Sistema
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer',
} as const;

// Permisos por Módulo
export const PERMISSIONS = {
  // Auth
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_REFRESH: 'auth.refresh',

  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',

  // Companies
  COMPANIES_VIEW: 'companies.view',
  COMPANIES_CREATE: 'companies.create',
  COMPANIES_EDIT: 'companies.edit',
  COMPANIES_DELETE: 'companies.delete',

  // Branches
  BRANCHES_VIEW: 'branches.view',
  BRANCHES_CREATE: 'branches.create',
  BRANCHES_EDIT: 'branches.edit',

  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',

  // Suppliers
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_EDIT: 'suppliers.edit',
  SUPPLIERS_DELETE: 'suppliers.delete',

  // Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_EDIT: 'inventory.edit',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_MOVE: 'inventory.move',

  // Sales
  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_EDIT: 'sales.edit',
  SALES_DELETE: 'sales.delete',
  SALES_APPROVE: 'sales.approve',

  // Purchases
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_EDIT: 'purchases.edit',
  PURCHASES_DELETE: 'purchases.delete',
  PURCHASES_APPROVE: 'purchases.approve',

  // Finance
  FINANCES_VIEW: 'finances.view',
  FINANCES_CREATE: 'finances.create',
  FINANCES_EDIT: 'finances.edit',
  FINANCES_APPROVE: 'finances.approve',

  // Invoices
  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_EDIT: 'invoices.edit',
  INVOICES_APPROVE: 'invoices.approve',

  // HR
  HR_VIEW: 'hr.view',
  HR_CREATE: 'hr.create',
  HR_EDIT: 'hr.edit',
  HR_DELETE: 'hr.delete',

  // Projects
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_EDIT: 'projects.edit',
  PROJECTS_DELETE: 'projects.delete',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // Audit
  AUDIT_VIEW: 'audit.view',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',

  // Notifications
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_READ: 'notifications.read',
} as const;

// Estados de Documentos
export const DOCUMENT_STATUSES = {
  BORRADOR: 'draft',
  CONFIRMADO: 'confirmed',
  PENDIENTE: 'pending',
  ACTIVO: 'active',
  INACTIVO: 'inactive',
  CANCELADO: 'cancelled',
  COMPLETADO: 'completed',
  EN_PROCESO: 'in_progress',
  APROBADO: 'approved',
  RECHAZADO: 'rejected',
} as const;

// Estados de Venta
export const SALES_STATUSES = {
  BORRADOR: 'draft',
  CONFIRMADO: 'confirmed',
  PREPARANDO: 'preparing',
  ENVIADO: 'shipped',
  ENTREGADO: 'delivered',
  FACTURADO: 'invoiced',
  PAGADO: 'paid',
  CANCELADO: 'cancelled',
} as const;

// Estados de Compra
export const PURCHASE_STATUSES = {
  BORRADOR: 'draft',
  SOLICITADA: 'requested',
  APROBADA: 'approved',
  ORDENADA: 'ordered',
  RECIBIDA: 'received',
  FACTURADA: 'invoiced',
  PAGADA: 'paid',
  CANCELADA: 'cancelled',
} as const;

// Tipos de Movimiento de Inventario
export const MOVEMENT_TYPES = {
  ENTRADA: 'entry',
  SALIDA: 'exit',
  TRANSFERENCIA: 'transfer',
  AJUSTE: 'adjustment',
  DEVOLUCION: 'return',
} as const;

// Tipos de Notificación
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
} as const;

// Currencies por defecto
export const DEFAULT_CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  MXN: 'MXN',
  COP: 'COP',
  ARS: 'ARS',
  PEN: 'PEN',
  CLP: 'CLP',
} as const;

// Configuración de Paginación
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Configuración de Bcrypt
export const BCRYPT_ROUNDS = 12;

// Configuración de JWT
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
} as const;

// Configuración de Rate Limiting
export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS: 100,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutos
} as const;

// Logger Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;
