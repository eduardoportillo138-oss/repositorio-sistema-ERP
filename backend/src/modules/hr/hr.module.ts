// ============================================
// Módulo de Recursos Humanos
// ============================================

import { isValidObjectId } from '../../utils/validation';
import { Router } from 'express';
import { getEmployees, getEmployeeById, createEmployee, updateEmployee } from '../../controllers/hr.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

router.get('/', checkPermission('hr.view'), getEmployees);
router.get('/:id', checkPermission('hr.view'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), getEmployeeById);
router.post('/', checkPermission('hr.create'), validate({
  body: { name: { type: 'string', required: true }, email: { type: 'string' } },
}), createEmployee);
router.put('/:id', checkPermission('hr.edit'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), updateEmployee);

export const hrRouter = router;
