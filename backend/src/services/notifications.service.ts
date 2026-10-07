import { Notification } from '../models/notification.model';
import { Actor } from './user.service';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';
import { auditedMutation } from './auditedMutation';

function publicNotification(row: { _id: unknown; title: string; message: string; type: string;
  read: boolean; relatedEntity?: string; relatedEntityId?: string; createdAt?: Date }) {
  return { id: String(row._id), title: row.title, message: row.message, type: row.type,
    read: row.read, relatedEntity: row.relatedEntity, relatedEntityId: row.relatedEntityId,
    createdAt: row.createdAt };
}
function audit(actor: Actor, action: string, entityId: string, ip: string, device: string) {
  return { userId: actor.userId, companyId: actor.companyId, module: 'notifications', action,
    entity: 'notification', entityId, ip, device };
}

export const notificationsService = {
  async list(actor: Actor, query: Record<string, unknown>) {
    let page;
    try { page = pagination(query); } catch { throw new ValidationError('Paginación inválida'); }
    if (query.read !== undefined && !['true', 'false'].includes(String(query.read)))
      throw new ValidationError('Filtro read inválido');
    const filter: Record<string, unknown> = { companyId: actor.companyId, userId: actor.userId };
    if (query.read !== undefined) filter.read = query.read === 'true';
    const [rows, total, unread] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip(page.skip).limit(page.limit).lean().exec(),
      Notification.countDocuments(filter).exec(),
      Notification.countDocuments({ companyId: actor.companyId, userId: actor.userId, read: false }).exec(),
    ]);
    return { data: rows.map(publicNotification), unread,
      pagination: { page: page.page, limit: page.limit, total, pages: Math.ceil(total / page.limit) } };
  },
  async markRead(actor: Actor, id: string, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    return auditedMutation(async (session) => {
      const row = await Notification.findOne({ _id: id, companyId: actor.companyId,
        userId: actor.userId }).session(session).exec();
      if (!row) throw new NotFoundError('Notificación');
      if (row.read) throw new ConflictError('La notificación ya fue leída');
      row.read = true; await row.save({ session });
      return publicNotification(row);
    }, (row) => audit(actor, 'read', row.id, ip, device));
  },
  async markAllRead(actor: Actor, ip: string, device: string) {
    return auditedMutation(async (session) => {
      const result = await Notification.updateMany({ companyId: actor.companyId,
        userId: actor.userId, read: false }, { $set: { read: true } }, { session }).exec();
      if (!result.modifiedCount) throw new ConflictError('No hay notificaciones sin leer');
      return { modified: result.modifiedCount };
    }, (result) => audit(actor, 'read-all', actor.userId, ip, device));
  },
};
