import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import { AuthenticationError, AuthorizationError, TokenExpiredError } from '../errors/AppError';
import { Role } from '../models/role.model';
import { Company } from '../models/company.model';
import { Session } from '../models/session.model';
import { userRepository } from '../repositories/user.repository';
import { isValidObjectId } from '../utils/validation';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        companyId: string;
        roleId: string;
        permissions: string[];
        isPlatformAdmin?: boolean;
      };
      companyId?: string;
      branchId?: string;
    }
  }
}

interface AccessClaims extends jwt.JwtPayload {
  userId: string;
  companyId: string;
  roleId: string;
  sid: string;
  type: string;
}

export async function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const match = /^Bearer\s+(.+)$/.exec(req.get('authorization') || '');
    if (!match) throw new AuthenticationError('Token de acceso no proporcionado');
    if (!config.jwtSecret) throw new Error('JWT_SECRET no configurado');
    let claims: AccessClaims;
    try {
      claims = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'] }) as AccessClaims;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) throw new TokenExpiredError();
      if (error instanceof jwt.JsonWebTokenError)
        throw new AuthenticationError('Token de acceso inválido');
      throw error;
    }
    if (
      claims.type !== 'access' ||
      ![claims.userId, claims.companyId, claims.roleId, claims.sid].every(isValidObjectId)
    ) {
      throw new AuthenticationError('Token de acceso inválido');
    }
    const [user, role, company, session] = await Promise.all([
      userRepository.findById(claims.userId, claims.companyId),
      Role.findOne({ _id: claims.roleId, companyId: claims.companyId, status: 'active' }).exec(),
      Company.findOne({ _id: claims.companyId, status: 'active' }).exec(),
      Session.findOne({
        _id: claims.sid,
        userId: claims.userId,
        companyId: claims.companyId,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      }).exec(),
    ]);
    if (
      !user ||
      user.status !== 'active' ||
      String(user.roleId) !== claims.roleId ||
      !role ||
      !company ||
      !session
    ) {
      throw new AuthenticationError('Cuenta o empresa inactiva');
    }
    req.user = {
      userId: claims.userId,
      companyId: claims.companyId,
      roleId: claims.roleId,
      permissions: role.permissions.filter(
        (p) => !p.startsWith('platform.') || user.isPlatformAdmin,
      ),
      isPlatformAdmin: user.isPlatformAdmin === true,
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
    if (permission.startsWith('platform.') && !req.user.isPlatformAdmin)
      return next(new AuthorizationError());
    next();
  };
}

export function checkCompanyAccess(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new AuthenticationError());
  const requested = req.query.companyId || req.body?.companyId;
  if (requested && requested !== req.user.companyId)
    return next(new AuthorizationError('Empresa ajena'));
  req.companyId = req.user.companyId;
  next();
}

export function validateCompanyContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new AuthenticationError());
  req.companyId = req.user.companyId;
  next();
}

export const createRateLimiter = () =>
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas solicitudes' },
    },
  });
