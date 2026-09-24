"use strict";
// ============================================
// Validadores Compartidos del ERP
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidEmail = isValidEmail;
exports.isValidUUID = isValidUUID;
exports.isPositiveNumber = isPositiveNumber;
exports.isNonEmptyString = isNonEmptyString;
exports.isInRange = isInRange;
exports.isValidCode = isValidCode;
exports.validatePassword = validatePassword;
exports.validatePagination = validatePagination;
exports.sanitizeString = sanitizeString;
exports.isValidDocumentStatus = isValidDocumentStatus;
// Validación de email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// Validación de UUID
function isValidUUID(value) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}
// Validación de cantidad positiva
function isPositiveNumber(value, allowZero = false) {
    if (allowZero)
        return Number.isFinite(value) && value >= 0;
    return Number.isFinite(value) && value > 0;
}
// Validación de string no vacío
function isNonEmptyString(value, maxLength = 255) {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}
// Validación de rango
function isInRange(value, min, max) {
    return Number.isFinite(value) && value >= min && value <= max;
}
// Validación de código
function isValidCode(code, maxLength = 20) {
    const codeRegex = /^[a-zA-Z0-9_-]+$/;
    return codeRegex.test(code) && code.length <= maxLength;
}
function validatePassword(password) {
    const errors = [];
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
function validatePagination(page, limit) {
    const validatedPage = Math.max(1, Math.floor(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, Math.floor(limit) || 20));
    return { page: validatedPage, limit: validatedLimit };
}
// Sanitización de string
function sanitizeString(value) {
    return value.replace(/[<>"'&]/g, (char) => {
        const escapeMap = {
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
function isValidDocumentStatus(status) {
    const validStatuses = ['active', 'inactive', 'cancelled', 'draft', 'pending', 'confirmed', 'completed'];
    return validStatuses.includes(status);
}
//# sourceMappingURL=index.js.map