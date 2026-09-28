import { colors } from '../tokens';
// ============================================
// Componente Table
// ============================================

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, DimensionValue } from 'react-native';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: DimensionValue;
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

  const renderRow = (item: T) => {
    const cells = columns.map((column) => (
      <View key={column.key} style={[styles.cell, { width: column.width }]}>
        {column.render ? (
          column.render(item)
        ) : (
          <Text style={styles.cellText}>{String((item as any)[column.key] ?? '')}</Text>
        )}
      </View>
    ));
    // A disabled pressable marks its nested action buttons as disabled on web.
    // Non-interactive rows must be plain containers.
    if (!onRowPress) return <View style={styles.row}>{cells}</View>;
    return (
      <TouchableOpacity style={styles.row} onPress={() => onRowPress(item)} activeOpacity={0.7}>
        {cells}
      </TouchableOpacity>
    );
  };

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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  headerCell: {
    paddingVertical: 14,
    backgroundColor: colors.background,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cellText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
  },
});
