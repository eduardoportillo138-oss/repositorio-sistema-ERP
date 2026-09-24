// ============================================
// Configuración de Base de Datos
// ============================================

import mongoose from 'mongoose';
import { config } from '../../packages/config/src';

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    console.log('[DB] Conexión ya existente reutilizada');
    return;
  }

  try {
    const uri = config.mongodbUri;
    if (!uri) {
      throw new Error('MONGODB_URI no está configurada en las variables de entorno');
    }

    await mongoose.connect(uri, {
      dbName: config.mongodbDbName,
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    });

    isConnected = true;
    console.log('[DB] Conexión a MongoDB Atlas exitosa');
  } catch (error: any) {
    console.error('[DB] Error de conexión a MongoDB:', error.message);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('[DB] Conexión a MongoDB cerrada');
  } catch (error: any) {
    console.error('[DB] Error al cerrar conexión:', error.message);
    throw error;
  }
}

export function getConnectionState(): string {
  return mongoose.connection.readyState.toString();
}

// Estados: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
