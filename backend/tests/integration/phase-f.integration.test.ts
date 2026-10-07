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
import { SystemSetting } from '../../src/models/systemSetting.model';
import { Notification } from '../../src/models/notification.model';
import { AuditLog } from '../../src/models/auditLog.model';
import { migrateSettingIndex } from '../../src/utils/migrate-setting-index';

const app = createApp();
const password = 'TestPassword123!';
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
let mongo: MongoMemoryReplSet;
let companyA: string, companyB: string, userA: string;
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });
async function token(email: string, companyId: string) {
  const response = await request(app).post('/api/v1/auth/login').send({ email, companyId, password });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}
beforeAll(async () => {
  Object.assign(config, { nodeEnv: 'test', bcryptRounds: 10,
    jwtSecret: 'test-access-secret-independent-32-characters',
    jwtRefreshSecret: 'test-refresh-secret-independent-32-characters', rateLimitMax: 10000 });
  mongo = await MongoMemoryReplSet.create({ binary: { version: '7.0.24', downloadDir: cache },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  config.mongodbUri = mongo.getUri(); config.mongodbDbName = 'erp_phase_f_test';
  await connectDatabase();
  await Promise.all([Company.init(), Role.init(), User.init(), Session.init(),
    SystemSetting.init(), Notification.init(), AuditLog.init()]);
}, 120000);
afterAll(async () => { await disconnectDatabase(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Company.deleteMany({}), Role.deleteMany({}), User.deleteMany({}),
    Session.deleteMany({}), SystemSetting.deleteMany({}), Notification.deleteMany({}), AuditLog.deleteMany({})]);
  const [a, b] = await Promise.all([
    Company.create({ name: 'Empresa A', legalName: 'A', taxId: 'A-PHASEF', email: 'a@example.test', country: 'MX' }),
    Company.create({ name: 'Empresa B', legalName: 'B', taxId: 'B-PHASEF', email: 'b@example.test', country: 'MX' }),
  ]);
  companyA = String(a._id); companyB = String(b._id);
  const [adminA, adminB, viewerRole] = await Promise.all([
    Role.create({ companyId: companyA, name: 'Admin', permissions: ['settings.view', 'settings.edit', 'notifications.view', 'notifications.read'] }),
    Role.create({ companyId: companyB, name: 'Admin', permissions: ['settings.view', 'settings.edit', 'notifications.view', 'notifications.read'] }),
    Role.create({ companyId: companyA, name: 'Viewer', permissions: ['settings.view', 'notifications.view'] }),
  ]);
  const [user, other, viewer] = await Promise.all([
    User.create({ companyId: companyA, roleId: adminA._id, email: 'a@example.test', name: 'Admin A', passwordHash: password }),
    User.create({ companyId: companyB, roleId: adminB._id, email: 'b@example.test', name: 'Admin B', passwordHash: password }),
    User.create({ companyId: companyA, roleId: viewerRole._id, email: 'viewer@example.test', name: 'Viewer', passwordHash: password }),
  ]);
  userA = String(user._id);
  await Notification.create([
    { companyId: companyA, userId: userA, title: 'Aviso propio', message: 'Texto QA', type: 'info' },
    { companyId: companyA, userId: String(viewer._id), title: 'Aviso de otro usuario', message: 'Privado', type: 'warning' },
    { companyId: companyB, userId: String(other._id), title: 'Aviso de otra empresa', message: 'Privado', type: 'info' },
  ]);
});

test('ajustes guardan preferencias permitidas por empresa y auditan cambios', async () => {
  const access = await token('a@example.test', companyA);
  const other = await token('b@example.test', companyB);
  expect((await request(app).get('/api/v1/settings').set(auth(access))).body.data)
    .toMatchObject({ locale: 'es-MX', timeZone: 'America/Mexico_City' });
  const updated = await request(app).patch('/api/v1/settings').set(auth(access))
    .send({ locale: 'en-US', dateFormat: 'yyyy-MM-dd' });
  expect(updated.status).toBe(200);
  expect(updated.body.data).toMatchObject({ locale: 'en-US', dateFormat: 'yyyy-MM-dd' });
  expect((await request(app).get('/api/v1/settings').set(auth(other))).body.data.locale).toBe('es-MX');
  expect(await AuditLog.countDocuments({ companyId: companyA, module: 'settings' })).toBe(1);
  expect((await request(app).patch('/api/v1/settings').set(auth(access)).send({ currency: 'USD' })).status).toBe(400);
  expect((await request(app).patch('/api/v1/settings').set(auth(access)).send({ timeZone: 'Mars/Olympus' })).status).toBe(400);
});

test('notificaciones solo se listan y leen por su propietario', async () => {
  const access = await token('a@example.test', companyA);
  const list = await request(app).get('/api/v1/notifications').set(auth(access));
  expect(list.status).toBe(200); expect(list.body.data).toHaveLength(1); expect(list.body.unread).toBe(1);
  const id = list.body.data[0].id as string;
  expect((await request(app).patch(`/api/v1/notifications/${id}/read`).set(auth(access))).body.data.read).toBe(true);
  const viewer = await token('viewer@example.test', companyA);
  const theirId = String((await Notification.findOne({ userId: { $ne: userA }, companyId: companyA }))!._id);
  expect((await request(app).patch(`/api/v1/notifications/${theirId}/read`).set(auth(access))).status).toBe(404);
  expect((await request(app).get('/api/v1/notifications').set(auth(viewer))).body.data).toHaveLength(1);
  expect((await request(app).patch('/api/v1/notifications/read-all').set(auth(viewer))).status).toBe(403);
  expect(await AuditLog.countDocuments({ companyId: companyA, module: 'notifications' })).toBe(1);
});

test('migración de índice de ajustes bloquea documentos legacy sin tenant', async () => {
  await SystemSetting.collection.insertOne({ key: 'legacy', value: 'old', type: 'string', isSystem: true });
  const dry = await migrateSettingIndex();
  expect(dry.unscoped).toBe(1);
  await expect(migrateSettingIndex(true)).rejects.toThrow('Revisa ajustes sin empresa');
});
