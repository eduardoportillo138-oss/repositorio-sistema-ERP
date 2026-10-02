import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { config, validateConfig } from '../config/env';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Company } from '../models/company.model';
import { Branch } from '../models/branch.model';
import { Role } from '../models/role.model';
import { User } from '../models/user.model';
import { auditService } from '../services/audit.service';
import { PERMISSIONS } from '../../../packages/types/dist';
import { isValidEmail, isValidPassword } from './validation';

export interface BootstrapInput {
  email: string;
  password: string;
  companyName: string;
  companyTaxId: string;
  companyCountry: string;
  branchName: string;
  branchAddress: string;
  branchCity: string;
}

export function bootstrapInputFromEnv(): BootstrapInput {
  return {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || '',
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD || '',
    companyName: process.env.BOOTSTRAP_COMPANY_NAME?.trim() || '',
    companyTaxId: process.env.BOOTSTRAP_COMPANY_TAX_ID?.trim() || '',
    companyCountry: process.env.BOOTSTRAP_COMPANY_COUNTRY?.trim() || '',
    branchName: process.env.BOOTSTRAP_BRANCH_NAME?.trim() || 'Principal',
    branchAddress: process.env.BOOTSTRAP_BRANCH_ADDRESS?.trim() || '',
    branchCity: process.env.BOOTSTRAP_BRANCH_CITY?.trim() || '',
  };
}

export async function bootstrapAdmin(input: BootstrapInput): Promise<string> {
  if (!isValidEmail(input.email) || !isValidPassword(input.password) || input.password.length < 12)
    throw new Error('BOOTSTRAP_ADMIN_EMAIL o BOOTSTRAP_ADMIN_PASSWORD inválidos');
  if (
    [
      input.companyName,
      input.companyTaxId,
      input.companyCountry,
      input.branchName,
      input.branchAddress,
      input.branchCity,
    ].some((value) => !value.trim())
  )
    throw new Error('Faltan datos obligatorios de empresa o sucursal para bootstrap');

  // Build indexes before entering a transaction; _id makes the marker atomic across workers.
  await Promise.all([Company.init(), Branch.init(), Role.init(), User.init()]);
  if (!(await mongoose.connection.db!.listCollections({ name: 'bootstrapStates' }).hasNext()))
    await mongoose.connection.createCollection('bootstrapStates');
  const markers = mongoose.connection.collection('bootstrapStates');
  const session = await mongoose.startSession();
  try {
    let companyId = '';
    await session.withTransaction(async () => {
      const companies = await Company.countDocuments({}).session(session);
      const branches = await Branch.countDocuments({}).session(session);
      const roles = await Role.countDocuments({}).session(session);
      const users = await User.countDocuments({}).session(session);
      const marker = await markers.findOne({ _id: 'first-admin' as never }, { session });
      if (companies || branches || roles || users || marker)
        throw new Error('Bootstrap rechazado: la instalación Core ya contiene datos');
      await markers.insertOne({ _id: 'first-admin' as never, createdAt: new Date() }, { session });
      const [company] = await Company.create(
        [
          {
            name: input.companyName,
            legalName: input.companyName,
            taxId: input.companyTaxId,
            email: input.email,
            country: input.companyCountry,
            status: 'active',
          },
        ],
        { session },
      );
      companyId = String(company._id);
      const [branch] = await Branch.create(
        [
          {
            companyId: company._id,
            name: input.branchName,
            code: 'HQ',
            address: input.branchAddress,
            city: input.branchCity,
            country: input.companyCountry,
            isMain: true,
            status: 'active',
          },
        ],
        { session },
      );
      const [role] = await Role.create(
        [
          {
            companyId: company._id,
            name: 'admin',
            description: 'Administrador empresarial inicial',
            permissions: PERMISSIONS.filter((permission) => !permission.startsWith('platform.')),
            isSystemRole: true,
            status: 'active',
          },
        ],
        { session },
      );
      const [user] = await User.create(
        [
          {
            email: input.email,
            name: 'Administrador',
            passwordHash: input.password,
            companyId: company._id,
            branchId: branch._id,
            roleId: role._id,
            isPlatformAdmin: false,
            status: 'active',
          },
        ],
        { session },
      );
      await auditService.log(
        {
          eventId: crypto.randomUUID(),
          userId: String(user._id),
          companyId,
          module: 'bootstrap',
          action: 'first-admin',
          entity: 'company',
          entityId: companyId,
          newValue: {
            adminUserId: String(user._id),
            roleId: String(role._id),
            branchId: String(branch._id),
          },
          ip: 'cli',
          device: 'bootstrap-admin',
        },
        session,
      );
    });
    return companyId;
  } finally {
    await session.endSession();
  }
}

if (require.main === module) {
  (async () => {
    validateConfig();
    await connectDatabase();
    try {
      const companyId = await bootstrapAdmin(bootstrapInputFromEnv());
      console.log(`Bootstrap completado para empresa ${companyId}`);
    } finally {
      await disconnectDatabase();
    }
  })().catch((error: Error) => {
    console.error('Bootstrap rechazado o fallido', { name: error.name });
    process.exitCode = 1;
  });
}
