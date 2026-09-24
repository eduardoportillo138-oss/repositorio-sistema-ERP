// ============================================
// Errores de la Aplicación
// ============================================

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INVENTORY_INSUFFICIENT = 'INVENTORY_INSUFFICIENT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  INVALID_INPUT = 'INVALID_INPUT',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
}

export class AppError extends Error {
  public code: ErrorCode;
  public statusCode: number;
  public details?: Record<string, any>;
  public isOperational: boolean;

  constructor(code: ErrorCode, message: string, statusCode: number = 400, details?: Record<string, any>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Error de validación', details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Credenciales inválidas') {
    super(ErrorCode.AUTHENTICATION_ERROR, message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'No tiene permiso para realizar esta acción') {
    super(ErrorCode.AUTHORIZATION_ERROR, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string = 'Recurso') {
    super(ErrorCode.NOT_FOUND, `${entity} no encontrado`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflicto de recursos') {
    super(ErrorCode.CONFLICT, message, 409);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Error de base de datos') {
    super(ErrorCode.DATABASE_ERROR, message, 500);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = 'Token de acceso expirado') {
    super(ErrorCode.TOKEN_EXPIRED, message, 401);
  }
}

export class InventoryInsufficientError extends AppError {
  constructor(productName: string, available: number, requested: number) {
    super(
      ErrorCode.INVENTORY_INSUFFICIENT,
      `Stock insuficiente para "${productName}". Disponible: ${available}, Solicitado: ${requested}`,
      409
    );
  }
}
