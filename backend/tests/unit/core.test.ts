import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config/env';
import { authService } from '../../src/services/auth.service';
import { userService, Actor } from '../../src/services/user.service';
import { userRepository } from '../../src/repositories/user.repository';
import { Role } from '../../src/models/role.model';
import { Company } from '../../src/models/company.model';
import { Session } from '../../src/models/session.model';
import { User } from '../../src/models/user.model';
import { auditService } from '../../src/services/audit.service';
import { getRole } from '../../src/controllers/role.controller';
import { updateRole } from '../../src/controllers/role.controller';
import { deactivateCompany } from '../../src/controllers/company.controller';
import { getBranch } from '../../src/controllers/branch.controller';
import { createBranch } from '../../src/controllers/branch.controller';
import { Branch } from '../../src/models/branch.model';
import { checkPermission } from '../../src/middlewares/auth';

const companyA = '507f1f77bcf86cd799439011';
const companyB = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439013';
const roleId = '507f1f77bcf86cd799439014';
const actor: Actor = { userId, companyId: companyA, roleId, permissions: ['users.view'] };

const query = (value: unknown) => ({ exec: jest.fn().mockResolvedValue(value) }) as any;

beforeAll(() => {
  (config as any).jwtSecret = 'test-access-secret-at-least-32-characters';
  (config as any).jwtRefreshSecret = 'test-refresh-secret-at-least-32-characters';
});
afterEach(() => jest.restoreAllMocks());

function mockLoginUser(passwordHash: string, status = 'active') {
  const user = { _id: userId, companyId: companyA, roleId, email: 'a@example.com', name: 'A', passwordHash, status } as any;
  jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(user);
  jest.spyOn(Role, 'findOne').mockReturnValue(query({ _id: roleId, permissions: ['users.view'], status: 'active' }));
  jest.spyOn(Company, 'findOne').mockReturnValue(query({ _id: companyA, status: 'active' }));
  jest.spyOn(Session, 'create').mockResolvedValue({} as any);
  jest.spyOn(userRepository, 'updateLastLogin').mockResolvedValue({} as any);
  jest.spyOn(auditService, 'log').mockResolvedValue();
  return user;
}

describe('Auth', () => {
  test('el modelo hashea la contraseña una sola vez', async () => {
    const user = new User({ email: 'hash@example.com', name: 'Hash', passwordHash: 'ValidPass123',
      roleId, companyId: companyA, permissions: [], status: 'active' });
    jest.spyOn(User.collection, 'insertOne').mockResolvedValue({ acknowledged: true, insertedId: user._id } as any);
    jest.spyOn(User.collection, 'findOne').mockResolvedValue({ _id: user._id } as any);
    await user.save();
    const firstHash = user.passwordHash;
    expect(firstHash).not.toBe('ValidPass123');
    expect(await bcrypt.compare('ValidPass123', firstHash)).toBe(true);
    await user.save();
    expect(user.passwordHash).toBe(firstHash);
  });

  test('login correcto usa bcrypt, persiste la sesión y excluye secretos', async () => {
    mockLoginUser(await bcrypt.hash('ValidPass123', 4));
    const result = await authService.authenticate('a@example.com', 'ValidPass123', companyA);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(jwt.decode(result.accessToken)).not.toHaveProperty('email');
    expect(Session.create).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(userRepository.updateLastLogin).toHaveBeenCalledWith(userId, companyA);
  });

  test('rechaza contraseña incorrecta', async () => {
    mockLoginUser(await bcrypt.hash('ValidPass123', 4));
    await expect(authService.authenticate('a@example.com', 'WrongPass123', companyA)).rejects.toMatchObject({ statusCode: 401 });
    expect(Session.create).not.toHaveBeenCalled();
  });

  test('rechaza email inexistente', async () => {
    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
    await expect(authService.authenticate('missing@example.com', 'ValidPass123', companyA)).rejects.toMatchObject({ statusCode: 401 });
  });

  test('rechaza usuario inactivo', async () => {
    mockLoginUser(await bcrypt.hash('ValidPass123', 4), 'inactive');
    await expect(authService.authenticate('a@example.com', 'ValidPass123', companyA)).rejects.toMatchObject({ statusCode: 401 });
  });

  test('rechaza refresh expirado', async () => {
    const token = jwt.sign({ userId, companyId: companyA, roleId }, config.jwtRefreshSecret, { expiresIn: -1 });
    await expect(authService.refreshToken(token)).rejects.toMatchObject({ statusCode: 401 });
  });

  test('revocación bloquea refresh', async () => {
    const token = jwt.sign({ userId, companyId: companyA, roleId }, config.jwtRefreshSecret, { expiresIn: '1h' });
    jest.spyOn(Session, 'findOneAndUpdate').mockReturnValue(query(null));
    await expect(authService.refreshToken(token)).rejects.toMatchObject({ statusCode: 401 });
  });

  test('refresh válido rota sesión', async () => {
    const token = jwt.sign({ userId, companyId: companyA, roleId }, config.jwtRefreshSecret, { expiresIn: '1h' });
    const user = mockLoginUser(await bcrypt.hash('ValidPass123', 4));
    jest.spyOn(Session, 'findOneAndUpdate').mockReturnValue(query({ _id: 'session' }));
    jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
    const result = await authService.refreshToken(token);
    expect(result.refreshToken).not.toBe(token);
    expect(Session.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ companyId: companyA }), expect.anything(), expect.anything());
  });

  test('logout revoca sesión correspondiente', async () => {
    jest.spyOn(Session, 'findOneAndUpdate').mockReturnValue(query({ _id: 'session' }));
    jest.spyOn(auditService, 'log').mockResolvedValue();
    await authService.invalidateRefreshToken('refresh-value', userId, companyA);
    expect(Session.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ userId, companyId: companyA }), expect.anything(), expect.anything());
  });
});

