import path from 'node:path';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../../src/app';
import { config } from '../../src/config/env';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { Company } from '../../src/models/company.model';
import { Role } from '../../src/models/role.model';
import { User } from '../../src/models/user.model';
import { Session } from '../../src/models/session.model';
import { Unit } from '../../src/models/unit.model';
import { Product } from '../../src/models/product.model';
import { AuditLog } from '../../src/models/auditLog.model';

const app = createApp();
const password = 'TestPassword123!';
let mongo: MongoMemoryReplSet;
let companyA: string;
let companyB: string;
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
const permissions = ['units.view', 'units.create', 'units.edit', 'units.disable'];

async function token(email: string, companyId: string) {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password, companyId });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}
const auth = (value: string) => ({ Authorization: 'Bearer ' + value });

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
  config.mongodbDbName = 'erp_units_test';
  await connectDatabase();
  await Promise.all([Company.init(), Role.init(), User.init(), Session.init(),
    Unit.init(), Product.init(), AuditLog.init()]);
}, 120000);

afterAll(async () => {
  await disconnectDatabase();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([Company.deleteMany({}), Role.deleteMany({}), User.deleteMany({}),
    Session.deleteMany({}), Unit.deleteMany({}), Product.deleteMany({}), AuditLog.deleteMany({})]);
  const a = await Company.create({ name: 'Empresa A', legalName: 'A', taxId: 'A-TEST',
    email: 'a@example.test', country: 'MX' });
  const b = await Company.create({ name: 'Empresa B', legalName: 'B', taxId: 'B-TEST',
    email: 'b@example.test', country: 'MX' });
  companyA = String(a._id);
  companyB = String(b._id);
  const roleA = await Role.create({ name: 'Admin', companyId: companyA, permissions });
  const roleB = await Role.create({ name: 'Admin', companyId: companyB, permissions });
  const viewer = await Role.create({ name: 'Viewer', companyId: companyA,
    permissions: ['units.view'] });
  await User.create({ email: 'admin-a@example.test', name: 'Admin A', companyId: companyA,
    roleId: roleA._id, passwordHash: password });
  await User.create({ email: 'admin-b@example.test', name: 'Admin B', companyId: companyB,
    roleId: roleB._id, passwordHash: password });
  await User.create({ email: 'viewer@example.test', name: 'Viewer', companyId: companyA,
    roleId: viewer._id, passwordHash: password });
});

test('CRUD, paginación, búsqueda y auditoría de unidades', async () => {
  const access = await token('admin-a@example.test', companyA);
  const created = await request(app).post('/api/v1/units').set(auth(access))
    .send({ name: 'Unidad Uno', code: 'UNT-1', symbol: 'u', description: 'Unidad QA' });
  expect(created.status).toBe(201);
  expect(created.body.data).toMatchObject({ name: 'Unidad Uno', code: 'UNT-1',
    symbol: 'u', description: 'Unidad QA', status: 'active' });
  const id = created.body.data.id as string;
  const list = await request(app).get('/api/v1/units?search=Uno&page=1&limit=1')
    .set(auth(access));
  expect(list.status).toBe(200);
  expect(list.body.pagination).toEqual({ page: 1, limit: 1, total: 1, pages: 1 });
  expect(list.body.data[0].id).toBe(id);
  const updated = await request(app).put('/api/v1/units/' + id).set(auth(access))
    .send({ description: 'Actualizada' });
  expect(updated.status).toBe(200);
  expect(updated.body.data.description).toBe('Actualizada');
  const inactive = await request(app).patch('/api/v1/units/' + id + '/deactivate')
    .set(auth(access));
  expect(inactive.status).toBe(200);
  expect(inactive.body.data.status).toBe('inactive');
  expect(await Unit.countDocuments({ companyId: companyA, status: 'inactive' })).toBe(1);
  expect(await AuditLog.countDocuments({ companyId: companyA, entityId: id })).toBe(3);
});

test('una empresa no puede leer ni modificar una unidad de otra', async () => {
  const accessA = await token('admin-a@example.test', companyA);
  const accessB = await token('admin-b@example.test', companyB);
  const created = await request(app).post('/api/v1/units').set(auth(accessA))
    .send({ name: 'Privado', code: 'PRIV', symbol: 'p' });
  const id = created.body.data.id as string;
  expect((await request(app).get('/api/v1/units/' + id).set(auth(accessB))).status).toBe(404);
  expect((await request(app).put('/api/v1/units/' + id).set(auth(accessB))
    .send({ name: 'Intruso' })).status).toBe(404);
  expect((await request(app).patch('/api/v1/units/' + id + '/deactivate')
    .set(auth(accessB))).status).toBe(404);
  const listB = await request(app).get('/api/v1/units').set(auth(accessB));
  expect(listB.body.data).toEqual([]);
  expect((await Unit.findById(id))?.name).toBe('Privado');
});

test('rechaza tenant del body, duplicados y datos inválidos', async () => {
  const access = await token('admin-a@example.test', companyA);
  expect((await request(app).post('/api/v1/units').set(auth(access))
    .send({ name: 'Ajeno', code: 'AJENO', symbol: 'a', companyId: companyB })).status).toBe(400);
  expect((await request(app).post('/api/v1/units').set(auth(access))
    .send({ name: 'Código inválido', code: 'MALO!', symbol: 'm' })).status).toBe(400);
  expect((await request(app).post('/api/v1/units').set(auth(access))
    .send({ name: 'Uno', code: 'ABC', symbol: 'a' })).status).toBe(201);
  expect((await request(app).post('/api/v1/units').set(auth(access))
    .send({ name: 'Dos', code: 'abc', symbol: 'b' })).status).toBe(409);
  expect((await request(app).get('/api/v1/units?limit=1000').set(auth(access))).status).toBe(400);
});

test('protege operaciones por autenticación y permiso', async () => {
  expect((await request(app).get('/api/v1/units')).status).toBe(401);
  const access = await token('viewer@example.test', companyA);
  expect((await request(app).get('/api/v1/units').set(auth(access))).status).toBe(200);
  expect((await request(app).post('/api/v1/units').set(auth(access))
    .send({ name: 'Sin permiso' })).status).toBe(403);
  expect(await mongoose.connection.collection('units').countDocuments()).toBe(0);
});
test('rechaza nombre activo duplicado y desactivar una unidad con productos activos', async () => {
  const access = await token('admin-a@example.test', companyA);
  const created = await request(app).post('/api/v1/units').set(auth(access))
    .send({ name: 'Pieza', code: 'PZA', symbol: 'pza' });
  expect(created.status).toBe(201);
  expect((await request(app).post('/api/v1/units').set(auth(access))
    .send({ name: 'pieza', code: 'PZA2', symbol: 'pz' })).status).toBe(409);
  const id = created.body.data.id as string;
  await mongoose.connection.collection('products').insertOne({
    companyId: new mongoose.Types.ObjectId(companyA),
    unitId: new mongoose.Types.ObjectId(id),
    name: 'Producto histórico', status: 'active',
  });
  expect((await request(app).patch('/api/v1/units/' + id + '/deactivate')
    .set(auth(access))).status).toBe(409);
  expect((await Unit.findById(id))?.status).toBe('active');
});
