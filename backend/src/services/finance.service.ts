import mongoose from 'mongoose';
import { AccountsReceivable, IAccountsReceivableDocument } from '../models/accountsReceivable.model';
import { AccountsPayable, IAccountsPayableDocument } from '../models/accountsPayable.model';
import { Payment, IPaymentDocument } from '../models/payment.model';
import { financeRepository } from '../repositories/finance.repository';
import { ISaleDocument } from '../models/sale.model';
import { IPurchaseDocument } from '../models/purchase.model';
import { auditedMutation } from './auditedMutation';
import { Actor } from './user.service';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';

type Account = IAccountsReceivableDocument | IAccountsPayableDocument;
const accountJson = (account: Account) => ({
  id: String(account._id), branchId: String(account.branchId),
  sourceId: 'saleId' in account ? String(account.saleId) : String(account.purchaseId),
  partyId: 'customerId' in account ? String(account.customerId) : String(account.supplierId),
  amountMinor: account.amountMinor, paidMinor: account.paidMinor,
  balanceMinor: account.balanceMinor, status: account.status,
  createdAt: account.createdAt, updatedAt: account.updatedAt,
});
const paymentJson = (payment: IPaymentDocument) => ({
  id: String(payment._id), accountType: payment.accountType,
  accountId: String(payment.accountId), branchId: String(payment.branchId),
  amountMinor: payment.amountMinor, paymentMethod: payment.paymentMethod,
  reference: payment.reference, notes: payment.notes,
  createdAt: payment.createdAt,
});
function paging(query: Record<string, unknown>) {
  try { return pagination(query); } catch { throw new ValidationError('Paginación inválida'); }
}
function validId(value: string) {
  if (!isValidObjectId(value)) throw new ValidationError('ID inválido');
}
function kind(value: unknown): 'receivable' | 'payable' {
  if (value !== 'receivable' && value !== 'payable')
    throw new ValidationError('Tipo de cuenta inválido');
  return value;
}

/** Called inside the same order/stock transaction; zero value orders have no debt. */
export async function createSaleReceivable(sale: ISaleDocument, session: mongoose.ClientSession) {
  if (sale.totalMinor <= 0) return;
  await AccountsReceivable.create([{ companyId: sale.companyId, branchId: sale.branchId,
    saleId: sale._id, customerId: sale.customerId, amountMinor: sale.totalMinor,
    paidMinor: 0, balanceMinor: sale.totalMinor, status: 'pending' }], { session });
}
export async function createPurchasePayable(purchase: IPurchaseDocument,
  session: mongoose.ClientSession) {
  if (purchase.totalMinor <= 0) return;
  await AccountsPayable.create([{ companyId: purchase.companyId, branchId: purchase.branchId,
    purchaseId: purchase._id, supplierId: purchase.supplierId,
    amountMinor: purchase.totalMinor, paidMinor: 0, balanceMinor: purchase.totalMinor,
    status: 'pending' }], { session });
}
/** A paid or partially paid order requires a separate refund/reconciliation workflow. */
export async function cancelSaleReceivable(companyId: string, saleId: string,
  session: mongoose.ClientSession) {
  const account = await financeRepository.saleAccount(companyId, saleId, session);
  if (!account) throw new ConflictError('Cuenta por cobrar faltante; requiere conciliación');
  if (account.paidMinor !== 0 || account.status !== 'pending')
    throw new ConflictError('La venta tiene pagos; requiere devolución antes de cancelar');
  account.balanceMinor = 0; account.status = 'cancelled';
  await account.save({ session });
}
export async function cancelPurchasePayable(companyId: string, purchaseId: string,
  session: mongoose.ClientSession) {
  const account = await financeRepository.purchaseAccount(companyId, purchaseId, session);
  if (!account) throw new ConflictError('Cuenta por pagar faltante; requiere conciliación');
  if (account.paidMinor !== 0 || account.status !== 'pending')
    throw new ConflictError('La compra tiene pagos; requiere reembolso antes de cancelar');
  account.balanceMinor = 0; account.status = 'cancelled';
  await account.save({ session });
}

