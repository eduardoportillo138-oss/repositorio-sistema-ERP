// ============================================
// Módulo de Productos
// ============================================

import { isValidObjectId } from '../../utils/validation';
import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deactivateProduct } from '../../controllers/product.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

router.get('/', checkPermission('products.view'), getProducts);

router.get('/:id', checkPermission('products.view'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), getProductById);

router.post('/', checkPermission('products.create'), validate({
  body: {
    code: { type: 'string', required: true },
    name: { type: 'string', required: true },
    categoryId: { type: 'string', required: true },
    unitPrice: { type: 'number', required: true },
  },
}), createProduct);

router.put('/:id', checkPermission('products.edit'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), updateProduct);

router.patch('/:id/deactivate', checkPermission('products.delete'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), deactivateProduct);

export const productsRouter = router;
