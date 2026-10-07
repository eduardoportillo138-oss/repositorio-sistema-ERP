import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { listReceivables, getReceivable, listPayables, getPayable,
  listPayments, recordPayment } from '../../controllers/finance.controller';

const router = Router();
router.use(authenticateToken);
router.get('/receivables', checkPermission('finances.view'), asyncHandler(listReceivables));
router.get('/receivables/:id', checkPermission('finances.view'), asyncHandler(getReceivable));
router.get('/payables', checkPermission('finances.view'), asyncHandler(listPayables));
router.get('/payables/:id', checkPermission('finances.view'), asyncHandler(getPayable));
router.get('/payments', checkPermission('finances.view'), asyncHandler(listPayments));
router.post('/payments', checkPermission('finances.create'), asyncHandler(recordPayment));
export const financeRouter = router;
