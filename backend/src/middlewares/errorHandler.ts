import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../errors/AppError';
import { logger, sanitizeLogData } from '../utils/logger';

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  const driverError = err as Error & { code?: number; type?: string; status?: number };
  const operational = err instanceof AppError;
  const malformed = err instanceof SyntaxError && driverError.status === 400;
  const duplicate = driverError.code === 11000;
  const validation = err.name === 'ValidationError' || err.name === 'CastError';
  const oversized = driverError.type === 'entity.too.large';
  const status = operational
    ? err.statusCode
    : malformed || validation
      ? 400
      : duplicate
        ? 409
        : oversized
          ? 413
          : 500;
  const code = operational
    ? err.code
    : status === 400
      ? ErrorCode.VALIDATION_ERROR
      : duplicate
        ? 'CONFLICT'
        : oversized
          ? 'PAYLOAD_TOO_LARGE'
          : ErrorCode.INTERNAL_ERROR;
  const message = operational
    ? err.message
    : status === 400
      ? 'Solicitud inválida'
      : duplicate
        ? 'El recurso ya existe'
        : oversized
          ? 'Solicitud demasiado grande'
          : 'Error interno del servidor';
  const details = operational && err.details ? sanitizeLogData(err.details) : undefined;
  if (status >= 500) logger.error('Error de API', { code, status, name: err.name });
  else logger.warn(message, { code, status });
  return res
    .status(status)
    .json({ success: false, error: { code, message, ...(details && { details }) } });
}

export function notFoundHandler(_req: Request, res: Response, _next: NextFunction): Response {
  return res
    .status(404)
    .json({ success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Ruta no encontrada' } });
}
