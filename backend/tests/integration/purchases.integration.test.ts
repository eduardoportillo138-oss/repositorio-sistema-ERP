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
import { Branch } from '../../src/models/branch.model';
import { Warehouse } from '../../src/models/warehouse.model';
import { Product } from '../../src/models/product.model';
import { Supplier } from '../../src/models/supplier.model';
import { Purchase } from '../../src/models/purchase.model';
import { AccountsPayable } from '../../src/models/accountsPayable.model';
import { Payment } from '../../src/models/payment.model';
import { InventoryMovement } from '../../src/models/inventoryMovement.model';
import { AuditLog } from '../../src/models/auditLog.model';

const app = createApp();
const password = 'TestPassword123!';
let mongo: MongoMemoryReplSet;
let companyA: string, companyB: string, warehouseA: string, warehouseB: string;
let supplierA: string, supplierB: string, productA: string;
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
const permissions = ['purchases.view', 'purchases.create', 'purchases.edit',
  'purchases.confirm', 'purchases.cancel', 'inventory.view', 'inventory.adjust',
  'finances.view', 'finances.create'];
const auth = (value: string) => ({ Authorization: 'Bearer ' + value });
async function token(email: string, companyId: string) {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password, companyId });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}
const draft = () => ({ supplierId: supplierA, warehouseId: warehouseA,
  items: [{ productId: productA, quantityMilli: 2000, unitCostMinor: 900 }] });

