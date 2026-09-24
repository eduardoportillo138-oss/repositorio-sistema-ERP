// ============================================
// Middleware de Autenticación y Autorización
// ============================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { AppError, AuthenticationError, AuthorizationError } from '../errors/AppError';
import { config } from '../../packages/config/src';
import { logger } from '../utils/logger';

// Extensión de Request para incluir usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        name: string;
        role: string;
        companyId: string;
        permissions: string[];
      };
      companyId?: string;
      branchId?: string;
    }
  }
}

// Interfaz para el payload del JWT
interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  permissions: string[];
}

// ============================================
// Verificar Token de Acceso
// ============================================

export function authenticateToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Token de acceso no proporcionado');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      companyId: decoded.companyId,
      permissions: decoded.permissions,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(
        'TOKEN_EXPIRED',
        'Token expirado',
        401,
        { message: 'El token de acceso ha expirado' }
      );
    }
    throw new AuthenticationError('Token de acceso inválido');
  }
}

// ============================================
// Verificar Permisos (RBAC)
// ============================================

export function checkPermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Usuario no autenticado');
    }

    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(permission)) {
      logger.warn('Intento de acceso sin permiso', {
        userId: req.user.userId,
        permission,
        path: req.path,
      });
      throw new AuthorizationError(`No tiene permiso para ${permission}`);
    }

    next();
  };
}

// ============================================
// Verificar Acceso a Empresa
// ============================================

export function checkCompanyAccess(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AuthenticationError('Usuario no autenticado');
  }

  const requestedCompanyId = req.query.companyId as string || req.body.companyId;

  if (requestedCompanyId && requestedCompanyId !== req.user.companyId) {
    // Verificar si el usuario tiene acceso a múltiples empresas
    // Por ahora, solo permite acceso a su empresa
    throw new AuthorizationError('No tiene acceso a esta empresa');
  }

  req.companyId = req.user.companyId;
  next();
}

// ============================================
// Middleware de Validación de Empresa/Sucursal
// ============================================

export function validateCompanyContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AuthenticationError('Usuario no autenticado');
  }

  // Establecer contexto de empresa
  req.companyId = req.user.companyId;
  next();
}

// ============================================
// Middleware de Rate Limiting
// ============================================

export const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes, intente más tarde',
    },
  },
});
