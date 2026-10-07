import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getProducts, getProductById, createProduct, updateProduct,
  deactivateProduct } from '../../controllers/product.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('products.view'), asyncHandler(getProducts));
router.get('/:id', checkPermission('products.view'), asyncHandler(getProductById));
router.post('/', checkPermission('products.create'), asyncHandler(createProduct));
router.put('/:id', checkPermission('products.edit'), asyncHandler(updateProduct));
router.patch('/:id', checkPermission('products.edit'), asyncHandler(updateProduct));
router.patch('/:id/deactivate', checkPermission('products.disable'), asyncHandler(deactivateProduct));

export const productsRouter = router;
