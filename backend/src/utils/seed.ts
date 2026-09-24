// ============================================
// Seed para Desarrollo
// ============================================

import mongoose from 'mongoose';
import { config } from '../../packages/config/src';
import { Company } from '../models/company.model';
import { Role } from '../models/role.model';
import { User } from '../models/user.model';
import { Branch } from '../models/branch.model';
import { Warehouse } from '../models/warehouse.model';
import { Category } from '../models/category.model';

const ADMIN_EMAIL = 'admin@erp.local';
const ADMIN_PASSWORD = 'Admin123!';

async function seed(): Promise<void> {
  try {
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
      permissions: [
        'users.view', 'users.create', 'users.edit', 'users.delete',
        'companies.view', 'companies.create', 'companies.edit', 'companies.delete',
        'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
        'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
        'products.view', 'products.create', 'products.edit', 'products.delete',
        'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust',
        'sales.view', 'sales.create', 'sales.edit', 'sales.approve',
        'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.approve',
        'finances.view', 'finances.create', 'finances.edit', 'finances.approve',
        'reports.view', 'reports.export',
        'audit.view',
        'settings.view', 'settings.edit',
        'notifications.view', 'notifications.read',
      ],
      isSystemRole: true,
      status: 'active',
    });
    console.log(`[SEED] Rol creado: ${adminRole.name}`);

    // Crear usuario admin
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (!existingAdmin) {
      const bcrypt = await import('bcrypt');
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

      await User.create({
        email: ADMIN_EMAIL,
        name: 'Administrador',
        passwordHash,
        roleId: adminRole._id,
        companyId: company._id,
        branchId: branch._id,
        permissions: adminRole.permissions,
        status: 'active',
      });
      console.log(`[SEED] Usuario admin creado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
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
