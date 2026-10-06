import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { apiClient, ApiEnvelope } from '@erp/api-client';
import { useAuth } from '@erp/session';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { StatusBadge, ErrorState, EmptyState } from '../components/DataStates';
import { Loading } from '../components/Loading';
import { colors, typography } from '../tokens';
interface UserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  roleId: string;
  phone?: string;
}
interface Page<T> extends ApiEnvelope<T[]> {
  pagination: { page: number; pages: number; total: number };
}
export function UsersScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<UserRow | 'new' | null>(null),
    [removing, setRemoving] = useState<UserRow | null>(null);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ _id: string; name: string }>>([]);
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [roleId, setRoleId] = useState(''),
    [branchId, setBranchId] = useState('');
  const [saving, setSaving] = useState(false),
    [formError, setFormError] = useState('');
  const compact = useWindowDimensions().width < 768;
  const can = (permission: string) => !!user?.permissions.includes(permission);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiClient
      .listUsers(page)
      .then((response) => {
        if (active) {
          setRows(response.data);
          setPages(response.pagination.pages);
        }
      })
      .catch((failure: unknown) => {
        if (active)
          setError(failure instanceof Error ? failure.message : 'No se pudieron cargar usuarios');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, revision]);
  const open = async (row: UserRow | 'new') => {
    setEditing(row);
    setFormError('');
    setName(row === 'new' ? '' : row.name);
    setEmail(row === 'new' ? '' : row.email);
    setPassword('');
    setRoleId('');
    setBranchId('');
    if (row === 'new') {
      try {
        const response =
          await apiClient.get<
            Page<{ id: string; name: string; permissions: string[]; status: string }>
          >('/roles?limit=100');
        setRoles(
          response.data.filter(
            (role) =>
              role.status === 'active' && !role.permissions.some((p) => p.startsWith('platform.')),
          ),
        );
        try {
          const branchResponse = await apiClient.get<
            Page<{ _id: string; name: string; status: string }>
          >('/branches?limit=100');
          setBranches(branchResponse.data.filter((branch) => branch.status === 'active'));
        } catch {
          // Branch assignment is optional; users without branches.view can still create users.
          setBranches([]);
        }
      } catch (failure) {
        setFormError(failure instanceof Error ? failure.message : 'No se pudieron cargar roles');
      }
    }
  };
  const save = async () => {
    if (!editing || saving) return;
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        const normalizedEmail = email.trim().toLowerCase();
        const passwordBytes = encodeURIComponent(password).replace(/%[0-9A-F]{2}/g, 'x').length;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
          throw new Error('Ingresa un correo válido');
        }
        if (
          password.length < 8 ||
          passwordBytes > 72 ||
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password) ||
          !/\d/.test(password)
        ) {
          throw new Error('La contraseña requiere 8 caracteres, mayúscula, minúscula y número; máximo 72 bytes');
        }
        await apiClient.createUser({
          name: name.trim(),
          email: normalizedEmail,
          password,
          roleId,
          ...(branchId ? { branchId } : {}),
        });
      }
      else await apiClient.patch('/users/' + editing.id, { name });
      setEditing(null);
      setRevision(revision + 1);
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : 'No se pudo guardar');
    } finally {
      setPassword('');
      setSaving(false);
    }
  };
  const deactivate = async () => {
    if (!removing || saving) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.patch('/users/' + removing.id + '/deactivate');
      setRemoving(null);
      setRevision(revision + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo desactivar');
      setRemoving(null);
    } finally {
      setSaving(false);
    }
  };
  const actions = (row: UserRow) => (
    <View style={styles.actions}>
      {can('users.edit') && (
        <Button
          title="Editar"
          variant="outline"
          onPress={() => {
            void open(row);
          }}
        />
      )}
      {can('users.disable') && row.id !== user?.id && row.status === 'active' && (
        <Button title="Desactivar" variant="outline" onPress={() => setRemoving(row)} />
      )}
    </View>
  );
  return (
    <View style={{ gap: 20 }}>
      <View style={styles.heading}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            Usuarios
          </Text>
          <Text style={styles.subtitle}>El equipo de {user?.companyName || 'tu empresa'}</Text>
        </View>
        {can('users.create') && can('roles.view') && (
          <Button
            title="Nuevo usuario"
            onPress={() => {
              void open('new');
            }}
          />
        )}
      </View>
      {error ? (
        <ErrorState message={error} onRetry={() => setRevision(revision + 1)} />
      ) : loading ? (
        <Loading message="Cargando usuarios" />
      ) : !rows.length ? (
        <EmptyState title="No hay usuarios en esta página" />
      ) : compact ? (
        <View style={{ gap: 12 }}>
          {rows.map((row) => (
            <Card key={row.id} title={row.name} subtitle={row.email}>
              <StatusBadge status={row.status} />
              {actions(row)}
            </Card>
          ))}
        </View>
      ) : (
        <Table
          data={rows}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'name', header: 'Nombre' },
            { key: 'email', header: 'Correo' },
            {
              key: 'status',
              header: 'Estado',
              render: (row) => <StatusBadge status={row.status} />,
            },
            { key: 'actions', header: 'Acciones', render: actions },
          ]}
        />
      )}
      {!loading && !error && pages > 1 && (
        <View style={styles.actions}>
          <Button
            title="Anterior"
            onPress={() => setPage(page - 1)}
            disabled={page <= 1}
            variant="outline"
          />
          <Text style={styles.subtitle}>
            Página {page} de {pages}
          </Text>
          <Button
            title="Siguiente"
            onPress={() => setPage(page + 1)}
            disabled={page >= pages}
            variant="outline"
          />
        </View>
      )}
      <Modal
        visible={!!editing}
        title={editing === 'new' ? 'Nuevo usuario' : 'Editar usuario'}
        onClose={() => {
          if (!saving) {
            setEditing(null);
            setPassword('');
          }
        }}
      >
        <Input label="Nombre" value={name} onChangeText={setName} disabled={saving} />
        {editing === 'new' && (
          <>
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              disabled={saving}
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChangeText={setPassword}
              disabled={saving}
              accessibilityHint="Mínimo 8 caracteres, mayúsculas, minúsculas y números; máximo 72 bytes"
            />
            <Select
              value={roleId}
              onChange={setRoleId}
              options={roles.map((role) => ({ label: role.name, value: role.id }))}
              placeholder="Selecciona un rol"
              disabled={saving}
            />
            {branches.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Sucursal (opcional)</Text>
                <Select
                  value={branchId}
                  onChange={setBranchId}
                  options={branches.map((branch) => ({ label: branch.name, value: branch._id }))}
                  placeholder="Sin sucursal"
                  disabled={saving}
                />
              </>
            )}
          </>
        )}
        {formError && <ErrorState message={formError} />}
        <Button
          title="Guardar usuario"
          onPress={() => {
            void save();
          }}
          loading={saving}
          disabled={!name.trim() || (editing === 'new' && (!roleId || !email.trim() || !password))}
        />
      </Modal>
      <ConfirmationDialog
        visible={!!removing}
        title="Desactivar usuario"
        message={'Se desactivará el acceso de ' + (removing?.name || '') + '.'}
        onConfirm={() => {
          void deactivate();
        }}
        onCancel={() => {
          if (!saving) setRemoving(null);
        }}
        confirmText={saving ? 'Desactivando…' : 'Desactivar'}
        loading={saving}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  title: { ...typography.Heading1, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 22 },
  fieldLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 12 },
});
