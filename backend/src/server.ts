import { validateConfig } from './config/env';
import { appConfig } from './config/appConfig';
import { createApp } from './app';
import { errorLogFields, logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

async function startServer(): Promise<void> {
  let startupStage = 'configuration';
  try {
    validateConfig();
    logger.info('Startup configuration: PASS');
    startupStage = 'mongodb';
    await connectDatabase();
    startupStage = 'express';
    const app = createApp();
    logger.info('Express initialization: PASS');
    startupStage = 'listen';
    const server = app.listen(appConfig.port, () =>
      logger.info('Listening on PORT: PASS', {
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
      } catch (error) {
        logger.error('Error durante cierre', errorLogFields(error));
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
      logger.error('Uncaught exception', errorLogFields(error));
      void shutdown(1);
    });
    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled rejection', errorLogFields(error));
      void shutdown(1);
    });
    server.on('error', (error) => {
      logger.error('No se pudo abrir el puerto', errorLogFields(error));
      void shutdown(1);
    });
  } catch (error) {
    logger.error('Error al iniciar servidor', { stage: startupStage, ...errorLogFields(error) });
    await disconnectDatabase().catch(() => undefined);
    process.exit(1);
  }
}
void startServer();
