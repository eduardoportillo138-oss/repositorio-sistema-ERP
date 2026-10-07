import mongoose from 'mongoose';
import { Branch } from '../models/branch.model';
import { IEmployeeDocument } from '../models/employee.model';
import { employeeRepository } from '../repositories/employee.repository';
import { auditedMutation } from './auditedMutation';
import { Actor } from './user.service';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidEmail, isValidObjectId, pagination } from '../utils/validation';

const limits = { employeeNumber: 40, name: 200, email: 254, phone: 30,
  position: 100, department: 100, hireDate: 10, branchId: 24 } as const;
type Field = keyof typeof limits;
type Input = Partial<Record<Field, string>>;
function validate(body: unknown, creating: boolean): Input {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Empleado inválido');
  const raw = body as Record<string, unknown>;
  if (!Object.keys(raw).length || Object.keys(raw).some((key) => !(key in limits)))
    throw new ValidationError('Campos de empleado no permitidos');
  const input: Input = {};
  for (const key of Object.keys(raw) as Field[]) {
    if (typeof raw[key] !== 'string' || (!raw[key].trim() && key !== 'phone') ||
      raw[key].length > limits[key])
      throw new ValidationError(`${key} inválido`);
    input[key] = raw[key].trim();
  }
  if (creating && ['employeeNumber', 'name', 'email', 'position', 'department',
    'hireDate', 'branchId'].some((key) => !input[key as Field]))
    throw new ValidationError('Faltan campos obligatorios');
  if (input.employeeNumber) {
    input.employeeNumber = input.employeeNumber.toUpperCase();
    if (!/^[A-Z0-9_-]{1,40}$/.test(input.employeeNumber))
      throw new ValidationError('Número de empleado inválido');
  }
  if (input.email) {
    input.email = input.email.toLowerCase();
    if (!isValidEmail(input.email)) throw new ValidationError('Email inválido');
  }
  if (input.branchId && !isValidObjectId(input.branchId))
    throw new ValidationError('Sucursal inválida');
  if (input.hireDate) {
    const date = new Date(input.hireDate + 'T00:00:00.000Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.hireDate) ||
      Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.hireDate)
      throw new ValidationError('Fecha de ingreso inválida');
  }
  return input;
}
function publicEmployee(employee: IEmployeeDocument) {
  return { id: String(employee._id), employeeNumber: employee.employeeNumber,
    name: employee.name, email: employee.email, phone: employee.phone,
    position: employee.position, department: employee.department,
    hireDate: employee.hireDate, branchId: String(employee.branchId),
    status: employee.status, createdAt: employee.createdAt,
    updatedAt: employee.updatedAt };
}
function audit(actor: Actor, action: string, id: string, ip: string, device: string,
  value: Record<string, unknown>) {
  return { userId: actor.userId, companyId: actor.companyId, module: 'hr', action,
    entity: 'employee', entityId: id, newValue: value, ip, device };
}
async function checkReferences(companyId: string, input: Input, session: mongoose.ClientSession) {
  if (input.branchId && !(await Branch.exists({ _id: input.branchId,
    companyId, status: 'active' }).session(session).exec()))
    throw new ValidationError('Sucursal ajena o inactiva');
}
async function checkDuplicate(companyId: string, input: Input, id: string | undefined,
  session: mongoose.ClientSession) {
  if (input.employeeNumber &&
    await employeeRepository.duplicate(companyId, input.employeeNumber, id, session))
    throw new ConflictError('Número de empleado duplicado');
}
function validateId(id: string) {
  if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
}
export const employeeService = {
  async list(actor: Actor, query: Record<string, unknown>) {
    let paging;
    try { paging = pagination(query); } catch { throw new ValidationError('Paginación inválida'); }
    if (query.status !== undefined && !['active', 'inactive'].includes(String(query.status)))
      throw new ValidationError('Estado inválido');
    const search = query.search === undefined ? '' : query.search;
    if (typeof search !== 'string' || search.length > 100)
      throw new ValidationError('Búsqueda inválida');
    const filter: Record<string, unknown> = { status: query.status ||
      { $in: ['active', 'inactive'] } };
    const safe = search.trim().replace(/[^\p{L}\p{N}\s@._-]/gu, '').replaceAll('.', '\\.');
    if (safe) filter.$or = [{ name: new RegExp(safe, 'i') },
      { employeeNumber: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }];
    const { data, total } = await employeeRepository.list(actor.companyId,
      filter, paging.skip, paging.limit);
    return { data: data.map(publicEmployee), pagination: { page: paging.page,
      limit: paging.limit, total, pages: Math.ceil(total / paging.limit) } };
  },
  async get(actor: Actor, id: string) {
    validateId(id);
    const employee = await employeeRepository.get(actor.companyId, id);
    if (!employee) throw new NotFoundError('Empleado');
    return publicEmployee(employee);
  },
  async create(actor: Actor, body: unknown, ip: string, device: string) {
    const input = validate(body, true);
    return auditedMutation(async (session) => {
      await checkReferences(actor.companyId, input, session);
      await checkDuplicate(actor.companyId, input, undefined, session);
      const employee = await employeeRepository.create({ ...input,
        hireDate: new Date(input.hireDate! + 'T00:00:00.000Z'),
        companyId: actor.companyId, status: 'active',
        createdBy: actor.userId, updatedBy: actor.userId }, session);
      return publicEmployee(employee);
    }, (employee) => audit(actor, 'create', employee.id, ip, device,
      { employeeNumber: employee.employeeNumber, status: employee.status }));
  },
  async update(actor: Actor, id: string, body: unknown, ip: string, device: string) {
    validateId(id); const input = validate(body, false);
    return auditedMutation(async (session) => {
      const employee = await employeeRepository.get(actor.companyId, id, session);
      if (!employee) throw new NotFoundError('Empleado');
      if (employee.status !== 'active') throw new ConflictError('Empleado inactivo');
      await checkReferences(actor.companyId, input, session);
      await checkDuplicate(actor.companyId, input, id, session);
      const { hireDate, ...fields } = input;
      Object.assign(employee, fields, { updatedBy: actor.userId });
      if (hireDate) employee.hireDate = new Date(hireDate + 'T00:00:00.000Z');
      await employeeRepository.save(employee, session);
      return publicEmployee(employee);
    }, (employee) => audit(actor, 'update', id, ip, device,
      { employeeNumber: employee.employeeNumber }));
  },
  async deactivate(actor: Actor, id: string, ip: string, device: string) {
    validateId(id);
    return auditedMutation(async (session) => {
      const employee = await employeeRepository.get(actor.companyId, id, session);
      if (!employee) throw new NotFoundError('Empleado');
      if (employee.status !== 'active') throw new ConflictError('Empleado ya inactivo');
      employee.status = 'inactive'; employee.updatedBy = new mongoose.Types.ObjectId(actor.userId);
      await employeeRepository.save(employee, session);
      return publicEmployee(employee);
    }, (employee) => audit(actor, 'deactivate', id, ip, device,
      { status: employee.status }));
  },
};
