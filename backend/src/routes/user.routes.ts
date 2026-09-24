import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, deactivateUser } from '../controllers/user.controller';
import { authenticateToken, checkPermission } from '../middlewares/auth';
import { validate } from '../middlewares/validators';
import { asyncHandler } from '../utils/asyncHandler';
import { isValidEmail, isValidObjectId, isValidPassword } from '../utils/validation';

const router = Router();
const idRule = validate({ params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } } });
router.use(authenticateToken);
router.get('/', checkPermission('users.view'), asyncHandler(getUsers));
router.get('/:id', checkPermission('users.view'), idRule, asyncHandler(getUserById));
router.post('/', checkPermission('users.create'), validate({ body: {
  email: { type: 'string', required: true, validate: isValidEmail },
  name: { type: 'string', required: true },
  password: { type: 'string', required: true, validate: isValidPassword },
  roleId: { type: 'string', required: true, validate: isValidObjectId },
} }), asyncHandler(createUser));
router.put('/:id', checkPermission('users.edit'), idRule, asyncHandler(updateUser));
router.patch('/:id', checkPermission('users.edit'), idRule, asyncHandler(updateUser));
router.patch('/:id/deactivate', checkPermission('users.disable'), idRule, asyncHandler(deactivateUser));

export { router as userRoutes };
