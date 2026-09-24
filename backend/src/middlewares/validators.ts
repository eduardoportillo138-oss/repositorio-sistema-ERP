// ============================================
// Middleware de Validación
// ============================================

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/AppError';
import { isValidObjectId, isValidEmail } from '../utils/validation';

// Tipo para el schema de validación
interface ValidationSchema {
  body?: Record<string, { type: string; required?: boolean; validate?: (value: any) => boolean; message?: string }>;
  params?: Record<string, { type: string; validate?: (value: any) => boolean; message?: string }>;
  query?: Record<string, { type: string; validate?: (value: any) => boolean; message?: string }>;
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
          if ((rules.type && typeof value !== rules.type) || (rules.validate && !rules.validate(value))) {
            errors.push(rules.message || `El campo "${field}" tiene un valor inválido`);
          }
        }
      }
    }

    // Validar params
    if (schema.params && req.params) {
      for (const [field, rules] of Object.entries(schema.params)) {
        const value = req.params[field];

        if ((rules.type && typeof value !== rules.type) || (rules.validate && !rules.validate(value))) {
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

    next();
  };
}

// Validadores de parámetros comunes
export const paramValidators = {
  objectId: isValidObjectId,
  email: (value: string) => isValidEmail(value),
  positiveNumber: (value: number) => Number.isFinite(value) && value > 0,
  nonEmptyString: (value: string) => typeof value === 'string' && value.trim().length > 0,
  pageSize: (value: number) => Number.isInteger(value) && value >= 1 && value <= 100,
  page: (value: number) => Number.isInteger(value) && value >= 1,
  status: (value: string) => ['active', 'inactive', 'cancelled', 'draft', 'pending', 'confirmed'].includes(value),
};
