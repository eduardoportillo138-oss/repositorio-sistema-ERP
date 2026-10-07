import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { apiClient, ApiError, BranchResponse } from '@erp/api-client';
import { useAuth } from '@erp/session';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState } from '../components/DataStates';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { colors, typography } from '../tokens';

type BranchInput = { name: string; code: string; address: string; city: string; country: string; phone: string; email: string };
const blank = (): BranchInput => ({ name: '', code: '', address: '', city: '', country: '', phone: '', email: '' });
export function BranchesScreen() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<BranchResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<BranchResponse | null>(null);
  const [form, setForm] = useState<BranchInput>(blank());
  const [saving, setSaving] = useState(false);
  const canCreate = !!user?.permissions.includes('branches.create');
  const canEdit = !!user?.permissions.includes('branches.edit');
  const canDisable = !!user?.permissions.includes('branches.disable');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setBranches((await apiClient.listBranches({ limit: 100 })).data); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudieron cargar las sucursales'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const openForm = (branch?: BranchResponse) => {
    setEditing(branch || null);
    setForm(branch ? { name: branch.name, code: branch.code, address: branch.address, city: branch.city,
      country: branch.country, phone: branch.phone || '', email: branch.email || '' } : blank());
    setFormOpen(true); setError('');
  };
  const save = async () => {
    setSaving(true); setError('');
    try {
      const body = { ...form, phone: form.phone || undefined, email: form.email || undefined };
      if (editing) await apiClient.updateBranch(editing._id, body);
      else await apiClient.createBranch(body);
      setFormOpen(false); setNotice(editing ? 'Sucursal actualizada.' : 'Sucursal creada.'); await load();
    } catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo guardar la sucursal'); }
    finally { setSaving(false); }
  };
  const deactivate = async () => {
    if (!deactivating) return;
    setSaving(true); setError('');
    try { await apiClient.deactivateBranch(deactivating._id); setNotice('Sucursal desactivada.'); setDeactivating(null); await load(); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo desactivar la sucursal'); }
    finally { setSaving(false); }
  };
  const field = (key: keyof BranchInput, label: string) => <Input key={key} label={label} value={form[key]}
    onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} />;
  return <View style={styles.page}>
    <View style={styles.heading}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.title}>Sucursales</Text>
      <Text style={styles.subtitle}>Ubicaciones y equipos de tu empresa</Text></View>
      {canCreate && <Button title="Nueva sucursal" onPress={() => openForm()} />}</View>
    {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    {error && !formOpen && !deactivating ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    {loading ? <Loading message="Cargando sucursales…" /> : branches.length ? branches.map((branch) =>
      <Card key={branch._id} testID={`branch-card-${branch._id}`} title={branch.name} subtitle={`${branch.code} · ${branch.city}, ${branch.country}`}>
        <View style={styles.actions}><Text style={branch.status === 'active' ? styles.active : styles.muted}>
          {branch.status === 'active' ? 'Activa' : 'Inactiva'}{branch.isMain ? ' · Principal' : ''}</Text>
          {canEdit && <Button title="Editar" variant="outline" onPress={() => openForm(branch)} />}
          {canDisable && branch.status === 'active' && <Button title="Desactivar" variant="danger" onPress={() => setDeactivating(branch)} />}
        </View>
      </Card>) : <EmptyState title="Sin sucursales" message="Agrega la primera ubicación de tu empresa." />}
    <Modal visible={formOpen} title={editing ? 'Editar sucursal' : 'Nueva sucursal'} onClose={() => setFormOpen(false)}>
      {field('name', 'Nombre')}{field('code', 'Código')}{field('address', 'Dirección')}
      {field('city', 'Ciudad')}{field('country', 'País')}{field('phone', 'Teléfono')}{field('email', 'Correo electrónico')}
      {error ? <ErrorState message={error} /> : null}
      <Button title="Guardar sucursal" onPress={() => void save()} loading={saving}
        disabled={!form.name.trim() || !form.code.trim() || !form.address.trim() || !form.city.trim() || !form.country.trim()} />
    </Modal>
    <Modal visible={!!deactivating} title="Desactivar sucursal" onClose={() => setDeactivating(null)}>
      <Text style={styles.confirm}>¿Desactivar {deactivating?.name}? No se permite si tiene usuarios activos asignados.</Text>
      {error ? <ErrorState message={error} /> : null}
      <View style={styles.actions}><Button title="Confirmar desactivación" variant="danger" onPress={() => void deactivate()} loading={saving} />
        <Button title="Cancelar" variant="outline" onPress={() => setDeactivating(null)} /></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({ page: { gap: 16 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { ...typography.Heading1, color: colors.textPrimary }, subtitle: { color: colors.textSecondary, marginTop: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, active: { color: colors.success, flex: 1 },
  muted: { color: colors.textSecondary, flex: 1 }, notice: { color: colors.success }, confirm: { color: colors.textPrimary, lineHeight: 22, marginBottom: 16 },
});
