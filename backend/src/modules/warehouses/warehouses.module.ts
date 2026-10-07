import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getWarehouses, getWarehouseById, createWarehouse, updateWarehouse,
  deactivateWarehouse } from '../../controllers/warehouse.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('warehouses.view'), asyncHandler(getWarehouses));
router.get('/:id', checkPermission('warehouses.view'), asyncHandler(getWarehouseById));
router.post('/', checkPermission('warehouses.create'), asyncHandler(createWarehouse));
router.put('/:id', checkPermission('warehouses.edit'), asyncHandler(updateWarehouse));
router.patch('/:id', checkPermission('warehouses.edit'), asyncHandler(updateWarehouse));
router.patch('/:id/deactivate', checkPermission('warehouses.disable'), asyncHandler(deactivateWarehouse));

export const warehousesRouter = router;
