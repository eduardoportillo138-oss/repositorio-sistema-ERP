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
import { Customer } from '../../src/models/customer.model';
import { Lead } from '../../src/models/lead.model';
import { Opportunity } from '../../src/models/opportunity.model';
import { AuditLog } from '../../src/models/auditLog.model';

const app = createApp();
const password = 'TestPassword123!';
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
let mongo: MongoMemoryReplSet;
let companyA: string, companyB: string, userB: string, customerA: string, customerB: string;
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });
const leadInput = () => ({ name: 'Contacto QA', source: 'web',
  email: 'contacto@example.test', phone: '5551234567' });
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
  config.mongodbUri = mongo.getUri(); config.mongodbDbName = 'erp_crm_test';
  await connectDatabase();
  await Promise.all([Company.init(), Role.init(), User.init(), Session.init(),
    Customer.init(), Lead.init(), Opportunity.init(), AuditLog.init()]);
}, 120000);
afterAll(async () => { await disconnectDatabase(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Company.deleteMany({}), Role.deleteMany({}), User.deleteMany({}),
    Session.deleteMany({}), Customer.deleteMany({}), Lead.deleteMany({}),
    Opportunity.deleteMany({}), AuditLog.deleteMany({})]);
  const a = await Company.create({ name: 'Empresa A', legalName: 'A', taxId: 'A-TEST',
    email: 'a@example.test', country: 'MX' });
  const b = await Company.create({ name: 'Empresa B', legalName: 'B', taxId: 'B-TEST',
    email: 'b@example.test', country: 'MX' });
  companyA = String(a._id); companyB = String(b._id);
  const permissions = ['crm.view', 'crm.create', 'crm.edit', 'crm.disable'];
  const ra = await Role.create({ companyId: companyA, name: 'Admin', permissions });
  const rb = await Role.create({ companyId: companyB, name: 'Admin', permissions });
  const rv = await Role.create({ companyId: companyA, name: 'Viewer',
    permissions: ['crm.view'] });
  await User.create({ companyId: companyA, roleId: ra._id, email: 'a@example.test',
    name: 'Admin A', passwordHash: password });
  userB = String((await User.create({ companyId: companyB, roleId: rb._id,
    email: 'b@example.test', name: 'Admin B', passwordHash: password }))._id);
  await User.create({ companyId: companyA, roleId: rv._id, email: 'viewer@example.test',
    name: 'Viewer', passwordHash: password });
  customerA = String((await Customer.create({ companyId: companyA,
    name: 'Cliente A' }))._id);
  customerB = String((await Customer.create({ companyId: companyB,
    name: 'Cliente B' }))._id);
});
test('lead: CRUD, búsqueda, calificación, desactivación y auditoría', async () => {
  const access = await token('a@example.test', companyA);
  const created = await request(app).post('/api/v1/crm/leads').set(auth(access)).send(leadInput());
  expect(created.status).toBe(201);
  const id = created.body.data.id as string;
  expect(created.body.data).toMatchObject({ status: 'new', name: 'Contacto QA' });
  expect((await request(app).get('/api/v1/crm/leads?search=Contacto&limit=1')
    .set(auth(access))).body.pagination.total).toBe(1);
  expect((await request(app).get('/api/v1/crm/leads/' + id)
    .set(auth(access))).body.data.id).toBe(id);
  expect((await request(app).put('/api/v1/crm/leads/' + id).set(auth(access))
    .send({ companyName: 'Empresa Prospecto' })).body.data.companyName).toBe('Empresa Prospecto');
  expect((await request(app).patch('/api/v1/crm/leads/' + id + '/qualify')
    .set(auth(access))).body.data.status).toBe('qualified');
  expect((await request(app).patch('/api/v1/crm/leads/' + id + '/deactivate')
    .set(auth(access))).body.data.status).toBe('inactive');
  expect((await request(app).put('/api/v1/crm/leads/' + id).set(auth(access))
    .send({ name: 'No permitido' })).status).toBe(409);
  expect(await AuditLog.countDocuments({ companyId: companyA, module: 'crm' })).toBe(4);
});
test('oportunidad: referencia, monto entero, etapas y cierre inmutable', async () => {
  const access = await token('a@example.test', companyA);
  const lead = await request(app).post('/api/v1/crm/leads').set(auth(access)).send(leadInput());
  const leadId = lead.body.data.id as string;
  const created = await request(app).post('/api/v1/crm/opportunities').set(auth(access))
    .send({ leadId, title: 'Negocio QA', amountMinor: 125000,
      expectedCloseDate: '2026-12-31' });
  expect(created.status).toBe(201);
  const id = created.body.data.id as string;
  expect(created.body.data).toMatchObject({ stage: 'prospecting', amountMinor: 125000 });
  expect((await request(app).patch('/api/v1/crm/leads/' + leadId + '/deactivate')
    .set(auth(access))).status).toBe(409);
  expect((await request(app).get('/api/v1/crm/opportunities?search=Negocio')
    .set(auth(access))).body.pagination.total).toBe(1);
  expect((await request(app).get('/api/v1/crm/opportunities/' + id)
    .set(auth(access))).body.data.id).toBe(id);
  expect((await request(app).put('/api/v1/crm/opportunities/' + id)
    .set(auth(access)).send({ amountMinor: 150000 })).body.data.amountMinor).toBe(150000);
  expect((await request(app).patch('/api/v1/crm/opportunities/' + id + '/stage')
    .set(auth(access)).send({ stage: 'won' })).status).toBe(409);
  for (const stage of ['proposal', 'negotiation', 'won'])
    expect((await request(app).patch('/api/v1/crm/opportunities/' + id + '/stage')
      .set(auth(access)).send({ stage })).body.data.stage).toBe(stage);
  expect((await request(app).put('/api/v1/crm/opportunities/' + id)
    .set(auth(access)).send({ title: 'No permitido' })).status).toBe(409);
  expect((await request(app).patch('/api/v1/crm/opportunities/' + id + '/cancel')
    .set(auth(access))).status).toBe(409);
  expect((await Opportunity.findById(id))?.stage).toBe('won');
});
test('CRM aísla tenants, valida referencias y respeta permisos', async () => {
  expect((await request(app).get('/api/v1/crm/leads')).status).toBe(401);
  const a = await token('a@example.test', companyA);
  const b = await token('b@example.test', companyB);
  const viewer = await token('viewer@example.test', companyA);
  expect((await request(app).post('/api/v1/crm/leads').set(auth(viewer))
    .send(leadInput())).status).toBe(403);
  expect((await request(app).post('/api/v1/crm/leads').set(auth(a))
    .send({ ...leadInput(), assignedTo: userB })).status).toBe(400);
  expect((await request(app).post('/api/v1/crm/leads').set(auth(a))
    .send({ ...leadInput(), companyId: companyB })).status).toBe(400);
  const lead = await request(app).post('/api/v1/crm/leads').set(auth(a)).send(leadInput());
  const leadId = lead.body.data.id as string;
  expect((await request(app).post('/api/v1/crm/leads').set(auth(a))
    .send(leadInput())).status).toBe(409);
  expect((await request(app).get('/api/v1/crm/leads/' + leadId).set(auth(b))).status).toBe(404);
  expect((await request(app).post('/api/v1/crm/opportunities').set(auth(a))
    .send({ customerId: customerB, title: 'Ajeno', amountMinor: 100 })).status).toBe(400);
  expect((await request(app).post('/api/v1/crm/opportunities').set(auth(a))
    .send({ leadId, customerId: customerA, title: 'Dos fuentes', amountMinor: 100 })).status).toBe(400);
  expect((await request(app).post('/api/v1/crm/opportunities').set(auth(a))
    .send({ customerId: customerA, title: 'Decimal', amountMinor: 1.5 })).status).toBe(400);
  const own = await request(app).post('/api/v1/crm/opportunities').set(auth(a))
    .send({ customerId: customerA, title: 'Cliente QA', amountMinor: 100 });
  expect(own.status).toBe(201);
  expect((await request(app).get('/api/v1/crm/opportunities/' + own.body.data.id)
    .set(auth(b))).status).toBe(404);
  expect((await request(app).get('/api/v1/crm/leads?limit=101').set(auth(a))).status).toBe(400);
  expect((await request(app).post('/api/v1/crm/opportunities').set(auth(viewer))
    .send({ customerId: customerA, title: 'Sin permiso', amountMinor: 100 })).status).toBe(403);
});
