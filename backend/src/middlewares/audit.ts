// ============================================
// Middleware de Auditoría
// ============================================

import { Request, Response, NextFunction } from 'express';
import { AuditLogDocument } from '../../packages/types/src';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      auditInfo?: { ip: string; device: string };
    }
  }
}

export interface AuditEntry {
  userId: string;
  companyId: string;
  module: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ip: string;
  device: string;
}

// Función para crear entrada de auditoría
export async function createAuditLog(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
  try {
    const auditEntry: AuditLogDocument = {
      ...entry,
      timestamp: new Date(),
    };

    // En producción, esto se guardaría en MongoDB
    // Por ahora se loggeará
    logger.info('Audit Log', {
      userId: entry.userId,
      companyId: entry.companyId,
      module: entry.module,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      ip: entry.ip,
      device: entry.device,
    });
  } catch (error) {
    logger.error('Error al crear audit log:', error);
    // No bloquear la petición principal si el audit log falla
  }
}

// Middleware para capturar información de la petición
export function captureRequestInfo(req: Request): { ip: string; device: string } {
  return {
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    device: req.get('User-Agent') || 'unknown',
  };
}

// Middleware que decora la petición con info de auditoría
export function auditMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const { ip, device } = captureRequestInfo(req);
  req.auditInfo = { ip, device };
  next();
}
