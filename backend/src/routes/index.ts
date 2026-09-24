// ============================================
// Actualizar rutas para incluir categorías y almacenes
// ============================================

import { Application } from 'express';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { roleRoutes } from './role.routes';
import { branchRoutes } from './branch.routes';
import { companiesRouter } from '../modules/companies/company.module';
import { authenticateToken } from '../middlewares/auth';

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
  app.use('/api/v1/roles', roleRoutes);
  app.use('/api/v1/branches', branchRoutes);
  app.use('/api/v1/companies', companiesRouter);
  // Los módulos heredados aún contienen controladores placeholder. No se anuncia éxito ficticio.
  app.use([
    '/api/v1/customers', '/api/v1/suppliers', '/api/v1/products', '/api/v1/categories',
    '/api/v1/inventory', '/api/v1/warehouses', '/api/v1/sales', '/api/v1/purchases',
    '/api/v1/finance', '/api/v1/reports',
  ], authenticateToken, (_req, res) => {
    res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Módulo en corrección' } });
  });
}
