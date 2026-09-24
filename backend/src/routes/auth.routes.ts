import { Router } from 'express';
import { login, logout, refreshToken } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth';
import { validate } from '../middlewares/validators';
import { asyncHandler } from '../utils/asyncHandler';
import { isValidEmail, isValidObjectId } from '../utils/validation';

const router = Router();
router.post('/login', validate({ body: {
  email: { type: 'string', required: true, validate: isValidEmail },
  password: { type: 'string', required: true },
  companyId: { type: 'string', validate: isValidObjectId },
} }), asyncHandler(login));
router.post('/refresh', validate({ body: {
  refreshToken: { type: 'string', required: true },
} }), asyncHandler(refreshToken));
router.post('/logout', authenticateToken, validate({ body: {
  refreshToken: { type: 'string', required: true },
} }), asyncHandler(logout));

export { router as authRoutes };
