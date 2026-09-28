import React from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Button } from './Button';
import { colors, radius } from '../tokens';
export type DataState = 'loading' | 'ready' | 'empty' | 'unavailable' | 'not-implemented' | 'error';
const labels: Record<DataState, string> = {
  loading: 'Cargando',
  ready: 'Disponible',
  empty: 'Sin datos',
  unavailable: 'No disponible',
  'not-implemented': 'Próximamente',
  error: 'Error',
};
export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const foreground =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
        ? colors.warning
        : tone === 'danger'
          ? colors.danger
          : colors.textSecondary;
  const background =
    tone === 'success'
      ? colors.successLight
      : tone === 'warning'
        ? colors.warningLight
        : tone === 'danger'
          ? colors.dangerLight
          : colors.background;
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={{ fontSize: 12, color: foreground, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      label={status === 'active' ? 'Activo' : status === 'inactive' ? 'Inactivo' : status}
      tone={status === 'active' ? 'success' : 'neutral'}
    />
  );
}
export function EmptyState({
  title = 'Sin datos disponibles',
  message = 'Los registros aparecerán aquí cuando estén disponibles.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.error} accessibilityRole="alert">
        {message}
      </Text>
      {onRetry && <Button title="Reintentar" onPress={onRetry} variant="outline" />}
    </View>
  );
}
export function StatCard({
  title,
  value,
  state,
}: {
  title: string;
  value?: number | string;
  state: DataState;
}) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.caption}>{title}</Text>
      {state === 'loading' ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : (
        <Text style={styles.value}>{state === 'ready' && value !== undefined ? value : '—'}</Text>
      )}
      <Badge label={labels[state]} />
    </Card>
  );
}
export function ChartCard({
  title,
  state,
  series,
}: {
  title: string;
  state: DataState;
  series?: Array<{ label: string; value: number }>;
}) {
  const valid = series?.filter((point) => Number.isFinite(point.value));
  const max = Math.max(1, ...(valid?.map((point) => Math.abs(point.value)) || []));
  return (
    <Card title={title}>
      <View style={styles.chart}>
        {state === 'loading' ? (
          <ActivityIndicator color={colors.primary} />
        ) : state === 'ready' && valid?.length ? (
          <View style={styles.bars}>
            {valid.map((point, index) => (
              <View key={index} style={styles.barColumn}>
                <Text style={styles.caption}>{point.value}</Text>
                <View
                  style={{
                    width: 16,
                    height: (Math.abs(point.value) / max) * 100,
                    backgroundColor: colors.primary,
                    borderRadius: 4,
                  }}
                />
                <Text style={styles.caption}>{point.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title={
              state === 'not-implemented'
                ? 'Tu información, pronto aquí'
                : 'Datos aún no disponibles'
            }
            message="La gráfica aparecerá cuando existan datos verificados."
          />
        )}
      </View>
    </Card>
  );
}
const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.small,
  },
  state: { paddingVertical: 28, paddingHorizontal: 12, alignItems: 'center', gap: 12 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  message: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 330,
  },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  caption: { color: colors.textSecondary, fontSize: 13 },
  value: { color: colors.textPrimary, fontSize: 32, fontWeight: '700', marginVertical: 14 },
  stat: { flexGrow: 1, flexBasis: 160, minWidth: 144 },
  chart: {
    minHeight: 220,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 12,
    flexWrap: 'wrap',
  },
  barColumn: { alignItems: 'center', gap: 8 },
});
