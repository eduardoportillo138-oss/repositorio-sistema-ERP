import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { apiClient, CreateCategoryRequest, CategoryResponse, PaginationResponse } from '@erp/api-client';
import { useAuth } from '@erp/session';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, StatusBadge } from '../components/DataStates';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { colors } from '../tokens';

const fields = [
  { key: 'name', label: 'Nombre' },
  { key: 'code', label: 'Código' },
  { key: 'description', label: 'Descripción' },
] as const;
type Field = (typeof fields)[number]['key'];
const emptyForm = (): CreateCategoryRequest => ({ name: '', code: '', description: '' });
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Operación fallida';

export function CategoriesScreen() {
  const { user } = useAuth();
  const canCreate = !!user?.permissions.includes('categories.create');
  const canEdit = !!user?.permissions.includes('categories.edit');
  const canDisable = !!user?.permissions.includes('categories.disable');
  const [rows, setRows] = useState<CategoryResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationResponse>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | undefined>('active');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<CategoryResponse | null>(null);
  const [mode, setMode] = useState<'detail' | 'create' | 'edit' | null>(null);
  const [form, setForm] = useState<CreateCategoryRequest>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    apiClient.listCategories({ page, limit: 20, search, status })
      .then((result) => {
        if (!mounted) return;
        setRows(result.data);
        setPagination(result.pagination);
      })
      .catch((failure: unknown) => { if (mounted) setError(messageOf(failure)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [page, search, status, refresh]);

  const openDetail = async (id: string) => {
    setFormError('');
    try {
      const response = await apiClient.getCategory(id);
      setSelected(response.data);
      setMode('detail');
    } catch (failure) { setError(messageOf(failure)); }
  };
  const openCreate = () => { setForm(emptyForm()); setFormError(''); setMode('create'); };
  const openEdit = () => {
    if (!selected) return;
    setForm({ name: selected.name, code: selected.code, description: selected.description || '' });
    setFormError('');
    setMode('edit');
  };
  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setFormError('Escribe nombre y código.'); return;
    }
    setSaving(true);
    setFormError('');
    try {
      const result = mode === 'edit' && selected
        ? await apiClient.updateCategory(selected.id, form)
        : await apiClient.createCategory(form);
      setSelected(result.data);
      setMode('detail');
      setFeedback(mode === 'edit' ? 'Categoría actualizada.' : 'Categoría creada.');
      setRefresh((value) => value + 1);
    } catch (failure) { setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  const deactivate = async () => {
    if (!selected) return;
    setSaving(true);
    setFormError('');
    try {
      const result = await apiClient.deactivateCategory(selected.id);
      setSelected(result.data);
      setConfirm(false);
      setMode('detail');
      setFeedback('Categoría desactivada.');
      setRefresh((value) => value + 1);
    } catch (failure) { setFormError(messageOf(failure)); setConfirm(false); }
    finally { setSaving(false); }
  };

  return <View style={styles.screen}>
    <View style={styles.heading}>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={styles.title}>Categorías</Text>
        <Text style={styles.caption}>Consulta y administra las categorías de tu empresa.</Text>
      </View>
      {canCreate && <Button title="Nueva categoría" onPress={openCreate} />}
    </View>
    <Card>
      <View style={styles.filters}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Input value={searchText} onChangeText={setSearchText} placeholder="Nombre o código"
            accessibilityLabel="Buscar categorías" onSubmitEditing={() => { setPage(1); setSearch(searchText.trim()); }} />
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
        : rows.length === 0 ? <EmptyState title="No hay categorías" message="Ajusta los filtros o registra una categoría nueva." />
          : <View style={styles.list}>
            {rows.map((row) => <View key={row.id} style={styles.row}>
              <View style={{ flex: 1, minWidth: 160 }}>
                <Text style={styles.name}>{row.name}</Text>
                <Text style={styles.caption}>{row.code}</Text>
                {!!row.description && <Text style={styles.caption}>{row.description}</Text>}
              </View>
              <StatusBadge status={row.status} />
              <Button title="Ver detalle" variant="outline" onPress={() => { void openDetail(row.id); }} />
            </View>)}
          </View>}
      <Pagination page={page} totalPages={pagination.pages} onPageChange={setPage} />
    </Card>
    <Modal visible={mode !== null && !confirm} title={mode === 'create' ? 'Nueva categoría' : mode === 'edit' ? 'Editar categoría' : 'Detalle de categoría'}
      onClose={() => { setMode(null); setSelected(null); }}>
      {mode === 'detail' && selected ? <View style={styles.detail}>
        {fields.map(({ key, label }) => <View key={key}>
          <Text style={styles.caption}>{label}</Text>
          <Text style={styles.name}>{String(selected[key] || '—')}</Text>
        </View>)}
        <StatusBadge status={selected.status} />
        {!!formError && <Text accessibilityRole="alert" style={styles.failure}>{formError}</Text>}
        {selected.status === 'active' && <View style={styles.actions}>
          {canEdit && <Button title="Editar" onPress={openEdit} />}
          {canDisable && <Button title="Desactivar" variant="danger" onPress={() => setConfirm(true)} />}
        </View>}
      </View> : (mode === 'create' || mode === 'edit') ? <View>
        {fields.map(({ key, label }) => <Input key={key} label={label} value={String(form[key] || '')}
          onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
          type="text" />)}
        {!!formError && <Text accessibilityRole="alert" style={styles.failure}>{formError}</Text>}
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => setMode(null)} />
          <Button title="Guardar" onPress={() => { void save(); }} loading={saving} />
        </View>
      </View> : null}
    </Modal>
    <Modal visible={confirm} title="Desactivar categoría" onClose={() => setConfirm(false)}>
      <Text style={styles.caption}>La categoría permanecerá en el historial. No puede desactivarse si tiene productos activos. ¿Confirmas la desactivación?</Text>
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
