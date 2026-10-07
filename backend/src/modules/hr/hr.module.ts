import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getEmployees, getEmployeeById, createEmployee,
  updateEmployee, deactivateEmployee } from '../../controllers/hr.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('hr.view'), asyncHandler(getEmployees));
router.get('/:id', checkPermission('hr.view'), asyncHandler(getEmployeeById));
router.post('/', checkPermission('hr.create'), asyncHandler(createEmployee));
router.put('/:id', checkPermission('hr.edit'), asyncHandler(updateEmployee));
router.patch('/:id', checkPermission('hr.edit'), asyncHandler(updateEmployee));
router.patch('/:id/deactivate', checkPermission('hr.disable'), asyncHandler(deactivateEmployee));
export const hrRouter = router;
