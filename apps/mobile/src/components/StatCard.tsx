// ============================================
// Componente StatCard para Mobile
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@erp/ui';
import { colors } from '../theme';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: string;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = colors.primary }) => {
  return (
    <Card style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    alignItems: 'center',
    margin: 4,
  },
  icon: { fontSize: 24, marginBottom: 8 },
  value: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  title: { fontSize: 12, color: '#666', textAlign: 'center' },
});
