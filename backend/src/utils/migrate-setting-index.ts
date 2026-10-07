import { SystemSetting } from '../models/systemSetting.model';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { validateConfig } from '../config/env';

/** Review unscoped legacy settings and duplicates before enabling tenant uniqueness. */
export async function migrateSettingIndex(apply = false) {
  const collection = SystemSetting.collection;
  const unscoped = await collection.countDocuments({ $or: [
    { companyId: { $exists: false } }, { companyId: null },
  ] });
  const duplicates = await collection.aggregate([
    { $match: { companyId: { $type: 'objectId' }, key: { $type: 'string' } } },
    { $group: { _id: { companyId: '$companyId', key: '$key' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }, { $count: 'groups' },
  ]).toArray();
  const report = { mode: apply ? 'apply' : 'dry-run', unscoped,
    duplicateGroups: duplicates[0]?.groups || 0, index: 'companyId_1_key_1_tenant_unique',
    created: false };
  if (!apply) return report;
  if (report.unscoped || report.duplicateGroups)
    throw new Error('Revisa ajustes sin empresa o duplicados antes de crear el índice');
  const existing = await collection.listIndexes().toArray();
  const index = existing.find((candidate) => candidate.name === report.index);
  if (index && (!index.unique || JSON.stringify(index.key) !== JSON.stringify({ companyId: 1, key: 1 })))
    throw new Error('El índice tenant único existente tiene definición inesperada');
  if (!index) {
    await collection.createIndex({ companyId: 1, key: 1 }, {
      name: report.index, unique: true, partialFilterExpression: { companyId: { $exists: true } },
    });
    report.created = true;
  }
  return report;
}

if (require.main === module) {
  (async () => {
    const mode = process.argv[2];
    if (!['--dry-run', '--apply'].includes(mode) || process.argv.length !== 3)
      throw new Error('Uso: migrate-setting-index --dry-run|--apply');
    validateConfig(); await connectDatabase();
    try { console.log(JSON.stringify(await migrateSettingIndex(mode === '--apply'), null, 2)); }
    finally { await disconnectDatabase(); }
  })().catch((error: Error) => {
    console.error('Migración de índice de ajustes fallida', { name: error.name, message: error.message });
    process.exitCode = 1;
  });
}
