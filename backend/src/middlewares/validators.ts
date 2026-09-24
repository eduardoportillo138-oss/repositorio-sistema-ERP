// ============================================
// Middleware de Validación
// ============================================

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/AppError';
import { sanitizeString, isValidUUID, isValidEmail } from '../../../packages/validation/src';

// Tipo para el schema de validación
interface ValidationSchema {
  body?: Record<string, { type: string; required?: boolean; validate?: (value: unknown) => boolean; message?: string }>;
  params?: Record<string, { type: string; validate?: (value: unknown) => boolean; message?: string }>;
  query?: Record<string, { type: string; validate?: (value: unknown) => boolean; message?: string }>;
}

// Validador genérico
export function validate(schema: ValidationSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validar body
    if (schema.body && req.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];

        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`El campo "${field}" es obligatorio`);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          if (rules.validate && !rules.validate(value)) {
            errors.push(rules.message || `El campo "${field}" tiene un valor inválido`);
          }
        }
      }
    }

    // Validar params
    if (schema.params && req.params) {
      for (const [field, rules] of Object.entries(schema.params)) {
        const value = req.params[field];

        if (rules.validate && !rules.validate(value)) {
          errors.push(rules.message || `El parámetro "${field}" tiene un valor inválido`);
        }
      }
    }

    // Validar query
    if (schema.query && req.query) {
      for (const [field, rules] of Object.entries(schema.query)) {
        const value = req.query[field];

        if (rules.validate && !rules.validate(value)) {
          errors.push(rules.message || `El parámetro de consulta "${field}" tiene un valor inválido`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Error de validación en la solicitud', { errors });
    }

    // Sanitizar strings en body
    if (req.body) {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          req.body[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          req.body[key] = sanitizeObject(value);
        }
      }
    }

    next();
  };
}

function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Validadores de parámetros comunes
export const paramValidators = {
  uuid: (value: string) => isValidUUID(value),
  email: (value: string) => isValidEmail(value),
  positiveNumber: (value: number) => Number.isFinite(value) && value > 0,
  nonEmptyString: (value: string) => typeof value === 'string' && value.trim().length > 0,
  pageSize: (value: number) => Number.isInteger(value) && value >= 1 && value <= 100,
  page: (value: number) => Number.isInteger(value) && value >= 1,
  status: (value: string) => ['active', 'inactive', 'cancelled', 'draft', 'pending', 'confirmed'].includes(value),
};
