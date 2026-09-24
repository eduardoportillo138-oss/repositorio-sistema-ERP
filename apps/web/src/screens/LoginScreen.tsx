// ============================================
// Pantalla de Login
// ============================================

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '@erp/ui';
import { Button } from '@erp/ui';
import { ErrorMessage } from '@erp/ui';
import { useAuth } from '../context/AuthContext';
import { globalStyles, colors } from '../styles/global';
import { theme } from '../theme';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[globalStyles.screenContainer, styles.container]}>
      <View style={styles.formContainer}>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          type="email"
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel="Email"
        />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          type="password"
          label="Contraseña"
          secureTextEntry
          accessibilityLabel="Contraseña"
        />
        {error ? <ErrorMessage message={error} /> : null}
        <Button
          title={loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          onPress={handleLogin}
          disabled={loading}
          variant="primary"
          style={styles.button}
          accessibilityLabel="Botón de inicio de sesión"
        />
        <Text style={styles.footerText}>ERP Empresarial v0.1.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    marginTop: theme.spacing.md,
  },
  footer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
});
