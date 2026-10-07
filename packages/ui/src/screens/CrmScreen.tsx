import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { apiClient, CreateLeadRequest, CreateOpportunityRequest, CustomerResponse,
  LeadResponse, OpportunityResponse } from '@erp/api-client';
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

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Operación fallida';
const muted = { color: colors.textSecondary, fontSize: 13 };
const money = (minor: number) => (minor / 100).toFixed(2);
function parseMinor(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

function LeadsPane() {
  const { user } = useAuth();
  const canCreate = !!user?.permissions.includes('crm.create');
  const canEdit = !!user?.permissions.includes('crm.edit');
  const canDisable = !!user?.permissions.includes('crm.disable');
  const [rows, setRows] = useState<LeadResponse[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadResponse['status'] | undefined>();
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<LeadResponse | null>(null);
  const [mode, setMode] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [form, setForm] = useState<CreateLeadRequest>({ name: '', source: '',
    companyName: '', email: '', phone: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    apiClient.listLeads({ page, limit: 20, search, status })
      .then((result) => { if (active) { setRows(result.data); setPages(result.pagination.pages); } })
      .catch((failure: unknown) => { if (active) setError(messageOf(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search, status, refresh]);
  const open = async (id: string) => {
    try { setSelected((await apiClient.getLead(id)).data); setMode('detail'); setFormError(''); }
    catch (failure) { setError(messageOf(failure)); }
  };
  const save = async () => {
    if (!form.name.trim() || !form.source.trim()) {
      setFormError('Nombre y origen son obligatorios.'); return;
    }
    setSaving(true); setFormError('');
    try {
      const result = mode === 'edit' && selected
        ? await apiClient.updateLead(selected.id, form) : await apiClient.createLead(form);
      setSelected(result.data); setMode('detail');
      setFeedback(mode === 'edit' ? 'Lead actualizado.' : 'Lead creado.');
      setRefresh((value) => value + 1);
    } catch (failure) { setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  const change = async (action: 'qualify' | 'deactivate') => {
    if (!selected) return;
    setSaving(true); setFormError('');
    try {
      setSelected((action === 'qualify' ? await apiClient.qualifyLead(selected.id)
        : await apiClient.deactivateLead(selected.id)).data);
      setConfirm(false); setFeedback(action === 'qualify' ? 'Lead calificado.' : 'Lead desactivado.');
      setRefresh((value) => value + 1);
    } catch (failure) { setConfirm(false); setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  return <View style={{ gap: 12 }}>
    {canCreate && <Button title="Nuevo lead" onPress={() => {
      setForm({ name: '', source: '', companyName: '', email: '', phone: '' });
      setFormError(''); setMode('create'); }} />}
    <Card><View style={{ gap: 10 }}>
      <Input value={searchText} onChangeText={setSearchText} placeholder="Nombre, empresa o correo"
        accessibilityLabel="Buscar leads" onSubmitEditing={() => { setPage(1); setSearch(searchText.trim()); }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title="Buscar" variant="outline" onPress={() => { setPage(1); setSearch(searchText.trim()); }} />
        {([undefined, 'new', 'qualified', 'inactive'] as const).map((value) =>
          <Button key={value || 'all'} title={value || 'Todos'}
            variant={status === value ? 'secondary' : 'outline'}
            onPress={() => { setStatus(value); setPage(1); }} />)}
      </View>
      {feedback ? <Text accessibilityRole="alert" style={{ color: colors.success }}>{feedback}</Text> : null}
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={() => setRefresh((value) => value + 1)} />
        : rows.length === 0 ? <EmptyState title="Sin leads" message="Ajusta filtros o crea un lead." />
          : rows.map((row) => <View key={row.id} style={{ flexDirection: 'row',
            flexWrap: 'wrap', alignItems: 'center', gap: 10, borderTopWidth: 1,
            borderColor: colors.border, paddingVertical: 12 }}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{row.name}</Text>
              <Text style={muted}>{row.companyName || row.source} · {row.status}</Text>
            </View>
            <Button title="Ver lead" variant="outline" onPress={() => { void open(row.id); }} />
          </View>)}
      <Pagination page={page} totalPages={pages} onPageChange={setPage} />
    </View></Card>
    <Modal visible={mode !== null && !confirm} title={mode === 'create' ? 'Nuevo lead'
      : mode === 'edit' ? 'Editar lead' : 'Detalle del lead'}
      onClose={() => { setMode(null); setSelected(null); }}>
      {mode === 'detail' && selected ? <View style={{ gap: 12 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{selected.name}</Text>
        <Text style={muted}>Estado: {selected.status} · Origen: {selected.source}</Text>
        <Text style={muted}>{selected.companyName || 'Sin empresa'} · {selected.email || 'Sin correo'} · {selected.phone || 'Sin teléfono'}</Text>
        {formError ? <ErrorState message={formError} /> : null}
        {selected.status !== 'inactive' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {canEdit && <Button title="Editar lead" onPress={() => {
            setForm({ name: selected.name, source: selected.source,
              companyName: selected.companyName || '', email: selected.email || '',
              phone: selected.phone || '' }); setFormError(''); setMode('edit'); }} />}
          {canEdit && selected.status === 'new' &&
            <Button title="Calificar" onPress={() => { void change('qualify'); }} />}
          {canDisable && <Button title="Desactivar lead" variant="danger" onPress={() => setConfirm(true)} />}
        </View>}
      </View> : mode === 'create' || mode === 'edit' ? <View>
        {([['name', 'Nombre'], ['companyName', 'Empresa'], ['email', 'Correo electrónico'],
          ['phone', 'Teléfono'], ['source', 'Origen']] as [keyof CreateLeadRequest, string][])
          .map(([key, label]) => <Input key={key} label={label} value={form[key] || ''}
            onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} />)}
        {formError ? <ErrorState message={formError} /> : null}
        <Button title="Guardar lead" loading={saving} onPress={() => { void save(); }} />
      </View> : null}
    </Modal>
    <Modal visible={confirm} title="Desactivar lead" onClose={() => setConfirm(false)}>
      <Text style={muted}>El lead permanecerá en el historial.</Text>
      <Button title="Confirmar desactivación" variant="danger" loading={saving}
        onPress={() => { void change('deactivate'); }} />
    </Modal>
  </View>;
}

type OpportunityForm = { title: string; amount: string; expectedCloseDate: string;
  sourceType: 'lead' | 'customer'; sourceId: string };
const blankOpportunity = (): OpportunityForm => ({ title: '', amount: '',
  expectedCloseDate: '', sourceType: 'lead', sourceId: '' });
function OpportunitiesPane() {
  const { user } = useAuth();
  const canCreate = !!user?.permissions.includes('crm.create');
  const canEdit = !!user?.permissions.includes('crm.edit');
  const canDisable = !!user?.permissions.includes('crm.disable');
  const [rows, setRows] = useState<OpportunityResponse[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OpportunityResponse['stage'] | undefined>();
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<OpportunityResponse | null>(null);
  const [mode, setMode] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [form, setForm] = useState<OpportunityForm>(blankOpportunity());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<'proposal' | 'negotiation' | 'won' | 'lost' | 'cancelled' | null>(null);
  const [leads, setLeads] = useState<LeadResponse[]>([]);
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [sourceSearch, setSourceSearch] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    apiClient.listOpportunities({ page, limit: 20, search, status })
      .then((result) => { if (active) { setRows(result.data); setPages(result.pagination.pages); } })
      .catch((failure: unknown) => { if (active) setError(messageOf(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search, status, refresh]);
  useEffect(() => {
    if (mode !== 'create' && mode !== 'edit') return;
    let active = true;
    const pending = form.sourceType === 'lead'
      ? apiClient.listLeads({ search: sourceSearch, limit: 20 })
      : apiClient.listCustomers({ search: sourceSearch, status: 'active', limit: 20 });
    pending.then((result) => {
      if (!active) return;
      if (form.sourceType === 'lead') setLeads((result.data as LeadResponse[])
        .filter((row) => row.status !== 'inactive'));
      else setCustomers(result.data as CustomerResponse[]);
    }).catch((failure: unknown) => { if (active) setFormError(messageOf(failure)); });
    return () => { active = false; };
  }, [mode, form.sourceType, sourceSearch]);
  const open = async (id: string) => {
    try { setSelected((await apiClient.getOpportunity(id)).data); setMode('detail');
      setFormError(''); }
    catch (failure) { setError(messageOf(failure)); }
  };
  const save = async () => {
    const amountMinor = parseMinor(form.amount);
    if (!form.title.trim() || !form.sourceId || amountMinor === null) {
      setFormError('Título, monto y lead o cliente son obligatorios.'); return;
    }
    const payload: CreateOpportunityRequest = { title: form.title, amountMinor,
      ...(form.sourceType === 'lead' ? { leadId: form.sourceId } : { customerId: form.sourceId }),
      ...(form.expectedCloseDate ? { expectedCloseDate: form.expectedCloseDate } : {}) };
    setSaving(true); setFormError('');
    try {
      const result = mode === 'edit' && selected
        ? await apiClient.updateOpportunity(selected.id, payload)
        : await apiClient.createOpportunity(payload);
      setSelected(result.data); setMode('detail');
      setFeedback(mode === 'edit' ? 'Oportunidad actualizada.' : 'Oportunidad creada.');
      setRefresh((value) => value + 1);
    } catch (failure) { setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  const change = async () => {
    if (!selected || !action) return;
    setSaving(true); setFormError('');
    try {
      setSelected((action === 'cancelled' ? await apiClient.cancelOpportunity(selected.id)
        : await apiClient.setOpportunityStage(selected.id, action)).data);
      setFeedback('Etapa actualizada.'); setAction(null); setRefresh((value) => value + 1);
    } catch (failure) { setAction(null); setFormError(messageOf(failure)); }
    finally { setSaving(false); }
  };
  const actions: Record<string, Array<'proposal' | 'negotiation' | 'won' | 'lost'>> = {
    prospecting: ['proposal', 'negotiation', 'lost'],
    proposal: ['negotiation', 'won', 'lost'], negotiation: ['won', 'lost'],
  };
  return <View style={{ gap: 12 }}>
    {canCreate && <Button title="Nueva oportunidad" onPress={() => {
      setForm(blankOpportunity()); setFormError(''); setSourceSearch(''); setMode('create'); }} />}
    <Card><View style={{ gap: 10 }}>
      <Input value={searchText} onChangeText={setSearchText} placeholder="Título"
        accessibilityLabel="Buscar oportunidades" onSubmitEditing={() => { setPage(1); setSearch(searchText.trim()); }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title="Buscar" variant="outline" onPress={() => { setPage(1); setSearch(searchText.trim()); }} />
        {([undefined, 'prospecting', 'proposal', 'negotiation', 'won', 'lost',
          'cancelled'] as const).map((value) => <Button key={value || 'all'}
          title={value || 'Todos'} variant={status === value ? 'secondary' : 'outline'}
          onPress={() => { setStatus(value); setPage(1); }} />)}
      </View>
      {feedback ? <Text accessibilityRole="alert" style={{ color: colors.success }}>{feedback}</Text> : null}
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={() => setRefresh((value) => value + 1)} />
        : rows.length === 0 ? <EmptyState title="Sin oportunidades" message="Ajusta filtros o registra una." />
          : rows.map((row) => <View key={row.id} style={{ flexDirection: 'row',
            flexWrap: 'wrap', alignItems: 'center', gap: 10, borderTopWidth: 1,
            borderColor: colors.border, paddingVertical: 12 }}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{row.title}</Text>
              <Text style={muted}>{money(row.amountMinor)} · {row.stage}</Text>
            </View>
            <Button title="Ver oportunidad" variant="outline" onPress={() => { void open(row.id); }} />
          </View>)}
      <Pagination page={page} totalPages={pages} onPageChange={setPage} />
    </View></Card>
    <Modal visible={mode !== null && !action} title={mode === 'create' ? 'Nueva oportunidad'
      : mode === 'edit' ? 'Editar oportunidad' : 'Detalle de oportunidad'}
      onClose={() => { setMode(null); setSelected(null); }}>
      {mode === 'detail' && selected ? <View style={{ gap: 12 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{selected.title}</Text>
        <Text style={muted}>Monto: {money(selected.amountMinor)} · Etapa: {selected.stage}</Text>
        <Text style={muted}>Origen: {selected.leadId ? 'Lead ' + selected.leadId : 'Cliente ' + selected.customerId}</Text>
        <Text style={muted}>Cierre esperado: {selected.expectedCloseDate?.slice(0, 10) || 'Sin fecha'}</Text>
        {formError ? <ErrorState message={formError} /> : null}
        {actions[selected.stage] && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {canEdit && <Button title="Editar oportunidad" onPress={() => {
            setForm({ title: selected.title, amount: money(selected.amountMinor),
              expectedCloseDate: selected.expectedCloseDate?.slice(0, 10) || '',
              sourceType: selected.leadId ? 'lead' : 'customer',
              sourceId: selected.leadId || selected.customerId || '' });
            setSourceSearch(''); setFormError(''); setMode('edit'); }} />}
          {canEdit && actions[selected.stage].map((next) => <Button key={next}
            title={'Mover a ' + next} variant="outline" onPress={() => setAction(next)} />)}
          {canDisable && <Button title="Cancelar oportunidad" variant="danger"
            onPress={() => setAction('cancelled')} />}
        </View>}
      </View> : mode === 'create' || mode === 'edit' ? <View>
        <Input label="Título" value={form.title} onChangeText={(value) =>
          setForm((current) => ({ ...current, title: value }))} />
        <Input label="Monto" value={form.amount} onChangeText={(value) =>
          setForm((current) => ({ ...current, amount: value }))} />
        <Input label="Cierre esperado (AAAA-MM-DD)" value={form.expectedCloseDate}
          onChangeText={(value) => setForm((current) => ({ ...current, expectedCloseDate: value }))} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['lead', 'customer'] as const).map((sourceType) => <Button key={sourceType}
            title={sourceType === 'lead' ? 'Lead' : 'Cliente'}
            variant={form.sourceType === sourceType ? 'secondary' : 'outline'}
            onPress={() => { setForm((current) => ({ ...current, sourceType, sourceId: '' }));
              setSourceSearch(''); }} />)}
        </View>
        <Input label="Buscar origen" value={sourceSearch} onChangeText={setSourceSearch} />
        <Select value={form.sourceId} onChange={(value) => setForm((current) =>
          ({ ...current, sourceId: value }))}
          options={[(form.sourceType === 'lead' ? leads : customers).map((row) =>
            ({ value: row.id, label: row.name })),
          ...(!((form.sourceType === 'lead' ? leads : customers).some((row) =>
            row.id === form.sourceId)) && form.sourceId
            ? [[{ value: form.sourceId, label: 'Origen seleccionado' }]] : [])].flat()}
          placeholder={form.sourceType === 'lead' ? 'Selecciona lead' : 'Selecciona cliente'} />
        {formError ? <ErrorState message={formError} /> : null}
        <Button title="Guardar oportunidad" loading={saving} onPress={() => { void save(); }} />
      </View> : null}
    </Modal>
    <Modal visible={!!action} title="Confirmar etapa" onClose={() => setAction(null)}>
      <Text style={muted}>La oportunidad pasará a {action}.</Text>
      <Button title="Confirmar etapa" loading={saving} onPress={() => { void change(); }} />
    </Modal>
  </View>;
}

export function CrmScreen() {
  const [tab, setTab] = useState<'leads' | 'opportunities'>('leads');
  return <View style={{ gap: 16 }}>
    <Text accessibilityRole="header" style={{ color: colors.textPrimary,
      fontSize: 30, fontWeight: '700' }}>CRM</Text>
    <Text style={muted}>Leads y oportunidades de tu empresa.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button title="Leads" variant={tab === 'leads' ? 'primary' : 'outline'}
        onPress={() => setTab('leads')} />
      <Button title="Oportunidades" variant={tab === 'opportunities' ? 'primary' : 'outline'}
        onPress={() => setTab('opportunities')} />
    </View>
    {tab === 'leads' ? <LeadsPane /> : <OpportunitiesPane />}
  </View>;
}
