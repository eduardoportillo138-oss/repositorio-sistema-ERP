import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  apiVersion: process.env.API_VERSION || 'v1',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'erp_dev',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 100),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  enableMultiCompany: process.env.ENABLE_MULTI_COMPANY === 'true',
  enableBranches: process.env.ENABLE_BRANCHES === 'true',
  enableWarehouses: process.env.ENABLE_WAREHOUSES === 'true',
  enableMfa: process.env.ENABLE_MFA === 'true',
};

export function validateConfig(): void {
  if (config.jwtSecret && config.jwtSecret === config.jwtRefreshSecret)
    throw new Error('JWT secrets deben ser distintos');
  if (
    !Number.isInteger(config.bcryptRounds) ||
    config.bcryptRounds < 10 ||
    config.bcryptRounds > 15
  ) {
    throw new Error('BCRYPT_ROUNDS debe estar entre 10 y 15');
  }
  if (![config.rateLimitMax, config.rateLimitWindowMs].every((n) => Number.isInteger(n) && n > 0)) {
    throw new Error('Rate limit inválido');
  }
  if (config.nodeEnv === 'production') {
    const missing = [
      ['MONGODB_URI', config.mongodbUri],
      ['JWT_SECRET', config.jwtSecret],
      ['JWT_REFRESH_SECRET', config.jwtRefreshSecret],
    ]
      .filter(
        ([name, value]) =>
          !value ||
          value === 'change_me_in_local_env' ||
          (name === 'MONGODB_URI' && value.includes('cluster.example.mongodb.net')) ||
          (name !== 'MONGODB_URI' && value.length < 32),
      )
      .map(([name]) => name);
    if (missing.length) throw new Error(`Variables de entorno requeridas: ${missing.join(', ')}`);
    if (
      /replace_with|change_me|provide_locally/i.test(config.jwtSecret + config.jwtRefreshSecret)
    ) {
      throw new Error('Reemplaza los secretos de ejemplo');
    }
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('PORT inválido');
  }
}
