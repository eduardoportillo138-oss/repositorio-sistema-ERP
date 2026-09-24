// ============================================
// Módulo de Clientes
// ============================================

import { isValidObjectId } from '../../utils/validation';
import { Router } from 'express';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deactivateCustomer } from '../../controllers/customer.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

router.get('/', checkPermission('customers.view'), getCustomers);

router.get('/:id', checkPermission('customers.view'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), getCustomerById);

router.post('/', checkPermission('customers.create'), validate({
  body: {
    name: { type: 'string', required: true },
    email: { type: 'string' },
    phone: { type: 'string' },
  },
}), createCustomer);

router.put('/:id', checkPermission('customers.edit'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), updateCustomer);

router.patch('/:id/deactivate', checkPermission('customers.delete'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), deactivateCustomer);

export const customersRouter = router;
