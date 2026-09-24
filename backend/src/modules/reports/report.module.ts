// ============================================
// Módulo de Reportes
// ============================================

import { Router } from 'express';
import { getDashboard, getSalesReport, getInventoryReport, getFinanceReport } from '../../controllers/report.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Dashboard
router.get('/dashboard', checkPermission('reports.view'), getDashboard);

// Reportes
router.get('/sales', checkPermission('reports.view'), getSalesReport);
router.get('/inventory', checkPermission('reports.view'), getInventoryReport);
router.get('/finance', checkPermission('reports.view'), getFinanceReport);

export const reportRouter = router;
