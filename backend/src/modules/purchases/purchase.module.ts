import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPurchases, getPurchaseById, createPurchase, updatePurchase,
  confirmPurchase, cancelPurchase } from '../../controllers/purchase.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('purchases.view'), asyncHandler(getPurchases));
router.get('/:id', checkPermission('purchases.view'), asyncHandler(getPurchaseById));
router.post('/', checkPermission('purchases.create'), asyncHandler(createPurchase));
router.put('/:id', checkPermission('purchases.edit'), asyncHandler(updatePurchase));
router.patch('/:id', checkPermission('purchases.edit'), asyncHandler(updatePurchase));
router.patch('/:id/confirm', checkPermission('purchases.confirm'), asyncHandler(confirmPurchase));
router.patch('/:id/cancel', checkPermission('purchases.cancel'), asyncHandler(cancelPurchase));
export const purchasesRouter = router;
