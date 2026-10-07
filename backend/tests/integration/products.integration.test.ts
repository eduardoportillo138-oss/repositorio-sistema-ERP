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
import { Product } from '../../src/models/product.model';
import { Category } from '../../src/models/category.model';
import { Unit } from '../../src/models/unit.model';
import { AuditLog } from '../../src/models/auditLog.model';
import { migrateProductIndexes } from '../../src/utils/migrate-product-indexes';

const app = createApp();
const password = 'TestPassword123!';
let mongo: MongoMemoryReplSet;
let companyA: string;
let companyB: string;
let categoryA: string;
let categoryB: string;
let unitA: string;
let unitB: string;
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
const permissions = ['products.view', 'products.create', 'products.edit', 'products.disable'];
const auth = (value: string) => ({ Authorization: 'Bearer ' + value });
async function token(email: string, companyId: string) {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password, companyId });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}
const input = () => ({ code: 'SKU-1', name: 'Producto Uno', categoryId: categoryA,
  unitId: unitA, priceMinor: 12345, costMinor: 9801, taxRateBps: 1600,
  stockMinimum: 5 });

beforeAll(async () => {
  Object.assign(config, { nodeEnv: 'test', bcryptRounds: 10,
    jwtSecret: 'test-access-secret-independent-32-characters',
    jwtRefreshSecret: 'test-refresh-secret-independent-32-characters',
    rateLimitMax: 10000 });
  mongo = await MongoMemoryReplSet.create({
    binary: { version: '7.0.24', downloadDir: cache },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
  });
  config.mongodbUri = mongo.getUri();
  config.mongodbDbName = 'erp_products_test';
  await connectDatabase();
  await Promise.all([Company.init(), Role.init(), User.init(), Session.init(),
    Product.init(), Category.init(), Unit.init(), AuditLog.init()]);
}, 120000);
afterAll(async () => { await disconnectDatabase(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Company.deleteMany({}), Role.deleteMany({}), User.deleteMany({}),
    Session.deleteMany({}), Product.deleteMany({}), Category.deleteMany({}),
    Unit.deleteMany({}), AuditLog.deleteMany({})]);
  const a = await Company.create({ name: 'Empresa A', legalName: 'A', taxId: 'A-TEST',
    email: 'a@example.test', country: 'MX' });
  const b = await Company.create({ name: 'Empresa B', legalName: 'B', taxId: 'B-TEST',
    email: 'b@example.test', country: 'MX' });
  companyA = String(a._id); companyB = String(b._id);
  const ca = await Category.create({ companyId: companyA, name: 'Categoría A', code: 'CAT-A' });
  const cb = await Category.create({ companyId: companyB, name: 'Categoría B', code: 'CAT-B' });
  const ua = await Unit.create({ companyId: companyA, name: 'Pieza', code: 'PZA', symbol: 'pza' });
  const ub = await Unit.create({ companyId: companyB, name: 'Pieza B', code: 'PZB', symbol: 'pza' });
  categoryA = String(ca._id); categoryB = String(cb._id);
  unitA = String(ua._id); unitB = String(ub._id);
  const ra = await Role.create({ name: 'Admin', companyId: companyA, permissions });
  const rb = await Role.create({ name: 'Admin', companyId: companyB, permissions });
  const rv = await Role.create({ name: 'Viewer', companyId: companyA,
    permissions: ['products.view'] });
  await User.create({ email: 'admin-a@example.test', name: 'Admin A', companyId: companyA,
    roleId: ra._id, passwordHash: password });
  await User.create({ email: 'admin-b@example.test', name: 'Admin B', companyId: companyB,
    roleId: rb._id, passwordHash: password });
  await User.create({ email: 'viewer@example.test', name: 'Viewer', companyId: companyA,
    roleId: rv._id, passwordHash: password });
});

