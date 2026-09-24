// ============================================
// Manejo Centralizado de Errores
// ============================================

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../errors/AppError';
import { logger, sanitizeLogData } from '../utils/logger';

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;
  const code = isOperational ? (err as AppError).code : ErrorCode.INTERNAL_ERROR;
  const message = isOperational ? err.message : 'Error interno del servidor';
  const details = isOperational ? (err as AppError).details : undefined;

  // Log del error
  if (statusCode >= 500) {
    logger.error(message, { code, statusCode, stack: err.stack, details: sanitizeLogData(details || {}) });
  } else {
    logger.warn(message, { code, statusCode });
  }

  const errorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
      ...(details && { details: sanitizeLogData(details) }),
    },
  };

  return res.status(statusCode).json(errorResponse);
}

export function notFoundHandler(_req: Request, _res: Response, _next: NextFunction): Response {
  return _res.status(404).json({
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: 'Ruta no encontrada',
    },
  });
}
