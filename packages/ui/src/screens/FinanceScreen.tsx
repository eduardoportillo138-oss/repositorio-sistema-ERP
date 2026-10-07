import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { apiClient, FinanceAccountKind, FinanceAccountResponse,
  PaymentResponse } from '@erp/api-client';
import { useAuth } from '@erp/session';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState } from '../components/DataStates';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { colors } from '../tokens';

type Tab = FinanceAccountKind | 'payments';
const money = (minor: number) => (minor / 100).toFixed(2);
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Operación fallida';
function parseMinor(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function FinanceScreen() {
  const { user } = useAuth();
  const canPay = !!user?.permissions.includes('finances.create');
  const [tab, setTab] = useState<Tab>('receivable');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [status, setStatus] = useState('');
  const [accounts, setAccounts] = useState<FinanceAccountResponse[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<FinanceAccountResponse | null>(null);
  const [accountPayments, setAccountPayments] = useState<PaymentResponse[]>([]);
  const [detailError, setDetailError] = useState('');
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const pending = tab === 'payments' ? apiClient.listPayments({ page, limit: 20 })
      : apiClient.listFinanceAccounts(tab, { page, limit: 20,
        ...(status ? { status: status as FinanceAccountResponse['status'] } : {}) });
    pending.then((result) => {
      if (!active) return;
      if (tab === 'payments') setPayments(result.data as PaymentResponse[]);
      else setAccounts(result.data as FinanceAccountResponse[]);
      setPages(result.pagination.pages);
    }).catch((failure: unknown) => { if (active) setError(messageOf(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, page, status, refresh]);

  const open = async (account: FinanceAccountResponse) => {
    setSelected(account); setPaying(false); setDetailError(''); setAccountPayments([]);
    try {
      const result = await apiClient.listPayments({ accountType: tab as FinanceAccountKind,
        accountId: account.id, limit: 100 });
      setAccountPayments(result.data);
    } catch (failure) { setDetailError(messageOf(failure)); }
  };
  const submit = async () => {
    if (!selected || tab === 'payments') return;
    const amountMinor = parseMinor(amount);
    if (!amountMinor || amountMinor > selected.balanceMinor || !method.trim()) {
      setDetailError('Indica un monto válido dentro del saldo y un método de pago.'); return;
    }
    setSaving(true); setDetailError('');
    try {
      await apiClient.recordPayment({ accountType: tab, accountId: selected.id,
        amountMinor, paymentMethod: method.trim(), reference: reference.trim(), notes: notes.trim() });
      setSelected(null); setPaying(false); setAmount(''); setMethod('');
      setReference(''); setNotes(''); setFeedback('Pago registrado.');
      setRefresh((value) => value + 1);
    } catch (failure) { setDetailError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  return <View style={{ gap: 16 }}>
    <Text accessibilityRole="header" style={{ color: colors.textPrimary,
      fontSize: 30, fontWeight: '700' }}>Finanzas</Text>
    <Text style={{ color: colors.textSecondary }}>Saldos y pagos vinculados a ventas y compras.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {([['receivable', 'Cuentas por cobrar'], ['payable', 'Cuentas por pagar'],
        ['payments', 'Pagos']] as [Tab, string][]).map(([item, label]) =>
        <Button key={item} title={label} variant={tab === item ? 'primary' : 'outline'}
          onPress={() => { setTab(item); setPage(1); setStatus(''); setFeedback(''); }} />)}
    </View>
    {tab !== 'payments' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {['', 'pending', 'partial', 'paid', 'cancelled'].map((item) =>
        <Button key={item} title={item || 'Todos'} variant={status === item ? 'secondary' : 'outline'}
          onPress={() => { setStatus(item); setPage(1); }} />)}
    </View>}
    {feedback ? <Text accessibilityRole="alert" style={{ color: colors.primary }}>{feedback}</Text> : null}
    {error ? <ErrorState message={error} onRetry={() => setRefresh((value) => value + 1)} /> : null}
    {loading ? <Loading /> : tab === 'payments' ? payments.length === 0
      ? <EmptyState title="Sin pagos" message="Los pagos registrados aparecerán aquí." />
      : payments.map((payment) => <Card key={payment.id}><View style={{ gap: 4 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
          {payment.accountType === 'receivable' ? 'Cobro' : 'Pago'} {money(payment.amountMinor)}
        </Text>
        <Text style={{ color: colors.textSecondary }}>{payment.paymentMethod} · {payment.reference || 'Sin referencia'}</Text>
        <Text style={{ color: colors.textSecondary }}>{new Date(payment.createdAt).toLocaleString()}</Text>
      </View></Card>)
      : accounts.length === 0
        ? <EmptyState title="Sin cuentas" message="Las órdenes confirmadas con saldo aparecerán aquí." />
        : accounts.map((account) => <Card key={account.id}><View style={{ gap: 8 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {tab === 'receivable' ? 'Venta' : 'Compra'} {account.sourceId.slice(-8).toUpperCase()}
          </Text>
          <Text style={{ color: colors.textSecondary }}>Estado: {account.status}</Text>
          <Text style={{ color: colors.textPrimary }}>Total {money(account.amountMinor)} ·
            Pagado {money(account.paidMinor)} · Saldo {money(account.balanceMinor)}</Text>
          <Button title="Ver detalle" variant="outline" onPress={() => { void open(account); }} />
        </View></Card>)}
    <Pagination page={page} totalPages={pages} onPageChange={setPage} />
    <Modal visible={!!selected} title="Detalle de cuenta" onClose={() => setSelected(null)}>
      {selected && <View style={{ gap: 12 }}>
        <Text style={{ color: colors.textPrimary }}>Total: {money(selected.amountMinor)} ·
          Pagado: {money(selected.paidMinor)} · Saldo: {money(selected.balanceMinor)}</Text>
        <Text style={{ color: colors.textSecondary }}>Estado: {selected.status}</Text>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Pagos de esta cuenta</Text>
        {accountPayments.length ? accountPayments.map((payment) =>
          <Text key={payment.id} style={{ color: colors.textSecondary }}>
            {money(payment.amountMinor)} · {payment.paymentMethod} · {payment.reference || 'Sin referencia'}
          </Text>) : <Text style={{ color: colors.textSecondary }}>Sin pagos registrados.</Text>}
        {detailError ? <ErrorState message={detailError} /> : null}
        {canPay && selected.balanceMinor > 0 && selected.status !== 'cancelled' &&
          (paying ? <View style={{ gap: 10 }}>
            <Input value={amount} onChangeText={setAmount} placeholder="Monto, ej. 123.45"
              accessibilityLabel="Monto del pago" keyboardType="decimal-pad" />
            <Input value={method} onChangeText={setMethod} placeholder="Método de pago"
              accessibilityLabel="Método de pago" />
            <Input value={reference} onChangeText={setReference} placeholder="Referencia opcional"
              accessibilityLabel="Referencia del pago" />
            <Input value={notes} onChangeText={setNotes} placeholder="Notas opcionales"
              accessibilityLabel="Notas del pago" />
            <Button title="Registrar pago" onPress={() => { void submit(); }} loading={saving} />
          </View> : <Button title="Nuevo pago" onPress={() => setPaying(true)} />)}
      </View>}
    </Modal>
  </View>;
}
