import { Router } from 'express';
import { authenticateToken, checkPermission } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { listBranches, getBranch, createBranch, updateBranch, deactivateBranch } from '../controllers/branch.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('branches.view'), asyncHandler(listBranches));
router.get('/:id', checkPermission('branches.view'), asyncHandler(getBranch));
router.post('/', checkPermission('branches.create'), asyncHandler(createBranch));
router.put('/:id', checkPermission('branches.edit'), asyncHandler(updateBranch));
router.patch('/:id', checkPermission('branches.edit'), asyncHandler(updateBranch));
router.patch('/:id/deactivate', checkPermission('branches.disable'), asyncHandler(deactivateBranch));
export { router as branchRoutes };
