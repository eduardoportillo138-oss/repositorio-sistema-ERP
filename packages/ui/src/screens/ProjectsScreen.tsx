import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { apiClient, CreateProjectRequest, ProjectResponse, UserResponse } from '@erp/api-client';
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

type Form = { code: string; name: string; description: string; startDate: string;
  endDate: string; budget: string; ownerUserId: string };
const blank = (): Form => ({ code: '', name: '', description: '', startDate: '',
  endDate: '', budget: '', ownerUserId: '' });
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Operación fallida';
const money = (minor: number) => (minor / 100).toFixed(2);
function parseBudget(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

export function ProjectsScreen() {
  const { user } = useAuth();
  const canCreate = !!user?.permissions.includes('projects.create');
  const canEdit = !!user?.permissions.includes('projects.edit');
  const canCancel = !!user?.permissions.includes('projects.cancel');
  const canSelectOwner = !!user?.permissions.includes('users.view');
  const [rows, setRows] = useState<ProjectResponse[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectResponse['status'] | undefined>();
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<ProjectResponse | null>(null);
  const [mode, setMode] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [form, setForm] = useState<Form>(blank());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<'activate' | 'complete' | 'cancel' | null>(null);
  const [owners, setOwners] = useState<UserResponse[]>([]);
  const [ownerPage, setOwnerPage] = useState(1);
  const [ownerPages, setOwnerPages] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    apiClient.listProjects({ page, limit: 20, search, status })
      .then((result) => { if (active) { setRows(result.data); setPages(result.pagination.pages); } })
      .catch((failure: unknown) => { if (active) setError(messageOf(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search, status, refresh]);
  useEffect(() => {
    if (!canSelectOwner || (mode !== 'create' && mode !== 'edit')) return;
    let active = true;
    apiClient.listUsers(ownerPage, 100).then((result) => {
      if (active) { setOwners(result.data.filter((row) => row.status === 'active'));
        setOwnerPages(result.pagination.pages); }
    }).catch((failure: unknown) => { if (active) setFormError(messageOf(failure)); });
    return () => { active = false; };
  }, [mode, ownerPage, canSelectOwner]);
  const open = async (id: string) => {
    try { setSelected((await apiClient.getProject(id)).data); setMode('detail'); setFormError(''); }
    catch (failure) { setError(messageOf(failure)); }
  };
  const edit = () => {
    if (!selected) return;
    setForm({ code: selected.code, name: selected.name,
      description: selected.description || '', startDate: selected.startDate.slice(0, 10),
      endDate: selected.endDate?.slice(0, 10) || '',
      budget: selected.budgetMinor === undefined ? '' : money(selected.budgetMinor),
      ownerUserId: selected.ownerUserId });
    setOwnerPage(1); setFormError(''); setMode('edit');
  };
  const save = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.startDate.trim()) {
      setFormError('Código, nombre y fecha de inicio son obligatorios.'); return;
    }
    const budgetMinor = form.budget ? parseBudget(form.budget) : undefined;
    if (budgetMinor === null) { setFormError('Presupuesto inválido.'); return; }
    const payload: CreateProjectRequest = { code: form.code, name: form.name,
      description: form.description, startDate: form.startDate,
      ...(form.endDate ? { endDate: form.endDate } : {}),
      ...(budgetMinor !== undefined ? { budgetMinor } : {}),
      ...(form.ownerUserId ? { ownerUserId: form.ownerUserId } : {}) };
    setSaving(true); setFormError('');
    try {
      const result = mode === 'edit' && selected
        ? await apiClient.updateProject(selected.id, payload)
        : await apiClient.createProject(payload);
      setSelected(result.data); setMode('detail');
      setFeedback(mode === 'edit' ? 'Proyecto actualizado.' : 'Proyecto creado.');
      setRefresh((value) => value + 1);
    } catch (failure) { setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  const transition = async () => {
    if (!selected || !action) return;
    setSaving(true); setFormError('');
    try {
      setSelected((await apiClient.transitionProject(selected.id, action)).data);
      setFeedback(action === 'activate' ? 'Proyecto activado.'
        : action === 'complete' ? 'Proyecto completado.' : 'Proyecto cancelado.');
      setAction(null); setRefresh((value) => value + 1);
    } catch (failure) { setAction(null); setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  const muted = { color: colors.textSecondary, fontSize: 13 };
  return <View style={{ gap: 16 }}>
    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <Text accessibilityRole="header" style={{ color: colors.textPrimary,
        fontSize: 30, fontWeight: '700', flex: 1 }}>Proyectos</Text>
      {canCreate && <Button title="Nuevo proyecto" onPress={() => {
        setForm(blank()); setFormError(''); setOwnerPage(1); setMode('create'); }} />}
    </View>
    <Card><View style={{ gap: 10 }}>
      <Input value={searchText} onChangeText={setSearchText} placeholder="Código o nombre"
        accessibilityLabel="Buscar proyectos" onSubmitEditing={() => { setPage(1); setSearch(searchText.trim()); }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title="Buscar" variant="outline" onPress={() => { setPage(1); setSearch(searchText.trim()); }} />
        {([undefined, 'planned', 'active', 'completed', 'cancelled'] as const).map((value) =>
          <Button key={value || 'all'} title={value || 'Todos'}
            variant={status === value ? 'secondary' : 'outline'}
            onPress={() => { setStatus(value); setPage(1); }} />)}
      </View>
      {feedback ? <Text accessibilityRole="alert" style={{ color: colors.success }}>{feedback}</Text> : null}
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={() => setRefresh((value) => value + 1)} />
        : rows.length === 0 ? <EmptyState title="Sin proyectos" message="Ajusta filtros o crea un proyecto." />
          : rows.map((row) => <View key={row.id} style={{ flexDirection: 'row',
            flexWrap: 'wrap', alignItems: 'center', gap: 10, borderTopWidth: 1,
            borderColor: colors.border, paddingVertical: 12 }}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{row.name}</Text>
              <Text style={muted}>{row.code} · {row.status}</Text>
            </View>
            <Button title="Ver detalle" variant="outline" onPress={() => { void open(row.id); }} />
          </View>)}
      <Pagination page={page} totalPages={pages} onPageChange={setPage} />
    </View></Card>
    <Modal visible={mode !== null && !action} title={mode === 'create' ? 'Nuevo proyecto'
      : mode === 'edit' ? 'Editar proyecto' : 'Detalle del proyecto'}
      onClose={() => { setMode(null); setSelected(null); }}>
      {mode === 'detail' && selected ? <View style={{ gap: 12 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{selected.code} · {selected.name}</Text>
        <Text style={muted}>Estado: {selected.status}</Text>
        <Text style={muted}>{selected.description || 'Sin descripción'}</Text>
        <Text style={muted}>Inicio: {selected.startDate.slice(0, 10)} · Término: {selected.endDate?.slice(0, 10) || 'Sin definir'}</Text>
        <Text style={muted}>Presupuesto: {selected.budgetMinor === undefined ? 'Sin definir' : money(selected.budgetMinor)}</Text>
        <Text style={muted}>Responsable: {selected.ownerUserId}</Text>
        {formError ? <ErrorState message={formError} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {canEdit && ['planned', 'active'].includes(selected.status) &&
            <Button title="Editar" onPress={edit} />}
          {canEdit && selected.status === 'planned' &&
            <Button title="Activar" onPress={() => setAction('activate')} />}
          {canEdit && selected.status === 'active' &&
            <Button title="Completar" onPress={() => setAction('complete')} />}
          {canCancel && ['planned', 'active'].includes(selected.status) &&
            <Button title="Cancelar proyecto" variant="danger" onPress={() => setAction('cancel')} />}
        </View>
      </View> : mode === 'create' || mode === 'edit' ? <View>
        {([['code', 'Código'], ['name', 'Nombre'], ['description', 'Descripción'],
          ['startDate', 'Inicio (AAAA-MM-DD)'], ['endDate', 'Término (AAAA-MM-DD)'],
          ['budget', 'Presupuesto']] as [keyof Form, string][]).map(([key, label]) =>
          <Input key={key} label={label} value={form[key]}
            onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} />)}
        {canSelectOwner && <><Text style={muted}>Responsable</Text>
          <Select value={form.ownerUserId} onChange={(value) => setForm((current) =>
            ({ ...current, ownerUserId: value }))}
            options={[...owners, ...(!owners.some((row) => row.id === form.ownerUserId) &&
              selected?.ownerUserId === form.ownerUserId ? [{ id: selected.ownerUserId,
                name: 'Responsable actual' } as UserResponse] : [])]
              .map((row) => ({ value: row.id, label: row.name }))}
            placeholder="Cuenta actual" />
          <Pagination page={ownerPage} totalPages={ownerPages} onPageChange={setOwnerPage} /></>}
        {formError ? <ErrorState message={formError} /> : null}
        <Button title="Guardar" loading={saving} onPress={() => { void save(); }} />
      </View> : null}
    </Modal>
    <Modal visible={!!action} title="Confirmar cambio de proyecto" onClose={() => setAction(null)}>
      <Text style={muted}>El estado del proyecto cambiará a {action === 'activate' ? 'activo'
        : action === 'complete' ? 'completado' : 'cancelado'}.</Text>
      <Button title="Confirmar cambio" loading={saving} onPress={() => { void transition(); }} />
    </Modal>
  </View>;
}
