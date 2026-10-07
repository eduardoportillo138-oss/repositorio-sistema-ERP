import { PERMISSIONS, Permission } from '../../../packages/types/dist';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { validateConfig } from '../config/env';
import { Role } from '../models/role.model';
import { User } from '../models/user.model';
import { auditedMutation } from '../services/auditedMutation';
import { AuthorizationError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidObjectId } from './validation';

const grants = PERMISSIONS.filter((permission) =>
  permission.startsWith('categories.') || permission.startsWith('units.') ||
  permission.startsWith('warehouses.') || permission.startsWith('hr.') ||
  permission.startsWith('projects.') || permission.startsWith('crm.') ||
  permission === 'inventory.transfer' ||
  ['sales.confirm', 'sales.cancel', 'purchases.confirm', 'purchases.cancel',
    'finances.view', 'finances.create'].includes(permission));

/** An explicit, idempotent migration for one existing enterprise admin role. */
export async function grantMasterDataPermissions(
  companyId: string, roleId: string, actorId: string, apply = false,
) {
  if (![companyId, roleId, actorId].every(isValidObjectId))
    throw new ValidationError('IDs inválidos');
  const [role, actor] = await Promise.all([
    Role.findOne({ _id: roleId, companyId, status: 'active' }).exec(),
    User.findOne({ _id: actorId, companyId, roleId, status: 'active' }).exec(),
  ]);
  if (!role || !actor) throw new NotFoundError('Rol o administrador');
  if (!role.permissions.includes('roles.manage') ||
    !role.permissions.includes('users.view') ||
    role.permissions.some((permission) => permission.startsWith('platform.'))) {
    throw new AuthorizationError('Se requiere un rol administrador empresarial sin permisos de plataforma');
  }
  const missing = grants.filter((permission) => !role.permissions.includes(permission));
  if (!apply || missing.length === 0)
    return { companyId, roleId, mode: apply ? 'apply' : 'dry-run', missing, applied: [] as Permission[] };
  await auditedMutation(
    async (session) => {
      const current = await Role.findOne({ _id: roleId, companyId, status: 'active' })
        .session(session).exec();
      if (!current) throw new NotFoundError('Rol');
      current.permissions = Array.from(new Set([...current.permissions, ...grants]));
      await current.save({ session });
      return current;
    },
    () => ({
      userId: actorId, companyId, module: 'roles', action: 'grant-master-data-permissions',
      entity: 'role', entityId: roleId,
      newValue: { permissionsGranted: missing }, ip: 'migration',
      device: 'grant-master-data-permissions',
    }),
  );
  return { companyId, roleId, mode: 'apply', missing, applied: missing };
}

if (require.main === module) {
  (async () => {
    const [mode, companyId, roleId, actorId] = process.argv.slice(2);
    if (!['--dry-run', '--apply'].includes(mode) || !companyId || !roleId || !actorId ||
      process.argv.length !== 6) {
      throw new Error('Uso: grant-master-data-permissions --dry-run|--apply COMPANY_ID ROLE_ID ACTOR_ID');
    }
    validateConfig();
    await connectDatabase();
    try {
      const report = await grantMasterDataPermissions(companyId, roleId, actorId, mode === '--apply');
      console.log(JSON.stringify(report, null, 2));
    } finally {
      await disconnectDatabase();
    }
  })().catch((error: Error) => {
    console.error('Migración fallida', { name: error.name });
    process.exitCode = 1;
  });
}
