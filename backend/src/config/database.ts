import mongoose from 'mongoose';
import { config } from './env';
import { errorLogFields, logger } from '../utils/logger';
import { AuditLog } from '../models/auditLog.model';

let eventsRegistered = false;

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (!config.mongodbUri) throw new Error('MONGODB_URI no configurada');
  if (!eventsRegistered) {
    mongoose.connection.on('connected', () => logger.info('MongoDB conectado'));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB desconectado'));
    mongoose.connection.on('error', (error: Error) =>
      logger.error('MongoDB connection error', errorLogFields(error)),
    );
    eventsRegistered = true;
  }
  await mongoose.connect(config.mongodbUri, {
    dbName: config.mongodbDbName,
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    autoIndex: config.nodeEnv !== 'production',
  });
  logger.info('MongoDB connection: PASS');
  // Production disables Mongoose autoIndex; this index is required for audit idempotency.
  try {
    await AuditLog.collection.createIndex(
      { eventId: 1 },
      { unique: true, partialFilterExpression: { eventId: { $type: 'string' } } },
    );
  } catch (error) {
    logger.error('MongoDB initialization: FAIL', errorLogFields(error));
    throw error;
  }
  logger.info('MongoDB initialization: PASS');
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

export function getConnectionState(): string {
  return mongoose.connection.readyState.toString();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
