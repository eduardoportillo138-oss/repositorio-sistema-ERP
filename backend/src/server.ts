// ============================================
// Servidor Principal
// ============================================

import { validateConfig } from './config/env';
import { appConfig } from './config/appConfig';
import { createApp } from './app';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

const startServer = async (): Promise<void> => {
  try {
    validateConfig();
    // Conectar a MongoDB
    await connectDatabase();

    // Crear aplicación Express
    const app = createApp();

    // Iniciar servidor
    const server = app.listen(appConfig.port, () => {
      logger.info(`ERP Backend corriendo en puerto ${appConfig.port}`, {
        environment: appConfig.nodeEnv,
        apiVersion: appConfig.apiVersion,
      });
    });

    const shutdown = async () => {
      logger.info('Cerrando servidor...');
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await disconnectDatabase();
      process.exit(0);
    };
    process.once('SIGTERM', () => { void shutdown(); });
    process.once('SIGINT', () => { void shutdown(); });

    // Manejo de errores no capturados
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
