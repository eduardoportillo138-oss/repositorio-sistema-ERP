// ============================================
// Mobile - Ventas Screen
// ============================================

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Card, Button } from '@erp/ui';
import { useApi } from '../hooks/useApi';
import { colors } from '../theme';

export const SalesScreen: React.FC = () => {
  const { data, loading } = useApi<any>('/sales');

  if (loading) return <View style={styles.loading}><Text>Cargando...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ventas</Text>
      <FlatList
        data={data?.data}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => <Card title={item.customerName} subtitle={`Total: $${item.total}`} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F5F6FA' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 16 },
});
