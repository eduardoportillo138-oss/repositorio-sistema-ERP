// ============================================
// Validadores Compartidos del ERP
// ============================================

// Validación de email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validación de UUID
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Validación de cantidad positiva
export function isPositiveNumber(value: number, allowZero: boolean = false): boolean {
  if (allowZero) return Number.isFinite(value) && value >= 0;
  return Number.isFinite(value) && value > 0;
}

// Validación de string no vacío
export function isNonEmptyString(value: string, maxLength: number = 255): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

// Validación de rango
export function isInRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

// Validación de código
export function isValidCode(code: string, maxLength: number = 20): boolean {
  const codeRegex = /^[a-zA-Z0-9_-]+$/;
  return codeRegex.test(code) && code.length <= maxLength;
}

// Validación de contraseña
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (!password || password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  if (password.length > 128) {
    errors.push('La contraseña debe tener menos de 128 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validación de paginación
export function validatePagination(page: number, limit: number): { page: number; limit: number } {
  const validatedPage = Math.max(1, Math.floor(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, Math.floor(limit) || 20));
  return { page: validatedPage, limit: validatedLimit };
}

// Sanitización de string
export function sanitizeString(value: string): string {
  return value.replace(/[<>"'&]/g, (char) => {
    const escapeMap: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '&': '&amp;',
    };
    return escapeMap[char];
  });
}

// Validación de estado
export function isValidDocumentStatus(status: string): boolean {
  const validStatuses = ['active', 'inactive', 'cancelled', 'draft', 'pending', 'confirmed', 'completed'];
  return validStatuses.includes(status);
}
