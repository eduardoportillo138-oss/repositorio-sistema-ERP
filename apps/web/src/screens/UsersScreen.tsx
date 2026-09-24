// ============================================
// Pantalla de Usuarios
// ============================================

import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Button, Table } from '@erp/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { globalStyles, colors } from '../styles/global';
import { theme } from '../theme';

interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  status: string;
}

export const UsersScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUsers = async () => {
    try {
      const response = await api.get<{ data: User[]; total: number }>('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <View style={globalStyles.loading}>
        <Text style={{ color: colors.textSecondary }}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <View style={globalStyles.screenContainer}>
      <View style={styles.header}>
        <Text style={globalStyles.title}>Usuarios</Text>
        <Button title="+ Nuevo" onPress={() => {}} variant="primary" />
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <Card title={item.name} subtitle={item.email}>
            <Text style={styles.roleText}>Rol: {item.role}</Text>
            <Text style={[styles.statusText, item.status === 'active' ? styles.statusActive : styles.statusInactive]}>
              {item.status === 'active' ? 'Activo' : 'Inactivo'}
            </Text>
          </Card>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  list: {
    paddingBottom: theme.spacing.md,
  },
  roleText: {
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
  },
  statusActive: {
    color: colors.success,
    fontWeight: '600',
  },
  statusInactive: {
    color: colors.error,
    fontWeight: '600',
  },
});
