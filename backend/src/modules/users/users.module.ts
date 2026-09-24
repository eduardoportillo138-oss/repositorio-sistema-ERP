// ============================================
// Módulo de Usuarios
// ============================================

import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, deactivateUser } from '../../controllers/user.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

// GET /api/v1/users
router.get('/', checkPermission('users.view'), getUsers);

// GET /api/v1/users/:id
router.get('/:id', checkPermission('users.view'), validate({
  params: { id: { type: 'string', validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), message: 'ID inválido' } },
}), getUserById);

// POST /api/v1/users
router.post('/', checkPermission('users.create'), validate({
  body: {
    email: { type: 'string', required: true, validate: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: 'Email inválido' },
    name: { type: 'string', required: true },
    password: { type: 'string', required: true },
    roleId: { type: 'string', required: true },
    companyId: { type: 'string', required: true },
  },
}), createUser);

// PUT /api/v1/users/:id
router.put('/:id', checkPermission('users.edit'), validate({
  params: { id: { type: 'string', validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), message: 'ID inválido' } },
}), updateUser);

// PATCH /api/v1/users/:id/deactivate
router.patch('/:id/deactivate', checkPermission('users.delete'), validate({
  params: { id: { type: 'string', validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), message: 'ID inválido' } },
}), deactivateUser);

export const usersRouter = router;
