// ============================================
// Módulo de Compras
// ============================================

import { isValidObjectId } from '../../utils/validation';
import { Router } from 'express';
import { getPurchases, getPurchaseById, createPurchase, updatePurchase, approvePurchase } from '../../controllers/purchase.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

router.get('/', checkPermission('purchases.view'), getPurchases);
router.get('/:id', checkPermission('purchases.view'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), getPurchaseById);
router.post('/', checkPermission('purchases.create'), validate({
  body: {
    supplierId: { type: 'string', required: true },
    warehouseId: { type: 'string', required: true },
    items: { type: 'array', required: true },
    total: { type: 'number', required: true },
  },
}), createPurchase);
router.put('/:id', checkPermission('purchases.edit'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), updatePurchase);
router.patch('/:id/approve', checkPermission('purchases.approve'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), approvePurchase);

export const purchasesRouter = router;
