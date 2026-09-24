// ============================================
// Componente Form
// ============================================

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

interface FormProps {
  children: React.ReactNode;
  onSubmit: () => void;
  isSubmitting?: boolean;
  style?: any;
}

export const Form: React.FC<FormProps> = ({ children, onSubmit, isSubmitting, style }) => {
  return (
    <ScrollView style={[styles.form, style]} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  form: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
});
