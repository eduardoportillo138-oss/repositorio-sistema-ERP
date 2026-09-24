import { Router } from 'express';
import { authenticateToken, checkPermission } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { listRoles, getRole, createRole, updateRole, deactivateRole } from '../controllers/role.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('roles.view'), asyncHandler(listRoles));
router.get('/:id', checkPermission('roles.view'), asyncHandler(getRole));
router.post('/', checkPermission('roles.manage'), asyncHandler(createRole));
router.put('/:id', checkPermission('roles.manage'), asyncHandler(updateRole));
router.patch('/:id', checkPermission('roles.manage'), asyncHandler(updateRole));
router.patch('/:id/deactivate', checkPermission('roles.manage'), asyncHandler(deactivateRole));
export { router as roleRoutes };
