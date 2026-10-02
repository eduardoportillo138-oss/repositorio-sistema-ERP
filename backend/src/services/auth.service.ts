import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthenticationError, AuthorizationError, ValidationError } from '../errors/AppError';
import { Company } from '../models/company.model';
import { Role } from '../models/role.model';
import { Session } from '../models/session.model';
import { IUserDocument } from '../models/user.model';
import { userRepository } from '../repositories/user.repository';
import { auditedMutation } from './auditedMutation';
import { isValidObjectId } from '../utils/validation';

type TokenClaims = jwt.JwtPayload & {
  userId: string;
  companyId: string;
  roleId: string;
  sid: string;
  type: string;
};
const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

function secrets(): void {
  if (
    !config.jwtSecret ||
    !config.jwtRefreshSecret ||
    config.jwtSecret === config.jwtRefreshSecret
  ) {
    throw new Error('Configure secretos JWT independientes');
  }
}

async function resolveIdentity(user: IUserDocument) {
  const companyId = String(user.companyId);
  const [role, company] = await Promise.all([
    Role.findOne({ _id: user.roleId, companyId, status: 'active' }).exec(),
    Company.findOne({ _id: companyId, status: 'active' }).exec(),
  ]);
  if (!role || !company || user.status !== 'active')
    throw new AuthorizationError('Cuenta, empresa o rol inactivo');
  return { role, company };
}

function publicIdentity(
  user: IUserDocument,
  identity: Awaited<ReturnType<typeof resolveIdentity>>,
) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    companyId: String(user.companyId),
    companyName: identity.company.name,
    roleId: String(user.roleId),
    permissions: identity.role.permissions.filter(
      (p) => !p.startsWith('platform.') || user.isPlatformAdmin,
    ),
  };
}

function tokenPair(user: IUserDocument, sid: string) {
  secrets();
  const payload = {
    userId: String(user._id),
    companyId: String(user.companyId),
    roleId: String(user.roleId),
    sid,
  };
  const accessToken = jwt.sign(
    { ...payload, type: 'access', jti: crypto.randomUUID() },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] },
  );
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh', jti: crypto.randomUUID() },
    config.jwtRefreshSecret,
    { algorithm: 'HS256', expiresIn: config.jwtRefreshExpiresIn as SignOptions['expiresIn'] },
  );
  const decoded = jwt.decode(refreshToken) as jwt.JwtPayload;
  if (!decoded.exp) throw new Error('Refresh token sin expiración');
  return { accessToken, refreshToken, expiresAt: new Date(decoded.exp * 1000) };
}

function verifyRefresh(token: string): TokenClaims {
  secrets();
  try {
    const claims = jwt.verify(token, config.jwtRefreshSecret, {
      algorithms: ['HS256'],
    }) as TokenClaims;
    if (
      claims.type !== 'refresh' ||
      ![claims.userId, claims.companyId, claims.roleId, claims.sid].every(isValidObjectId)
    ) {
      throw new AuthenticationError('Refresh token inválido');
    }
    return claims;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError)
      throw new AuthenticationError('Refresh token expirado');
    if (error instanceof jwt.JsonWebTokenError)
      throw new AuthenticationError('Refresh token inválido');
    throw error;
  }
}

export const authService = {
  async authenticate(email: string, password: string, companyId?: string, ip = '', device = '') {
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw new ValidationError('Email o contraseña inválidos');
    }
    const user = await userRepository.findByEmail(email, companyId);
    if (!user || user.status !== 'active' || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AuthenticationError('Credenciales inválidas');
    }
    const identity = await resolveIdentity(user);
    const sid = new mongoose.Types.ObjectId();
    const { accessToken, refreshToken, expiresAt } = tokenPair(user, String(sid));
    await auditedMutation(
      async (session) => {
        await Session.create(
          [
            {
              _id: sid,
              tokenHash: tokenHash(refreshToken),
              userId: user._id,
              companyId: user.companyId,
              expiresAt,
            },
          ],
          { session },
        );
        await userRepository.updateLastLogin(String(user._id), String(user.companyId), session);
        return sid;
      },
      () => ({
        userId: String(user._id),
        companyId: String(user.companyId),
        module: 'auth',
        action: 'login',
        entity: 'session',
        entityId: String(sid),
        ip: ip || 'unknown',
        device: device || 'unknown',
      }),
    );
    return { accessToken, refreshToken, user: publicIdentity(user, identity) };
  },

  async refreshToken(token: string, ip = '', device = '') {
    if (typeof token !== 'string' || !token) throw new ValidationError('Refresh token obligatorio');
    const claims = verifyRefresh(token);
    const user = await userRepository.findById(claims.userId, claims.companyId);
    if (!user || String(user.roleId) !== claims.roleId)
      throw new AuthenticationError('Usuario no válido');
    const identity = await resolveIdentity(user);
    const pair = tokenPair(user, claims.sid);
    // Compare-and-swap on one document: only one concurrent refresh can consume the old hash.
    await auditedMutation(
      async (session) => {
        const updated = await Session.findOneAndUpdate(
          {
            _id: claims.sid,
            tokenHash: tokenHash(token),
            userId: claims.userId,
            companyId: claims.companyId,
            revokedAt: { $exists: false },
            expiresAt: { $gt: new Date() },
          },
          { $set: { tokenHash: tokenHash(pair.refreshToken), expiresAt: pair.expiresAt } },
          { new: true, session },
        ).exec();
        if (!updated) throw new AuthenticationError('Sesión revocada o expirada');
        return updated;
      },
      (updated) => ({
        userId: claims.userId,
        companyId: claims.companyId,
        module: 'auth',
        action: 'refresh',
        entity: 'session',
        entityId: String(updated._id),
        ip: ip || 'unknown',
        device: device || 'unknown',
      }),
    );
    return {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      user: publicIdentity(user, identity),
    };
  },

  async invalidateRefreshToken(
    token: string,
    userId: string,
    companyId: string,
    ip = '',
    device = '',
  ) {
    if (typeof token !== 'string' || !token) throw new ValidationError('Refresh token obligatorio');
    await auditedMutation(
      async (session) => {
        const result = await Session.findOneAndUpdate(
          {
            tokenHash: tokenHash(token),
            userId,
            companyId,
            revokedAt: { $exists: false },
          },
          { $set: { revokedAt: new Date() } },
          { new: true, session },
        ).exec();
        if (!result) throw new AuthenticationError('Sesión no encontrada');
        return result;
      },
      (result) => ({
        userId,
        companyId,
        module: 'auth',
        action: 'logout',
        entity: 'session',
        entityId: String(result._id),
        ip: ip || 'unknown',
        device: device || 'unknown',
      }),
    );
  },
};
