import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getInventory, getProductStock, getInventoryMovements,
  createAdjustment, createTransfer } from '../../controllers/inventory.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('inventory.view'), asyncHandler(getInventory));
router.get('/movements', checkPermission('inventory.view'), asyncHandler(getInventoryMovements));
router.get('/product/:productId', checkPermission('inventory.view'), asyncHandler(getProductStock));
router.post('/adjustments', checkPermission('inventory.adjust'), asyncHandler(createAdjustment));
router.post('/transfers', checkPermission('inventory.transfer'), asyncHandler(createTransfer));
export const inventoryRouter = router;
