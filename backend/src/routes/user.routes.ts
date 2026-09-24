// ============================================
// Rutas de Usuarios
// ============================================

import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, deactivateUser } from '../controllers/user.controller';
import { authenticateToken, checkPermission } from '../middlewares/auth';
import { validate } from '../middlewares/validators';

const router = Router();

// Todos los routes requieren autenticación
router.use(authenticateToken);

// Obtener lista de usuarios
router.get('/', checkPermission('users.view'), getUsers);

// Obtener usuario por ID
router.get('/:id', checkPermission('users.view'), validate({
  params: { id: { type: 'string', validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), message: 'ID inválido' } },
}), getUserById);

// Crear usuario
router.post('/', checkPermission('users.create'), validate({
  body: {
    email: { type: 'string', required: true, validate: (v: string) => /^\S+@\S+\.\S+$/.test(v), message: 'Email inválido' },
    name: { type: 'string', required: true },
    password: { type: 'string', required: true },
    roleId: { type: 'string', required: true },
    companyId: { type: 'string', required: true },
  },
}), createUser);

// Actualizar usuario
router.put('/:id', checkPermission('users.edit'), validate({
  params: { id: { type: 'string', validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), message: 'ID inválido' } },
}), updateUser);

// Desactivar usuario
router.patch('/:id/deactivate', checkPermission('users.delete'), validate({
  params: { id: { type: 'string', validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), message: 'ID inválido' } },
}), deactivateUser);

export { router as userRoutes };