describe('Aislamiento de empresa', () => {
  test('Users crea dentro de la empresa del actor y audita', async () => {
    const user = { _id: companyB, companyId: companyA, roleId, email: 'b@example.com', name: 'B', status: 'active' } as any;
    jest.spyOn(Role, 'findOne').mockReturnValue(query({ _id: roleId, status: 'active' }));
    jest.spyOn(userRepository, 'create').mockResolvedValue(user);
    jest.spyOn(auditService, 'log').mockResolvedValue();
    const created = await userService.create(actor, { email: user.email, name: user.name, password: 'ValidPass123', roleId }, '', '');
    expect(created.companyId).toBe(companyA);
    expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({ companyId: companyA, actorId: userId }));
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', companyId: companyA }));
  });

  test('Users actualiza y desactiva con filtro empresarial', async () => {
    const before = { _id: companyB, companyId: companyA, roleId, status: 'active', name: 'B' } as any;
    jest.spyOn(userRepository, 'findById').mockResolvedValue(before);
    jest.spyOn(userRepository, 'update').mockResolvedValue({ ...before, name: 'Nuevo' });
    jest.spyOn(userRepository, 'deactivate').mockResolvedValue({ ...before, status: 'inactive' });
    jest.spyOn(auditService, 'log').mockResolvedValue();
    await userService.update(actor, companyB, { name: 'Nuevo' }, '', '');
    await userService.deactivate(actor, companyB, '', '');
    expect(userRepository.update).toHaveBeenCalledWith(companyB, companyA, { name: 'Nuevo' });
    expect(userRepository.deactivate).toHaveBeenCalledWith(companyB, companyA);
  });

  test('middleware deniega permiso ausente', () => {
    const next = jest.fn();
    checkPermission('roles.manage')({ user: actor } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test('Users busca con el companyId del actor y oculta un recurso ajeno', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue(null);
    await expect(userService.get(actor, companyB)).rejects.toMatchObject({ statusCode: 404 });
    expect(userRepository.findById).toHaveBeenCalledWith(companyB, companyA);
  });

  test('Users rechaza companyId arbitrario al crear', async () => {
    await expect(userService.create(actor, { companyId: companyB, email: 'b@example.com', name: 'B', password: 'ValidPass123' }, '', '')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('Roles filtra por empresa', async () => {
    jest.spyOn(Role, 'findOne').mockReturnValue(query(null));
    await expect(getRole({ params: { id: roleId }, user: actor } as any, {} as any)).rejects.toMatchObject({ statusCode: 404 });
    expect(Role.findOne).toHaveBeenCalledWith(expect.objectContaining({ companyId: companyA }));
  });

  test('Roles modifica permisos y audita', async () => {
    const role = { _id: roleId, companyId: companyA, name: 'Operador', description: '', permissions: ['users.view'],
      isSystemRole: false, status: 'active', save: jest.fn().mockResolvedValue(undefined) };
    jest.spyOn(Role, 'findOne').mockReturnValue(query(role));
    jest.spyOn(auditService, 'log').mockResolvedValue();
    const json = jest.fn();
    await updateRole({ params: { id: roleId }, user: actor, body: { permissions: ['users.view', 'users.create'] },
      ip: '', get: () => '' } as any, { json } as any);
    expect(role.save).toHaveBeenCalled();
    expect(role.permissions).toEqual(['users.view', 'users.create']);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'update', companyId: companyA }));
  });

  test('Companies no desactiva otra empresa', async () => {
    const mutation = jest.spyOn(Company, 'findOneAndUpdate');
    await expect(deactivateCompany({ params: { id: companyB }, user: actor } as any, {} as any)).rejects.toMatchObject({ statusCode: 404 });
    expect(mutation).not.toHaveBeenCalled();
  });

  test('Branches filtra por empresa', async () => {
    const querySpy = jest.spyOn(require('../../src/models/branch.model').Branch, 'findOne').mockReturnValue(query(null));
    await expect(getBranch({ params: { id: companyB }, user: actor } as any, {} as any)).rejects.toMatchObject({ statusCode: 404 });
    expect(querySpy).toHaveBeenCalledWith(expect.objectContaining({ companyId: companyA }));
  });

  test('Branches crea usando la empresa del actor', async () => {
    const branch = { _id: companyB, companyId: companyA, name: 'Centro', code: 'CTR' };
    jest.spyOn(Branch, 'create').mockResolvedValue(branch as any);
    jest.spyOn(auditService, 'log').mockResolvedValue();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    await createBranch({ user: actor, body: { name: 'Centro', code: 'CTR', address: 'A', city: 'B', country: 'MX' },
      ip: '', get: () => '' } as any, { status } as any);
    expect(Branch.create).toHaveBeenCalledWith(expect.objectContaining({ companyId: companyA }));
    expect(status).toHaveBeenCalledWith(201);
  });
});
