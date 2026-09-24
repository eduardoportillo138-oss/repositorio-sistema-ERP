// ============================================
// Middleware de Auditoría
// ============================================

import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

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
export async function createAuditLog(entry: AuditEntry): Promise<void> {
  await auditService.log(entry);
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
