// ============================================
// Rutas de Autenticación
// ============================================

import { Router } from 'express';
import { login, logout, refreshToken } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth';
import { validate } from '../middlewares/validators';

const router = Router();

// Login
router.post('/login', validate({
  body: {
    email: { type: 'string', required: true, validate: (v: string) => /^\S+@\S+\.\S+$/.test(v), message: 'Email inválido' },
    password: { type: 'string', required: true },
    companyId: { type: 'string', validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v || ''), message: 'CompanyId inválido' },
  },
}), login);

// Logout (requiere autenticación)
router.post('/logout', authenticateToken, logout);

// Refresh Token
router.post('/refresh', refreshToken);

export { router as authRoutes };
