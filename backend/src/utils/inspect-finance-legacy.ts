import { connectDatabase, disconnectDatabase } from '../config/database';
import { validateConfig } from '../config/env';
import { AccountsReceivable } from '../models/accountsReceivable.model';
import { AccountsPayable } from '../models/accountsPayable.model';
import { Payment } from '../models/payment.model';

/** Read-only gate before enabling the new minor-unit finance workflow in an existing database. */
export async function inspectFinanceLegacy() {
  const [receivables, payables, payments] = await Promise.all([
    AccountsReceivable.collection.countDocuments({ $or: [
      { companyId: { $exists: false } }, { amountMinor: { $exists: false } },
      { saleId: { $exists: false } },
    ] }),
    AccountsPayable.collection.countDocuments({ $or: [
      { companyId: { $exists: false } }, { amountMinor: { $exists: false } },
      { purchaseId: { $exists: false } },
    ] }),
    Payment.collection.countDocuments({ $or: [
      { companyId: { $exists: false } }, { amountMinor: { $exists: false } },
      { accountId: { $exists: false } },
    ] }),
  ]);
  return { legacyReceivables: receivables, legacyPayables: payables,
    legacyPayments: payments, safeToEnable: receivables + payables + payments === 0 };
}

if (require.main === module) {
  (async () => {
    if (process.argv.length !== 2) throw new Error('Uso: inspect-finance-legacy');
    validateConfig();
    await connectDatabase();
    try { console.log(JSON.stringify(await inspectFinanceLegacy(), null, 2)); }
    finally { await disconnectDatabase(); }
  })().catch((error: Error) => {
    console.error('Inspección financiera fallida', { name: error.name });
    process.exitCode = 1;
  });
}
