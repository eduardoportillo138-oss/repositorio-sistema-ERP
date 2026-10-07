import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { apiClient, InventoryMovementResponse, InventoryStockResponse,
  PaginationResponse, ProductStockResponse, WarehouseResponse } from '@erp/api-client';
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

type Form = { warehouseId: string; destinationId: string; direction: 'initial' | 'in' | 'out';
  quantity: string; reason: string; notes: string };
const emptyForm = (): Form => ({ warehouseId: '', destinationId: '', direction: 'in',
  quantity: '', reason: '', notes: '' });
const quantityText = (milli: number) => (milli / 1000).toFixed(3).replace(/\.?0+$/, '');
function parseQuantity(value: string) {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const milli = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  return Number.isSafeInteger(milli) && milli > 0 ? milli : null;
}
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Operación fallida';

export function InventoryScreen() {
  const { user } = useAuth();
  const canAdjust = !!user?.permissions.includes('inventory.adjust');
  const canTransfer = !!user?.permissions.includes('inventory.transfer');
  const [rows, setRows] = useState<InventoryStockResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationResponse>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<ProductStockResponse | null>(null);
  const [mode, setMode] = useState<'detail' | 'adjust' | 'transfer' | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [movements, setMovements] = useState<InventoryMovementResponse[]>([]);
  const [movementPage, setMovementPage] = useState(1);
  const [movementPages, setMovementPages] = useState(0);
  const [movementError, setMovementError] = useState('');

  const loadWarehouses = async (searchValue = '') => {
    try {
      const result = await apiClient.listWarehouses({ status: 'active', search: searchValue, limit: 20 });
      setWarehouses((current) => {
        const selectedRows = current.filter((row) => row.id === warehouseId ||
          row.id === form.warehouseId || row.id === form.destinationId);
        return [...selectedRows, ...result.data.filter((row) => !selectedRows.some((saved) => saved.id === row.id))];
      });
      setFormError('');
    } catch (failure) { setFormError(messageOf(failure)); }
  };
  useEffect(() => { void loadWarehouses(); }, []);
  useEffect(() => {
    let mounted = true;
    setLoading(true); setError('');
    apiClient.listInventory({ page, limit: 20, search,
      ...(warehouseId ? { warehouseId } : {}) })
      .then((result) => { if (mounted) { setRows(result.data); setPagination(result.pagination); } })
      .catch((failure: unknown) => { if (mounted) setError(messageOf(failure)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [page, search, warehouseId, refresh]);
  useEffect(() => {
    let mounted = true;
    apiClient.listInventoryMovements({ page: movementPage, limit: 10,
      ...(selected ? { productId: selected.productId } : {}) })
      .then((result) => { if (mounted) { setMovements(result.data);
        setMovementPages(result.pagination.pages); setMovementError(''); } })
      .catch((failure: unknown) => { if (mounted) setMovementError(messageOf(failure)); });
    return () => { mounted = false; };
  }, [movementPage, selected?.productId, refresh]);
  const openDetail = async (productId: string) => {
    setFormError('');
    try { const result = await apiClient.getProductStock(productId);
      setSelected(result.data); setMode('detail'); setMovementPage(1); }
    catch (failure) { setError(messageOf(failure)); }
  };
  const openForm = (next: 'adjust' | 'transfer') => {
    setForm({ ...emptyForm(), warehouseId: warehouseId || selected?.warehouses[0]?.warehouseId || '' });
    setFormError(''); setMode(next); void loadWarehouses();
  };
  const submit = async () => {
    if (!selected) return;
    const quantityMilli = parseQuantity(form.quantity);
    if (!quantityMilli || !form.warehouseId || !form.reason.trim() ||
      (mode === 'transfer' && (!form.destinationId || form.destinationId === form.warehouseId))) {
      setFormError('Selecciona almacenes distintos e indica cantidad y motivo válidos.'); return;
    }
    if ((mode === 'transfer' || form.direction === 'out') && !confirm) {
      setConfirm(true); return;
    }
    setSaving(true); setFormError('');
    try {
      if (mode === 'transfer') {
        await apiClient.createInventoryTransfer({ productId: selected.productId,
          fromWarehouseId: form.warehouseId, toWarehouseId: form.destinationId,
          quantityMilli, reason: form.reason.trim(), notes: form.notes.trim() });
        setFeedback('Transferencia registrada.');
      } else {
        await apiClient.createInventoryAdjustment({ productId: selected.productId,
          warehouseId: form.warehouseId, direction: form.direction,
          quantityMilli, reason: form.reason.trim(), notes: form.notes.trim() });
        setFeedback('Ajuste registrado.');
      }
      setConfirm(false); setMode('detail'); setRefresh((value) => value + 1);
      const result = await apiClient.getProductStock(selected.productId); setSelected(result.data);
    } catch (failure) { setFormError(messageOf(failure)); setConfirm(false); }
    finally { setSaving(false); }
  };
  const set = (key: keyof Form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return <View style={styles.screen}>
    <Text accessibilityRole="header" style={styles.title}>Inventario</Text>
    <Text style={styles.caption}>Existencias calculadas de movimientos confirmados.</Text>
    <Card>
      <View style={styles.filters}>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Input value={searchText} onChangeText={setSearchText} placeholder="Buscar producto"
            accessibilityLabel="Buscar productos en inventario"
            onSubmitEditing={() => { setPage(1); setSearch(searchText.trim()); }} />
        </View>
        <Button title="Buscar" variant="outline" onPress={() => { setPage(1); setSearch(searchText.trim()); }} />
        <View style={{ flex: 1, minWidth: 160 }}>
          <Input value={warehouseSearch} onChangeText={setWarehouseSearch}
            placeholder="Buscar almacén" accessibilityLabel="Buscar almacén" />
        </View>
        <Button title="Filtrar almacenes" variant="outline" onPress={() => { void loadWarehouses(warehouseSearch.trim()); }} />
        <Select value={warehouseId} onChange={(value) => { setPage(1); setWarehouseId(value); }}
          options={[{ value: '', label: 'Todos los almacenes' },
            ...warehouses.map((row) => ({ value: row.id, label: row.name }))]}
          placeholder="Todos los almacenes" />
      </View>
      {!!feedback && <Text accessibilityRole="alert" style={styles.success}>{feedback}</Text>}
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={() => setRefresh((value) => value + 1)} />
        : rows.length === 0 ? <EmptyState title="Sin productos" message="Registra productos para consultar existencias." />
          : <View style={styles.list}>{rows.map((row) => <View key={row.productId} style={styles.row}>
            <View style={{ flex: 1, minWidth: 150 }}>
              <Text style={styles.name}>{row.name}</Text>
              <Text style={styles.caption}>{row.code}</Text>
            </View>
            <Text style={row.lowStock ? styles.low : styles.name}>{quantityText(row.quantityMilli)}</Text>
            <Button title="Ver existencias" variant="outline"
              onPress={() => { void openDetail(row.productId); }} />
          </View>)}</View>}
      <Pagination page={page} totalPages={pagination.pages} onPageChange={setPage} />
    </Card>
    <Card>
      <Text style={styles.name}>Movimientos {selected ? 'de ' + selected.name : 'recientes'}</Text>
      {!!movementError && <ErrorState message={movementError}
        onRetry={() => setRefresh((value) => value + 1)} />}
      {!movementError && movements.length === 0 && <EmptyState title="Sin movimientos" />}
      {movements.map((row) => <View key={row.id} style={styles.row}>
        <View style={{ flex: 1, minWidth: 150 }}>
          <Text style={styles.name}>{row.type}</Text>
          <Text style={styles.caption}>{row.reason} · {new Date(row.createdAt).toLocaleString()}</Text>
        </View>
        <Text style={styles.caption}>{quantityText(row.quantityMilli)}</Text>
      </View>)}
      <Pagination page={movementPage} totalPages={movementPages} onPageChange={setMovementPage} />
    </Card>
    <Modal visible={mode !== null && !confirm}
      title={mode === 'detail' ? 'Existencias' : mode === 'adjust' ? 'Ajustar inventario' : 'Transferir inventario'}
      onClose={() => { setMode(null); setSelected(null); }}>
      {mode === 'detail' && selected ? <View style={styles.detail}>
        <Text style={styles.name}>{selected.name} ({selected.code})</Text>
        <Text style={styles.caption}>Total: {quantityText(selected.quantityMilli)}</Text>
        {selected.warehouses.map((row) => <Text key={row.warehouseId} style={styles.caption}>
          {row.warehouseName}: {quantityText(row.quantityMilli)}
        </Text>)}
        <View style={styles.actions}>
          {canAdjust && <Button title="Ajustar" onPress={() => openForm('adjust')} />}
          {canTransfer && <Button title="Transferir" onPress={() => openForm('transfer')} />}
        </View>
      </View> : (mode === 'adjust' || mode === 'transfer') ? <View style={styles.detail}>
        <Input label="Buscar almacén" value={warehouseSearch} onChangeText={setWarehouseSearch} />
        <Button title="Buscar almacenes" variant="outline"
          onPress={() => { void loadWarehouses(warehouseSearch.trim()); }} />
        <Text style={styles.caption}>{mode === 'transfer' ? 'Almacén origen' : 'Almacén'}</Text>
        <Select value={form.warehouseId} onChange={set('warehouseId')}
          options={warehouses.map((row) => ({ value: row.id, label: row.name }))}
          placeholder="Selecciona un almacén" />
        {mode === 'transfer' ? <>
          <Text style={styles.caption}>Almacén destino</Text>
          <Select value={form.destinationId} onChange={set('destinationId')}
            options={warehouses.map((row) => ({ value: row.id, label: row.name }))}
            placeholder="Selecciona el destino" />
        </> : <>
          <Text style={styles.caption}>Tipo de ajuste</Text>
          <Select value={form.direction} onChange={(value) =>
            set('direction')(value)} options={[
              { value: 'initial', label: 'Existencia inicial' },
              { value: 'in', label: 'Entrada' }, { value: 'out', label: 'Salida' },
            ]} placeholder="Selecciona tipo" />
        </>}
        <Input label="Cantidad" value={form.quantity} onChangeText={set('quantity')} />
        <Input label="Motivo" value={form.reason} onChangeText={set('reason')} />
        <Input label="Notas" value={form.notes} onChangeText={set('notes')} />
        {!!formError && <Text accessibilityRole="alert" style={styles.failure}>{formError}</Text>}
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => setMode('detail')} />
          <Button title="Registrar" onPress={() => { void submit(); }} loading={saving} />
        </View>
      </View> : null}
    </Modal>
    <Modal visible={confirm} title="Confirmar salida de inventario" onClose={() => setConfirm(false)}>
      <Text style={styles.caption}>Se registrará una salida de {form.quantity} unidades. ¿Confirmas?</Text>
      {!!formError && <Text accessibilityRole="alert" style={styles.failure}>{formError}</Text>}
      <View style={styles.actions}>
        <Button title="Cancelar" variant="outline" onPress={() => setConfirm(false)} />
        <Button title="Confirmar" variant="danger" loading={saving} onPress={() => { void submit(); }} />
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: 20 }, title: { fontSize: 30, fontWeight: '700', color: colors.textPrimary },
  caption: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  list: { gap: 4 },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center',
    borderTopWidth: 1, borderColor: colors.border, paddingVertical: 14 },
  name: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  low: { fontSize: 15, color: colors.danger, fontWeight: '700' },
  detail: { gap: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  failure: { color: colors.danger, marginVertical: 10 },
  success: { color: colors.success, marginVertical: 10 },
});