test('CRUD, dinero en centavos, búsqueda y auditoría', async () => {
  const access = await token('admin-a@example.test', companyA);
  const created = await request(app).post('/api/v1/products').set(auth(access)).send(input());
  expect(created.status).toBe(201);
  expect(created.body.data).toMatchObject({ code: 'SKU-1', priceMinor: 12345,
    costMinor: 9801, taxRateBps: 1600, status: 'active' });
  const id = created.body.data.id as string;
  const stored = await Product.findById(id);
  expect(stored?.stockCurrent).toBeUndefined();
  expect(stored?.unitPrice).toBeUndefined();
  const list = await request(app).get('/api/v1/products?search=Uno&page=1&limit=1')
    .set(auth(access));
  expect(list.body.pagination).toEqual({ page: 1, limit: 1, total: 1, pages: 1 });
  expect(list.body.data[0].id).toBe(id);
  const updated = await request(app).put('/api/v1/products/' + id).set(auth(access))
    .send({ priceMinor: 11001 });
  expect(updated.status).toBe(200);
  expect(updated.body.data.priceMinor).toBe(11001);
  const inactive = await request(app).patch('/api/v1/products/' + id + '/deactivate')
    .set(auth(access));
  expect(inactive.status).toBe(200);
  expect(inactive.body.data.status).toBe('inactive');
  expect((await Product.findById(id))?.isActive).toBe(false);
  expect(await AuditLog.countDocuments({ companyId: companyA, entityId: id })).toBe(3);
});
test('aísla datos entre empresas y valida referencias del mismo tenant', async () => {
  const accessA = await token('admin-a@example.test', companyA);
  const accessB = await token('admin-b@example.test', companyB);
  expect((await request(app).post('/api/v1/products').set(auth(accessA))
    .send({ ...input(), categoryId: categoryB })).status).toBe(400);
  expect((await request(app).post('/api/v1/products').set(auth(accessA))
    .send({ ...input(), unitId: unitB })).status).toBe(400);
  const created = await request(app).post('/api/v1/products').set(auth(accessA)).send(input());
  const id = created.body.data.id as string;
  expect((await request(app).get('/api/v1/products/' + id).set(auth(accessB))).status).toBe(404);
  expect((await request(app).put('/api/v1/products/' + id).set(auth(accessB))
    .send({ name: 'Intruso' })).status).toBe(404);
  expect((await request(app).patch('/api/v1/products/' + id + '/deactivate')
    .set(auth(accessB))).status).toBe(404);
  expect((await request(app).get('/api/v1/products').set(auth(accessB))).body.data).toEqual([]);
});
test('rechaza precio inseguro, tenant del body, duplicados e IDs inválidos', async () => {
  const access = await token('admin-a@example.test', companyA);
  expect((await request(app).post('/api/v1/products').set(auth(access))
    .send({ ...input(), companyId: companyB })).status).toBe(400);
  expect((await request(app).post('/api/v1/products').set(auth(access))
    .send({ ...input(), priceMinor: 10.5 })).status).toBe(400);
  expect((await request(app).post('/api/v1/products').set(auth(access))
    .send({ ...input(), priceMinor: -1 })).status).toBe(400);
  expect((await request(app).post('/api/v1/products').set(auth(access)).send(input())).status).toBe(201);
  expect((await request(app).post('/api/v1/products').set(auth(access))
    .send({ ...input(), code: 'sku-1' })).status).toBe(409);
  expect((await request(app).post('/api/v1/products').set(auth(access))
    .send({ ...input(), code: 'SKU-3', barcode: 'BAR-1' })).status).toBe(201);
  expect((await request(app).post('/api/v1/products').set(auth(access))
    .send({ ...input(), code: 'SKU-4', barcode: 'BAR-1' })).status).toBe(409);
  expect((await request(app).get('/api/v1/products?limit=1000').set(auth(access))).status).toBe(400);
  expect((await request(app).get('/api/v1/products/invalid').set(auth(access))).status).toBe(400);
});
test('requiere autenticación y permisos', async () => {
  expect((await request(app).get('/api/v1/products')).status).toBe(401);
  const access = await token('viewer@example.test', companyA);
  expect((await request(app).get('/api/v1/products').set(auth(access))).status).toBe(200);
  expect((await request(app).post('/api/v1/products').set(auth(access)).send(input())).status).toBe(403);
});
test('migra índices globales heredados de forma explícita e idempotente', async () => {
  await Product.collection.createIndex({ sku: 1 }, { unique: true, name: 'sku_1' });
  await Product.collection.createIndex({ barcode: 1 }, { unique: true, name: 'barcode_1' });
  await Product.collection.createIndex({ sku: 1, companyId: 1 },
    { unique: true, name: 'sku_1_companyId_1' });
  const dryRun = await migrateProductIndexes();
  expect(dryRun.legacyIndexes).toHaveLength(3);
  expect(dryRun.droppedIndexes).toEqual([]);
  const applied = await migrateProductIndexes(true);
  expect(applied.droppedIndexes).toHaveLength(3);
  expect((await migrateProductIndexes(true)).droppedIndexes).toEqual([]);
  const access = await token('admin-a@example.test', companyA);
  expect((await request(app).post('/api/v1/products').set(auth(access)).send(input())).status).toBe(201);
  expect((await request(app).post('/api/v1/products').set(auth(access))
    .send({ ...input(), code: 'SKU-2' })).status).toBe(201);
});
