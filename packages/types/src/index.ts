/** Shared API vocabulary. Mongo document identifiers are serialized as strings. */
export type DocumentStatus = 'active' | 'inactive' | 'cancelled' | 'draft' | 'pending' | 'confirmed' | 'completed';

export interface BaseDocument {
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface AuditLogDocument extends BaseDocument {
  userId: string;
  companyId: string;
  module: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ip: string;
  device: string;
  timestamp: Date;
}

export const PERMISSIONS = [
  'users.view', 'users.create', 'users.edit', 'users.disable',
  'roles.view', 'roles.manage',
  'companies.view', 'companies.edit', 'companies.disable',
  'platform.company.create',
  'branches.view', 'branches.create', 'branches.edit', 'branches.disable',
  'customers.view', 'customers.create', 'customers.edit', 'customers.disable',
  'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.disable',
  'products.view', 'products.create', 'products.edit', 'products.disable',
  'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust',
  'sales.view', 'sales.create', 'sales.edit', 'sales.approve',
  'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.approve',
  'finances.view', 'finances.create', 'finances.edit', 'finances.approve',
  'reports.view', 'reports.export', 'audit.view',
  'settings.view', 'settings.edit', 'notifications.view', 'notifications.read',
] as const;

export type Permission = typeof PERMISSIONS[number];
