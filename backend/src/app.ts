// ============================================
// Configuración de Express App
// ============================================

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { appConfig } from './config/appConfig';
import { errorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/errorHandler';
import { rateLimiter } from './middlewares/auth';
import { setupRoutes } from './routes';

export function createApp(): express.Application {
  const app = express();

  // Middleware de seguridad
  app.use(helmet());
  app.use(compression());

  // CORS configurado
  const corsOrigin = appConfig.corsOrigin;
  app.use(
    cors({
      origin: Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
  );

  // Rate Limiting
  app.use(rateLimiter);

  // Parseo de JSON
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true }));

  // Headers personalizados
  app.use((req, _res, next) => {
    req.setTimeout(30000);
    next();
  });

  // Routes
  setupRoutes(app);

  // Manejo de errores
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
