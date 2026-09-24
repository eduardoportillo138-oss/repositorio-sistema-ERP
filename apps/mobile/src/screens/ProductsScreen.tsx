// ============================================
// Mobile - Productos Screen
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Card, Input, Button } from '@erp/ui';
import { useApi } from '../hooks/useApi';
import { colors } from '../theme';

interface Product {
  productId: string;
  name: string;
  code: string;
  unitPrice: number;
  stockCurrent: number;
}

export const ProductsScreen: React.FC = () => {
  const { data, loading, error, refetch } = useApi<{ data: Product[] }>('/products');
  const [search, setSearch] = useState('');

  if (loading) return <View style={styles.loading}><Text>Cargando...</Text></View>;
  if (error) return <View style={styles.error}><Text>{error}</Text></View>;

  const filtered = data?.data?.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <View style={styles.container}>
      <Input value={search} onChangeText={setSearch} placeholder="Buscar producto..." />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => (
          <Card title={item.name} subtitle={item.code}>
            <Text>Precio: ${item.unitPrice}</Text>
            <Text>Stock: {item.stockCurrent}</Text>
          </Card>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F5F6FA' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  list: { paddingBottom: 16 },
});
