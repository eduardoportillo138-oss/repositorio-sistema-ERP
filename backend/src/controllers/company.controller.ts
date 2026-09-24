import { Request, Response } from 'express';
import { Company } from '../models/company.model';
import { auditService } from '../services/audit.service';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidEmail, isValidObjectId, pagination } from '../utils/validation';

const editable = ['name', 'legalName', 'taxId', 'email', 'phone', 'address', 'city', 'country', 'postalCode', 'currency', 'timezone', 'logo'];

function fields(body: Record<string, unknown>, creating = false): Record<string, unknown> {
  if (Object.keys(body).some((key) => !editable.includes(key))) throw new ValidationError('Campos no permitidos');
  if (creating && ['name', 'legalName', 'taxId', 'email', 'country'].some((key) => !body[key])) {
    throw new ValidationError('Faltan datos de empresa');
  }
  for (const key of ['name', 'legalName', 'taxId', 'country']) {
    if (body[key] !== undefined && (typeof body[key] !== 'string' || !String(body[key]).trim())) throw new ValidationError(`${key} inválido`);
  }
  if (body.email !== undefined && !isValidEmail(body.email)) throw new ValidationError('Email inválido');
  return body;
}

export async function getCompanies(req: Request, res: Response) {
  let paging;
  try { paging = pagination(req.query); } catch { throw new ValidationError('Paginación inválida'); }
  const company = await Company.findOne({ _id: req.user!.companyId, status: { $ne: 'cancelled' } }).exec();
  const all = company ? [company] : [];
  res.json({ success: true, data: paging.page === 1 ? all : [],
    pagination: { page: paging.page, limit: paging.limit, total: all.length, pages: all.length } });
}

export async function getCompanyById(req: Request, res: Response) {
  if (!isValidObjectId(req.params.id!)) throw new ValidationError('ID inválido');
  if (req.params.id! !== req.user!.companyId) throw new NotFoundError('Empresa');
  const company = await Company.findOne({ _id: req.params.id!, status: { $ne: 'cancelled' } }).exec();
  if (!company || String(company._id) !== req.user!.companyId) throw new NotFoundError('Empresa');
  res.json({ success: true, data: company });
}

export async function createCompany(req: Request, res: Response) {
  const body = fields(req.body, true);
  try {
    const company = await Company.create({ ...body, status: 'active' });
    await auditService.log({ userId: req.user!.userId, companyId: req.user!.companyId, module: 'companies', action: 'create',
      entity: 'company', entityId: String(company._id), newValue: { name: company.name, taxId: company.taxId },
      ip: String(req.ip || ''), device: req.get('user-agent') || '' });
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new ConflictError('Empresa duplicada');
    throw error;
  }
}

export async function updateCompany(req: Request, res: Response) {
  if (!isValidObjectId(req.params.id!)) throw new ValidationError('ID inválido');
  if (req.params.id! !== req.user!.companyId) throw new NotFoundError('Empresa');
  const patch = fields(req.body);
  const before = await Company.findOne({ _id: req.params.id!, status: { $ne: 'cancelled' } }).exec();
  if (!before || String(before._id) !== req.user!.companyId) throw new NotFoundError('Empresa');
  const company = await Company.findOneAndUpdate({ _id: req.params.id! }, { $set: patch }, { new: true, runValidators: true }).exec();
  if (!company) throw new NotFoundError('Empresa');
  await auditService.log({ userId: req.user!.userId, companyId: req.user!.companyId, module: 'companies', action: 'update',
    entity: 'company', entityId: req.params.id!, oldValue: { name: before.name, taxId: before.taxId },
    newValue: { name: company.name, taxId: company.taxId }, ip: String(req.ip || ''), device: req.get('user-agent') || '' });
  res.json({ success: true, data: company });
}

export async function deactivateCompany(req: Request, res: Response) {
  if (!isValidObjectId(req.params.id!)) throw new ValidationError('ID inválido');
  if (req.params.id! !== req.user!.companyId) throw new NotFoundError('Empresa');
  const company = await Company.findOneAndUpdate({ _id: req.params.id!, status: 'active' },
    { $set: { status: 'inactive' } }, { new: true }).exec();
  if (!company || String(company._id) !== req.user!.companyId) throw new NotFoundError('Empresa');
  await auditService.log({ userId: req.user!.userId, companyId: req.user!.companyId, module: 'companies', action: 'deactivate',
    entity: 'company', entityId: req.params.id!, newValue: { status: 'inactive' }, ip: String(req.ip || ''), device: req.get('user-agent') || '' });
  res.json({ success: true, data: company });
}
