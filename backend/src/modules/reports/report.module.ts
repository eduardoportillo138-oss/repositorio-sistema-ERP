// ============================================
// Módulo de Reportes
// ============================================

import { Router } from 'express';
import {
  getDashboard,
  getSalesReport,
  getInventoryReport,
  getFinanceReport,
} from '../../controllers/report.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(authenticateToken);

// Dashboard
router.get('/dashboard', checkPermission('reports.view'), asyncHandler(getDashboard));

// Reportes
router.get('/sales', checkPermission('reports.view'), asyncHandler(getSalesReport));
router.get('/inventory', checkPermission('reports.view'), asyncHandler(getInventoryReport));
router.get('/finance', checkPermission('reports.view'), asyncHandler(getFinanceReport));

export const reportRouter = router;
