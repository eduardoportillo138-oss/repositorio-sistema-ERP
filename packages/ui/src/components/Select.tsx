import { colors } from '../tokens';
// ============================================
// Componente Select
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Seleccione...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={selectedOption?.label || placeholder}
        accessibilityState={{ disabled, expanded: isOpen }}
      >
        <Text style={[styles.text, !selectedOption && styles.placeholder]}>
          {selectedOption?.label || placeholder}
        </Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdown}>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, item.value === value && styles.selectedOption]}
                onPress={() => {
                  onChange(item.value);
                  setIsOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: item.value === value }}
              >
                <Text
                  style={[styles.optionText, item.value === value && styles.selectedOptionText]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: 'relative',
  },
  trigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: colors.surface,
    maxHeight: 200,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  selectedOption: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  selectedOptionText: {
    color: colors.primary,
    fontWeight: '600',
  },
});
