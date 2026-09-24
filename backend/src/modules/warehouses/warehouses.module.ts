// ============================================
// Módulo de Almacenes
// ============================================

import { Router } from 'express';
import { getWarehouses } from '../../controllers/warehouse.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', checkPermission('inventory.view'), getWarehouses);

export const warehousesRouter = router;
