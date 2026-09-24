// ============================================
// Servidor Principal
// ============================================

import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { config } from './config/database';
import { appConfig } from './config/appConfig';
import { createApp } from './app';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

const startServer = async (): Promise<void> => {
  try {
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

    // Manejo de cierre graceful
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM recibido. Cerrando servidor...');
      server.close();
      await disconnectDatabase();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT recibido. Cerrando servidor...');
      server.close();
      await disconnectDatabase();
      process.exit(0);
    });

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
