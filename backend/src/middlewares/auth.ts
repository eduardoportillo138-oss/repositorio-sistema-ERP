import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import { AuthenticationError, AuthorizationError, TokenExpiredError } from '../errors/AppError';
import { Role } from '../models/role.model';
import { Company } from '../models/company.model';
import { userRepository } from '../repositories/user.repository';
import { isValidObjectId } from '../utils/validation';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; companyId: string; roleId: string; permissions: string[] };
      companyId?: string;
      branchId?: string;
    }
  }
}

interface AccessClaims extends jwt.JwtPayload {
  userId: string;
  companyId: string;
  roleId: string;
}

export async function authenticateToken(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const match = /^Bearer\s+(.+)$/.exec(req.get('authorization') || '');
    if (!match) throw new AuthenticationError('Token de acceso no proporcionado');
    if (!config.jwtSecret) throw new Error('JWT_SECRET no configurado');
    let claims: AccessClaims;
    try {
      claims = jwt.verify(match[1], config.jwtSecret) as AccessClaims;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) throw new TokenExpiredError();
      if (error instanceof jwt.JsonWebTokenError) throw new AuthenticationError('Token de acceso inválido');
      throw error;
    }
    if (![claims.userId, claims.companyId, claims.roleId].every(isValidObjectId)) {
      throw new AuthenticationError('Token de acceso inválido');
    }
    const [user, role, company] = await Promise.all([
      userRepository.findById(claims.userId, claims.companyId),
      Role.findOne({ _id: claims.roleId, companyId: claims.companyId, status: 'active' }).exec(),
      Company.findOne({ _id: claims.companyId, status: 'active' }).exec(),
    ]);
    if (!user || user.status !== 'active' || String(user.roleId) !== claims.roleId || !role || !company) {
      throw new AuthenticationError('Cuenta o empresa inactiva');
    }
    req.user = {
      userId: claims.userId, companyId: claims.companyId, roleId: claims.roleId,
      permissions: role.permissions,
    };
    req.companyId = claims.companyId;
    next();
  } catch (error) {
    next(error);
  }
}

export function checkPermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AuthenticationError());
    if (!req.user.permissions.includes(permission)) return next(new AuthorizationError());
    next();
  };
}

export function checkCompanyAccess(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new AuthenticationError());
  const requested = req.query.companyId || req.body?.companyId;
  if (requested && requested !== req.user.companyId) return next(new AuthorizationError('Empresa ajena'));
  req.companyId = req.user.companyId;
  next();
}

export function validateCompanyContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new AuthenticationError());
  req.companyId = req.user.companyId;
  next();
}

export const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas solicitudes' } },
});
