import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
} from '../../controllers/customer.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('customers.view'), asyncHandler(getCustomers));
router.get('/:id', checkPermission('customers.view'), asyncHandler(getCustomerById));
router.post('/', checkPermission('customers.create'), asyncHandler(createCustomer));
router.put('/:id', checkPermission('customers.edit'), asyncHandler(updateCustomer));
router.patch('/:id', checkPermission('customers.edit'), asyncHandler(updateCustomer));
router.patch('/:id/deactivate', checkPermission('customers.disable'), asyncHandler(deactivateCustomer));

export const customersRouter = router;
