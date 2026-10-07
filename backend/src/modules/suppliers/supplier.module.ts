import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier,
  deactivateSupplier } from '../../controllers/supplier.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('suppliers.view'), asyncHandler(getSuppliers));
router.get('/:id', checkPermission('suppliers.view'), asyncHandler(getSupplierById));
router.post('/', checkPermission('suppliers.create'), asyncHandler(createSupplier));
router.put('/:id', checkPermission('suppliers.edit'), asyncHandler(updateSupplier));
router.patch('/:id', checkPermission('suppliers.edit'), asyncHandler(updateSupplier));
router.patch('/:id/deactivate', checkPermission('suppliers.disable'), asyncHandler(deactivateSupplier));

export const suppliersRouter = router;
