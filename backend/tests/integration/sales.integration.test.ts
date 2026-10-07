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
import { Customer } from '../../src/models/customer.model';
import { Sale } from '../../src/models/sale.model';
import { AccountsReceivable } from '../../src/models/accountsReceivable.model';
import { Payment } from '../../src/models/payment.model';
import { InventoryMovement } from '../../src/models/inventoryMovement.model';
import { AuditLog } from '../../src/models/auditLog.model';

const app = createApp();
const password = 'TestPassword123!';
let mongo: MongoMemoryReplSet;
let companyA: string, companyB: string, warehouseA: string, warehouseB: string;
let customerA: string, customerB: string, productA: string;
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
const permissions = ['sales.view', 'sales.create', 'sales.edit', 'sales.confirm',
  'sales.cancel', 'inventory.view', 'inventory.adjust', 'finances.view', 'finances.create'];
const auth = (value: string) => ({ Authorization: 'Bearer ' + value });
async function token(email: string, companyId: string) {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password, companyId });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}
const draft = () => ({ customerId: customerA, warehouseId: warehouseA,
  items: [{ productId: productA, quantityMilli: 2000 }] });
async function seedStock(access: string, quantityMilli = 2000) {
  const result = await request(app).post('/api/v1/inventory/adjustments').set(auth(access))
    .send({ productId: productA, warehouseId: warehouseA, direction: 'initial',
      quantityMilli, reason: 'Conteo test' });
  expect(result.status).toBe(201);
}