export const financeService = {
  async listAccounts(actor: Actor, rawKind: string, query: Record<string, unknown>) {
    const accountKind = kind(rawKind);
    const { page, limit, skip } = paging(query);
    const status = query.status === undefined ? undefined : String(query.status);
    if (status && !['pending', 'partial', 'paid', 'cancelled'].includes(status))
      throw new ValidationError('Estado inválido');
    const { data, total } = await financeRepository.listAccounts(accountKind,
      actor.companyId, status, skip, limit);
    return { data: data.map(accountJson),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },
  async getAccount(actor: Actor, rawKind: string, id: string) {
    const accountKind = kind(rawKind); validId(id);
    const account = accountKind === 'receivable'
      ? await financeRepository.receivable(actor.companyId, id)
      : await financeRepository.payable(actor.companyId, id);
    if (!account) throw new NotFoundError('Cuenta');
    return accountJson(account);
  },
  async listPayments(actor: Actor, query: Record<string, unknown>) {
    const { page, limit, skip } = paging(query);
    const accountType = query.accountType === undefined ? undefined : kind(query.accountType);
    const accountId = query.accountId === undefined ? undefined : String(query.accountId);
    if (accountId) validId(accountId);
    const { data, total } = await financeRepository.listPayments(actor.companyId,
      skip, limit, accountType, accountId);
    return { data: data.map(paymentJson),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },
  async recordPayment(actor: Actor, body: unknown, ip: string, device: string) {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new ValidationError('Pago inválido');
    const input = body as Record<string, unknown>;
    if (Object.keys(input).some((key) => !['accountType', 'accountId', 'amountMinor',
      'paymentMethod', 'reference', 'notes'].includes(key)))
      throw new ValidationError('Campos de pago no permitidos');
    const accountType = kind(input.accountType);
    const accountId = String(input.accountId || ''); validId(accountId);
    if (!Number.isSafeInteger(input.amountMinor) || Number(input.amountMinor) <= 0)
      throw new ValidationError('Monto inválido');
    if (typeof input.paymentMethod !== 'string' || !input.paymentMethod.trim() ||
      input.paymentMethod.length > 60 ||
      (input.reference !== undefined && (typeof input.reference !== 'string' ||
        input.reference.length > 120)) ||
      (input.notes !== undefined && (typeof input.notes !== 'string' ||
        input.notes.length > 500)))
      throw new ValidationError('Datos de pago inválidos');
    const paymentMethod = input.paymentMethod.trim();
    return auditedMutation(async (session) => {
      const account = accountType === 'receivable'
        ? await financeRepository.receivable(actor.companyId, accountId, session)
        : await financeRepository.payable(actor.companyId, accountId, session);
      if (!account) throw new NotFoundError('Cuenta');
      const amountMinor = input.amountMinor as number;
      if (account.status === 'cancelled' || account.status === 'paid' ||
        amountMinor > account.balanceMinor)
        throw new ConflictError('El pago excede el saldo o la cuenta está cerrada');
      account.paidMinor += amountMinor;
      account.balanceMinor -= amountMinor;
      account.status = account.balanceMinor === 0 ? 'paid' : 'partial';
      await account.save({ session });
      const payment = (await Payment.create([{ companyId: actor.companyId,
        branchId: account.branchId, accountType, accountId,
        amountMinor, paymentMethod,
        reference: typeof input.reference === 'string' ? input.reference.trim() : undefined,
        notes: typeof input.notes === 'string' ? input.notes.trim() : undefined,
        createdBy: actor.userId }], { session }))[0];
      return paymentJson(payment);
    }, (payment) => ({ userId: actor.userId, companyId: actor.companyId,
      module: 'finances', action: 'pay', entity: 'payment', entityId: payment.id,
      newValue: { accountType: payment.accountType, accountId: payment.accountId,
        amountMinor: payment.amountMinor }, ip, device }));
  },
};
