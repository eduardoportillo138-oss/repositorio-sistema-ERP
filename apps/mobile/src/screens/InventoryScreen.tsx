// ============================================
// Mobile - Inventario Screen
// ============================================

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Card } from '@erp/ui';
import { useApi } from '../hooks/useApi';
import { colors } from '../theme';

export const InventoryScreen: React.FC = () => {
  const { data, loading } = useApi<any>('/inventory');

  if (loading) return <View style={styles.loading}><Text>Cargando...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventario</Text>
      <FlatList
        data={data?.data}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => (
          <Card title={item.productName} subtitle={`Stock: ${item.quantity}`}>
            <Text>Almacén: {item.warehouseName}</Text>
          </Card>
        )}
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
