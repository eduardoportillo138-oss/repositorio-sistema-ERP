// ============================================
// Componente Table
// ============================================

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T) => string;
  onRowPress?: (item: T) => void;
  loading?: boolean;
}

export function Table<T>({ data, columns, keyExtractor, onRowPress, loading }: TableProps<T>) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No hay datos disponibles</Text>
      </View>
    );
  }

  const renderRow = (item: T) => (
    <View
      style={[styles.row, onRowPress && styles.rowPressable]}
      onPress={() => onRowPress?.(item)}
    >
      {columns.map((column) => (
        <View key={column.key} style={[styles.cell, { width: column.width }]}>
          {column.render ? column.render(item) : (
            <Text style={styles.cellText}>
              {String((item as any)[column.key] ?? '')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {columns.map((column) => (
          <View key={column.key} style={[styles.cell, styles.headerCell, { width: column.width }]}>
            <Text style={styles.headerText}>{column.header}</Text>
          </View>
        ))}
      </View>

      {/* Data */}
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => renderRow(item)}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  rowPressable: {
    activeOpacity: 0.7,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  headerCell: {
    backgroundColor: '#F5F5F5',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cellText: {
    fontSize: 14,
    color: '#333',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
});
