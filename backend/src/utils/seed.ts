// ============================================
// Seed para Desarrollo
// ============================================

import mongoose from 'mongoose';
import { config } from '../config/env';
import { Company } from '../models/company.model';
import { Role } from '../models/role.model';
import { User } from '../models/user.model';
import { Branch } from '../models/branch.model';
import { Warehouse } from '../models/warehouse.model';
import { Category } from '../models/category.model';
import { PERMISSIONS } from '../../../packages/types/dist';
import { isValidEmail, isValidPassword } from './validation';

const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

async function seed(): Promise<void> {
  try {
    if (!config.mongodbUri || config.mongodbUri.includes('cluster.example.mongodb.net')) {
      throw new Error('Configure MONGODB_URI de desarrollo antes de ejecutar el seed');
    }
    if (!isValidEmail(adminEmail) || !isValidPassword(adminPassword) || adminPassword.length < 12) {
      throw new Error('Configure SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD válidos (12 caracteres o más)');
    }
    await mongoose.connect(config.mongodbUri, { dbName: config.mongodbDbName });
    console.log('[SEED] Conectado a MongoDB');

    // Crear empresa
    const company = await Company.findOne({ taxId: 'EMP001' }) || await Company.create({
      name: 'ERP Demo Corp',
      legalName: 'ERP Demo Corporation',
      taxId: 'EMP001',
      email: 'admin@erp.local',
      phone: '+1234567890',
      address: '123 Main St',
      city: 'Mexico City',
      country: 'Mexico',
      postalCode: '06600',
      currency: 'MXN',
      timezone: 'America/Mexico_City',
    });
    console.log(`[SEED] Empresa creada: ${company.name}`);

    // Crear sucursal
    const branch = await Branch.findOne({ code: 'HQ', companyId: company._id }) || await Branch.create({
      companyId: company._id,
      name: 'Sucursal Principal',
      code: 'HQ',
      address: '123 Main St',
      city: 'Mexico City',
      country: 'Mexico',
      phone: '+1234567890',
      isMain: true,
    });
    console.log(`[SEED] Sucursal creada: ${branch.name}`);

    // Crear almacén
    const warehouse = await Warehouse.findOne({ code: 'MAIN', companyId: company._id }) || await Warehouse.create({
      companyId: company._id,
      branchId: branch._id,
      name: 'Almacén Principal',
      code: 'MAIN',
      location: '123 Main St',
      capacity: 10000,
      isDefault: true,
    });
    console.log(`[SEED] Almacén creada: ${warehouse.name}`);

    // Crear rol administrador
    const adminRole = await Role.findOne({ name: 'super_admin', companyId: company._id }) || await Role.create({
      companyId: company._id,
      name: 'super_admin',
      description: 'Administrador del sistema',
      permissions: [...PERMISSIONS],
      isSystemRole: true,
      status: 'active',
    });
    console.log(`[SEED] Rol creado: ${adminRole.name}`);

    // Crear usuario admin
    const existingAdmin = await User.findOne({ email: adminEmail, companyId: company._id });
    if (!existingAdmin) {
      await User.create({
        email: adminEmail,
        name: 'Administrador',
        passwordHash: adminPassword,
        roleId: adminRole._id,
        companyId: company._id,
        branchId: branch._id,
        permissions: adminRole.permissions,
        status: 'active',
      });
      console.log('[SEED] Usuario admin creado');
    } else {
      console.log('[SEED] Usuario admin ya existe');
    }

    // Crear categorías base
    const categories = ['Electrónica', 'Oficina', 'Almacén', 'Herramientas', 'Mobiliario'];
    for (const catName of categories) {
      await Category.findOne({ code: catName.toUpperCase(), companyId: company._id }) || await Category.create({
        companyId: company._id,
        name: catName,
        code: catName.toUpperCase(),
        status: 'active',
      });
    }
    console.log(`[SEED] ${categories.length} categorías creadas`);

    console.log('[SEED] ¡Seed completado exitosamente!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('[SEED] Error:', error);
    process.exit(1);
  }
}

seed();
