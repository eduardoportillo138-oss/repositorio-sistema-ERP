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
import { Product } from '../../src/models/product.model';
import { Warehouse } from '../../src/models/warehouse.model';
import { Branch } from '../../src/models/branch.model';
import { InventoryMovement } from '../../src/models/inventoryMovement.model';
import { AuditLog } from '../../src/models/auditLog.model';

const app = createApp();
const password = 'TestPassword123!';
let mongo: MongoMemoryReplSet;
let companyA: string;
let companyB: string;
let productA: string;
let warehouseA: string;
let warehouseA2: string;
let warehouseB: string;
const cache = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
const permissions = ['inventory.view', 'inventory.adjust', 'inventory.transfer'];
const auth = (value: string) => ({ Authorization: 'Bearer ' + value });
async function token(email: string, companyId: string) {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password, companyId });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}
const initial = () => ({ productId: productA, warehouseId: warehouseA,
  direction: 'initial', quantityMilli: 10250, reason: 'Conteo inicial' });

beforeAll(async () => {
  Object.assign(config, { nodeEnv: 'test', bcryptRounds: 10,
    jwtSecret: 'test-access-secret-independent-32-characters',
    jwtRefreshSecret: 'test-refresh-secret-independent-32-characters',
    rateLimitMax: 10000 });
  mongo = await MongoMemoryReplSet.create({
    binary: { version: '7.0.24', downloadDir: cache },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
  });
  config.mongodbUri = mongo.getUri(); config.mongodbDbName = 'erp_inventory_test';
  await connectDatabase();
  await Promise.all([Company.init(), Role.init(), User.init(), Session.init(),
    Product.init(), Warehouse.init(), Branch.init(), InventoryMovement.init(), AuditLog.init()]);
}, 120000);
afterAll(async () => { await disconnectDatabase(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Company.deleteMany({}), Role.deleteMany({}), User.deleteMany({}),
    Session.deleteMany({}), Product.deleteMany({}), Warehouse.deleteMany({}),
    Branch.deleteMany({}), InventoryMovement.deleteMany({}), AuditLog.deleteMany({})]);
  const a = await Company.create({ name: 'Empresa A', legalName: 'A', taxId: 'A-TEST',
    email: 'a@example.test', country: 'MX' });
  const b = await Company.create({ name: 'Empresa B', legalName: 'B', taxId: 'B-TEST',
    email: 'b@example.test', country: 'MX' });
  companyA = String(a._id); companyB = String(b._id);
  const branchA = await Branch.create({ companyId: companyA, name: 'Principal A', code: 'A',
    address: 'Calle A', city: 'CDMX', country: 'MX' });
  const branchB = await Branch.create({ companyId: companyB, name: 'Principal B', code: 'B',
    address: 'Calle B', city: 'CDMX', country: 'MX' });
  const [wa, wa2, wb] = await Warehouse.create([
    { companyId: companyA, branchId: branchA._id, name: 'Almacén A', code: 'A1' },
    { companyId: companyA, branchId: branchA._id, name: 'Almacén A2', code: 'A2' },
    { companyId: companyB, branchId: branchB._id, name: 'Almacén B', code: 'B1' },
  ]);
  warehouseA = String(wa._id); warehouseA2 = String(wa2._id); warehouseB = String(wb._id);
  const product = await Product.create({ companyId: companyA, code: 'P-1', name: 'Producto',
    categoryId: new mongoose.Types.ObjectId(), unitId: new mongoose.Types.ObjectId(),
    priceMinor: 1000, stockMinimum: 2 });
  productA = String(product._id);
  const ra = await Role.create({ name: 'Admin', companyId: companyA, permissions });
  const rb = await Role.create({ name: 'Admin', companyId: companyB, permissions });
  const rv = await Role.create({ name: 'Viewer', companyId: companyA,
    permissions: ['inventory.view'] });
  await User.create({ email: 'admin-a@example.test', name: 'Admin A', companyId: companyA,
    roleId: ra._id, passwordHash: password });
  await User.create({ email: 'admin-b@example.test', name: 'Admin B', companyId: companyB,
    roleId: rb._id, passwordHash: password });
  await User.create({ email: 'viewer@example.test', name: 'Viewer', companyId: companyA,
    roleId: rv._id, passwordHash: password });
});