beforeAll(async () => {
  Object.assign(config, { nodeEnv: 'test', bcryptRounds: 10,
    jwtSecret: 'test-access-secret-independent-32-characters',
    jwtRefreshSecret: 'test-refresh-secret-independent-32-characters', rateLimitMax: 10000 });
  mongo = await MongoMemoryReplSet.create({ binary: { version: '7.0.24', downloadDir: cache },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  config.mongodbUri = mongo.getUri(); config.mongodbDbName = 'erp_sales_test';
  await connectDatabase();
  await Promise.all([Company.init(), Role.init(), User.init(), Session.init(), Branch.init(),
    Warehouse.init(), Product.init(), Customer.init(), Sale.init(),
    AccountsReceivable.init(), Payment.init(),
    InventoryMovement.init(), AuditLog.init()]);
}, 120000);
afterAll(async () => { await disconnectDatabase(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Company.deleteMany({}), Role.deleteMany({}), User.deleteMany({}),
    Session.deleteMany({}), Branch.deleteMany({}), Warehouse.deleteMany({}),
    Product.deleteMany({}), Customer.deleteMany({}), Sale.deleteMany({}),
    AccountsReceivable.deleteMany({}), Payment.deleteMany({}),
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
  customerA = String((await Customer.create({ companyId: companyA, name: 'Cliente A' }))._id);
  customerB = String((await Customer.create({ companyId: companyB, name: 'Cliente B' }))._id);
  productA = String((await Product.create({ companyId: companyA, code: 'P1',
    name: 'Producto A', categoryId: new mongoose.Types.ObjectId(),
    unitId: new mongoose.Types.ObjectId(), priceMinor: 1250,
    taxRateBps: 1600 }))._id);
  const ra = await Role.create({ companyId: companyA, name: 'Admin', permissions });
  const rb = await Role.create({ companyId: companyB, name: 'Admin', permissions });
  const rv = await Role.create({ companyId: companyA, name: 'Viewer',
    permissions: ['sales.view'] });
  await User.create({ companyId: companyA, roleId: ra._id, email: 'a@example.test',
    name: 'Admin A', passwordHash: password });
  await User.create({ companyId: companyB, roleId: rb._id, email: 'b@example.test',
    name: 'Admin B', passwordHash: password });
  await User.create({ companyId: companyA, roleId: rv._id, email: 'viewer@example.test',
    name: 'Viewer', passwordHash: password });
});

test('borrador, totales enteros, confirmación, cancelación e inventario', async () => {
  const access = await token('a@example.test', companyA);
  await seedStock(access);
  const created = await request(app).post('/api/v1/sales').set(auth(access)).send(draft());
  expect(created.status).toBe(201);
  expect(created.body.data).toMatchObject({ status: 'draft', subtotalMinor: 2500,
    taxMinor: 400, totalMinor: 2900 });
  const saleId = created.body.data.id as string;
  const edited = await request(app).put('/api/v1/sales/' + saleId).set(auth(access))
    .send({ notes: 'Entrega local' });
  expect(edited.status).toBe(200);
  expect(edited.body.data.notes).toBe('Entrega local');
  const confirmed = await request(app).patch('/api/v1/sales/' + saleId + '/confirm')
    .set(auth(access));
  expect(confirmed.status).toBe(200);
  expect(confirmed.body.data.status).toBe('confirmed');
  expect((await AccountsReceivable.findOne({ saleId, companyId: companyA }))?.balanceMinor).toBe(2900);
  expect((await request(app).get('/api/v1/inventory/product/' + productA)
    .set(auth(access))).body.data.quantityMilli).toBe(0);
  expect((await request(app).put('/api/v1/sales/' + saleId).set(auth(access))
    .send({ notes: 'Intruso' })).status).toBe(409);
  const cancelled = await request(app).patch('/api/v1/sales/' + saleId + '/cancel')
    .set(auth(access));
  expect(cancelled.status).toBe(200);
  expect(cancelled.body.data.status).toBe('cancelled');
  expect((await AccountsReceivable.findOne({ saleId, companyId: companyA }))?.status).toBe('cancelled');
  expect((await request(app).get('/api/v1/inventory/product/' + productA)
    .set(auth(access))).body.data.quantityMilli).toBe(2000);
  expect((await request(app).patch('/api/v1/sales/' + saleId + '/cancel')
    .set(auth(access))).status).toBe(409);
  expect(await AuditLog.countDocuments({ companyId: companyA, module: 'sales' })).toBe(4);
  expect(await InventoryMovement.countDocuments({ companyId: companyA,
    referenceType: 'sale', referenceId: saleId })).toBe(2);
});
test('saldo insuficiente revierte confirmación y movimientos', async () => {
  const access = await token('a@example.test', companyA);
  const created = await request(app).post('/api/v1/sales').set(auth(access)).send(draft());
  const saleId = created.body.data.id as string;
  expect((await request(app).patch('/api/v1/sales/' + saleId + '/confirm')
    .set(auth(access))).status).toBe(409);
  expect((await Sale.findById(saleId))?.status).toBe('draft');
  expect(await InventoryMovement.countDocuments({ referenceType: 'sale' })).toBe(0);
});
test('cuenta por cobrar: pago parcial, total, aislamiento y cancelación protegida', async () => {
  const access = await token('a@example.test', companyA);
  const outsider = await token('b@example.test', companyB);
  const viewer = await token('viewer@example.test', companyA);
  await seedStock(access);
  const created = await request(app).post('/api/v1/sales').set(auth(access)).send(draft());
  const saleId = created.body.data.id as string;
  expect((await request(app).patch('/api/v1/sales/' + saleId + '/confirm')
    .set(auth(access))).status).toBe(200);
  const list = await request(app).get('/api/v1/finance/receivables?limit=1').set(auth(access));
  expect(list.status).toBe(200);
  expect(list.body.pagination.total).toBe(1);
  const accountId = list.body.data[0].id as string;
  expect(list.body.data[0]).toMatchObject({ sourceId: saleId, amountMinor: 2900,
    balanceMinor: 2900, status: 'pending' });
  expect((await request(app).get('/api/v1/finance/receivables/' + accountId)
    .set(auth(outsider))).status).toBe(404);
  expect((await request(app).post('/api/v1/finance/payments').set(auth(outsider))
    .send({ accountType: 'receivable', accountId, amountMinor: 100,
      paymentMethod: 'transferencia' })).status).toBe(404);
  expect((await request(app).post('/api/v1/finance/payments').set(auth(viewer))
    .send({ accountType: 'receivable', accountId, amountMinor: 100,
      paymentMethod: 'transferencia' })).status).toBe(403);
  expect((await request(app).post('/api/v1/finance/payments').set(auth(access))
    .send({ accountType: 'receivable', accountId, amountMinor: 0.5,
      paymentMethod: 'transferencia' })).status).toBe(400);
  const partial = await request(app).post('/api/v1/finance/payments').set(auth(access))
    .send({ accountType: 'receivable', accountId, amountMinor: 900,
      paymentMethod: 'transferencia', reference: 'QA-1' });
  expect(partial.status).toBe(201);
  expect((await AccountsReceivable.findById(accountId)))
    .toMatchObject({ paidMinor: 900, balanceMinor: 2000, status: 'partial' });
  expect((await request(app).patch('/api/v1/sales/' + saleId + '/cancel')
    .set(auth(access))).status).toBe(409);
  expect((await Sale.findById(saleId))?.status).toBe('confirmed');
  expect(await InventoryMovement.countDocuments({ referenceType: 'sale', referenceId: saleId })).toBe(1);
  expect((await request(app).post('/api/v1/finance/payments').set(auth(access))
    .send({ accountType: 'receivable', accountId, amountMinor: 2001,
      paymentMethod: 'efectivo' })).status).toBe(409);
  const full = await request(app).post('/api/v1/finance/payments').set(auth(access))
    .send({ accountType: 'receivable', accountId, amountMinor: 2000,
      paymentMethod: 'efectivo' });
  expect(full.status).toBe(201);
  expect((await AccountsReceivable.findById(accountId)))
    .toMatchObject({ paidMinor: 2900, balanceMinor: 0, status: 'paid' });
  expect((await request(app).get('/api/v1/finance/payments?accountType=receivable&accountId=' + accountId)
    .set(auth(access))).body.pagination.total).toBe(2);
  expect(await AuditLog.countDocuments({ companyId: companyA, module: 'finances',
    action: 'pay' })).toBe(2);
});
test('aísla tenant, referencias ajenas y rechaza totales enviados', async () => {
  const accessA = await token('a@example.test', companyA);
  const accessB = await token('b@example.test', companyB);
  expect((await request(app).post('/api/v1/sales').set(auth(accessA))
    .send({ ...draft(), customerId: customerB })).status).toBe(400);
  expect((await request(app).post('/api/v1/sales').set(auth(accessA))
    .send({ ...draft(), warehouseId: warehouseB })).status).toBe(400);
  expect((await request(app).post('/api/v1/sales').set(auth(accessA))
    .send({ ...draft(), totalMinor: 1 })).status).toBe(400);
  expect((await request(app).post('/api/v1/sales').set(auth(accessA))
    .send({ ...draft(), companyId: companyB })).status).toBe(400);
  const created = await request(app).post('/api/v1/sales').set(auth(accessA)).send(draft());
  const saleId = created.body.data.id as string;
  expect((await request(app).get('/api/v1/sales/' + saleId).set(auth(accessB))).status).toBe(404);
  expect((await request(app).put('/api/v1/sales/' + saleId).set(auth(accessB))
    .send({ notes: 'Ajeno' })).status).toBe(404);
  expect((await request(app).get('/api/v1/sales').set(auth(accessB))).body.data).toEqual([]);
});
test('pagos simultáneos no cobran dos veces el mismo saldo', async () => {
  const access = await token('a@example.test', companyA);
  await seedStock(access);
  const created = await request(app).post('/api/v1/sales').set(auth(access)).send(draft());
  const saleId = created.body.data.id as string;
  expect((await request(app).patch('/api/v1/sales/' + saleId + '/confirm')
    .set(auth(access))).status).toBe(200);
  const account = await AccountsReceivable.findOne({ saleId, companyId: companyA });
  const accountId = String(account!._id);
  const attempts = await Promise.all([1, 2].map(() =>
    request(app).post('/api/v1/finance/payments').set(auth(access))
      .send({ accountType: 'receivable', accountId, amountMinor: 2900,
        paymentMethod: 'efectivo' })));
  expect(attempts.map((result) => result.status).sort()).toEqual([201, 409]);
  expect((await AccountsReceivable.findById(accountId)))
    .toMatchObject({ paidMinor: 2900, balanceMinor: 0, status: 'paid' });
  expect(await Payment.countDocuments({ companyId: companyA, accountId })).toBe(1);
});
test('permisos, búsqueda, paginación y transición inválida', async () => {
  expect((await request(app).get('/api/v1/sales')).status).toBe(401);
  const viewer = await token('viewer@example.test', companyA);
  expect((await request(app).get('/api/v1/sales').set(auth(viewer))).status).toBe(200);
  expect((await request(app).post('/api/v1/sales').set(auth(viewer)).send(draft())).status).toBe(403);
  const access = await token('a@example.test', companyA);
  const created = await request(app).post('/api/v1/sales').set(auth(access)).send(draft());
  const saleId = created.body.data.id as string;
  const list = await request(app).get('/api/v1/sales?search=Cliente&page=1&limit=1')
    .set(auth(access));
  expect(list.body.pagination).toEqual({ page: 1, limit: 1, total: 1, pages: 1 });
  expect((await request(app).patch('/api/v1/sales/' + saleId + '/cancel')
    .set(auth(access))).status).toBe(200);
  expect((await request(app).patch('/api/v1/sales/' + saleId + '/confirm')
    .set(auth(access))).status).toBe(409);
});
test('dos ventas simultáneas no consumen la misma existencia', async () => {
  const access = await token('a@example.test', companyA);
  await seedStock(access, 1000);
  const first = await request(app).post('/api/v1/sales').set(auth(access))
    .send({ ...draft(), items: [{ productId: productA, quantityMilli: 1000 }] });
  const second = await request(app).post('/api/v1/sales').set(auth(access))
    .send({ ...draft(), items: [{ productId: productA, quantityMilli: 1000 }] });
  const results = await Promise.all([first.body.data.id, second.body.data.id].map((id: string) =>
    request(app).patch('/api/v1/sales/' + id + '/confirm').set(auth(access))));
  expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  expect((await request(app).get('/api/v1/inventory/product/' + productA)
    .set(auth(access))).body.data.quantityMilli).toBe(0);
  expect(await InventoryMovement.countDocuments({ companyId: companyA, type: 'SALE' })).toBe(1);
});
