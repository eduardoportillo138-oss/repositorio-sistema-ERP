// ============================================
// Módulo de Autenticación
// ============================================

import { Router } from 'express';
import { login, logout, refreshToken } from '../../controllers/auth.controller';
import { authenticateToken } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', validate({
  body: {
    email: { type: 'string', required: true, validate: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: 'Email inválido' },
    password: { type: 'string', required: true },
    companyId: { type: 'string', validate: (v: string) => !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), message: 'CompanyId inválido' },
  },
}), login);

// POST /api/v1/auth/logout
router.post('/logout', authenticateToken, logout);

// POST /api/v1/auth/refresh
router.post('/refresh', refreshToken);

export const authRouter = router;