test('ledger de milésimas, ajustes, transferencia atómica, consulta y auditoría', async () => {
  const access = await token('admin-a@example.test', companyA);
  const first = await request(app).post('/api/v1/inventory/adjustments')
    .set(auth(access)).send(initial());
  expect(first.status).toBe(201);
  expect(first.body.data).toMatchObject({ quantityMilli: 10250,
    movement: { type: 'INITIAL', quantityMilli: 10250 } });
  const outgoing = await request(app).post('/api/v1/inventory/adjustments')
    .set(auth(access)).send({ ...initial(), direction: 'out', quantityMilli: 2125 });
  expect(outgoing.status).toBe(201);
  expect(outgoing.body.data.quantityMilli).toBe(8125);
  const transfer = await request(app).post('/api/v1/inventory/transfers')
    .set(auth(access)).send({ productId: productA, fromWarehouseId: warehouseA,
      toWarehouseId: warehouseA2, quantityMilli: 3000, reason: 'Reposición' });
  expect(transfer.status).toBe(201);
  expect(transfer.body.data).toMatchObject({ sourceStockMilli: 5125,
    destinationStockMilli: 3000, outgoing: { type: 'TRANSFER_OUT' },
    incoming: { type: 'TRANSFER_IN' } });
  const stock = await request(app).get('/api/v1/inventory/product/' + productA)
    .set(auth(access));
  expect(stock.body.data.quantityMilli).toBe(8125);
  expect(stock.body.data.warehouses).toHaveLength(2);
  const listed = await request(app).get('/api/v1/inventory?warehouseId=' + warehouseA)
    .set(auth(access));
  expect(listed.body.data[0].quantityMilli).toBe(5125);
  expect(listed.body.pagination.total).toBe(1);
  const movements = await request(app).get('/api/v1/inventory/movements?limit=2')
    .set(auth(access));
  expect(movements.body.pagination).toMatchObject({ total: 4, pages: 2 });
  expect(await AuditLog.countDocuments({ companyId: companyA, module: 'inventory' })).toBe(3);
  expect((await Product.findById(productA))?.stockCurrent).toBeUndefined();
});
test('no permite stock negativo ni movimiento parcial por error', async () => {
  const access = await token('admin-a@example.test', companyA);
  const response = await request(app).post('/api/v1/inventory/transfers').set(auth(access))
    .send({ productId: productA, fromWarehouseId: warehouseA,
      toWarehouseId: warehouseA2, quantityMilli: 1000, reason: 'Sin stock' });
  expect(response.status).toBe(409);
  expect(await InventoryMovement.countDocuments({ companyId: companyA })).toBe(0);
  expect(await AuditLog.countDocuments({ companyId: companyA, module: 'inventory' })).toBe(0);
  expect((await Product.findById(productA))?.stockRevision).toBe(0);
});
test('rechaza referencias de otro tenant, body.companyId y cantidades inválidas', async () => {
  const accessA = await token('admin-a@example.test', companyA);
  const accessB = await token('admin-b@example.test', companyB);
  expect((await request(app).post('/api/v1/inventory/adjustments').set(auth(accessA))
    .send({ ...initial(), warehouseId: warehouseB })).status).toBe(400);
  expect((await request(app).post('/api/v1/inventory/adjustments').set(auth(accessB))
    .send(initial())).status).toBe(404);
  expect((await request(app).post('/api/v1/inventory/adjustments').set(auth(accessA))
    .send({ ...initial(), companyId: companyB })).status).toBe(400);
  expect((await request(app).post('/api/v1/inventory/adjustments').set(auth(accessA))
    .send({ ...initial(), quantityMilli: 1.5 })).status).toBe(400);
  expect((await request(app).post('/api/v1/inventory/transfers').set(auth(accessA))
    .send({ productId: productA, fromWarehouseId: warehouseA,
      toWarehouseId: warehouseB, quantityMilli: 1, reason: 'Ajeno' })).status).toBe(400);
  expect((await request(app).get('/api/v1/inventory/product/' + productA)
    .set(auth(accessB))).status).toBe(404);
  expect((await request(app).get('/api/v1/inventory').set(auth(accessB))).body.data).toEqual([]);
});
test('requiere permisos y bloquea movimientos heredados ambiguos', async () => {
  expect((await request(app).get('/api/v1/inventory')).status).toBe(401);
  const viewer = await token('viewer@example.test', companyA);
  expect((await request(app).get('/api/v1/inventory').set(auth(viewer))).status).toBe(200);
  expect((await request(app).post('/api/v1/inventory/adjustments')
    .set(auth(viewer)).send(initial())).status).toBe(403);
  await InventoryMovement.create({ companyId: companyA, productId: productA,
    warehouseId: warehouseA, type: 'adjustment', quantity: 2,
    createdBy: 'legacy', reason: 'Sin dirección' });
  expect((await request(app).get('/api/v1/inventory/product/' + productA)
    .set(auth(viewer))).status).toBe(409);
  const admin = await token('admin-a@example.test', companyA);
  expect((await request(app).post('/api/v1/inventory/adjustments')
    .set(auth(admin)).send(initial())).status).toBe(409);
});
test('no presenta como cero un stockCurrent heredado que no tiene conciliación', async () => {
  await Product.updateOne({ _id: productA }, { $set: { stockCurrent: 7 } });
  const access = await token('admin-a@example.test', companyA);
  expect((await request(app).get('/api/v1/inventory').set(auth(access))).status).toBe(409);
  expect((await request(app).get('/api/v1/inventory/product/' + productA)
    .set(auth(access))).status).toBe(409);
  expect((await request(app).post('/api/v1/inventory/adjustments')
    .set(auth(access)).send(initial())).status).toBe(409);
  expect(await InventoryMovement.countDocuments()).toBe(0);
});
test('inicial se registra una sola vez y protege contra salidas simultáneas', async () => {
  const access = await token('admin-a@example.test', companyA);
  expect((await request(app).post('/api/v1/inventory/adjustments').set(auth(access))
    .send({ ...initial(), quantityMilli: 1000 })).status).toBe(201);
  expect((await request(app).post('/api/v1/inventory/adjustments').set(auth(access))
    .send(initial())).status).toBe(409);
  const body = { ...initial(), direction: 'out', quantityMilli: 750 };
  const results = await Promise.all([
    request(app).post('/api/v1/inventory/adjustments').set(auth(access)).send(body),
    request(app).post('/api/v1/inventory/adjustments').set(auth(access)).send(body),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
  const stock = await request(app).get('/api/v1/inventory/product/' + productA).set(auth(access));
  expect(stock.body.data.quantityMilli).toBe(250);
});
