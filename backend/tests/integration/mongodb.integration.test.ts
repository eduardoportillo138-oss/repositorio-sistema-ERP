import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../../src/app';
import { config } from '../../src/config/env';
import {
  connectDatabase,
  disconnectDatabase,
  isDatabaseConnected,
} from '../../src/config/database';
import { Company } from '../../src/models/company.model';
import { Role } from '../../src/models/role.model';
import { Branch } from '../../src/models/branch.model';
import { User } from '../../src/models/user.model';
import { Session } from '../../src/models/session.model';
import { AuditLog } from '../../src/models/auditLog.model';
import { PERMISSIONS } from '../../../packages/types/dist';
import { auditService } from '../../src/services/audit.service';
import { bootstrapAdmin, BootstrapInput } from '../../src/utils/bootstrap-admin';
import { migrateCore } from '../../src/utils/core-migrations';

const password = 'TestPassword123!';
let mongo: MongoMemoryReplSet, app: ReturnType<typeof createApp>;
let companyA: string,
  companyB: string,
  adminA: string,
  adminB: string,
  roleA: string,
  roleB: string;
const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');

async function login(email = 'admin-a@example.test', companyId = companyA) {
  return request(app).post('/api/v1/auth/login').send({ email, password, companyId });
}
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

beforeAll(async () => {
  Object.assign(config, {
    nodeEnv: 'test',
    bcryptRounds: 10,
    jwtSecret: 'test-access-secret-independent-32-characters',
    jwtRefreshSecret: 'test-refresh-secret-independent-32-characters',
    rateLimitMax: 10000,
  });
  mongo = await MongoMemoryReplSet.create({
    binary: { version: '7.0.24', downloadDir: cache },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
  });
  config.mongodbUri = mongo.getUri();
  config.mongodbDbName = 'erp_core_audit_test';
  await connectDatabase();
  await Promise.all([
    Company.init(),
    Role.init(),
    Branch.init(),
    User.init(),
    Session.init(),
    AuditLog.init(),
  ]);
  await mongoose.connection.createCollection('bootstrapStates');
  app = createApp();
}, 120000);

