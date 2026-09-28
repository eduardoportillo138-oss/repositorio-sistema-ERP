const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server');
(async () => {
  const server = await MongoMemoryServer.create({
    binary: {
      version: '7.0.24',
      downloadDir: path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server'),
    },
    instance: { ip: '127.0.0.1' },
  });
  console.info('MongoDB temporal listo; versión 7.0.24. No se usó Atlas.');
  await server.stop();
})().catch((error) => {
  console.error('MongoDB temporal no disponible:', error.name);
  process.exitCode = 1;
});
