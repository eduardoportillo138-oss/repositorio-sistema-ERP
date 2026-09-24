// ============================================
// Módulo de Inventario
// ============================================

import { Router } from 'express';
import { getInventory, getInventoryMovement, createInventoryMovement, getWarehouses } from '../../controllers/inventory.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

// Inventario
router.get('/', checkPermission('inventory.view'), getInventory);

// Movimientos
router.get('/movements', checkPermission('inventory.view'), getInventoryMovement);
router.post('/movements', checkPermission('inventory.create'), createInventoryMovement);

// Almacenes
router.get('/warehouses', checkPermission('inventory.view'), getWarehouses);

export const inventoryRouter = router;
