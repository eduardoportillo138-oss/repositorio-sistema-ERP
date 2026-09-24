// ============================================
// Pantalla Mobile - Login
// ============================================

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '@erp/ui';
import { Button } from '@erp/ui';
import { ErrorMessage } from '@erp/ui';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

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
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Input value={email} onChangeText={setEmail} placeholder="Email" label="Email" type="email" />
        <Input value={password} onChangeText={setPassword} placeholder="Contraseña" label="Contraseña" type="password" secureTextEntry />
        {error ? <ErrorMessage message={error} /> : null}
        <Button title={loading ? 'Iniciando...' : 'Iniciar Sesión'} onPress={handleLogin} disabled={loading} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#F5F6FA' },
  formContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
});
