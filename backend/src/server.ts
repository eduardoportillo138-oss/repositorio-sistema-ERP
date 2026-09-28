import { validateConfig } from './config/env';
import { appConfig } from './config/appConfig';
import { createApp } from './app';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

async function startServer(): Promise<void> {
  try {
    validateConfig();
    await connectDatabase();
    const server = createApp().listen(appConfig.port, () =>
      logger.info('ERP Backend operativo', {
        port: appConfig.port,
        environment: appConfig.nodeEnv,
      }),
    );
    let closing = false;
    const shutdown = async (exitCode = 0) => {
      if (closing) return;
      closing = true;
      const deadline = setTimeout(() => {
        server.closeAllConnections();
        process.exit(1);
      }, 10000);
      deadline.unref();
      try {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
        await disconnectDatabase();
        clearTimeout(deadline);
        process.exit(exitCode);
      } catch {
        logger.error('Error durante cierre');
        process.exit(1);
      }
    };
    process.once('SIGTERM', () => {
      void shutdown();
    });
    process.once('SIGINT', () => {
      void shutdown();
    });
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { name: error.name });
      void shutdown(1);
    });
    process.on('unhandledRejection', () => {
      logger.error('Unhandled rejection');
      void shutdown(1);
    });
    server.on('error', () => {
      logger.error('No se pudo abrir el puerto');
      void shutdown(1);
    });
  } catch (error) {
    logger.error('Error al iniciar servidor', { name: (error as Error).name });
    await disconnectDatabase().catch(() => undefined);
    process.exit(1);
  }
}
void startServer();
