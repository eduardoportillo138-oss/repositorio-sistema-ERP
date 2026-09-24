// ============================================
// Constantes del Backend
// ============================================

export const MONGOOSE_COLLECTIONS = {
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  COMPANIES: 'companies',
  BRANCHES: 'branches',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  UNITS: 'units',
  WAREHOUSES: 'warehouses',
  INVENTORY_MOVEMENTS: 'inventoryMovements',
  QUOTES: 'quotes',
  SALES_ORDERS: 'salesOrders',
  SALES_ORDER_ITEMS: 'salesOrderItems',
  PURCHASE_ORDERS: 'purchaseOrders',
  PURCHASE_ORDER_ITEMS: 'purchaseOrderItems',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  ACCOUNTS_RECEIVABLE: 'accountsReceivable',
  ACCOUNTS_PAYABLE: 'accountsPayable',
  EMPLOYEES: 'employees',
  PROJECTS: 'projects',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'auditLogs',
  SYSTEM_SETTINGS: 'systemSettings',
} as const;

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login exitoso',
  LOGOUT_SUCCESS: 'Sesión cerrada correctamente',
  USER_CREATED: 'Usuario creado exitosamente',
  USER_UPDATED: 'Usuario actualizado exitosamente',
  USER_DELETED: 'Usuario desactivado exitosamente',
  COMPANY_CREATED: 'Empresa creada exitosamente',
  ROLE_CREATED: 'Rol creado exitosamente',
  PERMISSION_UPDATED: 'Permisos actualizados exitosamente',
} as const;
