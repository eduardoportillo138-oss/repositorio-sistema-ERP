import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthenticationError, AuthorizationError, ValidationError } from '../errors/AppError';
import { Company } from '../models/company.model';
import { Role } from '../models/role.model';
import { Session } from '../models/session.model';
import { IUserDocument } from '../models/user.model';
import { userRepository } from '../repositories/user.repository';
import { auditService } from './audit.service';

type TokenClaims = jwt.JwtPayload & { userId: string; companyId: string; roleId: string };

const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

function secrets(): void {
  if (!config.jwtSecret || !config.jwtRefreshSecret) {
    throw new Error('Configure JWT_SECRET y JWT_REFRESH_SECRET');
  }
}

async function resolveIdentity(user: IUserDocument) {
  const companyId = String(user.companyId);
  const role = await Role.findOne({ _id: user.roleId, companyId, status: 'active' }).exec();
  const company = await Company.findOne({ _id: companyId, status: 'active' }).exec();
  if (!role || !company || user.status !== 'active') {
    throw new AuthorizationError('Cuenta, empresa o rol inactivo');
  }
  return { role, companyId };
}

async function issueTokens(user: IUserDocument) {
  secrets();
  const payload = { userId: String(user._id), companyId: String(user.companyId), roleId: String(user.roleId) };
  const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] });
  const refreshToken = jwt.sign({ ...payload, jti: crypto.randomUUID() }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn as SignOptions['expiresIn'],
  });
  const decoded = jwt.decode(refreshToken) as jwt.JwtPayload;
  if (!decoded.exp) throw new Error('Refresh token sin expiración');
  await Session.create({
    tokenHash: tokenHash(refreshToken), userId: user._id, companyId: user.companyId,
    expiresAt: new Date(decoded.exp * 1000),
  });
  return { accessToken, refreshToken };
}

function verifyRefresh(token: string): TokenClaims {
  secrets();
  try {
    const claims = jwt.verify(token, config.jwtRefreshSecret) as TokenClaims;
    if (!claims.userId || !claims.companyId || !claims.roleId) throw new AuthenticationError('Refresh token inválido');
    return claims;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new AuthenticationError('Refresh token expirado');
    if (error instanceof jwt.JsonWebTokenError) throw new AuthenticationError('Refresh token inválido');
    throw error;
  }
}

export const authService = {
  async authenticate(email: string, password: string, companyId?: string, ip = '', device = '') {
    if (typeof email !== 'string' || typeof password !== 'string') throw new ValidationError('Email y contraseña obligatorios');
    const user = await userRepository.findByEmail(email, companyId);
    if (!user || user.status !== 'active' || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AuthenticationError('Credenciales inválidas');
    }
    const { role } = await resolveIdentity(user);
    const tokens = await issueTokens(user);
    await userRepository.updateLastLogin(String(user._id), String(user.companyId));
    await auditService.log({
      userId: String(user._id), companyId: String(user.companyId), module: 'auth', action: 'login',
      entity: 'session', entityId: String(user._id), ip, device,
    });
    return {
      ...tokens,
      user: {
        id: String(user._id), email: user.email, name: user.name, companyId: String(user.companyId),
        roleId: String(user.roleId), permissions: role.permissions,
      },
    };
  },

  async refreshToken(token: string) {
    if (typeof token !== 'string' || !token) throw new ValidationError('Refresh token obligatorio');
    const claims = verifyRefresh(token);
    const session = await Session.findOneAndUpdate({
      tokenHash: tokenHash(token), userId: claims.userId, companyId: claims.companyId,
      revokedAt: { $exists: false }, expiresAt: { $gt: new Date() },
    }, { $set: { revokedAt: new Date() } }, { new: true }).exec();
    if (!session) throw new AuthenticationError('Sesión revocada o expirada');
    const user = await userRepository.findById(claims.userId, claims.companyId);
    if (!user || String(user.roleId) !== claims.roleId) throw new AuthenticationError('Usuario no válido');
    await resolveIdentity(user);
    return issueTokens(user);
  },

  async invalidateRefreshToken(token: string, userId: string, companyId: string, ip = '', device = '') {
    if (typeof token !== 'string' || !token) throw new ValidationError('Refresh token obligatorio');
    const result = await Session.findOneAndUpdate({
      tokenHash: tokenHash(token), userId, companyId, revokedAt: { $exists: false },
    }, { $set: { revokedAt: new Date() } }, { new: true }).exec();
    if (!result) throw new AuthenticationError('Sesión no encontrada');
    await auditService.log({
      userId, companyId, module: 'auth', action: 'logout', entity: 'session',
      entityId: String(result._id), ip, device,
    });
  },
};
