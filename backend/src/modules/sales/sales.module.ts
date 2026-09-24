// ============================================
// Módulo de Ventas
// ============================================

import { isValidObjectId } from '../../utils/validation';
import { Router } from 'express';
import { getSales, getSaleById, createSale, updateSale, approveSale } from '../../controllers/sale.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

router.get('/', checkPermission('sales.view'), getSales);
router.get('/:id', checkPermission('sales.view'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), getSaleById);
router.post('/', checkPermission('sales.create'), validate({
  body: {
    customerId: { type: 'string', required: true },
    warehouseId: { type: 'string', required: true },
    items: { type: 'array', required: true },
    total: { type: 'number', required: true },
  },
}), createSale);
router.put('/:id', checkPermission('sales.edit'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), updateSale);
router.patch('/:id/approve', checkPermission('sales.approve'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), approveSale);

export const salesRouter = router;
