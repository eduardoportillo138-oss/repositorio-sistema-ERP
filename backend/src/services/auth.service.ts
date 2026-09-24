// ============================================
// Servicio de Autenticación
// ============================================

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../../packages/config/src';
import { logger } from '../../utils/logger';
import { AuthenticationError, AppError } from '../../errors/AppError';
import { IUser } from '../../models/user.model';

export const authService = {
  async authenticate(email: string, password: string, companyId?: string) {
    // TODO: Implementar con repositorio de usuarios
    const user = await findUserByEmail(email, companyId);

    if (!user) {
      logger.warn('Intento de login con email no registrado', { email });
      throw new AuthenticationError('Credenciales inválidas');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      logger.warn('Contraseña incorrecta', { userId: user.userId });
      throw new AuthenticationError('Credenciales inválidas');
    }

    if (user.status !== 'active') {
      logger.warn('Intento de login con usuario inactivo', { userId: user.userId });
      throw new AppError('USER_INACTIVE', 'Usuario inactivo', 403);
    }

    const tokens = generateTokens(user);

    // Actualizar último login
    await updateLastLogin(user.userId);

    logger.info('Autenticación exitosa', { userId: user.userId, companyId: user.companyId });

    return tokens;
  },

  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { userId: string };
      const user = await findUserById(decoded.userId);

      if (!user || user.status !== 'active') {
        throw new AuthenticationError('Usuario no válido');
      }

      return generateAccessToken(user);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('TOKEN_EXPIRED', 'Refresh token expirado', 401);
      }
      throw new AuthenticationError('Refresh token inválido');
    }
  },

  async invalidateRefreshToken(userId: string) {
    // TODO: Implementar con Redis o repositorio
    logger.info('Refresh token invalidado', { userId });
  },
};

function generateTokens(user: IUser) {
  const payload = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    permissions: user.permissions,
  };

  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  const refreshToken = jwt.sign({ userId: user.userId }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });

  return { accessToken, refreshToken };
}

function generateAccessToken(user: IUser): string {
  const payload = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    permissions: user.permissions,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// Stubs - a implementar
async function findUserByEmail(email: string, companyId?: string): Promise<IUser | null> { return null; }
async function findUserById(userId: string): Promise<IUser | null> { return null; }
async function updateLastLogin(userId: string): Promise<void> {}
