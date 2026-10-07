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
import { Sale } from '../../src/models/sale.model';
import { AuditLog } from '../../src/models/auditLog.model';
import { Product } from '../../src/models/product.model';
import { InventoryMovement } from '../../src/models/inventoryMovement.model';

const app = createApp();
const password = 'TestPassword123!';
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
let mongo: MongoMemoryReplSet;
let companyA: string, companyB: string;
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
  config.mongodbUri = mongo.getUri(); config.mongodbDbName = 'erp_reports_test';
  await connectDatabase();
  await Promise.all([Company.init(), Role.init(), User.init(), Session.init(), Sale.init(),
    Product.init(), InventoryMovement.init(), AuditLog.init()]);
}, 120000);
afterAll(async () => { await disconnectDatabase(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Company.deleteMany({}), Role.deleteMany({}), User.deleteMany({}),
    Session.deleteMany({}), Sale.deleteMany({}), Product.deleteMany({}),
    InventoryMovement.deleteMany({}), AuditLog.deleteMany({})]);
  const [a, b] = await Promise.all([
    Company.create({ name: 'Empresa A', legalName: 'A', taxId: 'A-REPORT', email: 'a@example.test', country: 'MX' }),
    Company.create({ name: 'Empresa B', legalName: 'B', taxId: 'B-REPORT', email: 'b@example.test', country: 'MX' }),
  ]);
  companyA = String(a._id); companyB = String(b._id);
  const [ra, rb, noReports] = await Promise.all([
    Role.create({ companyId: companyA, name: 'Admin', permissions: ['reports.view'] }),
    Role.create({ companyId: companyB, name: 'Admin', permissions: ['reports.view'] }),
    Role.create({ companyId: companyA, name: 'No reports', permissions: [] }),
  ]);
  await Promise.all([
    User.create({ companyId: companyA, roleId: ra._id, email: 'a@example.test', name: 'Admin A', passwordHash: password }),
    User.create({ companyId: companyB, roleId: rb._id, email: 'b@example.test', name: 'Admin B', passwordHash: password }),
    User.create({ companyId: companyA, roleId: noReports._id, email: 'viewer@example.test', name: 'Viewer', passwordHash: password }),
  ]);
});

test('dashboard y reportes devuelven métricas reales de su empresa', async () => {
  const accessA = await token('a@example.test', companyA);
  const accessB = await token('b@example.test', companyB);
  const recent = new Date();
  const sale = (companyId: string, status: string, totalMinor: number) => ({
    companyId, branchId: new (require('mongoose').Types.ObjectId)(),
    customerId: new (require('mongoose').Types.ObjectId)(), customerName: 'QA',
    warehouseId: new (require('mongoose').Types.ObjectId)(), warehouseName: 'QA',
    folio: `QA-${companyId}-${status}`, status, items: [], subtotalMinor: totalMinor,
    discountMinor: 0, taxMinor: 0, totalMinor,
    createdBy: new (require('mongoose').Types.ObjectId)(), createdAt: recent,
  });
  await Sale.create([sale(companyA, 'confirmed', 12345), sale(companyA, 'cancelled', 90000), sale(companyB, 'confirmed', 80000)]);
  const dashboard = await request(app).get('/api/v1/reports/dashboard').set(auth(accessA));
  expect(dashboard.status).toBe(200);
  expect(dashboard.body.data.metrics.sales).toBe(12345);
  expect(dashboard.body.data.metrics.invoices).toBe(1);
  expect(dashboard.body.data.series.sales).toHaveLength(6);
  const other = await request(app).get('/api/v1/reports/sales').set(auth(accessB));
  expect(other.body.data.totals).toMatchObject({ totalMinor: 80000, count: 1 });
  expect((await request(app).get('/api/v1/reports/finance').set(auth(accessA))).body.data)
    .toMatchObject({ receivables: [], payables: [], unit: 'minor' });
});

test('reportes requieren autenticación, permiso y rango válido', async () => {
  expect((await request(app).get('/api/v1/reports/dashboard')).status).toBe(401);
  const viewer = await token('viewer@example.test', companyA);
  expect((await request(app).get('/api/v1/reports/dashboard').set(auth(viewer))).status).toBe(403);
  const access = await token('a@example.test', companyA);
  expect((await request(app).get('/api/v1/reports/sales?from=fecha').set(auth(access))).status).toBe(400);
  expect((await request(app).get('/api/v1/reports/inventory').set(auth(access))).body.data)
    .toMatchObject({ productCount: 0, lowStockCount: 0 });
  const product = await Product.create({ companyId: companyA, code: 'STOCK-QA', name: 'Stock QA',
    categoryId: new (require('mongoose').Types.ObjectId)(), unitId: new (require('mongoose').Types.ObjectId)(),
    stockMinimum: 3, status: 'active' });
  const movement = (type: string, quantityMilli: number) => ({ companyId: companyA,
    productId: product._id, warehouseId: new (require('mongoose').Types.ObjectId)(),
    type, quantity: quantityMilli / 1000, quantityMilli, reason: 'QA', createdBy: 'qa', status: 'confirmed' });
  await InventoryMovement.create([movement('PURCHASE', 5000), movement('SALE', 3000)]);
  const inventory = await request(app).get('/api/v1/reports/inventory').set(auth(access));
  expect(inventory.body.data).toMatchObject({ productCount: 1, lowStockCount: 1 });
  expect(inventory.body.data.lowStock[0].stockMilli).toBe(2000);
});
