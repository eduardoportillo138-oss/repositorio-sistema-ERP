import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getSales, getSaleById, createSale, updateSale,
  confirmSale, cancelSale } from '../../controllers/sale.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('sales.view'), asyncHandler(getSales));
router.get('/:id', checkPermission('sales.view'), asyncHandler(getSaleById));
router.post('/', checkPermission('sales.create'), asyncHandler(createSale));
router.put('/:id', checkPermission('sales.edit'), asyncHandler(updateSale));
router.patch('/:id', checkPermission('sales.edit'), asyncHandler(updateSale));
router.patch('/:id/confirm', checkPermission('sales.confirm'), asyncHandler(confirmSale));
router.patch('/:id/cancel', checkPermission('sales.cancel'), asyncHandler(cancelSale));
export const salesRouter = router;
