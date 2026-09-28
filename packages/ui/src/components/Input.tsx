import React, { useState } from 'react';
import { Text, TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { colors, radius } from '../tokens';
export interface InputProps extends Omit<TextInputProps, 'onChange' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
}
export function Input({ label, error, disabled, type = 'text', style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        editable={!disabled}
        keyboardType={
          props.keyboardType ||
          (type === 'email' ? 'email-address' : type === 'number' ? 'numeric' : 'default')
        }
        secureTextEntry={props.secureTextEntry || type === 'password'}
        accessibilityLabel={props.accessibilityLabel || label || props.placeholder}
        accessibilityHint={error || props.accessibilityHint}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          focused && { borderColor: colors.primary },
          !!error && { borderColor: colors.danger },
          disabled && { opacity: 0.6 },
          style,
        ]}
      />
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { marginBottom: 16, minWidth: 0 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    fontSize: 15,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
});
