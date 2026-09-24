// ============================================
// Pantalla Mobile - Dashboard
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Card } from '@erp/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors } from '../theme';

export const DashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/reports/dashboard');
      setStats(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) {
    return <View style={styles.loading}><Text>Cargando...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text>Bienvenido, {user?.name}</Text>
      <FlatList
        data={[
          { title: 'Ventas Hoy', value: stats?.todaySales || 0 },
          { title: 'Ventas Mes', value: stats?.monthSales || 0 },
          { title: 'Stock Bajo', value: stats?.lowStock || 0 },
          { title: 'Facturas Pendientes', value: stats?.pendingInvoices || 0 },
        ]}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => <Card title={item.title}><Text>{item.value}</Text></Card>}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchDashboard} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F5F6FA' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 16 },
});
