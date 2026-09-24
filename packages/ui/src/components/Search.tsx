// ============================================
// Componente Search
// ============================================

import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface SearchProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const Search: React.FC<SearchProps> = ({ value, onChangeText, placeholder = 'Buscar...' }) => {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        accessibilityLabel="Buscar"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});
