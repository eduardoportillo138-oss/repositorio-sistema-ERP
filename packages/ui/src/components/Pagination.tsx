import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';
import { colors } from '../tokens';
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingVertical: 12,
      }}
    >
      <Button
        title="Anterior"
        variant="outline"
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
      />
      <Text style={{ color: colors.textSecondary }}>
        Página {page} de {totalPages}
      </Text>
      <Button
        title="Siguiente"
        variant="outline"
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
      />
    </View>
  );
}
