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
  transports:
    process.env.NODE_ENV === 'production'
      ? []
      : [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ],
});

// Render recoge stdout. La sanitización global se aplica también en producción.
logger.add(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
  }),
);

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

export function errorLogFields(error: unknown): Record<string, unknown> {
  const candidate = error as { name?: unknown; message?: unknown; stack?: unknown; code?: unknown } | null;
  const code = candidate?.code;
  return sanitizeLogData({
    errorName: typeof candidate?.name === 'string' ? candidate.name : 'UnknownError',
    errorMessage:
      typeof candidate?.message === 'string' ? candidate.message : String(error),
    errorStack: typeof candidate?.stack === 'string' ? candidate.stack : undefined,
    errorCode: typeof code === 'string' || typeof code === 'number' ? code : undefined,
  });
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  let sanitized = value
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/gi, '[REDACTED_URI]')
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]');
  const secrets = [process.env.MONGODB_URI, process.env.JWT_SECRET, process.env.JWT_REFRESH_SECRET];
  const credentials: string[] = [];
  if (process.env.MONGODB_URI) {
    try {
      const uri = new URL(process.env.MONGODB_URI);
      credentials.push(uri.username, uri.password, decodeURIComponent(uri.username), decodeURIComponent(uri.password));
    } catch {
      // The URI itself is still redacted by the pattern above.
    }
  }
  for (const secret of secrets) {
    if (secret && secret.length >= 4) sanitized = sanitized.split(secret).join('[REDACTED]');
  }
  for (const credential of credentials) {
    if (credential) sanitized = sanitized.split(credential).join('[REDACTED]');
  }
  return sanitized;
}
