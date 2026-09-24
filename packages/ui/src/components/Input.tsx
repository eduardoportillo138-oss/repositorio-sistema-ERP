// ============================================
// Componente Input
// ============================================

import React from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
}

export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder = '',
  secureTextEntry = false,
  disabled = false,
  error,
  label,
  type = 'text',
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        editable={!disabled}
        keyboardType={type === 'number' ? 'numeric' : type === 'email' ? 'email-address' : 'default'}
        accessibilityLabel={label || placeholder}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  inputError: {
    borderColor: '#DC3545',
  },
  errorText: {
    color: '#DC3545',
    fontSize: 12,
    marginTop: 4,
  },
});
