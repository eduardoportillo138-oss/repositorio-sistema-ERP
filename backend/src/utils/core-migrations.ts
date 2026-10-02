import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { validateConfig } from '../config/env';

type Finding = {
  check: string;
  count: number;
  status: 'SAFE_APPLY' | 'MANUAL_REVIEW_REQUIRED';
  sampleIds?: string[];
};
export type CoreMigrationReport = {
  generatedAt: string;
  mode: 'dry-run' | 'apply';
  findings: Finding[];
  incompatibleIndexes: string[];
  applied?: { userPermissionsUnset: number };
};

async function sample(collection: string, filter: Record<string, unknown>) {
  const docs = await mongoose.connection
    .collection(collection)
    .find(filter, { projection: { _id: 1 } })
    .limit(5)
    .toArray();
  return docs.map((doc) => String(doc._id));
}

async function duplicates(collection: string, keys: Record<string, unknown>) {
  const rows = await mongoose.connection
    .collection(collection)
    .aggregate([
      { $match: { companyId: { $exists: true } } },
      { $group: { _id: keys, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'groups' },
    ])
    .toArray();
  return Number(rows[0]?.groups || 0);
}

export async function inspectCore(): Promise<CoreMigrationReport> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB no conectado');
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name),
  );
  const findings: Finding[] = [];
  for (const [collection, filter, check, status] of [
    ['users', { permissions: { $exists: true } }, 'User.permissions heredado', 'SAFE_APPLY'],
    ['roles', { companyId: { $exists: false } }, 'Roles sin companyId', 'MANUAL_REVIEW_REQUIRED'],
    [
      'branches',
      { companyId: { $exists: false } },
      'Branches sin companyId',
      'MANUAL_REVIEW_REQUIRED',
    ],
  ] as const) {
    const count = await db.collection(collection).countDocuments(filter);
    findings.push({
      check,
      count,
      status,
      sampleIds: count ? await sample(collection, filter) : [],
    });
  }
  for (const [collection, keys, check] of [
    ['users', { companyId: '$companyId', email: '$email' }, 'Email duplicado por empresa'],
    ['roles', { companyId: '$companyId', name: '$name' }, 'Rol duplicado por empresa'],
    ['branches', { companyId: '$companyId', code: '$code' }, 'Sucursal duplicada por empresa'],
  ] as const) {
    findings.push({
      check,
      count: await duplicates(collection, keys),
      status: 'MANUAL_REVIEW_REQUIRED',
    });
  }
  for (const [source, target, localField, check] of [
    ['users', 'roles', 'roleId', 'User.roleId cross-tenant o ausente'],
    ['users', 'branches', 'branchId', 'User.branchId cross-tenant o ausente'],
  ] as const) {
    const pipeline = [
      { $match: { [localField]: { $exists: true }, companyId: { $exists: true } } },
      { $lookup: { from: target, localField, foreignField: '_id', as: 'ref' } },
      { $match: { $expr: { $ne: ['$companyId', { $arrayElemAt: ['$ref.companyId', 0] }] } } },
      { $count: 'count' },
    ];
    const rows = await db.collection(source).aggregate(pipeline).toArray();
    findings.push({ check, count: Number(rows[0]?.count || 0), status: 'MANUAL_REVIEW_REQUIRED' });
  }
  const incompatibleIndexes: string[] = [];
  for (const [collection, field] of [
    ['users', 'email'],
    ['roles', 'name'],
    ['branches', 'code'],
  ] as const) {
    if (!existing.has(collection)) continue;
    const indexes = await db.collection(collection).indexes();
    for (const index of indexes) {
      if (index.unique && Object.keys(index.key).length === 1 && index.key[field] === 1)
        incompatibleIndexes.push(`${collection}.${index.name}`);
    }
  }
  return { generatedAt: new Date().toISOString(), mode: 'dry-run', findings, incompatibleIndexes };
}

export async function migrateCore(apply: boolean): Promise<CoreMigrationReport> {
  const report = await inspectCore();
  if (!apply) return report;
  const result = await mongoose.connection
    .collection('users')
    .updateMany({ permissions: { $exists: true } }, { $unset: { permissions: '' } });
  return { ...report, mode: 'apply', applied: { userPermissionsUnset: result.modifiedCount } };
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !['--dry-run', '--apply'].includes(args[0]))
      throw new Error('Uso: db:core-migrate -- --dry-run | --apply');
    validateConfig();
    await connectDatabase();
    try {
      const before = await inspectCore();
      console.log(JSON.stringify(before, null, 2));
      if (args[0] === '--apply') {
        const applied = await migrateCore(true);
        console.log(
          JSON.stringify({ applied: applied.applied, after: await inspectCore() }, null, 2),
        );
      }
    } finally {
      await disconnectDatabase();
    }
  })().catch((error: Error) => {
    console.error('Migración fallida', { name: error.name });
    process.exitCode = 1;
  });
}
