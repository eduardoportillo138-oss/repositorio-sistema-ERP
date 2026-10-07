import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { apiClient, ApiEnvelope, ApiError } from '@erp/api-client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DataState, EmptyState, ErrorState } from '../components/DataStates';
import { Loading } from '../components/Loading';
import { colors, typography } from '../tokens';

type ReportKind = 'sales' | 'inventory' | 'finance';
type ReportPayload = Record<string, unknown>;
const labels: Record<ReportKind, string> = { sales: 'Ventas', inventory: 'Inventario', finance: 'Finanzas' };

export function ReportsScreen() {
  const [kind, setKind] = useState<ReportKind>('sales');
  const [state, setState] = useState<DataState>('loading');
  const [data, setData] = useState<ReportPayload | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const load = useCallback(async () => {
    setState('loading'); setError('');
    try {
      const response = await apiClient.get<ApiEnvelope<ReportPayload>>(`/reports/${kind}`);
      setData(response.data || null); setState(response.data ? 'ready' : 'empty');
    } catch (failure) {
      setData(null); setState('error');
      setError(failure instanceof ApiError ? failure.message : 'No se pudo cargar el reporte');
    }
  }, [kind]);
  useEffect(() => { void load(); }, [load, attempt]);
  const rows = data ? Object.entries(data).filter(([key, value]) => key !== 'unit' && key !== 'currency' && value !== undefined) : [];
  return <View style={styles.page}>
    <View><Text accessibilityRole="header" style={styles.title}>Reportes</Text><Text style={styles.subtitle}>Datos operativos de tu empresa</Text></View>
    <View style={styles.tabs}>{(Object.keys(labels) as ReportKind[]).map((item) =>
      <Button key={item} title={labels[item]} onPress={() => setKind(item)}
        accessibilityLabel={`Reporte ${labels[item]}`}
        variant={kind === item ? 'secondary' : 'outline'} />)}</View>
    {state === 'loading' && <Loading message="Cargando reporte…" />}
    {state === 'error' && <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />}
    {state === 'empty' && <EmptyState title="Sin datos" message="Aún no hay información para este reporte." />}
    {state === 'ready' && <Card title={labels[kind]} subtitle={data?.unit === 'minor' ? 'Importes expresados en unidades monetarias menores.' : undefined}>
      <View style={{ gap: 14 }}>{rows.map(([key, value]) => <View key={key} style={styles.row}>
        <Text style={styles.key}>{key}</Text>
        <Text style={styles.value}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</Text>
      </View>)}</View>
    </Card>}
  </View>;
}

const styles = StyleSheet.create({ page: { gap: 20 }, title: { ...typography.Heading1, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: 5 }, tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  key: { color: colors.textSecondary, textTransform: 'capitalize', flex: 1 },
  value: { color: colors.textPrimary, fontWeight: '600', flex: 2, textAlign: 'right' },
});
