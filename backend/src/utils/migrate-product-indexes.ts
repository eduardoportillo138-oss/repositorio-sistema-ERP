import { Product } from '../models/product.model';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { validateConfig } from '../config/env';

type Index = { name?: string; key: Record<string, number>; unique?: boolean };
const desired = [
  { field: 'sku', name: 'companyId_1_sku_1' },
  { field: 'barcode', name: 'companyId_1_barcode_1' },
] as const;
function oldUnique(index: Index) {
  if (!index.unique) return false;
  const entries = Object.entries(index.key);
  const global = entries.length === 1 && ['sku', 'barcode'].includes(entries[0]![0]) &&
    entries[0]![1] === 1;
  const reversedTenant = entries.length === 2 && entries[0]![0] === 'sku' &&
    entries[0]![1] === 1 && entries[1]![0] === 'companyId' && entries[1]![1] === 1;
  return global || reversedTenant;
}

/** Review with dry-run, then apply before deploying the tenant-scoped product catalog. */
export async function migrateProductIndexes(apply = false) {
  const collection = Product.collection;
  const indexes = await collection.listIndexes().toArray() as Index[];
  const legacy = indexes.filter(oldUnique).map((index) => index.name!).filter(Boolean);
  const unscoped = await collection.countDocuments({ $or: [
    { companyId: { $exists: false } }, { companyId: null },
  ] });
  const duplicateCounts: Record<string, number> = {};
  for (const { field } of desired) {
    const groups = await collection.aggregate([
      { $match: { [field]: { $type: 'string' } } },
      { $group: { _id: { companyId: '$companyId', value: `$${field}` }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'groups' },
    ]).toArray();
    duplicateCounts[field] = groups[0]?.groups || 0;
  }
  const report = { mode: apply ? 'apply' : 'dry-run', unscoped,
    duplicateCounts, legacyIndexes: legacy, createdIndexes: [] as string[],
    droppedIndexes: [] as string[] };
  if (!apply) return report;
  if (unscoped || Object.values(duplicateCounts).some(Boolean))
    throw new Error('Corrige productos sin empresa o valores duplicados antes de migrar índices');
  for (const { field, name } of desired) {
    await collection.createIndex({ companyId: 1, [field]: 1 },
      { name, unique: true, partialFilterExpression: { [field]: { $type: 'string' } } });
    report.createdIndexes.push(name);
  }
  for (const name of legacy) {
    await collection.dropIndex(name);
    report.droppedIndexes.push(name);
  }
  return report;
}

if (require.main === module) {
  (async () => {
    const mode = process.argv[2];
    if (!['--dry-run', '--apply'].includes(mode) || process.argv.length !== 3)
      throw new Error('Uso: migrate-product-indexes --dry-run|--apply');
    validateConfig();
    await connectDatabase();
    try { console.log(JSON.stringify(await migrateProductIndexes(mode === '--apply'), null, 2)); }
    finally { await disconnectDatabase(); }
  })().catch((error: Error) => {
    console.error('Migración de índices fallida', { name: error.name, message: error.message });
    process.exitCode = 1;
  });
}
