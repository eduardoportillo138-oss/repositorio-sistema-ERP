import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { apiClient, ApiEnvelope, ApiError } from '@erp/api-client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorState } from '../components/DataStates';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { colors, typography } from '../tokens';

type Settings = { locale: string; timeZone: string; dateFormat: string };
const choices = {
  locale: ['es-MX', 'en-US'],
  timeZone: ['America/Mexico_City', 'America/Monterrey', 'America/Tijuana', 'UTC'],
  dateFormat: ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'],
} as const;

export function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const load = async () => {
    setState('loading'); setError('');
    try { setSettings((await apiClient.get<ApiEnvelope<Settings>>('/settings')).data); setState('ready'); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo cargar la configuración'); setState('error'); }
  };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    if (!settings) return;
    setSaving(true); setError(''); setSaved(false);
    try { setSettings((await apiClient.patch<ApiEnvelope<Settings>>('/settings', settings)).data); setSaved(true); }
    catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo guardar'); }
    finally { setSaving(false); }
  };
  if (state === 'loading') return <Loading message="Cargando preferencias…" />;
  if (state === 'error') return <ErrorState message={error} onRetry={() => void load()} />;
  if (!settings) return null;
  return <View style={styles.page}>
    <View><Text style={styles.title}>Configuración</Text><Text style={styles.subtitle}>Preferencias de presentación de la empresa</Text></View>
    <Card title="Idioma y región" subtitle="Estas preferencias solo cambian cómo se presentan las fechas y etiquetas.">
      <Input label="Zona horaria" value={settings.timeZone}
        onChangeText={(timeZone) => setSettings({ ...settings, timeZone })}
        placeholder="America/Mexico_City" />
      {Object.entries(choices).map(([key, values]) => <View key={key} style={styles.group}>
        <Text style={styles.label}>{key === 'locale' ? 'Idioma' : key === 'dateFormat' ? 'Formato de fecha' : 'Zona horaria sugerida'}</Text>
        <View style={styles.options}>{values.map((value) => <Button key={value} title={value}
          variant={settings[key as keyof Settings] === value ? 'secondary' : 'outline'}
          onPress={() => setSettings({ ...settings, [key]: value })} />)}</View>
      </View>)}
      {error && <ErrorState message={error} />}
      {saved && <Text accessibilityRole="alert" style={styles.saved}>Preferencias guardadas.</Text>}
      <Button title="Guardar preferencias" onPress={() => void save()} loading={saving} />
    </Card>
  </View>;
}
const styles = StyleSheet.create({ page: { gap: 20 }, title: { ...typography.Heading1, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: 5 }, group: { marginBottom: 16 },
  label: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  options: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, saved: { color: colors.success, marginBottom: 12 },
});
