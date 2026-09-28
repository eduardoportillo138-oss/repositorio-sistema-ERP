// Disposable local QA server. Never uses the configured Atlas URI or production data.
const path = require('node:path');
const crypto = require('node:crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.JWT_REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
process.env.RATE_LIMIT_MAX = '10000';
const { config } = require('../dist/config/env');
const { connectDatabase, disconnectDatabase } = require('../dist/config/database');
const { createApp } = require('../dist/app');
const { Company } = require('../dist/models/company.model');
const { Role } = require('../dist/models/role.model');
const { User } = require('../dist/models/user.model');
const { PERMISSIONS } = require('../../packages/types/dist');
let mongo, http;
(async () => {
  mongo = await MongoMemoryServer.create({
    binary: {
      version: '7.0.24',
      downloadDir: path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server'),
    },
    instance: { ip: '127.0.0.1' },
  });
  Object.assign(config, {
    mongodbUri: mongo.getUri(),
    mongodbDbName: 'erp_disposable_e2e',
    bcryptRounds: 10,
  });
  await connectDatabase();
  await Promise.all([Company.init(), Role.init(), User.init()]);
  const company = await Company.create({
    name: 'Empresa de prueba A',
    legalName: 'QA A',
    taxId: 'QA-A',
    email: 'qa@example.test',
    country: 'MX',
  });
  const role = await Role.create({
    name: 'Administrador QA',
    companyId: company._id,
    permissions: PERMISSIONS.filter((permission) => !permission.startsWith('platform.')),
  });
  await User.create({
    name: 'QA Admin A',
    email: 'qa@example.test',
    passwordHash: 'E2ETestPassword123!',
    companyId: company._id,
    roleId: role._id,
  });
  http = createApp().listen(3081, '127.0.0.1', () =>
    console.info('API QA temporal lista en puerto 3081; datos de prueba.'),
  );
})().catch((error) => {
  console.error('QA server failed:', error.name);
  process.exit(1);
});
async function stop() {
  if (http) await new Promise((resolve) => http.close(resolve));
  await disconnectDatabase();
  if (mongo) await mongo.stop();
  process.exit(0);
}
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
