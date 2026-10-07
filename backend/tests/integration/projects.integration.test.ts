import path from 'node:path';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../../src/app';
import { config } from '../../src/config/env';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { Company } from '../../src/models/company.model';
import { Role } from '../../src/models/role.model';
import { User } from '../../src/models/user.model';
import { Session } from '../../src/models/session.model';
import { Project } from '../../src/models/project.model';
import { AuditLog } from '../../src/models/auditLog.model';

const app = createApp();
const password = 'TestPassword123!';
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
let mongo: MongoMemoryReplSet;
let companyA: string, companyB: string, userB: string;
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });
const input = () => ({ code: 'P-001', name: 'Proyecto QA',
  startDate: '2026-10-01', endDate: '2026-12-31', budgetMinor: 250000,
  description: 'Plan de trabajo' });
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
  config.mongodbUri = mongo.getUri(); config.mongodbDbName = 'erp_projects_test';
  await connectDatabase();
  await Promise.all([Company.init(), Role.init(), User.init(), Session.init(),
    Project.init(), AuditLog.init()]);
}, 120000);
afterAll(async () => { await disconnectDatabase(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Company.deleteMany({}), Role.deleteMany({}), User.deleteMany({}),
    Session.deleteMany({}), Project.deleteMany({}), AuditLog.deleteMany({})]);
  const a = await Company.create({ name: 'Empresa A', legalName: 'A', taxId: 'A-TEST',
    email: 'a@example.test', country: 'MX' });
  const b = await Company.create({ name: 'Empresa B', legalName: 'B', taxId: 'B-TEST',
    email: 'b@example.test', country: 'MX' });
  companyA = String(a._id); companyB = String(b._id);
  const permissions = ['projects.view', 'projects.create', 'projects.edit', 'projects.cancel'];
  const ra = await Role.create({ companyId: companyA, name: 'Admin', permissions });
  const rb = await Role.create({ companyId: companyB, name: 'Admin', permissions });
  const rv = await Role.create({ companyId: companyA, name: 'Viewer',
    permissions: ['projects.view'] });
  await User.create({ companyId: companyA, roleId: ra._id, email: 'a@example.test',
    name: 'Admin A', passwordHash: password });
  userB = String((await User.create({ companyId: companyB, roleId: rb._id,
    email: 'b@example.test', name: 'Admin B', passwordHash: password }))._id);
  await User.create({ companyId: companyA, roleId: rv._id, email: 'viewer@example.test',
    name: 'Viewer', passwordHash: password });
});
test('proyecto: borrador, edición, activación, cierre y auditoría', async () => {
  const access = await token('a@example.test', companyA);
  const created = await request(app).post('/api/v1/projects').set(auth(access)).send(input());
  expect(created.status).toBe(201);
  expect(created.body.data).toMatchObject({ code: 'P-001', status: 'planned',
    budgetMinor: 250000 });
  const id = created.body.data.id as string;
  expect((await request(app).get('/api/v1/projects?search=P-001&limit=1')
    .set(auth(access))).body.pagination.total).toBe(1);
  expect((await request(app).get('/api/v1/projects/' + id)
    .set(auth(access))).body.data.id).toBe(id);
  expect((await request(app).put('/api/v1/projects/' + id).set(auth(access))
    .send({ name: 'Proyecto editado' })).body.data.name).toBe('Proyecto editado');
  expect((await request(app).patch('/api/v1/projects/' + id + '/activate')
    .set(auth(access))).body.data.status).toBe('active');
  expect((await request(app).patch('/api/v1/projects/' + id + '/complete')
    .set(auth(access))).body.data.status).toBe('completed');
  expect((await request(app).put('/api/v1/projects/' + id).set(auth(access))
    .send({ name: 'No permitido' })).status).toBe(409);
  expect((await request(app).patch('/api/v1/projects/' + id + '/cancel')
    .set(auth(access))).status).toBe(409);
  expect(await AuditLog.countDocuments({ companyId: companyA,
    module: 'projects' })).toBe(4);
});
test('proyecto: cancelación conserva historial; owner y lectura aíslan tenant', async () => {
  const access = await token('a@example.test', companyA);
  const outsider = await token('b@example.test', companyB);
  expect((await request(app).post('/api/v1/projects').set(auth(access))
    .send({ ...input(), ownerUserId: userB })).status).toBe(400);
  expect((await request(app).post('/api/v1/projects').set(auth(access))
    .send({ ...input(), companyId: companyB })).status).toBe(400);
  const created = await request(app).post('/api/v1/projects').set(auth(access)).send(input());
  const id = created.body.data.id as string;
  expect((await request(app).post('/api/v1/projects').set(auth(access))
    .send(input())).status).toBe(409);
  expect((await request(app).get('/api/v1/projects/' + id)
    .set(auth(outsider))).status).toBe(404);
  expect((await request(app).put('/api/v1/projects/' + id).set(auth(outsider))
    .send({ name: 'Ajeno' })).status).toBe(404);
  expect((await request(app).patch('/api/v1/projects/' + id + '/cancel')
    .set(auth(access))).body.data.status).toBe('cancelled');
  expect((await Project.findById(id))?.status).toBe('cancelled');
});
test('proyectos: autenticación, permisos, dinero y fechas', async () => {
  expect((await request(app).get('/api/v1/projects')).status).toBe(401);
  const viewer = await token('viewer@example.test', companyA);
  expect((await request(app).get('/api/v1/projects').set(auth(viewer))).status).toBe(200);
  expect((await request(app).post('/api/v1/projects').set(auth(viewer))
    .send(input())).status).toBe(403);
  const access = await token('a@example.test', companyA);
  expect((await request(app).post('/api/v1/projects').set(auth(access))
    .send({ ...input(), budgetMinor: 1.5 })).status).toBe(400);
  expect((await request(app).post('/api/v1/projects').set(auth(access))
    .send({ ...input(), endDate: '2026-09-01' })).status).toBe(400);
  expect((await request(app).post('/api/v1/projects').set(auth(access))
    .send({ ...input(), startDate: '2026-02-31' })).status).toBe(400);
  expect((await request(app).get('/api/v1/projects?limit=101').set(auth(access))).status).toBe(400);
});
