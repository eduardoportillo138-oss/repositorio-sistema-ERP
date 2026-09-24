import { Request, Response } from 'express';
import { Role } from '../models/role.model';
import { PERMISSIONS } from '../../../packages/types/dist';
import { auditService } from '../services/audit.service';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';

const permitted = new Set<string>(PERMISSIONS);
const response = (role: InstanceType<typeof Role>) => ({
  id: String(role._id), companyId: String(role.companyId), name: role.name,
  description: role.description, permissions: role.permissions, isSystemRole: role.isSystemRole, status: role.status,
});

function fields(body: Record<string, unknown>) {
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) throw new ValidationError('Nombre inválido');
  if (body.description !== undefined && typeof body.description !== 'string') throw new ValidationError('Descripción inválida');
  if (body.permissions !== undefined && (!Array.isArray(body.permissions) || !body.permissions.every((p) => typeof p === 'string' && permitted.has(p)))) {
    throw new ValidationError('Permisos inválidos');
  }
  if (Object.keys(body).some((key) => !['name', 'description', 'permissions'].includes(key))) throw new ValidationError('Campos no permitidos');
  return body;
}

export async function listRoles(req: Request, res: Response) {
  let paging;
  try { paging = pagination(req.query); } catch { throw new ValidationError('Paginación inválida'); }
  const filter = { companyId: req.user!.companyId, status: { $ne: 'cancelled' } };
  const [roles, total] = await Promise.all([
    Role.find(filter).sort({ name: 1 }).skip(paging.skip).limit(paging.limit).exec(),
    Role.countDocuments(filter).exec(),
  ]);
  res.json({ success: true, data: roles.map(response), pagination: { page: paging.page, limit: paging.limit, total, pages: Math.ceil(total / paging.limit) } });
}

export async function getRole(req: Request, res: Response) {
  if (!isValidObjectId(req.params.id!)) throw new ValidationError('ID inválido');
  const role = await Role.findOne({ _id: req.params.id!, companyId: req.user!.companyId, status: { $ne: 'cancelled' } }).exec();
  if (!role) throw new NotFoundError('Rol');
  res.json({ success: true, data: response(role) });
}

export async function createRole(req: Request, res: Response) {
  const body = fields(req.body);
  if (!body.name) throw new ValidationError('Nombre obligatorio');
  try {
    const role = await Role.create({ ...body, companyId: req.user!.companyId, isSystemRole: false, status: 'active' });
    await auditService.log({ userId: req.user!.userId, companyId: req.user!.companyId, module: 'roles', action: 'create',
      entity: 'role', entityId: String(role._id), newValue: { name: role.name, permissions: role.permissions }, ip: String(req.ip || ''), device: req.get('user-agent') || '' });
    res.status(201).json({ success: true, data: response(role) });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new ConflictError('Rol duplicado');
    throw error;
  }
}

export async function updateRole(req: Request, res: Response) {
  if (!isValidObjectId(req.params.id!)) throw new ValidationError('ID inválido');
  const body = fields(req.body);
  const role = await Role.findOne({ _id: req.params.id!, companyId: req.user!.companyId, status: { $ne: 'cancelled' } }).exec();
  if (!role) throw new NotFoundError('Rol');
  if (role.isSystemRole) throw new ValidationError('El rol del sistema no se puede modificar');
  const oldValue = { name: role.name, permissions: role.permissions };
  if (body.name !== undefined) role.name = String(body.name);
  if (body.description !== undefined) role.description = String(body.description);
  if (body.permissions !== undefined) role.permissions = body.permissions as typeof role.permissions;
  await role.save();
  await auditService.log({ userId: req.user!.userId, companyId: req.user!.companyId, module: 'roles', action: 'update',
    entity: 'role', entityId: String(role._id), oldValue, newValue: { name: role.name, permissions: role.permissions }, ip: String(req.ip || ''), device: req.get('user-agent') || '' });
  res.json({ success: true, data: response(role) });
}

export async function deactivateRole(req: Request, res: Response) {
  if (!isValidObjectId(req.params.id!)) throw new ValidationError('ID inválido');
  const role = await Role.findOne({ _id: req.params.id!, companyId: req.user!.companyId, status: 'active' }).exec();
  if (!role) throw new NotFoundError('Rol');
  if (role.isSystemRole) throw new ValidationError('El rol del sistema no se puede desactivar');
  role.status = 'inactive';
  await role.save();
  await auditService.log({ userId: req.user!.userId, companyId: req.user!.companyId, module: 'roles', action: 'deactivate',
    entity: 'role', entityId: String(role._id), newValue: { status: 'inactive' }, ip: String(req.ip || ''), device: req.get('user-agent') || '' });
  res.json({ success: true, data: response(role) });
}


