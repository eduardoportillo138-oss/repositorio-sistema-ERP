import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { apiClient, BranchResponse, CreateEmployeeRequest,
  EmployeeResponse } from '@erp/api-client';
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

const fields = [
  ['employeeNumber', 'Número de empleado'], ['name', 'Nombre'],
  ['email', 'Correo electrónico'], ['phone', 'Teléfono'],
  ['position', 'Puesto'], ['department', 'Departamento'],
  ['hireDate', 'Fecha de ingreso (AAAA-MM-DD)'],
] as const;
type Field = (typeof fields)[number][0];
const blank = (): CreateEmployeeRequest => ({ employeeNumber: '', name: '', email: '',
  phone: '', position: '', department: '', hireDate: '', branchId: '' });
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Operación fallida';

export function EmployeesScreen() {
  const { user } = useAuth();
  const canCreate = !!user?.permissions.includes('hr.create');
  const canEdit = !!user?.permissions.includes('hr.edit');
  const canDisable = !!user?.permissions.includes('hr.disable');
  const [rows, setRows] = useState<EmployeeResponse[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | undefined>('active');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<EmployeeResponse | null>(null);
  const [mode, setMode] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [form, setForm] = useState<CreateEmployeeRequest>(blank());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [branchPage, setBranchPage] = useState(1);
  const [branchPages, setBranchPages] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    apiClient.listEmployees({ page, limit: 20, search, status })
      .then((result) => { if (active) { setRows(result.data); setPages(result.pagination.pages); } })
      .catch((failure: unknown) => { if (active) setError(messageOf(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search, status, refresh]);
  useEffect(() => {
    if (mode !== 'create' && mode !== 'edit') return;
    let active = true;
    apiClient.listBranches({ page: branchPage, limit: 100 }).then((result) => {
      if (active) { setBranches(result.data.filter((row) => row.status === 'active'));
        setBranchPages(result.pagination.pages); }
    }).catch((failure: unknown) => { if (active) setFormError(messageOf(failure)); });
    return () => { active = false; };
  }, [mode, branchPage]);
  const open = async (id: string) => {
    try { setSelected((await apiClient.getEmployee(id)).data); setMode('detail'); setFormError(''); }
    catch (failure) { setError(messageOf(failure)); }
  };
  const edit = () => {
    if (!selected) return;
    setForm({ employeeNumber: selected.employeeNumber, name: selected.name,
      email: selected.email, phone: selected.phone || '', position: selected.position,
      department: selected.department, hireDate: selected.hireDate.slice(0, 10),
      branchId: selected.branchId });
    setBranchPage(1); setFormError(''); setMode('edit');
  };
  const save = async () => {
    if (['employeeNumber', 'name', 'email', 'position', 'department', 'hireDate',
      'branchId'].some((key) => !form[key as keyof CreateEmployeeRequest]?.trim())) {
      setFormError('Completa los campos obligatorios.'); return;
    }
    setSaving(true); setFormError('');
    try {
      const result = mode === 'edit' && selected
        ? await apiClient.updateEmployee(selected.id, form)
        : await apiClient.createEmployee(form);
      setSelected(result.data); setMode('detail');
      setFeedback(mode === 'edit' ? 'Empleado actualizado.' : 'Empleado creado.');
      setRefresh((value) => value + 1);
    } catch (failure) { setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  const deactivate = async () => {
    if (!selected) return;
    setSaving(true); setFormError('');
    try {
      setSelected((await apiClient.deactivateEmployee(selected.id)).data);
      setConfirm(false); setMode('detail'); setFeedback('Empleado desactivado.');
      setRefresh((value) => value + 1);
    } catch (failure) { setConfirm(false); setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  const muted = { color: colors.textSecondary, fontSize: 13 };
  return <View style={{ gap: 16 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Text accessibilityRole="header" style={{ color: colors.textPrimary,
        fontSize: 30, fontWeight: '700', flex: 1 }}>Empleados</Text>
      {canCreate && <Button title="Nuevo empleado" onPress={() => {
        setForm(blank()); setBranchPage(1); setFormError(''); setMode('create'); }} />}
    </View>
    <Card><View style={{ gap: 10 }}>
      <Input value={searchText} onChangeText={setSearchText} placeholder="Nombre, correo o número"
        accessibilityLabel="Buscar empleados" onSubmitEditing={() => { setPage(1); setSearch(searchText.trim()); }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title="Buscar" variant="outline" onPress={() => { setPage(1); setSearch(searchText.trim()); }} />
        {(['active', 'inactive', undefined] as const).map((value) =>
          <Button key={value || 'all'} title={value === 'active' ? 'Activos' : value === 'inactive' ? 'Inactivos' : 'Todos'}
            variant={status === value ? 'secondary' : 'outline'}
            onPress={() => { setStatus(value); setPage(1); }} />)}
      </View>
      {feedback ? <Text accessibilityRole="alert" style={{ color: colors.success }}>{feedback}</Text> : null}
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={() => setRefresh((value) => value + 1)} />
        : rows.length === 0 ? <EmptyState title="Sin empleados" message="Ajusta los filtros o registra un empleado." />
          : rows.map((row) => <View key={row.id} style={{ flexDirection: 'row', flexWrap: 'wrap',
            alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: colors.border,
            paddingVertical: 12 }}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{row.name}</Text>
              <Text style={muted}>{row.employeeNumber} · {row.position}</Text>
            </View>
            <StatusBadge status={row.status} />
            <Button title="Ver detalle" variant="outline" onPress={() => { void open(row.id); }} />
          </View>)}
      <Pagination page={page} totalPages={pages} onPageChange={setPage} />
    </View></Card>
    <Modal visible={mode !== null && !confirm} title={mode === 'create' ? 'Nuevo empleado'
      : mode === 'edit' ? 'Editar empleado' : 'Detalle del empleado'}
      onClose={() => { setMode(null); setSelected(null); }}>
      {mode === 'detail' && selected ? <View style={{ gap: 12 }}>
        {fields.map(([key, label]) => <View key={key}><Text style={muted}>{label}</Text>
          <Text style={{ color: colors.textPrimary }}>{key === 'hireDate'
            ? selected.hireDate.slice(0, 10) : selected[key] || '—'}</Text></View>)}
        <Text style={muted}>Sucursal: {selected.branchId}</Text>
        <StatusBadge status={selected.status} />
        {formError ? <ErrorState message={formError} /> : null}
        {selected.status === 'active' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {canEdit && <Button title="Editar" onPress={edit} />}
          {canDisable && <Button title="Desactivar" variant="danger" onPress={() => setConfirm(true)} />}
        </View>}
      </View> : mode === 'create' || mode === 'edit' ? <View>
        {fields.map(([key, label]) => <Input key={key} label={label}
          value={form[key] || ''} type={key === 'email' ? 'email' : 'text'}
          onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} />)}
        <Text style={muted}>Sucursal</Text>
        <Select value={form.branchId} onChange={(value) => setForm((current) =>
          ({ ...current, branchId: value }))}
          options={[...branches, ...(!branches.some((row) => row._id === form.branchId) &&
            selected?.branchId === form.branchId ? [{ _id: selected.branchId,
              name: 'Sucursal actual', code: '', status: 'active' }] : [])]
            .map((row) => ({ value: row._id, label: row.name }))}
          placeholder="Selecciona sucursal" />
        <Pagination page={branchPage} totalPages={branchPages} onPageChange={setBranchPage} />
        {formError ? <ErrorState message={formError} /> : null}
        <Button title="Guardar" onPress={() => { void save(); }} loading={saving} />
      </View> : null}
    </Modal>
    <Modal visible={confirm} title="Desactivar empleado" onClose={() => setConfirm(false)}>
      <Text style={muted}>El registro permanecerá en el historial.</Text>
      <Button title="Confirmar desactivación" variant="danger" loading={saving}
        onPress={() => { void deactivate(); }} />
    </Modal>
  </View>;
}
