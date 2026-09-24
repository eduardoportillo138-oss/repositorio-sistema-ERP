// ============================================
// Configuración de la Aplicación
// ============================================

import { config } from './env';

export const appConfig = {
  nodeEnv: config.nodeEnv,
  port: config.port,
  apiVersion: config.apiVersion,
  baseUrl: config.baseUrl,
  corsOrigin: config.corsOrigin,
  bcryptRounds: config.bcryptRounds,
  rateLimitMax: config.rateLimitMax,
  rateLimitWindowMs: config.rateLimitWindowMs,
  enableMultiCompany: config.enableMultiCompany,
  enableBranches: config.enableBranches,
  enableWarehouses: config.enableWarehouses,
  enableMfa: config.enableMfa,
};
