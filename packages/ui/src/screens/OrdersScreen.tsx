import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { apiClient, CustomerResponse, ProductResponse, PurchaseResponse,
  SaleResponse, SupplierResponse, WarehouseResponse, PaginationResponse } from '@erp/api-client';
import { useAuth } from '@erp/session';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState } from '../components/DataStates';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Select } from '../components/Select';
import { colors } from '../tokens';

type Kind = 'sales' | 'purchases';
type Line = { productId: string; name: string; quantityMilli: number;
  unitMinor: number; discountMinor: number; subtotalMinor?: number;
  taxMinor?: number; totalMinor?: number };
type Order = { id: string; folio: string; status: string; counterpartyId: string;
  counterpartyName: string; warehouseId: string; warehouseName: string;
  items: Line[]; subtotalMinor: number; discountMinor: number; taxMinor: number;
  totalMinor: number; notes?: string; createdAt: string };
type Form = { counterpartyId: string; warehouseId: string; items: Line[]; notes: string };
const emptyForm = (): Form => ({ counterpartyId: '', warehouseId: '', items: [], notes: '' });
const money = (minor: number) => (minor / 100).toFixed(2);
const qty = (milli: number) => (milli / 1000).toFixed(3).replace(/\.?0+$/, '');
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Operación fallida';
function parseMinor(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}
function parseMilli(value: string): number | null {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const milli = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  return Number.isSafeInteger(milli) && milli > 0 ? milli : null;
}
function normalize(source: SaleResponse | PurchaseResponse): Order {
  if ('customerId' in source) return {
    id: source.id, folio: source.folio, status: source.status,
    counterpartyId: source.customerId, counterpartyName: source.customerName,
    warehouseId: source.warehouseId, warehouseName: source.warehouseName,
    items: source.items.map((item) => ({ productId: item.productId, name: item.name,
      quantityMilli: item.quantityMilli, unitMinor: item.unitPriceMinor,
      discountMinor: item.discountMinor, subtotalMinor: item.subtotalMinor,
      taxMinor: item.taxMinor, totalMinor: item.totalMinor })),
    subtotalMinor: source.subtotalMinor, discountMinor: source.discountMinor,
    taxMinor: source.taxMinor, totalMinor: source.totalMinor,
    notes: source.notes, createdAt: source.createdAt,
  };
  return { id: source.id, folio: source.folio, status: source.status,
    counterpartyId: source.supplierId, counterpartyName: source.supplierName,
    warehouseId: source.warehouseId, warehouseName: source.warehouseName,
    items: source.items.map((item) => ({ productId: item.productId, name: item.name,
      quantityMilli: item.quantityMilli, unitMinor: item.unitCostMinor,
      discountMinor: item.discountMinor, subtotalMinor: item.subtotalMinor,
      taxMinor: item.taxMinor, totalMinor: item.totalMinor })),
    subtotalMinor: source.subtotalMinor, discountMinor: source.discountMinor,
    taxMinor: source.taxMinor, totalMinor: source.totalMinor,
    notes: source.notes, createdAt: source.createdAt };
}

