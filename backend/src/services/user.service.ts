import { Branch } from '../models/branch.model';
import { Role } from '../models/role.model';
import { Session } from '../models/session.model';
import { IUserDocument } from '../models/user.model';
import { userRepository } from '../repositories/user.repository';
import { isValidEmail, isValidObjectId, isValidPassword, pagination } from '../utils/validation';
import { auditedMutation } from './auditedMutation';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../errors/AppError';

export interface Actor {
  userId: string;
  companyId: string;
  roleId: string;
  permissions: string[];
}

export function publicUser(user: IUserDocument) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    roleId: String(user.roleId),
    companyId: String(user.companyId),
    branchId: user.branchId ? String(user.branchId) : undefined,
    phone: user.phone,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function validRole(roleId: unknown, companyId: string) {
  if (!isValidObjectId(roleId)) throw new ValidationError('roleId inválido');
  const role = await Role.findOne({ _id: roleId, companyId, status: 'active' }).exec();
  if (!role) throw new ValidationError('Rol no pertenece a la empresa');
  if (role.permissions?.some((p) => p.startsWith('platform.')))
    throw new AuthorizationError('Rol de plataforma reservado');
}

async function validBranch(branchId: unknown, companyId: string) {
  if (branchId === undefined || branchId === null) return;
  if (!isValidObjectId(branchId)) throw new ValidationError('branchId inválido');
  const branch = await Branch.findOne({ _id: branchId, companyId, status: 'active' }).exec();
  if (!branch) throw new ValidationError('Sucursal no pertenece a la empresa');
}

export const userService = {
  async list(actor: Actor, query: Record<string, unknown>) {
    let paging;
    try {
      paging = pagination(query);
    } catch {
      throw new ValidationError('Paginación inválida');
    }
    const { data, total } = await userRepository.findByCompany(
      actor.companyId,
      paging.page,
      paging.limit,
    );
    return {
      data: data.map(publicUser),
      pagination: {
        page: paging.page,
        limit: paging.limit,
        total,
        pages: Math.ceil(total / paging.limit),
      },
    };
  },

  async get(actor: Actor, id: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const user = await userRepository.findById(id, actor.companyId);
    if (!user) throw new NotFoundError('Usuario');
    return publicUser(user);
  },

  async create(actor: Actor, body: Record<string, unknown>, ip: string, device: string) {
    if (
      Object.keys(body).some(
        (key) => !['email', 'name', 'password', 'roleId', 'branchId', 'companyId'].includes(key),
      )
    ) {
      throw new ValidationError('Campos de creación inválidos');
    }
    const { email, name, password, roleId, branchId } = body;
    if (
      !isValidEmail(email) ||
      typeof name !== 'string' ||
      !name.trim() ||
      !isValidPassword(password)
    ) {
      throw new ValidationError('Email, nombre o contraseña inválidos');
    }
    if (body.companyId !== undefined && body.companyId !== actor.companyId) {
      throw new ValidationError('companyId no se puede cambiar');
    }
    await validRole(roleId, actor.companyId);
    await validBranch(branchId, actor.companyId);
    try {
      const user = await auditedMutation(
        async (session) =>
          userRepository.create(
            {
              email,
              name,
              password,
              roleId: roleId as string,
              companyId: actor.companyId,
              branchId: branchId as string | undefined,
              actorId: actor.userId,
            },
            session,
          ),
        (user) => ({
          userId: actor.userId,
          companyId: actor.companyId,
          module: 'users',
          action: 'create',
          entity: 'user',
          entityId: String(user._id),
          newValue: { email: user.email, roleId: String(user.roleId), status: user.status },
          ip,
          device,
        }),
      );
      return publicUser(user);
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictError('El email ya existe en la empresa');
      throw error;
    }
  },

  async update(
    actor: Actor,
    id: string,
    body: Record<string, unknown>,
    ip: string,
    device: string,
  ) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const allowed = ['name', 'phone', 'roleId', 'branchId', 'status'];
    if (!Object.keys(body).length || Object.keys(body).some((key) => !allowed.includes(key))) {
      throw new ValidationError('Campos de actualización inválidos');
    }
    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim()))
      throw new ValidationError('Nombre inválido');
    if (body.phone !== undefined && (typeof body.phone !== 'string' || body.phone.length > 20))
      throw new ValidationError('Teléfono inválido');
    if (body.status !== undefined && !['active', 'inactive'].includes(String(body.status)))
      throw new ValidationError('Estado inválido');
    if (body.roleId !== undefined) await validRole(body.roleId, actor.companyId);
    if (body.branchId !== undefined) await validBranch(body.branchId, actor.companyId);
    let oldValue: { roleId: string; status: string };
    const user = await auditedMutation(
      async (session) => {
        const before = await userRepository.findById(id, actor.companyId, false, session);
        if (!before) throw new NotFoundError('Usuario');
        if (before.isPlatformAdmin) throw new AuthorizationError('Cuenta de plataforma reservada');
        oldValue = { roleId: String(before.roleId), status: before.status };
        const user = await userRepository.update(id, actor.companyId, body as any, session);
        if (!user) throw new NotFoundError('Usuario');
        if (body.roleId !== undefined || body.status === 'inactive') {
          await Session.updateMany(
            { userId: id, companyId: actor.companyId, revokedAt: { $exists: false } },
            { $set: { revokedAt: new Date() } },
            { session },
          ).exec();
        }
        return user;
      },
      (user) => ({
        userId: actor.userId,
        companyId: actor.companyId,
        module: 'users',
        action: 'update',
        entity: 'user',
        entityId: id,
        oldValue,
        newValue: { roleId: String(user.roleId), status: user.status },
        ip,
        device,
      }),
    );
    return publicUser(user);
  },

  async deactivate(actor: Actor, id: string, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    if (id === actor.userId) throw new ValidationError('No puedes desactivar tu propia cuenta');
    const user = await auditedMutation(
      async (session) => {
        const user = await userRepository.deactivate(id, actor.companyId, session);
        if (!user) throw new NotFoundError('Usuario');
        await Session.updateMany(
          { userId: id, companyId: actor.companyId, revokedAt: { $exists: false } },
          { $set: { revokedAt: new Date() } },
          { session },
        ).exec();
        return user;
      },
      (user) => ({
        userId: actor.userId,
        companyId: actor.companyId,
        module: 'users',
        action: 'deactivate',
        entity: 'user',
        entityId: id,
        newValue: { status: 'inactive' },
        ip,
        device,
      }),
    );
    return publicUser(user);
  },
};
