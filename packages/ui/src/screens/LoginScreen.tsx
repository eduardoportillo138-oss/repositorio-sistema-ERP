import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@erp/session';
import { ApiError } from '@erp/api-client';
import { ERPLogo } from '../components/ERPLogo';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorState } from '../components/DataStates';
import { colors, radius, typography } from '../tokens';

export function LoginScreen({
  developerSettings,
  checkBackendHealth,
}: {
  developerSettings?: React.ReactNode;
  checkBackendHealth?: () => Promise<{ status?: number; success: boolean; errorCode?: string }>;
}) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [companyId, setCompanyId] = useState('');
  const [error, setError] = useState(''),
    [retryable, setRetryable] = useState(false),
    [showCompany, setShowCompany] = useState(false);
  const wide = useWindowDimensions().width >= 1000;
  const [healthState, setHealthState] = useState<'checking' | 'ready' | 'error'>(
    checkBackendHealth ? 'checking' : 'ready',
  );
  const checkHealth = useCallback(async () => {
    if (!checkBackendHealth) return;
    setHealthState('checking');
    try {
      const result = await checkBackendHealth();
      setHealthState(result.success && result.status === 200 ? 'ready' : 'error');
    } catch {
      setHealthState('error');
    }
  }, [checkBackendHealth]);
  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);
  const submit = async () => {
    if (isLoading || healthState !== 'ready') return;
    setError('');
    setRetryable(false);
    if (!email.trim() || !password) {
      setError('Escribe tu correo y contraseña.');
      return;
    }
    try {
      await login(email, password, companyId);
    } catch (failure) {
      setRetryable(
        failure instanceof ApiError &&
          ['NETWORK_ERROR', 'DNS_ERROR', 'TLS_ERROR', 'TIMEOUT', 'UPSTREAM_UNAVAILABLE'].includes(
            failure.code || '',
          ),
      );
      if (
        failure instanceof ApiError &&
        (failure.code === 'TIMEOUT' || failure.code === 'UPSTREAM_UNAVAILABLE')
      ) {
        setError('El servidor tardó en responder. Reintenta.');
      } else {
        setError(failure instanceof Error ? failure.message : 'No se pudo iniciar sesión');
      }
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, wide && styles.wide]}
        keyboardShouldPersistTaps="handled"
      >
        {wide && (
          <View style={styles.story}>
            <View style={styles.wordmark}>
              <ERPLogo size="sm" />
              <Text style={styles.brand}>ERP Empresarial</Text>
            </View>
            <View style={styles.storyBody}>
              <Text style={styles.eyebrow}>UN ESPACIO PARA TU EMPRESA</Text>
              <Text style={styles.hero}>Todo conectado. Todo bajo control.</Text>
              <Text style={styles.heroBody}>
                Organiza tu equipo y construye una operación más clara, desde cualquier lugar.
              </Text>
              <View style={styles.brandTile}>
                <ERPLogo size="lg" />
              </View>
              <View style={styles.features}>
                {['Multiempresa', 'Acceso por roles', 'Web y móvil'].map((label) => (
                  <View key={label} style={styles.feature}>
                    <Text style={styles.featureText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={styles.footnote}>Una identidad. Toda tu operación.</Text>
          </View>
        )}
        <View style={styles.formSide}>
          <View style={styles.form}>
            <ERPLogo size="md" />
            <Text style={styles.eyebrow}>ERP EMPRESARIAL</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Bienvenido de nuevo
            </Text>
            <Text style={styles.subtitle}>Ingresa para acceder a tu espacio de trabajo.</Text>
            {developerSettings}
            <Input
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              type="email"
              placeholder="nombre@empresa.com"
              autoCapitalize="none"
              autoComplete="email"
              disabled={isLoading}
              returnKeyType="next"
            />
            <Input
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              type="password"
              placeholder="Tu contraseña"
              autoComplete="current-password"
              disabled={isLoading}
              returnKeyType="go"
              onSubmitEditing={() => {
                void submit();
              }}
            />
            <Button
              title={showCompany ? 'Ocultar empresa' : 'Usar identificador de empresa'}
              onPress={() => {
                setShowCompany(!showCompany);
                if (showCompany) setCompanyId('');
              }}
              variant="outline"
              disabled={isLoading}
            />
            {showCompany && (
              <View style={{ marginTop: 16 }}>
                <Input
                  label="Identificador de empresa"
                  value={companyId}
                  onChangeText={setCompanyId}
                  placeholder="Identificador proporcionado por tu administrador"
                  autoCapitalize="none"
                  disabled={isLoading}
                  accessibilityHint="Úsalo si tu correo existe en varias empresas"
                />
              </View>
            )}
            {healthState === 'checking' || isLoading ? (
              <Text accessibilityRole="alert" style={styles.health}>Cargando servidor...</Text>
            ) : healthState === 'error' ? (
              <ErrorState
                message="No se pudo conectar con el servidor."
                onRetry={() => void checkHealth()}
              />
            ) : error ? (
              <ErrorState message={error} onRetry={retryable ? () => void submit() : undefined} />
            ) : (
              <View style={{ height: 20 }} />
            )}
            <Button
              title="Iniciar sesión"
              onPress={() => {
                void submit();
              }}
              loading={isLoading}
              disabled={healthState !== 'ready'}
            />
            <Text style={styles.help}>
              ¿Necesitas acceso? Contacta al administrador de tu empresa.
            </Text>
            <Text style={styles.footer}>ERP Empresarial · Espacio seguro de trabajo</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center' },
  wide: { flexDirection: 'row', minHeight: 760 },
  story: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    padding: 48,
    justifyContent: 'space-between',
  },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  storyBody: { maxWidth: 520, gap: 20, marginVertical: 40 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    fontWeight: '700',
    marginVertical: 12,
  },
  hero: { fontSize: 46, lineHeight: 54, fontWeight: '700', color: colors.textPrimary },
  heroBody: { fontSize: 17, lineHeight: 28, color: colors.textSecondary, maxWidth: 400 },
  brandTile: {
    width: 200,
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feature: {
    borderWidth: 1,
    borderColor: '#D9CFFD',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  featureText: { fontSize: 12, color: colors.primaryDark },
  footnote: { fontSize: 13, color: colors.textSecondary },
  formSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  form: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    borderRadius: radius.large,
  },
  title: { ...typography.Heading2, color: colors.textPrimary, marginBottom: 8 },
  subtitle: { ...typography.Body, color: colors.textSecondary, marginBottom: 28 },
  health: { color: colors.textSecondary, marginVertical: 12 },
  help: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
  },
  footer: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 32 },
});
