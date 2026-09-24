import { Request, Response } from 'express';
import { Branch } from '../models/branch.model';
import { User } from '../models/user.model';
import { auditService } from '../services/audit.service';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidEmail, isValidObjectId, pagination } from '../utils/validation';

const editable = ['name', 'code', 'address', 'city', 'country', 'phone', 'email', 'isMain'];
function fields(body: Record<string, unknown>, creating = false) {
  if (Object.keys(body).some((key) => !editable.includes(key))) throw new ValidationError('Campos no permitidos');
  if (creating && ['name', 'code', 'address', 'city', 'country'].some((key) => !body[key])) throw new ValidationError('Faltan datos de sucursal');
  for (const key of ['name', 'code', 'address', 'city', 'country', 'phone']) {
    if (body[key] !== undefined && typeof body[key] !== 'string') throw new ValidationError(`${key} inválido`);
  }
  if (body.email !== undefined && !isValidEmail(body.email)) throw new ValidationError('Email inválido');
  if (body.isMain !== undefined && typeof body.isMain !== 'boolean') throw new ValidationError('isMain inválido');
  return body;
}

export async function listBranches(req: Request, res: Response) {
  let paging;
  try { paging = pagination(req.query); } catch { throw new ValidationError('Paginación inválida'); }
  const filter = { companyId: req.user!.companyId, status: { $ne: 'cancelled' } };
  const [data, total] = await Promise.all([
    Branch.find(filter).sort({ name: 1 }).skip(paging.skip).limit(paging.limit).exec(),
    Branch.countDocuments(filter).exec(),
  ]);
  res.json({ success: true, data, pagination: { page: paging.page, limit: paging.limit, total, pages: Math.ceil(total / paging.limit) } });
}

export async function getBranch(req: Request, res: Response) {
  if (!isValidObjectId(req.params.id!)) throw new ValidationError('ID inválido');
  const branch = await Branch.findOne({ _id: req.params.id!, companyId: req.user!.companyId, status: { $ne: 'cancelled' } }).exec();
  if (!branch) throw new NotFoundError('Sucursal');
  res.json({ success: true, data: branch });
}

export async function createBranch(req: Request, res: Response) {
  const body = fields(req.body, true);
  try {
    const branch = await Branch.create({ ...body, companyId: req.user!.companyId, status: 'active' });
    await auditService.log({ userId: req.user!.userId, companyId: req.user!.companyId, module: 'branches', action: 'create',
      entity: 'branch', entityId: String(branch._id), newValue: { name: branch.name, code: branch.code }, ip: String(req.ip || ''), device: req.get('user-agent') || '' });
    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new ConflictError('Código de sucursal duplicado');
    throw error;
  }
}

export async function updateBranch(req: Request, res: Response) {
  if (!isValidObjectId(req.params.id!)) throw new ValidationError('ID inválido');
  const body = fields(req.body);
  const branch = await Branch.findOne({ _id: req.params.id!, companyId: req.user!.companyId, status: { $ne: 'cancelled' } }).exec();
  if (!branch) throw new NotFoundError('Sucursal');
  const oldValue = { name: branch.name, code: branch.code };
  Object.assign(branch, body);
  await branch.save();
  await auditService.log({ userId: req.user!.userId, companyId: req.user!.companyId, module: 'branches', action: 'update',
    entity: 'branch', entityId: req.params.id!, oldValue, newValue: { name: branch.name, code: branch.code }, ip: String(req.ip || ''), device: req.get('user-agent') || '' });
  res.json({ success: true, data: branch });
}

export async function deactivateBranch(req: Request, res: Response) {
  if (!isValidObjectId(req.params.id!)) throw new ValidationError('ID inválido');
  const filter = { _id: req.params.id!, companyId: req.user!.companyId, status: 'active' };
  const branch = await Branch.findOne(filter).exec();
  if (!branch) throw new NotFoundError('Sucursal');
  if (await User.exists({ branchId: branch._id, companyId: req.user!.companyId, status: 'active' })) {
    throw new ConflictError('La sucursal tiene usuarios activos');
  }
  branch.status = 'inactive';
  await branch.save();
  await auditService.log({ userId: req.user!.userId, companyId: req.user!.companyId, module: 'branches', action: 'deactivate',
    entity: 'branch', entityId: req.params.id!, newValue: { status: 'inactive' }, ip: String(req.ip || ''), device: req.get('user-agent') || '' });
  res.json({ success: true, data: branch });
}


