// ============================================
// Componente Pagination
// ============================================

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.pageButton, page <= 1 && styles.disabled]}
        onPress={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <Text style={styles.pageButtonText}>Anterior</Text>
      </TouchableOpacity>

      {pages.map((p) => (
        <TouchableOpacity
          key={p}
          style={[styles.pageButton, p === page && styles.activePage]}
          onPress={() => onPageChange(p)}
        >
          <Text style={[styles.pageButtonText, p === page && styles.activePageText]}>{p}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.pageButton, page >= totalPages && styles.disabled]}
        onPress={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        <Text style={styles.pageButtonText}>Siguiente</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  activePage: {
    backgroundColor: '#0066CC',
  },
  pageButtonText: {
    fontSize: 14,
    color: '#333',
  },
  activePageText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