afterAll(async () => {
  await disconnectDatabase();
  if (mongo) await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([
    Company.deleteMany({}),
    Role.deleteMany({}),
    Branch.deleteMany({}),
    User.deleteMany({}),
    Session.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  await mongoose.connection.collection('bootstrapStates').deleteMany({});
  const a = await Company.create({
    name: 'Empresa de prueba A',
    legalName: 'A',
    taxId: 'TEST-A',
    email: 'a@example.test',
    country: 'MX',
  });
  const b = await Company.create({
    name: 'Empresa de prueba B',
    legalName: 'B',
    taxId: 'TEST-B',
    email: 'b@example.test',
    country: 'MX',
  });
  companyA = String(a._id);
  companyB = String(b._id);
  const tenantPermissions = PERMISSIONS.filter((permission) => !permission.startsWith('platform.'));
  const ra = await Role.create({
    name: 'Admin',
    companyId: companyA,
    permissions: tenantPermissions,
  });
  const rb = await Role.create({
    name: 'Admin',
    companyId: companyB,
    permissions: tenantPermissions,
  });
  roleA = String(ra._id);
  roleB = String(rb._id);
  const ua = await User.create({
    email: 'admin-a@example.test',
    name: 'Admin A',
    companyId: companyA,
    roleId: roleA,
    passwordHash: password,
  });
  const ub = await User.create({
    email: 'admin-b@example.test',
    name: 'Admin B',
    companyId: companyB,
    roleId: roleB,
    passwordHash: password,
  });
  adminA = String(ua._id);
  adminB = String(ub._id);
});

describe('Core HTTP con MongoDB real y temporal', () => {
  test('readiness refleja la conexión sin revelar datos internos', async () => {
    expect((await request(app).get('/ready')).body.data).toEqual({
      status: 'ready',
      database: 'connected',
    });
    const original = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
    Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, value: 0 });
    try {
      const response = await request(app).get('/ready');
      expect(response.status).toBe(503);
      expect(JSON.stringify(response.body)).not.toContain('mongodb://');
    } finally {
      if (original) Object.defineProperty(mongoose.connection, 'readyState', original);
      else delete (mongoose.connection as { readyState?: number }).readyState;
    }
  });

  test('una falla de auditoría revierte la escritura y permite retry sin duplicación', async () => {
    const pair = (await login()).body.data;
    const create = () =>
      request(app)
        .post('/api/v1/roles')
        .set(auth(pair.accessToken))
        .send({ name: 'RetryRole', permissions: ['users.view'] });
    const spy = jest
      .spyOn(AuditLog, 'create')
      .mockRejectedValueOnce(new Error('audit unavailable'));
    expect((await create()).status).toBe(500);
    spy.mockRestore();
    expect(await Role.countDocuments({ companyId: companyA, name: 'RetryRole' })).toBe(0);
    expect((await create()).status).toBe(201);
    expect(await Role.countDocuments({ companyId: companyA, name: 'RetryRole' })).toBe(1);
    expect(
      await AuditLog.countDocuments({ companyId: companyA, entity: 'role', action: 'create' }),
    ).toBe(1);
  });

  test('bootstrap inicial crea Core en una transacción y rechaza segunda ejecución', async () => {
    await Promise.all([
      Company.deleteMany({}),
      Branch.deleteMany({}),
      Role.deleteMany({}),
      User.deleteMany({}),
    ]);
    const input: BootstrapInput = {
      email: 'bootstrap@example.test',
      password: 'ValidBootstrap123!',
      companyName: 'Nueva Empresa',
      companyTaxId: 'NEW-001',
      companyCountry: 'MX',
      branchName: 'Principal',
      branchAddress: 'Calle 1',
      branchCity: 'Ciudad de México',
    };
    const companyId = await bootstrapAdmin(input);
    const user = await User.findOne({ companyId }).select('+passwordHash').exec();
    expect(user?.isPlatformAdmin).toBe(false);
    expect(user).not.toHaveProperty('permissions');
    expect(await bcrypt.compare(input.password, user!.passwordHash)).toBe(true);
    const role = await Role.findById(user!.roleId);
    expect(role?.permissions.some((permission) => permission.startsWith('platform.'))).toBe(false);
    expect(await AuditLog.countDocuments({ companyId, module: 'bootstrap' })).toBe(1);
    await expect(bootstrapAdmin(input)).rejects.toThrow('Bootstrap rechazado');
    expect(await User.countDocuments()).toBe(1);
  });

  test('bootstrap revierte todo cuando falla auditoría', async () => {
    await Promise.all([
      Company.deleteMany({}),
      Branch.deleteMany({}),
      Role.deleteMany({}),
      User.deleteMany({}),
    ]);
    const input: BootstrapInput = {
      email: 'bootstrap@example.test',
      password: 'ValidBootstrap123!',
      companyName: 'Nueva Empresa',
      companyTaxId: 'NEW-002',
      companyCountry: 'MX',
      branchName: 'Principal',
      branchAddress: 'Calle 1',
      branchCity: 'Ciudad de México',
    };
    const spy = jest
      .spyOn(auditService, 'log')
      .mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(bootstrapAdmin(input)).rejects.toThrow('audit unavailable');
    spy.mockRestore();
    expect(await Company.countDocuments()).toBe(0);
    expect(await Branch.countDocuments()).toBe(0);
    expect(await Role.countDocuments()).toBe(0);
    expect(await User.countDocuments()).toBe(0);
    expect(await mongoose.connection.collection('bootstrapStates').countDocuments()).toBe(0);
  });

  test('migración dry-run no modifica User.permissions y apply es idempotente', async () => {
    await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(adminA) },
      { $set: { permissions: ['users.view'] } },
    );
    const dry = await migrateCore(false);
    expect(
      dry.findings.find((finding) => finding.check === 'User.permissions heredado')?.count,
    ).toBe(1);
    expect(
      (await User.collection.findOne({ _id: new mongoose.Types.ObjectId(adminA) }))?.permissions,
    ).toEqual(['users.view']);
    expect((await migrateCore(true)).applied?.userPermissionsUnset).toBe(1);
    expect((await migrateCore(true)).applied?.userPermissionsUnset).toBe(0);
  });
  test('conecta y verifica índices únicos por empresa y TTL de sesiones', async () => {
    expect(isDatabaseConnected()).toBe(true);
    const indexes = await User.collection.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: { companyId: 1, email: 1 }, unique: true }),
      ]),
    );
    expect(await Session.collection.indexes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: { expiresAt: 1 }, expireAfterSeconds: 0 }),
      ]),
    );
    expect(await Role.collection.indexes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: { name: 1, companyId: 1 }, unique: true }),
      ]),
    );
    expect(await Branch.collection.indexes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: { companyId: 1, code: 1 }, unique: true }),
      ]),
    );
  });
  test('login persiste hash de sesión y auditoría, sin secretos en identidad', async () => {
    const response = await login();
    expect(response.status).toBe(200);
    const { accessToken, refreshToken, user } = response.body.data;
    expect(user).toMatchObject({
      id: adminA,
      companyId: companyA,
      companyName: 'Empresa de prueba A',
    });
    expect(user).not.toHaveProperty('passwordHash');
    const claims = jwt.decode(accessToken) as jwt.JwtPayload;
    expect(claims.type).toBe('access');
    const session = await Session.findOne({ _id: claims.sid }).lean();
    expect(session?.tokenHash).toBe(hash(refreshToken));
    expect(JSON.stringify(session)).not.toContain(refreshToken);
    expect(await AuditLog.countDocuments({ companyId: companyA, action: 'login' })).toBe(1);
  });
  test('rechaza contraseña incorrecta, usuario y empresa inactivos', async () => {
    expect(
      (
        await request(app).post('/api/v1/auth/login').send({
          email: 'admin-a@example.test',
          password: 'WrongPassword123',
          companyId: companyA,
        })
      ).status,
    ).toBe(401);
    await User.updateOne({ _id: adminA }, { status: 'inactive' });
    expect((await login()).status).toBe(401);
    await User.updateOne({ _id: adminA }, { status: 'active' });
    await Company.updateOne({ _id: companyA }, { status: 'inactive' });
    expect((await login()).status).toBe(403);
    expect(await Session.countDocuments()).toBe(0);
  });
  test('email compartido requiere empresa; índices permiten mismo correo en otro tenant', async () => {
    await User.create({
      email: 'admin-a@example.test',
      name: 'Shared',
      companyId: companyB,
      roleId: roleB,
      passwordHash: password,
    });
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'admin-a@example.test', password })
      ).status,
    ).toBe(401);
    expect((await login()).status).toBe(200);
    expect((await login('admin-a@example.test', companyB)).body.data.user.companyId).toBe(companyB);
  });
  test('rotación concurrente consume refresh exactamente una vez y el nuevo token funciona', async () => {
    const initial = (await login()).body.data;
    const responses = await Promise.all(
      [0, 1].map(() =>
        request(app).post('/api/v1/auth/refresh').send({ refreshToken: initial.refreshToken }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
    const fresh = responses.find((response) => response.status === 200)!.body.data;
    expect(fresh.refreshToken).not.toBe(initial.refreshToken);
    expect(await Session.countDocuments()).toBe(1);
    expect(
      (await request(app).post('/api/v1/auth/refresh').send({ refreshToken: fresh.refreshToken }))
        .status,
    ).toBe(200);
  });
  test('logout revoca inmediatamente access y refresh, y registra el evento', async () => {
    const pair = (await login()).body.data;
    expect(
      (
        await request(app)
          .post('/api/v1/auth/logout')
          .set(auth(pair.accessToken))
          .send({ refreshToken: pair.refreshToken })
      ).status,
    ).toBe(200);
    expect((await request(app).get('/api/v1/users').set(auth(pair.accessToken))).status).toBe(401);
    expect(
      (await request(app).post('/api/v1/auth/refresh').send({ refreshToken: pair.refreshToken }))
        .status,
    ).toBe(401);
    expect(await AuditLog.countDocuments({ companyId: companyA, action: 'logout' })).toBe(1);
  });
  test('no permite logout de una sesión ajena', async () => {
    const a = (await login()).body.data,
      b = (await login('admin-b@example.test', companyB)).body.data;
    expect(
      (
        await request(app)
          .post('/api/v1/auth/logout')
          .set(auth(a.accessToken))
          .send({ refreshToken: b.refreshToken })
      ).status,
    ).toBe(401);
    expect((await request(app).get('/api/v1/users').set(auth(b.accessToken))).status).toBe(200);
  });
  test('rechaza access expirado, refresh usado como access y sesiones expiradas sin esperar TTL', async () => {
    const pair = (await login()).body.data;
    const claims = jwt.decode(pair.accessToken) as jwt.JwtPayload;
    const expired = jwt.sign(
      { userId: adminA, companyId: companyA, roleId: roleA, sid: claims.sid, type: 'access' },
      config.jwtSecret,
      { expiresIn: -1 },
    );
    expect((await request(app).get('/api/v1/users').set(auth(expired))).status).toBe(401);
    expect((await request(app).get('/api/v1/users').set(auth(pair.refreshToken))).status).toBe(401);
    await Session.updateOne({ _id: claims.sid }, { expiresAt: new Date(0) });
    expect((await request(app).get('/api/v1/users').set(auth(pair.accessToken))).status).toBe(401);
    expect(
      (await request(app).post('/api/v1/auth/refresh').send({ refreshToken: pair.refreshToken }))
        .status,
    ).toBe(401);
  });
  test('Users CRUD respeta empresa, no filtra hashes y rechaza referencias ajenas', async () => {
    const pair = (await login()).body.data;
    const created = await request(app).post('/api/v1/users').set(auth(pair.accessToken)).send({
      email: 'worker@example.test',
      name: 'Worker',
      password,
      roleId: roleA,
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect(created.body.data.companyId).toBe(companyA);
    expect(created.body.data).not.toHaveProperty('passwordHash');
    expect(
      (await request(app).get('/api/v1/users').set(auth(pair.accessToken))).body.data.map(
        (row: { id: string }) => row.id,
      ),
    ).not.toContain(adminB);
    expect(
      (
        await request(app)
          .get('/api/v1/users/' + adminB)
          .set(auth(pair.accessToken))
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch('/api/v1/users/' + adminB)
          .set(auth(pair.accessToken))
          .send({ name: 'Attack' })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch('/api/v1/users/' + id)
          .set(auth(pair.accessToken))
          .send({ roleId: roleB })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch('/api/v1/users/' + id)
          .set(auth(pair.accessToken))
          .send({ name: 'Updated' })
      ).body.data.name,
    ).toBe('Updated');
    expect(
      (
        await request(app)
          .patch('/api/v1/users/' + id + '/deactivate')
          .set(auth(pair.accessToken))
      ).body.data.status,
    ).toBe('inactive');
    expect(await AuditLog.countDocuments({ companyId: companyA, entityId: id })).toBe(3);
  });
  test('no reanima sesiones de un usuario desactivado después de reactivar la cuenta', async () => {
    await User.create({
      email: 'worker@example.test',
      name: 'Worker',
      passwordHash: password,
      companyId: companyA,
      roleId: roleA,
    });
    const worker = (await login('worker@example.test')).body.data,
      admin = (await login()).body.data;
    await request(app)
      .patch('/api/v1/users/' + worker.user.id + '/deactivate')
      .set(auth(admin.accessToken));
    await request(app)
      .patch('/api/v1/users/' + worker.user.id)
      .set(auth(admin.accessToken))
      .send({ status: 'active' });
    expect((await request(app).get('/api/v1/users').set(auth(worker.accessToken))).status).toBe(
      401,
    );
  });
  test('duplicado en el tenant devuelve 409; entradas inválidas e inyección devuelven 400', async () => {
    const pair = (await login()).body.data;
    expect(
      (
        await request(app)
          .post('/api/v1/users')
          .set(auth(pair.accessToken))
          .send({ name: 'Duplicate', email: 'admin-a@example.test', password, roleId: roleA })
      ).status,
    ).toBe(409);
    expect(
      (await request(app).get('/api/v1/users?limit=101').set(auth(pair.accessToken))).status,
    ).toBe(400);
    expect(
      (await request(app).get('/api/v1/users/not-an-id').set(auth(pair.accessToken))).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: { $ne: null }, password })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .set('Content-Type', 'application/json')
          .send('{broken')
      ).status,
    ).toBe(400);
  });
  test('RBAC usa permisos vigentes, no el JWT histórico', async () => {
    const pair = (await login()).body.data;
    await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(adminA) },
      { $set: { permissions: ['users.view'] } },
    );
    await Role.updateOne({ _id: roleA, companyId: companyA }, { permissions: [] });
    expect((await request(app).get('/api/v1/users').set(auth(pair.accessToken))).status).toBe(403);
  });
  test('no concede permisos de plataforma mediante Roles ni un rol histórico', async () => {
    const pair = (await login()).body.data;
    expect(
      (
        await request(app)
          .post('/api/v1/roles')
          .set(auth(pair.accessToken))
          .send({ name: 'Escalated', permissions: ['platform.company.create'] })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch('/api/v1/roles/' + roleA)
          .set(auth(pair.accessToken))
          .send({ permissions: ['platform.company.create'] })
      ).status,
    ).toBe(400);
    await Role.updateOne({ _id: roleA }, { $addToSet: { permissions: 'platform.company.create' } });
    expect(
      (await request(app).post('/api/v1/companies').set(auth(pair.accessToken)).send({})).status,
    ).toBe(403);
  });
  test('Roles CRUD e índices son empresariales; los roles del sistema son inmutables', async () => {
    const pair = (await login()).body.data;
    const created = await request(app)
      .post('/api/v1/roles')
      .set(auth(pair.accessToken))
      .send({ name: 'Operator', permissions: ['users.view'] });
    expect(created.status).toBe(201);
    expect(
      (
        await request(app)
          .get('/api/v1/roles/' + roleB)
          .set(auth(pair.accessToken))
      ).status,
    ).toBe(404);
    const id = created.body.data.id;
    expect(
      (
        await request(app)
          .patch('/api/v1/roles/' + id)
          .set(auth(pair.accessToken))
          .send({ name: 'Admin' })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .patch('/api/v1/roles/' + id)
          .set(auth(pair.accessToken))
          .send({ name: 'Viewer' })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch('/api/v1/roles/' + id + '/deactivate')
          .set(auth(pair.accessToken))
      ).body.data.status,
    ).toBe('inactive');
    const system = await Role.create({ name: 'System', companyId: companyA, isSystemRole: true });
    expect(
      (
        await request(app)
          .patch('/api/v1/roles/' + system._id)
          .set(auth(pair.accessToken))
          .send({ name: 'Tampered' })
      ).status,
    ).toBe(400);
  });
  test('Branches CRUD rechaza tenant y sucursal ajenos; bloquea desactivación con usuarios', async () => {
    const pair = (await login()).body.data;
    const body = { name: 'Centro', code: 'CTR', address: 'A', city: 'B', country: 'MX' };
    const created = await request(app)
      .post('/api/v1/branches')
      .set(auth(pair.accessToken))
      .send(body);
    expect(created.status).toBe(201);
    const id = String(created.body.data._id);
    const other = await Branch.create({ ...body, companyId: companyB });
    expect(
      (
        await request(app)
          .get('/api/v1/branches/' + other._id)
          .set(auth(pair.accessToken))
      ).status,
    ).toBe(404);
    expect(
      (await request(app).post('/api/v1/branches').set(auth(pair.accessToken)).send(body)).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .patch('/api/v1/users/' + adminA)
          .set(auth(pair.accessToken))
          .send({ branchId: String(other._id) })
      ).status,
    ).toBe(400);
    await User.updateOne({ _id: adminA }, { branchId: id });
    expect(
      (
        await request(app)
          .patch('/api/v1/branches/' + id + '/deactivate')
          .set(auth(pair.accessToken))
      ).status,
    ).toBe(409);
    await User.updateOne({ _id: adminA }, { $unset: { branchId: 1 } });
    expect(
      (
        await request(app)
          .patch('/api/v1/branches/' + id)
          .set(auth(pair.accessToken))
          .send({ name: 'Nuevo' })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch('/api/v1/branches/' + id + '/deactivate')
          .set(auth(pair.accessToken))
      ).body.data.status,
    ).toBe('inactive');
  });
  test('Companies lista y modifica solamente la empresa propia', async () => {
    const pair = (await login()).body.data;
    expect(
      (await request(app).get('/api/v1/companies').set(auth(pair.accessToken))).body.data.map(
        (row: { _id: string }) => row._id,
      ),
    ).toEqual([companyA]);
    expect(
      (
        await request(app)
          .patch('/api/v1/companies/' + companyB)
          .set(auth(pair.accessToken))
          .send({ name: 'Attack' })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch('/api/v1/companies/' + companyA)
          .set(auth(pair.accessToken))
          .send({ name: 'Updated A' })
      ).body.data.name,
    ).toBe('Updated A');
    expect(
      (
        await request(app)
          .patch('/api/v1/companies/' + companyA + '/deactivate')
          .set(auth(pair.accessToken))
      ).status,
    ).toBe(200);
    expect((await request(app).get('/api/v1/users').set(auth(pair.accessToken))).status).toBe(401);
  });
  test('auditoría persiste redacción recursiva y exige companyId', async () => {
    await auditService.log({
      userId: adminA,
      companyId: companyA,
      module: 'test',
      action: 'update',
      entity: 'user',
      entityId: adminA,
      newValue: {
        password: 'never-store-this',
        nested: [{ refreshToken: 'never-store-token', valid: 'ok' }],
      },
      ip: '',
      device: '',
    });
    const entry = await AuditLog.findOne({ module: 'test' }).lean();
    expect(JSON.stringify(entry)).not.toMatch(/never-store/);
    expect(entry?.newValue?.nested[0].valid).toBe('ok');
    await expect(
      auditService.log({
        eventId: entry!.eventId,
        userId: adminA,
        companyId: companyA,
        module: 'test',
        action: 'update',
        entity: 'user',
        entityId: adminA,
        ip: 'test',
        device: 'test',
      }),
    ).rejects.toMatchObject({ code: 11000 });
    expect(await AuditLog.countDocuments({ eventId: entry!.eventId })).toBe(1);
    await expect(auditService.getLogs({ companyId: '' })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect((await auditService.getLogs({ companyId: companyB })).data).toHaveLength(0);
  });
  test.each([
    'customers',
    'suppliers',
    'categories',
    'units',
    'products',
    'warehouses',
    'inventory',
    'sales',
    'purchases',
    'finance',
    'reports',
    'hr',
    'projects',
    'crm',
  ])('%s incompleto nunca devuelve éxito', async (module) => {
    const pair = (await login()).body.data;
    const response = await request(app)
      .post('/api/v1/' + module)
      .set(auth(pair.accessToken))
      .send({});
    expect(response.status).toBe(501);
    expect(response.body).toMatchObject({ success: false, error: { code: 'NOT_IMPLEMENTED' } });
  });
});
