// ============================================
// Pantalla de Dashboard
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card } from '@erp/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { globalStyles, colors } from '../styles/global';
import { theme } from '../theme';

interface DashboardStats {
  todaySales: number;
  monthSales: number;
  yearSales: number;
  lowStockProducts: number;
  pendingInvoices: number;
  recentActivity: Array<{
    action: string;
    module: string;
    timestamp: string;
  }>;
}

export const DashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchDashboard = async () => {
    try {
      const response = await api.get<DashboardStats>('/reports/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
  };

  if (loading) {
    return (
      <View style={globalStyles.loading}>
        <Text style={{ color: colors.textSecondary }}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={globalStyles.screenContainer}>
      <Text style={globalStyles.title}>Dashboard</Text>
      <Text style={globalStyles.subtitle}>
        Bienvenido, {user?.name || 'Usuario'}
      </Text>

      {/* Tarjetas de estadísticas */}
      <FlatList
        data={[
          { title: 'Ventas Hoy', value: stats?.todaySales || 0, icon: '📊' },
          { title: 'Ventas Mes', value: stats?.monthSales || 0, icon: '📈' },
          { title: 'Stock Bajo', value: stats?.lowStockProducts || 0, icon: '⚠️' },
          { title: 'Facturas Pendientes', value: stats?.pendingInvoices || 0, icon: '📄' },
        ]}
        keyExtractor={(item) => item.title}
        numColumns={2}
        renderItem={({ item }) => (
          <Card title={item.title} style={styles.card}>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statIcon}>{item.icon}</Text>
          </Card>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
      />

      {/* Actividad reciente */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <View style={styles.section}>
          <Text style={globalStyles.title}>Actividad Reciente</Text>
          {stats.recentActivity.map((activity, index) => (
            <Card key={index} title={activity.action} subtitle={`${activity.module} - ${activity.timestamp}`} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingBottom: theme.spacing.md,
  },
  card: {
    flex: 1,
    margin: theme.spacing.xs,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statIcon: {
    fontSize: theme.fontSize.xl,
    marginTop: theme.spacing.xs,
  },
  section: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
});
