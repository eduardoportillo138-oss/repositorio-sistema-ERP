import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testConnection(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI no está definida.');
  }

  try {
    console.log('Probando conexión con MongoDB Atlas...');
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB_NAME || 'erp_dev',
      serverSelectionTimeoutMS: 5000,
    });

    if (!mongoose.connection.db) {
      throw new Error('La conexión no obtuvo una instancia de base de datos.');
    }

    await mongoose.connection.db.admin().ping();
    console.log('Ping a MongoDB Atlas exitoso.');
  } catch (error) {
    console.error('La prueba de MongoDB Atlas falló.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void testConnection();