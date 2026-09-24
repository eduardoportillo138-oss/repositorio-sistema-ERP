// ============================================
// Módulo de Proveedores
// ============================================

import { isValidObjectId } from '../../utils/validation';
import { Router } from 'express';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deactivateSupplier } from '../../controllers/supplier.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

router.get('/', checkPermission('suppliers.view'), getSuppliers);

router.get('/:id', checkPermission('suppliers.view'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), getSupplierById);

router.post('/', checkPermission('suppliers.create'), validate({
  body: { name: { type: 'string', required: true } },
}), createSupplier);

router.put('/:id', checkPermission('suppliers.edit'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), updateSupplier);

router.patch('/:id/deactivate', checkPermission('suppliers.delete'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), deactivateSupplier);

export const suppliersRouter = router;
