import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { apiClient, ApiEnvelope, ApiError } from '@erp/api-client';
import { useAuth } from '@erp/session';
import { Card } from '../components/Card';
import { StatCard, ChartCard, Badge, DataState, ErrorState } from '../components/DataStates';
import { Button } from '../components/Button';
import { colors, typography } from '../tokens';

interface DashboardData {
  metrics?: Partial<Record<string, number>>;
  series?: Partial<Record<string, Array<{ label: string; value: number }>>>;
}
const metrics = [
  { key: 'sales', title: 'Ventas del mes', permission: 'sales.view' },
  { key: 'customers', title: 'Clientes activos', permission: 'customers.view' },
  { key: 'products', title: 'Productos activos', permission: 'products.view' },
  { key: 'suppliers', title: 'Proveedores', permission: 'suppliers.view' },
  { key: 'invoices', title: 'Facturas de venta', permission: 'sales.view' },
  { key: 'leads', title: 'Leads', permission: 'reports.view' },
  { key: 'lowStock', title: 'Stock bajo', permission: 'inventory.view' },
];
const charts = [
  { key: 'sales', title: 'Ventas en el tiempo', permission: 'sales.view' },
  { key: 'purchases', title: 'Compras en el tiempo', permission: 'purchases.view' },
];
export function DashboardScreen({
  modules = [],
  onNavigate,
}: {
  modules?: Array<{ key: string; label: string; subtitle: string }>;
  onNavigate?: (key: string) => void;
}) {
  const { user } = useAuth();
  const [state, setState] = useState<DataState>('loading'),
    [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0),
    [chart, setChart] = useState('sales');
  const compact = useWindowDimensions().width < 768;
  const permitted = (permission: string) => !!user?.permissions.includes(permission);
  useEffect(() => {
    let active = true;
    if (!permitted('reports.view')) {
      setState('unavailable');
      return;
    }
    setState('loading');
    setError('');
    apiClient
      .get<ApiEnvelope<DashboardData>>('/reports/dashboard')
      .then((response) => {
        if (active) {
          setData(response.data);
          setState(response.data?.metrics ? 'ready' : 'empty');
        }
      })
      .catch((failure: unknown) => {
        if (!active) return;
        setData(null);
        setState(
          failure instanceof ApiError && failure.status === 501 ? 'not-implemented' : 'error',
        );
        if (!(failure instanceof ApiError && failure.status === 501))
          setError(failure instanceof Error ? failure.message : 'No se pudieron cargar los datos');
      });
    return () => {
      active = false;
    };
  }, [attempt, user?.companyId, user?.permissions.join(',')]);
  const visibleCharts = charts.filter(
    (entry) => permitted(entry.permission) && Array.isArray(data?.series?.[entry.key]),
  );
  const selected = visibleCharts.find((entry) => entry.key === chart) || visibleCharts[0];
  const metricCards = metrics.filter((metric) => permitted(metric.permission));
  const mainKeys = ['sales', 'customers', 'products'];
  const renderMetric = (metric: (typeof metrics)[number]) => {
    const value = data?.metrics?.[metric.key];
    return (
      <StatCard
        key={metric.key}
        title={metric.title}
        value={value}
        state={state === 'ready' && !Number.isFinite(value) ? 'unavailable' : state}
      />
    );
  };
  return (
    <View style={styles.page}>
      <View style={styles.heading}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.overline}>TU ESPACIO DE TRABAJO</Text>
          <Text accessibilityRole="header" style={[styles.title, compact && { fontSize: 28 }]}>
            Dashboard
          </Text>
          <Text style={styles.subtitle}>
            Bienvenido, {user?.name}. Esta es la visión de tu empresa.
          </Text>
        </View>
        <Badge label="Vista general" />
      </View>
      <Card style={styles.welcome}>
        <View style={styles.welcomeRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.welcomeTitle}>Tu operación, en un solo lugar.</Text>
            <Text style={styles.welcomeText}>
              Accede a tus módulos y mantén a tu equipo conectado.
            </Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Text style={{ color: colors.primary, fontSize: 28 }}>▦</Text>
          </View>
        </View>
      </Card>
      {error && <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />}
      <View style={styles.grid}>
        {metricCards.filter((metric) => mainKeys.includes(metric.key)).map(renderMetric)}
      </View>
      <View style={styles.grid}>
        {metricCards.filter((metric) => !mainKeys.includes(metric.key)).map(renderMetric)}
      </View>
      {selected && (
        <View style={{ gap: 16 }}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Resumen de actividad</Text>
            <View style={styles.tabs}>
              {visibleCharts.map((entry) => (
                <Button
                  key={entry.key}
                  title={
                    entry.key === 'incomeExpenses'
                      ? 'Finanzas'
                      : entry.key === 'crm'
                        ? 'CRM'
                        : entry.title.split(' ')[0]
                  }
                  onPress={() => setChart(entry.key)}
                  variant={selected.key === entry.key ? 'secondary' : 'outline'}
                />
              ))}
            </View>
          </View>
          <ChartCard
            title={selected.title}
            state={state === 'ready' && !data?.series?.[selected.key] ? 'unavailable' : state}
            series={data?.series?.[selected.key]}
          />
        </View>
      )}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Explora tus módulos</Text>
        <Text style={styles.subtitle}>Accesos de tu empresa</Text>
      </View>
      <View style={styles.grid}>
        {modules
          .filter((module) => module.key !== 'dashboard')
          .map((module) => (
            <Card key={module.key} style={styles.module} onPress={() => onNavigate?.(module.key)}>
              <View style={styles.moduleIcon}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {module.label.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.moduleTitle}>{module.label}</Text>
              <Text style={styles.moduleText}>{module.subtitle}</Text>
              <Text style={styles.moduleLink}>Abrir módulo →</Text>
            </Card>
          ))}
      </View>
      {!metricCards.length && (
        <Card
          title="Tu espacio está listo"
          subtitle="Los módulos y métricas se mostrarán según los permisos de tu cuenta."
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { gap: 24 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  overline: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  title: { ...typography.Heading1, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, marginTop: 6 },
  welcome: { backgroundColor: colors.primaryLight, borderColor: '#E2D9FF' },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  welcomeTitle: { fontSize: 21, fontWeight: '600', color: colors.textPrimary },
  welcomeText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginTop: 8 },
  welcomeIcon: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  sectionTitle: { ...typography.Heading3, color: colors.textPrimary },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  module: { flexGrow: 1, flexBasis: 230, gap: 10 },
  moduleIcon: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  moduleText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  moduleLink: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 8 },
});
