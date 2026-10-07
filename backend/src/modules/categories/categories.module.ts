import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getCategories, getCategoryById, createCategory, updateCategory,
  deactivateCategory } from '../../controllers/category.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('categories.view'), asyncHandler(getCategories));
router.get('/:id', checkPermission('categories.view'), asyncHandler(getCategoryById));
router.post('/', checkPermission('categories.create'), asyncHandler(createCategory));
router.put('/:id', checkPermission('categories.edit'), asyncHandler(updateCategory));
router.patch('/:id', checkPermission('categories.edit'), asyncHandler(updateCategory));
router.patch('/:id/deactivate', checkPermission('categories.disable'), asyncHandler(deactivateCategory));

export const categoriesRouter = router;
