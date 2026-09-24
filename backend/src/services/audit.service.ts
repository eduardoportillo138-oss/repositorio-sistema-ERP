// ============================================
// Servicio de Auditoría
// ============================================

import { AuditLog } from '../models/auditLog.model';
import { logger } from '../utils/logger';

export const auditService = {
  async log(entry: {
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
  }): Promise<void> {
    try {
      await AuditLog.create({
        ...entry,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error creando audit log', { error: (error as Error).message });
    }
  },

  async getLogs(filters: {
    companyId?: string;
    module?: string;
    userId?: string;
    entity?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const query: any = {};

    if (filters.companyId) query.companyId = filters.companyId;
    if (filters.module) query.module = filters.module;
    if (filters.userId) query.userId = filters.userId;
    if (filters.entity) query.entity = filters.entity;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const total = await AuditLog.countDocuments(query).exec();
    const data = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
};
