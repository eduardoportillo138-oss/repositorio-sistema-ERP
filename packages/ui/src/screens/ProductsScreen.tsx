import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { apiClient, CategoryResponse, CreateProductRequest, ProductResponse,
  UnitResponse, PaginationResponse } from '@erp/api-client';
import { useAuth } from '@erp/session';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, StatusBadge } from '../components/DataStates';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Select } from '../components/Select';
import { colors } from '../tokens';

type Form = { code: string; name: string; description: string; barcode: string; categoryId: string;
  unitId: string; price: string; cost: string; tax: string; stockMinimum: string };
const emptyForm = (): Form => ({ code: '', name: '', description: '', barcode: '', categoryId: '',
  unitId: '', price: '', cost: '', tax: '0', stockMinimum: '0' });
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Operación fallida';
const money = (value?: number) => value === undefined ? '—' : (value / 100).toFixed(2);
function parseMoney(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

export function ProductsScreen() {
  const { user } = useAuth();
  const canCreate = !!user?.permissions.includes('products.create');
  const canEdit = !!user?.permissions.includes('products.edit');
  const canDisable = !!user?.permissions.includes('products.disable');
  const [rows, setRows] = useState<ProductResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationResponse>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | undefined>('active');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<ProductResponse | null>(null);
  const [mode, setMode] = useState<'detail' | 'create' | 'edit' | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [units, setUnits] = useState<UnitResponse[]>([]);

  const loadReferences = async (product?: ProductResponse) => {
    try {
      const [categoryResult, unitResult] = await Promise.all([
        apiClient.listCategories({ limit: 100, status: 'active' }),
        apiClient.listUnits({ limit: 100, status: 'active' }),
      ]);
      const categoryRows = categoryResult.data;
      const unitRows = unitResult.data;
      if (product && !categoryRows.some((row) => row.id === product.categoryId)) {
        const result = await apiClient.getCategory(product.categoryId);
        categoryRows.push(result.data);
      }
      if (product && !unitRows.some((row) => row.id === product.unitId)) {
        const result = await apiClient.getUnit(product.unitId);
        unitRows.push(result.data);
      }
      setCategories(categoryRows); setUnits(unitRows);
    } catch (failure) { setFormError(messageOf(failure)); }
  };
  useEffect(() => {
    let mounted = true;
    setLoading(true); setError('');
    apiClient.listProducts({ page, limit: 20, search, status })
      .then((result) => { if (mounted) { setRows(result.data); setPagination(result.pagination); } })
      .catch((failure: unknown) => { if (mounted) setError(messageOf(failure)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [page, search, status, refresh]);

  const openDetail = async (id: string) => {
    setFormError('');
    try {
      const result = await apiClient.getProduct(id);
      setSelected(result.data); setMode('detail'); void loadReferences(result.data);
    } catch (failure) { setError(messageOf(failure)); }
  };
  const openCreate = () => {
    setForm(emptyForm()); setFormError(''); setMode('create'); void loadReferences();
  };
  const openEdit = () => {
    if (!selected) return;
    setForm({ code: selected.code, name: selected.name,
      description: selected.description || '', barcode: selected.barcode || '', categoryId: selected.categoryId,
      unitId: selected.unitId, price: money(selected.priceMinor),
      cost: money(selected.costMinor) === '—' ? '' : money(selected.costMinor),
      tax: String(selected.taxRateBps / 100), stockMinimum: String(selected.stockMinimum) });
    setFormError(''); setMode('edit');
  };
  const save = async () => {
    const priceMinor = parseMoney(form.price);
    const costMinor = form.cost.trim() ? parseMoney(form.cost) : undefined;
    const tax = Number(form.tax);
    const stockMinimum = Number(form.stockMinimum);
    if (!form.code.trim() || !form.name.trim() || !form.categoryId || !form.unitId ||
      priceMinor === null || costMinor === null || !Number.isFinite(tax) || tax < 0 || tax > 100 ||
      !Number.isInteger(tax * 100) || !Number.isSafeInteger(stockMinimum) || stockMinimum < 0) {
      setFormError('Completa código, nombre, categoría, unidad, precios y cantidades válidas.'); return;
    }
    const request: CreateProductRequest = { code: form.code, name: form.name,
      description: form.description, ...(form.barcode.trim() ? { barcode: form.barcode.trim() } : {}),
      categoryId: form.categoryId, unitId: form.unitId,
      priceMinor, taxRateBps: Math.round(tax * 100), stockMinimum,
      ...(costMinor !== undefined ? { costMinor } : {}) };
    setSaving(true); setFormError('');
    try {
      const result = mode === 'edit' && selected
        ? await apiClient.updateProduct(selected.id, request)
        : await apiClient.createProduct(request);
      setSelected(result.data); setMode('detail');
      setFeedback(mode === 'edit' ? 'Producto actualizado.' : 'Producto creado.');
      setRefresh((value) => value + 1);
    } catch (failure) { setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  const deactivate = async () => {
    if (!selected) return;
    setSaving(true); setFormError('');
    try {
      const result = await apiClient.deactivateProduct(selected.id);
      setSelected(result.data); setConfirm(false); setMode('detail');
      setFeedback('Producto desactivado.'); setRefresh((value) => value + 1);
    } catch (failure) { setFormError(messageOf(failure)); setConfirm(false); }
    finally { setSaving(false); }
  };
  const set = (key: keyof Form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return <View style={styles.screen}>
    <View style={styles.heading}>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={styles.title}>Productos</Text>
        <Text style={styles.caption}>Administra tu catálogo. Las existencias se calculan desde movimientos.</Text>
      </View>
      {canCreate && <Button title="Nuevo producto" onPress={openCreate} />}
    </View>
    <Card>
      <View style={styles.filters}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Input value={searchText} onChangeText={setSearchText} placeholder="Nombre o código"
            accessibilityLabel="Buscar productos" onSubmitEditing={() => { setPage(1); setSearch(searchText.trim()); }} />
        </View>
        <Button title="Buscar" variant="outline" onPress={() => { setPage(1); setSearch(searchText.trim()); }} />
        <Button title="Activos" variant={status === 'active' ? 'secondary' : 'outline'}
          onPress={() => { setPage(1); setStatus('active'); }} />
        <Button title="Inactivos" variant={status === 'inactive' ? 'secondary' : 'outline'}
          onPress={() => { setPage(1); setStatus('inactive'); }} />
        <Button title="Todos" variant={status === undefined ? 'secondary' : 'outline'}
          onPress={() => { setPage(1); setStatus(undefined); }} />
      </View>
      {!!feedback && <Text accessibilityRole="alert" style={styles.success}>{feedback}</Text>}
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={() => setRefresh((value) => value + 1)} />
        : rows.length === 0 ? <EmptyState title="No hay productos" message="Ajusta los filtros o registra un producto nuevo." />
          : <View style={styles.list}>{rows.map((row) => <View key={row.id} style={styles.row}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={styles.name}>{row.name}</Text>
              <Text style={styles.caption}>{row.code} · {money(row.priceMinor)}</Text>
            </View>
            <StatusBadge status={row.status} />
            <Button title="Ver detalle" variant="outline" onPress={() => { void openDetail(row.id); }} />
          </View>)}</View>}
      <Pagination page={page} totalPages={pagination.pages} onPageChange={setPage} />
    </Card>
    <Modal visible={mode !== null && !confirm} title={mode === 'create' ? 'Nuevo producto' : mode === 'edit' ? 'Editar producto' : 'Detalle de producto'}
      onClose={() => { setMode(null); setSelected(null); }}>
      {mode === 'detail' && selected ? <View style={styles.detail}>
        <Text style={styles.name}>{selected.name} ({selected.code})</Text>
        {!!selected.description && <Text style={styles.caption}>{selected.description}</Text>}
        {!!selected.barcode && <Text style={styles.caption}>Código de barras: {selected.barcode}</Text>}
        <Text style={styles.caption}>Categoría: {categories.find((row) => row.id === selected.categoryId)?.name || selected.categoryId}</Text>
        <Text style={styles.caption}>Unidad: {units.find((row) => row.id === selected.unitId)?.name || selected.unitId}</Text>
        <Text style={styles.caption}>Precio: {money(selected.priceMinor)} · Costo: {money(selected.costMinor)}</Text>
        <Text style={styles.caption}>Impuesto: {(selected.taxRateBps / 100).toFixed(2)}% · Mínimo: {selected.stockMinimum}</Text>
        <StatusBadge status={selected.status} />
        {!!formError && <Text accessibilityRole="alert" style={styles.failure}>{formError}</Text>}
        {selected.status === 'active' && <View style={styles.actions}>
          {canEdit && <Button title="Editar" onPress={openEdit} />}
          {canDisable && <Button title="Desactivar" variant="danger" onPress={() => setConfirm(true)} />}
        </View>}
      </View> : (mode === 'create' || mode === 'edit') ? <View>
        <Input label="Código" value={form.code} onChangeText={set('code')} />
        <Input label="Nombre" value={form.name} onChangeText={set('name')} />
        <Input label="Descripción" value={form.description} onChangeText={set('description')} />
        <Input label="Código de barras" value={form.barcode} onChangeText={set('barcode')} />
        <Text style={styles.caption}>Categoría</Text>
        <Select value={form.categoryId} onChange={set('categoryId')}
          options={categories.map((row) => ({ value: row.id, label: row.name }))}
          placeholder="Selecciona una categoría" />
        <Text style={styles.caption}>Unidad</Text>
        <Select value={form.unitId} onChange={set('unitId')}
          options={units.map((row) => ({ value: row.id, label: row.name }))}
          placeholder="Selecciona una unidad" />
        <Input label="Precio de venta" value={form.price} onChangeText={set('price')} />
        <Input label="Costo" value={form.cost} onChangeText={set('cost')} />
        <Input label="Impuesto %" value={form.tax} onChangeText={set('tax')} />
        <Input label="Existencia mínima" value={form.stockMinimum} onChangeText={set('stockMinimum')} />
        {!!formError && <Text accessibilityRole="alert" style={styles.failure}>{formError}</Text>}
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => setMode(null)} />
          <Button title="Guardar" onPress={() => { void save(); }} loading={saving} />
        </View>
      </View> : null}
    </Modal>
    <Modal visible={confirm} title="Desactivar producto" onClose={() => setConfirm(false)}>
      <Text style={styles.caption}>El producto permanecerá en el historial. ¿Confirmas la desactivación?</Text>
      <View style={styles.actions}>
        <Button title="Cancelar" variant="outline" onPress={() => setConfirm(false)} />
        <Button title="Desactivar" variant="danger" loading={saving} onPress={() => { void deactivate(); }} />
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: 20 },
  heading: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '700', color: colors.textPrimary },
  caption: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  list: { gap: 4 },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center',
    borderTopWidth: 1, borderColor: colors.border, paddingVertical: 14 },
  name: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  detail: { gap: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  failure: { color: colors.danger, marginVertical: 10 },
  success: { color: colors.success, marginVertical: 10 },
});
