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

// Catálogo único de permisos
export { PERMISSIONS } from '../../types/dist';

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
