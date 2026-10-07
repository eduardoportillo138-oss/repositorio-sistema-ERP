import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiClient, ApiError, RoleResponse } from '@erp/api-client';
import { useAuth } from '@erp/session';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState } from '../components/DataStates';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { colors, typography } from '../tokens';

export function RolesScreen() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<RoleResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<RoleResponse | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const available = (user?.permissions || []).filter((item) => !item.startsWith('platform.')).sort();
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRoles((await apiClient.listRoles({ limit: 100 })).data); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudieron cargar los roles'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const openForm = (role?: RoleResponse) => {
    setFormOpen(true);
    setEditing(role || null); setName(role?.name || ''); setDescription(role?.description || '');
    setPermissions(role ? [...role.permissions] : []); setNotice(''); setError('');
  };
  const save = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      const request = { name: name.trim(), description: description.trim(), permissions };
      if (editing) await apiClient.updateRole(editing.id, request);
      else await apiClient.createRole(request);
      setFormOpen(false); setEditing(null); setNotice(editing ? 'Rol actualizado.' : 'Rol creado.'); await load();
    } catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo guardar el rol'); }
    finally { setSaving(false); }
  };
  const deactivate = async () => {
    if (!deactivating) return;
    setSaving(true); setError('');
    try { await apiClient.deactivateRole(deactivating.id); setNotice('Rol desactivado.'); setDeactivating(null); await load(); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo desactivar el rol'); }
    finally { setSaving(false); }
  };
  return <View style={styles.page}>
    <View style={styles.heading}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.title}>Roles</Text>
      <Text style={styles.subtitle}>Controla el acceso mediante permisos de empresa</Text></View>
      {user?.permissions.includes('roles.manage') && <Button title="Nuevo rol" onPress={() => openForm()} />}</View>
    {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    {loading ? <Loading message="Cargando roles…" /> : roles.length ? roles.map((role) =>
      <Card key={role.id} title={role.name} subtitle={role.description || `${role.permissions.length} permisos`}>
        <View style={styles.cardActions}>
          <Text style={role.status === 'active' ? styles.active : styles.inactive}>{role.status === 'active' ? 'Activo' : 'Inactivo'}</Text>
          {role.isSystemRole ? <Text style={styles.muted}>Rol protegido</Text> : user?.permissions.includes('roles.manage') && <>
            <Button title="Editar" variant="outline" onPress={() => openForm(role)} />
            {role.status === 'active' && <Button title="Desactivar" variant="danger" onPress={() => setDeactivating(role)} />}
          </>}
        </View>
      </Card>) : <EmptyState title="Sin roles" message="Crea un rol para organizar los permisos del equipo." />}
    <Modal visible={formOpen && !deactivating} title={editing ? 'Editar rol' : 'Nuevo rol'} onClose={() => setFormOpen(false)}>
      <Input label="Nombre" value={name} onChangeText={setName} />
      <Input label="Descripción" value={description} onChangeText={setDescription} />
      <Text style={styles.permissionTitle}>Permisos que puedes asignar</Text>
      <ScrollView style={styles.permissionList} nestedScrollEnabled>
        {available.map((permission) => {
          const checked = permissions.includes(permission);
          return <Pressable key={permission} accessibilityRole="checkbox" accessibilityState={{ checked }}
            accessibilityLabel={permission} style={styles.permission} onPress={() => setPermissions((current) =>
              checked ? current.filter((item) => item !== permission) : [...current, permission])}>
            <Text style={[styles.check, checked && styles.checked]}>{checked ? '✓' : '○'}</Text>
            <Text style={styles.permissionText}>{permission}</Text>
          </Pressable>;
        })}
      </ScrollView>
      {error ? <ErrorState message={error} /> : null}
      <Button title="Guardar rol" onPress={() => void save()} loading={saving} disabled={!name.trim()} />
    </Modal>
    <Modal visible={!!deactivating} title="Desactivar rol" onClose={() => setDeactivating(null)}>
      <Text style={styles.confirm}>¿Desactivar {deactivating?.name}? Los usuarios que lo tengan asignado no podrán iniciar sesión.</Text>
      {error ? <ErrorState message={error} /> : null}
      <View style={styles.cardActions}><Button title="Confirmar desactivación" variant="danger" onPress={() => void deactivate()} loading={saving} />
        <Button title="Cancelar" variant="outline" onPress={() => setDeactivating(null)} /></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({ page: { gap: 16 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { ...typography.Heading1, color: colors.textPrimary }, subtitle: { color: colors.textSecondary, marginTop: 5 },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, active: { color: colors.success, flex: 1 },
  inactive: { color: colors.textSecondary, flex: 1 }, muted: { color: colors.textSecondary }, notice: { color: colors.success },
  permissionTitle: { fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  permissionList: { maxHeight: 360, marginBottom: 12 }, permission: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'center' },
  check: { color: colors.textSecondary, fontSize: 18, width: 22 }, checked: { color: colors.primary, fontWeight: '700' },
  permissionText: { color: colors.textPrimary, fontSize: 13 }, confirm: { color: colors.textPrimary, lineHeight: 22, marginBottom: 16 },
});
