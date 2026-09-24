// ============================================
// Actualizar rutas para incluir categorías y almacenes
// ============================================

import { Application } from 'express';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { companiesRouter } from '../modules/companies/company.module';
import { customersRouter } from '../modules/customers/customer.module';
import { suppliersRouter } from '../modules/suppliers/supplier.module';
import { productsRouter } from '../modules/products/product.module';
import { categoriesRouter } from '../modules/categories/categories.module';
import { inventoryRouter } from '../modules/inventory/inventory.module';
import { warehousesRouter } from '../modules/warehouses/warehouses.module';
import { salesRouter } from '../modules/sales/sales.module';
import { purchasesRouter } from '../modules/purchases/purchase.module';
import { financeRouter } from '../modules/finance/finance.module';
import { reportRouter } from '../modules/reports/report.module';

export function setupRoutes(app: Application): void {
  // Health Check
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', timestamp: new Date().toISOString() },
      message: 'ERP Backend está operativo',
    });
  });

  // API v1
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/companies', companiesRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/suppliers', suppliersRouter);
  app.use('/api/v1/products', productsRouter);
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/warehouses', warehousesRouter);
  app.use('/api/v1/sales', salesRouter);
  app.use('/api/v1/purchases', purchasesRouter);
  app.use('/api/v1/finance', financeRouter);
  app.use('/api/v1/reports', reportRouter);
}
