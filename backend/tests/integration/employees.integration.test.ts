import path from 'node:path';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../../src/app';
import { config } from '../../src/config/env';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { Company } from '../../src/models/company.model';
import { Branch } from '../../src/models/branch.model';
import { Role } from '../../src/models/role.model';
import { User } from '../../src/models/user.model';
import { Session } from '../../src/models/session.model';
import { Employee } from '../../src/models/employee.model';
import { AuditLog } from '../../src/models/auditLog.model';

const app = createApp();
const password = 'TestPassword123!';
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
let mongo: MongoMemoryReplSet;
let companyA: string, companyB: string, branchA: string, branchB: string;
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });
const input = () => ({ employeeNumber: 'EMP-001', name: 'Persona QA',
  email: 'persona@example.test', phone: '5551234567', position: 'Analista',
  department: 'Operaciones', hireDate: '2026-10-01', branchId: branchA });
async function token(email: string, companyId: string) {
  const response = await request(app).post('/api/v1/auth/login')
    .send({ email, companyId, password });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}
beforeAll(async () => {
  Object.assign(config, { nodeEnv: 'test', bcryptRounds: 10,
    jwtSecret: 'test-access-secret-independent-32-characters',
    jwtRefreshSecret: 'test-refresh-secret-independent-32-characters', rateLimitMax: 10000 });
  mongo = await MongoMemoryReplSet.create({ binary: { version: '7.0.24', downloadDir: cache },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  config.mongodbUri = mongo.getUri(); config.mongodbDbName = 'erp_employees_test';
  await connectDatabase();
  await Promise.all([Company.init(), Branch.init(), Role.init(), User.init(),
    Session.init(), Employee.init(), AuditLog.init()]);
}, 120000);
afterAll(async () => { await disconnectDatabase(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Company.deleteMany({}), Branch.deleteMany({}), Role.deleteMany({}),
    User.deleteMany({}), Session.deleteMany({}), Employee.deleteMany({}), AuditLog.deleteMany({})]);
  const a = await Company.create({ name: 'Empresa A', legalName: 'A', taxId: 'A-TEST',
    email: 'a@example.test', country: 'MX' });
  const b = await Company.create({ name: 'Empresa B', legalName: 'B', taxId: 'B-TEST',
    email: 'b@example.test', country: 'MX' });
  companyA = String(a._id); companyB = String(b._id);
  branchA = String((await Branch.create({ companyId: companyA, name: 'A', code: 'A',
    address: 'A', city: 'CDMX', country: 'MX' }))._id);
  branchB = String((await Branch.create({ companyId: companyB, name: 'B', code: 'B',
    address: 'B', city: 'CDMX', country: 'MX' }))._id);
  const permissions = ['hr.view', 'hr.create', 'hr.edit', 'hr.disable'];
  const ra = await Role.create({ companyId: companyA, name: 'Admin', permissions });
  const rb = await Role.create({ companyId: companyB, name: 'Admin', permissions });
  const rv = await Role.create({ companyId: companyA, name: 'Viewer',
    permissions: ['hr.view'] });
  await User.create({ companyId: companyA, roleId: ra._id, email: 'a@example.test',
    name: 'Admin A', passwordHash: password });
  await User.create({ companyId: companyB, roleId: rb._id, email: 'b@example.test',
    name: 'Admin B', passwordHash: password });
  await User.create({ companyId: companyA, roleId: rv._id, email: 'viewer@example.test',
    name: 'Viewer', passwordHash: password });
});

test('empleado: crear, buscar, editar, consultar, desactivar y auditar', async () => {
  const access = await token('a@example.test', companyA);
  const created = await request(app).post('/api/v1/hr').set(auth(access)).send(input());
  expect(created.status).toBe(201);
  expect(created.body.data).toMatchObject({ employeeNumber: 'EMP-001',
    name: 'Persona QA', status: 'active', branchId: branchA });
  const id = created.body.data.id as string;
  const list = await request(app).get('/api/v1/hr?search=EMP-001&limit=1').set(auth(access));
  expect(list.body.pagination).toEqual({ page: 1, limit: 1, total: 1, pages: 1 });
  expect((await request(app).get('/api/v1/hr/' + id).set(auth(access))).body.data.id).toBe(id);
  const edited = await request(app).put('/api/v1/hr/' + id).set(auth(access))
    .send({ position: 'Gerente', hireDate: '2026-10-02' });
  expect(edited.status).toBe(200);
  expect(edited.body.data).toMatchObject({ position: 'Gerente',
    hireDate: '2026-10-02T00:00:00.000Z' });
  expect((await request(app).patch('/api/v1/hr/' + id + '/deactivate')
    .set(auth(access))).body.data.status).toBe('inactive');
  expect((await request(app).put('/api/v1/hr/' + id).set(auth(access))
    .send({ name: 'Intruso' })).status).toBe(409);
  expect(await AuditLog.countDocuments({ companyId: companyA, module: 'hr' })).toBe(3);
});
test('empleados aíslan empresa y sucursal y evitan números duplicados', async () => {
  const a = await token('a@example.test', companyA);
  const b = await token('b@example.test', companyB);
  expect((await request(app).post('/api/v1/hr').set(auth(a))
    .send({ ...input(), branchId: branchB })).status).toBe(400);
  expect((await request(app).post('/api/v1/hr').set(auth(a))
    .send({ ...input(), companyId: companyB })).status).toBe(400);
  const created = await request(app).post('/api/v1/hr').set(auth(a)).send(input());
  const id = created.body.data.id as string;
  expect((await request(app).post('/api/v1/hr').set(auth(a))
    .send({ ...input(), email: 'otra@example.test' })).status).toBe(409);
  expect((await request(app).get('/api/v1/hr/' + id).set(auth(b))).status).toBe(404);
  expect((await request(app).put('/api/v1/hr/' + id).set(auth(b))
    .send({ name: 'Ajeno' })).status).toBe(404);
  expect((await request(app).get('/api/v1/hr').set(auth(b))).body.data).toEqual([]);
});
test('empleados validan entrada, paginación y permisos', async () => {
  expect((await request(app).get('/api/v1/hr')).status).toBe(401);
  const viewer = await token('viewer@example.test', companyA);
  expect((await request(app).get('/api/v1/hr').set(auth(viewer))).status).toBe(200);
  expect((await request(app).post('/api/v1/hr').set(auth(viewer)).send(input())).status).toBe(403);
  const a = await token('a@example.test', companyA);
  expect((await request(app).post('/api/v1/hr').set(auth(a))
    .send({ ...input(), hireDate: '2026-02-31' })).status).toBe(400);
  expect((await request(app).post('/api/v1/hr').set(auth(a))
    .send({ ...input(), email: 'bad' })).status).toBe(400);
  expect((await request(app).get('/api/v1/hr?limit=101').set(auth(a))).status).toBe(400);
  expect((await request(app).get('/api/v1/hr/invalid').set(auth(a))).status).toBe(400);
});
