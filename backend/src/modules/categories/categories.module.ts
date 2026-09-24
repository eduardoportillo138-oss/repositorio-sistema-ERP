// ============================================
// Módulo de Categorías
// ============================================

import { Router } from 'express';
import { getCategories, createCategory } from '../../controllers/category.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', checkPermission('products.view'), getCategories);
router.post('/', checkPermission('products.create'), createCategory);

export const categoriesRouter = router;
