// ============================================
// Configuraciones Compartidas del ERP
// ============================================

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiVersion: string;
  baseUrl: string;
  mongodbUri: string;
  mongodbDbName: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  corsOrigin: string | string[];
  bcryptRounds: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  enableMultiCompany: boolean;
  enableBranches: boolean;
  enableWarehouses: boolean;
  enableMfa: boolean;
}

export function getConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiVersion: process.env.API_VERSION || 'v1',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    mongodbUri: process.env.MONGODB_URI || '',
    mongodbDbName: process.env.MONGODB_DB_NAME || 'erp_dev',
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    enableMultiCompany: process.env.ENABLE_MULTI_COMPANY === 'true',
    enableBranches: process.env.ENABLE_BRANCHES === 'true',
    enableWarehouses: process.env.ENABLE_WAREHOUSES === 'true',
    enableMfa: process.env.ENABLE_MFA === 'true',
  };
}

export const config = getConfig();
