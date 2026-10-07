import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { apiClient, ApiEnvelope, ApiError } from '@erp/api-client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState } from '../components/DataStates';
import { Loading } from '../components/Loading';
import { colors } from '../tokens';

type Notification = { id: string; title: string; message: string; type: string; read: boolean; createdAt: string };
type Result = { data: Notification[]; unread: number };
export function NotificationsScreen() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await apiClient.get<ApiEnvelope<Result>>('/notifications');
      setRows(response.data.data || []); setUnread(response.data.unread || 0); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudieron cargar las notificaciones'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const markRead = async (id: string) => {
    setBusy(id); setError('');
    try { await apiClient.patch(`/notifications/${id}/read`); await load(); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo actualizar'); }
    finally { setBusy(''); }
  };
  const markAll = async () => {
    setBusy('all'); setError('');
    try { await apiClient.patch('/notifications/read-all'); await load(); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo actualizar'); }
    finally { setBusy(''); }
  };
  return <View style={styles.page}>
    {unread > 0 && <Button title={`Marcar ${unread} como leídas`} onPress={() => void markAll()} loading={busy === 'all'} variant="outline" />}
    {error && <ErrorState message={error} onRetry={() => void load()} />}
    {loading ? <Loading message="Cargando notificaciones…" /> : rows.length ? rows.map((row) =>
      <Card key={row.id} title={row.title} subtitle={new Date(row.createdAt).toLocaleString()}>
        <View style={styles.row}><Text style={styles.message}>{row.message}</Text>
          {!row.read && <Button title={busy === row.id ? 'Guardando…' : 'Marcar leída'} onPress={() => void markRead(row.id)} loading={busy === row.id} variant="outline" />}
        </View>
      </Card>) : <EmptyState title="Sin notificaciones" message="Las notificaciones de tu cuenta aparecerán aquí." />}
  </View>;
}
const styles = StyleSheet.create({ page: { gap: 14 }, row: { gap: 12 }, message: { color: colors.textPrimary, lineHeight: 21 } });
