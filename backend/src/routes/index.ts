// ============================================
// Actualizar rutas para incluir categorías y almacenes
// ============================================

import { Application } from 'express';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { roleRoutes } from './role.routes';
import { branchRoutes } from './branch.routes';
import { companiesRouter } from '../modules/companies/company.module';
import { customersRouter } from '../modules/customers/customer.module';
import { suppliersRouter } from '../modules/suppliers/supplier.module';
import { categoriesRouter } from '../modules/categories/categories.module';
import { unitsRouter } from '../modules/units/units.module';
import { warehousesRouter } from '../modules/warehouses/warehouses.module';
import { productsRouter } from '../modules/products/product.module';
import { inventoryRouter } from '../modules/inventory/inventory.module';
import { salesRouter } from '../modules/sales/sales.module';
import { purchasesRouter } from '../modules/purchases/purchase.module';
import { financeRouter } from '../modules/finance/finance.module';
import { hrRouter } from '../modules/hr/hr.module';
import { projectsRouter } from '../modules/projects/project.module';
import { crmRouter } from '../modules/crm/crm.module';
import { authenticateToken } from '../middlewares/auth';
import { isDatabaseConnected } from '../config/database';

export function setupRoutes(app: Application): void {
  // Health Check
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', timestamp: new Date().toISOString() },
      message: 'ERP Backend está operativo',
    });
  });

  app.get('/ready', (_req, res) => {
    const ready = isDatabaseConnected();
    res.status(ready ? 200 : 503).json({
      success: ready,
      data: {
        status: ready ? 'ready' : 'unavailable',
        database: ready ? 'connected' : 'disconnected',
      },
    });
  });

  // API v1
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/roles', roleRoutes);
  app.use('/api/v1/branches', branchRoutes);
  app.use('/api/v1/companies', companiesRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/suppliers', suppliersRouter);
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/units', unitsRouter);
  app.use('/api/v1/warehouses', warehousesRouter);
  app.use('/api/v1/products', productsRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/sales', salesRouter);
  app.use('/api/v1/purchases', purchasesRouter);
  app.use('/api/v1/finance', financeRouter);
  app.use('/api/v1/hr', hrRouter);
  app.use('/api/v1/projects', projectsRouter);
  app.use('/api/v1/crm', crmRouter);
  // Los módulos heredados aún contienen controladores placeholder. No se anuncia éxito ficticio.
  app.use(
    [
      '/api/v1/reports',
      '/api/v1/notifications',
      '/api/v1/settings',
    ],
    authenticateToken,
    (_req, res) => {
      res.status(501).json({
        success: false,
        error: { code: 'NOT_IMPLEMENTED', message: 'Módulo en desarrollo' },
      });
    },
  );
}
