// ============================================
// Mobile - Notificaciones Screen
// ============================================

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Card } from '@erp/ui';

export const NotificationsScreen: React.FC = () => {
  // Placeholder preparado para integración futura
  const notifications = [
    { id: '1', title: 'Notificación del sistema', message: 'Sistema operativo', time: 'Hace 5 min' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notificaciones</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Card title={item.title} subtitle={item.message} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F5F6FA' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  list: { paddingBottom: 16 },
});
