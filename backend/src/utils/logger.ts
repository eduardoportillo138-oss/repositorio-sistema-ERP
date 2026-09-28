// ============================================
// Logger Estructurado
// ============================================

import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => Object.assign(info, sanitizeLogData(info)))(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] ${level}: ${message} ${metaStr}`;
  }),
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'erp-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Agregar transporte de consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

// Helper para no loggear información sensible
export function sanitizeLogData(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'refreshToken',
    'secret',
    'jwt',
    'credential',
    'apikey',
    'api_key',
    'privatekey',
    'mfa',
    'creditCard',
    'cvv',
  ];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null ? sanitizeLogData(item) : sanitizeValue(item),
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = sanitizeValue(value);
    }
  }

  return sanitized;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/gi, '[REDACTED_URI]')
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]');
}