export function OrdersScreen({ kind }: { kind: Kind }) {
  const isSale = kind === 'sales';
  const title = isSale ? 'Ventas' : 'Compras';
  const counterpartLabel = isSale ? 'Cliente' : 'Proveedor';
  const { user } = useAuth();
  const canCreate = !!user?.permissions.includes(kind + '.create');
  const canEdit = !!user?.permissions.includes(kind + '.edit');
  const canConfirm = !!user?.permissions.includes(kind + '.confirm');
  const canCancel = !!user?.permissions.includes(kind + '.cancel');
  const [rows, setRows] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationResponse>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [mode, setMode] = useState<'detail' | 'create' | 'edit' | null>(null);
  const [action, setAction] = useState<'confirm' | 'cancel' | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [counterparties, setCounterparties] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [counterpartySearch, setCounterpartySearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [lineProductId, setLineProductId] = useState('');
  const [lineQuantity, setLineQuantity] = useState('');
  const [lineCost, setLineCost] = useState('');
  const [lineDiscount, setLineDiscount] = useState('0');

  useEffect(() => {
    let mounted = true;
    setLoading(true); setError('');
    const pending = isSale
      ? apiClient.listSales({ page, limit: 20, search,
        ...(status ? { status: status as SaleResponse['status'] } : {}) })
      : apiClient.listPurchases({ page, limit: 20, search,
        ...(status ? { status: status as PurchaseResponse['status'] } : {}) });
    pending.then((result) => { if (mounted) { setRows(result.data.map(normalize));
      setPagination(result.pagination); } })
      .catch((failure: unknown) => { if (mounted) setError(messageOf(failure)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [kind, page, search, status, refresh]);
  const loadCounterparties = async (term = '', selectedId?: string) => {
    try {
      const result = isSale
        ? await apiClient.listCustomers({ status: 'active', search: term, limit: 20 })
        : await apiClient.listSuppliers({ status: 'active', search: term, limit: 20 });
      const mapped = result.data.map((row: CustomerResponse | SupplierResponse) =>
        ({ id: row.id, name: row.name }));
      if (selectedId && !mapped.some((row) => row.id === selectedId)) {
        const chosen = isSale ? await apiClient.getCustomer(selectedId)
          : await apiClient.getSupplier(selectedId);
        mapped.unshift({ id: chosen.data.id, name: chosen.data.name });
      }
      setCounterparties(mapped);
    } catch (failure) { setFormError(messageOf(failure)); }
  };
  const loadWarehouses = async (term = '', selectedId?: string) => {
    try {
      const result = await apiClient.listWarehouses({ status: 'active', search: term, limit: 20 });
      const mapped = result.data;
      if (selectedId && !mapped.some((row) => row.id === selectedId))
        mapped.unshift((await apiClient.getWarehouse(selectedId)).data);
      setWarehouses(mapped);
    } catch (failure) { setFormError(messageOf(failure)); }
  };
  const loadProducts = async (term = '') => {
    try { setProducts((await apiClient.listProducts({ status: 'active', search: term, limit: 20 })).data); }
    catch (failure) { setFormError(messageOf(failure)); }
  };
  const loadReferences = (order?: Order) => {
    void loadCounterparties('', order?.counterpartyId);
    void loadWarehouses('', order?.warehouseId);
    void loadProducts();
  };
  const openCreate = () => {
    setForm(emptyForm()); setSelected(null); setFormError(''); setMode('create'); loadReferences();
  };
  const openDetail = async (id: string) => {
    setFormError('');
    try { const result = isSale ? await apiClient.getSale(id) : await apiClient.getPurchase(id);
      setSelected(normalize(result.data)); setMode('detail'); }
    catch (failure) { setError(messageOf(failure)); }
  };
  const openEdit = () => {
    if (!selected) return;
    setForm({ counterpartyId: selected.counterpartyId, warehouseId: selected.warehouseId,
      items: selected.items, notes: selected.notes || '' });
    setFormError(''); setMode('edit'); loadReferences(selected);
  };
  const addLine = () => {
    const product = products.find((row) => row.id === lineProductId);
    const quantityMilli = parseMilli(lineQuantity);
    const unitMinor = isSale ? product?.priceMinor : parseMinor(lineCost);
    const discountMinor = parseMinor(lineDiscount);
    if (!product || !quantityMilli || unitMinor === undefined || unitMinor === null ||
      discountMinor === null || form.items.some((row) => row.productId === product.id)) {
      setFormError('Selecciona un producto no repetido y escribe cantidad, precio y descuento válidos.'); return;
    }
    setForm((current) => ({ ...current, items: [...current.items,
      { productId: product.id, name: product.name, quantityMilli, unitMinor, discountMinor }] }));
    setLineProductId(''); setLineQuantity(''); setLineCost(''); setLineDiscount('0'); setFormError('');
  };
  const save = async () => {
    if (!form.counterpartyId || !form.warehouseId || !form.items.length) {
      setFormError('Selecciona ' + counterpartLabel.toLowerCase() + ', almacén y productos.'); return;
    }
    setSaving(true); setFormError('');
    try {
      let result: SaleResponse | PurchaseResponse;
      if (isSale) {
        const request = { customerId: form.counterpartyId, warehouseId: form.warehouseId,
          items: form.items.map((line) => ({ productId: line.productId,
            quantityMilli: line.quantityMilli, discountMinor: line.discountMinor })),
          notes: form.notes };
        result = mode === 'edit' && selected
          ? (await apiClient.updateSale(selected.id, request)).data
          : (await apiClient.createSale(request)).data;
      } else {
        const request = { supplierId: form.counterpartyId, warehouseId: form.warehouseId,
          items: form.items.map((line) => ({ productId: line.productId,
            quantityMilli: line.quantityMilli, unitCostMinor: line.unitMinor,
            discountMinor: line.discountMinor })), notes: form.notes };
        result = mode === 'edit' && selected
          ? (await apiClient.updatePurchase(selected.id, request)).data
          : (await apiClient.createPurchase(request)).data;
      }
      setSelected(normalize(result)); setMode('detail');
      setFeedback(isSale ? 'Venta guardada como borrador.' : 'Compra guardada como borrador.');
      setRefresh((value) => value + 1);
    } catch (failure) { setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  const applyAction = async () => {
    if (!selected || !action) return;
    setSaving(true); setFormError('');
    try {
      const result = isSale
        ? action === 'confirm' ? await apiClient.confirmSale(selected.id) : await apiClient.cancelSale(selected.id)
        : action === 'confirm' ? await apiClient.confirmPurchase(selected.id) : await apiClient.cancelPurchase(selected.id);
      setSelected(normalize(result.data)); setAction(null); setMode('detail');
      setFeedback(action === 'confirm' ? (isSale ? 'Venta confirmada.' : 'Compra recibida.')
        : (isSale ? 'Venta cancelada.' : 'Compra cancelada.'));
      setRefresh((value) => value + 1);
    } catch (failure) { setFormError(messageOf(failure)); setAction(null); }
    finally { setSaving(false); }
  };
  const ready = selected?.status === 'draft';

  return <View style={styles.screen}>
    <View style={styles.heading}>
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.caption}>Borradores, confirmación, cancelación e historial.</Text></View>
      {canCreate && <Button title={isSale ? 'Nueva venta' : 'Nueva compra'} onPress={openCreate} />}
    </View>
    <Card>
      <View style={styles.filters}>
        <View style={{ flex: 1, minWidth: 190 }}>
          <Input value={searchText} onChangeText={setSearchText} placeholder="Folio o nombre"
            accessibilityLabel={'Buscar ' + title.toLowerCase()}
            onSubmitEditing={() => { setPage(1); setSearch(searchText.trim()); }} />
        </View>
        <Button title="Buscar" variant="outline" onPress={() => { setPage(1); setSearch(searchText.trim()); }} />
        <Select value={status} onChange={(value) => { setPage(1); setStatus(value); }}
          options={[{ value: '', label: 'Todos' }, { value: 'draft', label: 'Borradores' },
            { value: isSale ? 'confirmed' : 'received', label: isSale ? 'Confirmadas' : 'Recibidas' },
            { value: 'cancelled', label: 'Canceladas' }]}
          placeholder="Todos" />
      </View>
      {!!feedback && <Text accessibilityRole="alert" style={styles.success}>{feedback}</Text>}
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={() => setRefresh((value) => value + 1)} />
        : rows.length === 0 ? <EmptyState title={'Sin ' + title.toLowerCase()}
          message="Ajusta los filtros o registra un borrador." />
          : <View>{rows.map((row) => <View key={row.id} style={styles.row}>
            <View style={{ flex: 1, minWidth: 170 }}><Text style={styles.name}>{row.folio}</Text>
              <Text style={styles.caption}>{row.counterpartyName} · {row.status}</Text></View>
            <Text style={styles.name}>{money(row.totalMinor)}</Text>
            <Button title="Ver detalle" variant="outline" onPress={() => { void openDetail(row.id); }} />
          </View>)}</View>}
      <Pagination page={page} totalPages={pagination.pages} onPageChange={setPage} />
    </Card>
    <Modal visible={mode !== null && action === null}
      title={mode === 'create' ? (isSale ? 'Nueva venta' : 'Nueva compra')
        : mode === 'edit' ? 'Editar borrador' : 'Detalle'}
      onClose={() => { setMode(null); setSelected(null); }}>
      {mode === 'detail' && selected ? <View style={styles.detail}>
        <Text style={styles.name}>{selected.folio} · {selected.status}</Text>
        <Text style={styles.caption}>{counterpartLabel}: {selected.counterpartyName}</Text>
        <Text style={styles.caption}>Almacén: {selected.warehouseName}</Text>
        {selected.items.map((line) => <Text key={line.productId} style={styles.caption}>
          {line.name} · {qty(line.quantityMilli)} × {money(line.unitMinor)} = {money(line.totalMinor || 0)}
        </Text>)}
        <Text style={styles.caption}>Subtotal {money(selected.subtotalMinor)} · Descuento {money(selected.discountMinor)} · Impuesto {money(selected.taxMinor)}</Text>
        <Text style={styles.name}>Total {money(selected.totalMinor)}</Text>
        {!!selected.notes && <Text style={styles.caption}>{selected.notes}</Text>}
        {!!formError && <Text accessibilityRole="alert" style={styles.failure}>{formError}</Text>}
        <View style={styles.actions}>
          {ready && canEdit && <Button title="Editar borrador" onPress={openEdit} />}
          {ready && canConfirm && <Button title={isSale ? 'Confirmar venta' : 'Recibir compra'}
            onPress={() => setAction('confirm')} />}
          {selected.status !== 'cancelled' && canCancel && <Button title="Cancelar operación"
            variant="danger" onPress={() => setAction('cancel')} />}
        </View>
      </View> : (mode === 'create' || mode === 'edit') ? <View style={styles.detail}>
        <Input label={'Buscar ' + counterpartLabel.toLowerCase()} value={counterpartySearch}
          onChangeText={setCounterpartySearch} />
        <Button title={'Buscar ' + counterpartLabel.toLowerCase()} variant="outline"
          onPress={() => { void loadCounterparties(counterpartySearch.trim(), form.counterpartyId); }} />
        <Text style={styles.caption}>{counterpartLabel}</Text>
        <Select value={form.counterpartyId} onChange={(counterpartyId) =>
          setForm((current) => ({ ...current, counterpartyId }))}
          options={counterparties.map((row) => ({ value: row.id, label: row.name }))}
          placeholder={'Selecciona ' + counterpartLabel.toLowerCase()} />
        <Input label="Buscar almacén" value={warehouseSearch} onChangeText={setWarehouseSearch} />
        <Button title="Buscar almacenes" variant="outline"
          onPress={() => { void loadWarehouses(warehouseSearch.trim(), form.warehouseId); }} />
        <Text style={styles.caption}>Almacén</Text>
        <Select value={form.warehouseId} onChange={(warehouseId) =>
          setForm((current) => ({ ...current, warehouseId }))}
          options={warehouses.map((row) => ({ value: row.id, label: row.name }))}
          placeholder="Selecciona un almacén" />
        <Text style={styles.name}>Productos</Text>
        {form.items.map((line) => <View key={line.productId} style={styles.row}>
          <Text style={{ flex: 1, color: colors.textPrimary }}>{line.name} · {qty(line.quantityMilli)} × {money(line.unitMinor)}</Text>
          <Button title={'Quitar ' + line.name} variant="outline" onPress={() =>
            setForm((current) => ({ ...current,
              items: current.items.filter((item) => item.productId !== line.productId) }))} />
        </View>)}
        <Input label="Buscar producto" value={productSearch} onChangeText={setProductSearch} />
        <Button title="Buscar productos" variant="outline" onPress={() => { void loadProducts(productSearch.trim()); }} />
        <Select value={lineProductId} onChange={setLineProductId}
          options={products.map((row) => ({ value: row.id, label: row.name + ' (' + row.code + ')' }))}
          placeholder="Selecciona un producto" />
        <Input label="Cantidad" value={lineQuantity} onChangeText={setLineQuantity} />
        {!isSale && <Input label="Costo unitario" value={lineCost} onChangeText={setLineCost} />}
        <Input label="Descuento" value={lineDiscount} onChangeText={setLineDiscount} />
        <Button title="Agregar producto" variant="outline" onPress={addLine} />
        <Input label="Notas" value={form.notes} onChangeText={(notes) =>
          setForm((current) => ({ ...current, notes }))} />
        {!!formError && <Text accessibilityRole="alert" style={styles.failure}>{formError}</Text>}
        <View style={styles.actions}>
          <Button title="Volver" variant="outline" onPress={() => setMode(selected ? 'detail' : null)} />
          <Button title="Guardar borrador" onPress={() => { void save(); }} loading={saving} />
        </View>
      </View> : null}
    </Modal>
    <Modal visible={action !== null} title={action === 'confirm' ? 'Confirmar operación' : 'Cancelar operación'}
      onClose={() => setAction(null)}>
      <Text style={styles.caption}>{action === 'confirm'
        ? (isSale ? 'Se descontará el inventario al confirmar.' : 'Se ingresará el inventario al recibir.')
        : 'La operación conservará su historial. La reversión del inventario requiere saldo disponible cuando corresponda.'}</Text>
      <View style={styles.actions}>
        <Button title="Volver" variant="outline" onPress={() => setAction(null)} />
        <Button title={action === 'confirm' ? 'Confirmar' : 'Cancelar operación ahora'}
          variant={action === 'cancel' ? 'danger' : 'primary'} loading={saving}
          onPress={() => { void applyAction(); }} />
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: 20 }, heading: { flexDirection: 'row', gap: 16,
    flexWrap: 'wrap', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '700', color: colors.textPrimary },
  caption: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center',
    borderTopWidth: 1, borderColor: colors.border, paddingVertical: 14 },
  name: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  detail: { gap: 14 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  failure: { color: colors.danger, marginVertical: 10 },
  success: { color: colors.success, marginVertical: 10 },
});