beforeAll(async () => {
  Object.assign(config, { nodeEnv: 'test', bcryptRounds: 10,
    jwtSecret: 'test-access-secret-independent-32-characters',
    jwtRefreshSecret: 'test-refresh-secret-independent-32-characters', rateLimitMax: 10000 });
  mongo = await MongoMemoryReplSet.create({ binary: { version: '7.0.24', downloadDir: cache },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  config.mongodbUri = mongo.getUri(); config.mongodbDbName = 'erp_purchases_test';
  await connectDatabase();
  await Promise.all([Company.init(), Role.init(), User.init(), Session.init(), Branch.init(),
    Warehouse.init(), Product.init(), Supplier.init(), Purchase.init(),
    AccountsPayable.init(), Payment.init(),
    InventoryMovement.init(), AuditLog.init()]);
}, 120000);
afterAll(async () => { await disconnectDatabase(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Company.deleteMany({}), Role.deleteMany({}), User.deleteMany({}),
    Session.deleteMany({}), Branch.deleteMany({}), Warehouse.deleteMany({}),
    Product.deleteMany({}), Supplier.deleteMany({}), Purchase.deleteMany({}),
    AccountsPayable.deleteMany({}), Payment.deleteMany({}),
    InventoryMovement.deleteMany({}), AuditLog.deleteMany({})]);
  const a = await Company.create({ name: 'Empresa A', legalName: 'A', taxId: 'A-TEST',
    email: 'a@example.test', country: 'MX' });
  const b = await Company.create({ name: 'Empresa B', legalName: 'B', taxId: 'B-TEST',
    email: 'b@example.test', country: 'MX' });
  companyA = String(a._id); companyB = String(b._id);
  const ba = await Branch.create({ companyId: companyA, name: 'Sucursal A', code: 'A',
    address: 'A', city: 'CDMX', country: 'MX' });
  const bb = await Branch.create({ companyId: companyB, name: 'Sucursal B', code: 'B',
    address: 'B', city: 'CDMX', country: 'MX' });
  const wa = await Warehouse.create({ companyId: companyA, branchId: ba._id,
    name: 'Almacén A', code: 'A' });
  const wb = await Warehouse.create({ companyId: companyB, branchId: bb._id,
    name: 'Almacén B', code: 'B' });
  warehouseA = String(wa._id); warehouseB = String(wb._id);
  supplierA = String((await Supplier.create({ companyId: companyA, name: 'Proveedor A' }))._id);
  supplierB = String((await Supplier.create({ companyId: companyB, name: 'Proveedor B' }))._id);
  productA = String((await Product.create({ companyId: companyA, code: 'P1',
    name: 'Producto A', categoryId: new mongoose.Types.ObjectId(),
    unitId: new mongoose.Types.ObjectId(), priceMinor: 1250,
    taxRateBps: 1600 }))._id);
  const ra = await Role.create({ companyId: companyA, name: 'Admin', permissions });
  const rb = await Role.create({ companyId: companyB, name: 'Admin', permissions });
  const rv = await Role.create({ companyId: companyA, name: 'Viewer',
    permissions: ['purchases.view'] });
  await User.create({ companyId: companyA, roleId: ra._id, email: 'a@example.test',
    name: 'Admin A', passwordHash: password });
  await User.create({ companyId: companyB, roleId: rb._id, email: 'b@example.test',
    name: 'Admin B', passwordHash: password });
  await User.create({ companyId: companyA, roleId: rv._id, email: 'viewer@example.test',
    name: 'Viewer', passwordHash: password });
});

test('borrador, costo negociado, recepción y cancelación atómica', async () => {
  const access = await token('a@example.test', companyA);
  const created = await request(app).post('/api/v1/purchases').set(auth(access)).send(draft());
  expect(created.status).toBe(201);
  expect(created.body.data).toMatchObject({ status: 'draft', subtotalMinor: 1800,
    taxMinor: 288, totalMinor: 2088 });
  const id = created.body.data.id as string;
  expect((await request(app).put('/api/v1/purchases/' + id).set(auth(access))
    .send({ notes: 'Entrega QA' })).body.data.notes).toBe('Entrega QA');
  const confirmed = await request(app).patch('/api/v1/purchases/' + id + '/confirm')
    .set(auth(access));
  expect(confirmed.status).toBe(200);
  expect(confirmed.body.data.status).toBe('received');
  expect((await AccountsPayable.findOne({ purchaseId: id, companyId: companyA }))?.balanceMinor).toBe(2088);
  expect((await request(app).get('/api/v1/inventory/product/' + productA)
    .set(auth(access))).body.data.quantityMilli).toBe(2000);
  expect((await request(app).put('/api/v1/purchases/' + id).set(auth(access))
    .send({ notes: 'No editable' })).status).toBe(409);
  const cancelled = await request(app).patch('/api/v1/purchases/' + id + '/cancel')
    .set(auth(access));
  expect(cancelled.status).toBe(200);
  expect(cancelled.body.data.status).toBe('cancelled');
  expect((await AccountsPayable.findOne({ purchaseId: id, companyId: companyA }))?.status).toBe('cancelled');
  expect((await request(app).get('/api/v1/inventory/product/' + productA)
    .set(auth(access))).body.data.quantityMilli).toBe(0);
  expect(await InventoryMovement.countDocuments({ referenceType: 'purchase', referenceId: id })).toBe(2);
  expect(await AuditLog.countDocuments({ companyId: companyA, module: 'purchases' })).toBe(4);
});
test('no revierte una compra recibida si su stock ya fue consumido', async () => {
  const access = await token('a@example.test', companyA);
  const created = await request(app).post('/api/v1/purchases').set(auth(access)).send(draft());
  const id = created.body.data.id as string;
  expect((await request(app).patch('/api/v1/purchases/' + id + '/confirm')
    .set(auth(access))).status).toBe(200);
  expect((await request(app).post('/api/v1/inventory/adjustments').set(auth(access))
    .send({ productId: productA, warehouseId: warehouseA, direction: 'out',
      quantityMilli: 1500, reason: 'Consumo' })).status).toBe(201);
  expect((await request(app).patch('/api/v1/purchases/' + id + '/cancel')
    .set(auth(access))).status).toBe(409);
  expect((await Purchase.findById(id))?.status).toBe('received');
  expect(await InventoryMovement.countDocuments({ referenceType: 'purchase', referenceId: id })).toBe(1);
});
test('cuenta por pagar se paga en centavos y bloquea cancelación de compra', async () => {
  const access = await token('a@example.test', companyA);
  const outsider = await token('b@example.test', companyB);
  const created = await request(app).post('/api/v1/purchases').set(auth(access)).send(draft());
  const id = created.body.data.id as string;
  expect((await request(app).patch('/api/v1/purchases/' + id + '/confirm')
    .set(auth(access))).status).toBe(200);
  const list = await request(app).get('/api/v1/finance/payables').set(auth(access));
  expect(list.body.pagination.total).toBe(1);
  const accountId = list.body.data[0].id as string;
  expect(list.body.data[0]).toMatchObject({ sourceId: id, amountMinor: 2088,
    balanceMinor: 2088, status: 'pending' });
  expect((await request(app).get('/api/v1/finance/payables/' + accountId)
    .set(auth(outsider))).status).toBe(404);
  const paid = await request(app).post('/api/v1/finance/payments').set(auth(access))
    .send({ accountType: 'payable', accountId, amountMinor: 88,
      paymentMethod: 'transferencia' });
  expect(paid.status).toBe(201);
  expect((await AccountsPayable.findById(accountId)))
    .toMatchObject({ paidMinor: 88, balanceMinor: 2000, status: 'partial' });
  expect((await request(app).patch('/api/v1/purchases/' + id + '/cancel')
    .set(auth(access))).status).toBe(409);
  expect((await Purchase.findById(id))?.status).toBe('received');
  expect(await InventoryMovement.countDocuments({ referenceType: 'purchase', referenceId: id })).toBe(1);
});
test('tenant, validación de importes, búsqueda y RBAC', async () => {
  expect((await request(app).get('/api/v1/purchases')).status).toBe(401);
  const accessA = await token('a@example.test', companyA);
  const accessB = await token('b@example.test', companyB);
  const viewer = await token('viewer@example.test', companyA);
  expect((await request(app).post('/api/v1/purchases').set(auth(viewer)).send(draft())).status).toBe(403);
  expect((await request(app).post('/api/v1/purchases').set(auth(accessA))
    .send({ ...draft(), supplierId: supplierB })).status).toBe(400);
  expect((await request(app).post('/api/v1/purchases').set(auth(accessA))
    .send({ ...draft(), warehouseId: warehouseB })).status).toBe(400);
  expect((await request(app).post('/api/v1/purchases').set(auth(accessA))
    .send({ ...draft(), totalMinor: 1 })).status).toBe(400);
  expect((await request(app).post('/api/v1/purchases').set(auth(accessA))
    .send({ ...draft(), items: [{ productId: productA, quantityMilli: 1000,
      unitCostMinor: 1.5 }] })).status).toBe(400);
  const created = await request(app).post('/api/v1/purchases').set(auth(accessA)).send(draft());
  const id = created.body.data.id as string;
  expect((await request(app).get('/api/v1/purchases/' + id).set(auth(accessB))).status).toBe(404);
  expect((await request(app).get('/api/v1/purchases?search=Proveedor&limit=1')
    .set(auth(accessA))).body.pagination.total).toBe(1);
});
