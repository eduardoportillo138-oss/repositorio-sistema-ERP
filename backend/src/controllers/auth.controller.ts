// ============================================
// Controlador de Autenticación
// ============================================

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../../packages/config/src';
import { logger } from '../../utils/logger';
import { AppError, AuthenticationError } from '../../errors/AppError';
import { IUser } from '../../models/user.model';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, companyId } = req.body;

    // Validación de entrada
    if (!email || !password) {
      throw new AppError('VALIDATION_ERROR', 'Email y contraseña son obligatorios', 400);
    }

    // TODO: Buscar usuario en base de datos (repositorio)
    // Por ahora, retornar respuesta de estructura
    const user = await findUserByEmail(email, companyId);

    if (!user) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    // Generar tokens JWT
    const accessToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        permissions: user.permissions,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.userId },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn }
    );

    // Registrar login en auditoría
    logger.info('Login exitoso', { userId: user.userId, companyId: user.companyId });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          permissions: user.permissions,
        },
      },
      message: 'Login exitoso',
    });
  } catch (error) {
    logger.error('Error en login', { error: (error as Error).message });
    throw error;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    logger.info('Logout', { userId });

    // En producción, invalidar el refresh token en Redis
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente',
    });
  } catch (error) {
    logger.error('Error en logout', { error: (error as Error).message });
    throw error;
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('VALIDATION_ERROR', 'Refresh token es obligatorio', 400);
    }

    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { userId: string };

    // Buscar usuario y generar nuevo access token
    const user = await findUserById(decoded.userId);
    if (!user) {
      throw new AuthenticationError('Usuario no encontrado');
    }

    const newAccessToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        permissions: user.permissions,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
      message: 'Token renovado exitosamente',
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('TOKEN_EXPIRED', 'Refresh token expirado', 401);
    }
    throw new AuthenticationError('Refresh token inválido');
  }
}

// Funciones stub - a implementar con repositorios
async function findUserByEmail(email: string, companyId?: string): Promise<IUser | null> {
  // TODO: Implementar con repositorio
  return null;
}

async function findUserById(userId: string): Promise<IUser | null> {
  // TODO: Implementar con repositorio
  return null;
}
