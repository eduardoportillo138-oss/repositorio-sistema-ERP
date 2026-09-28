import { colors } from '../tokens';
// ============================================
// Componente ConfirmationDialog
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal visible={visible} onClose={onCancel} title={title}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.buttonRow}>
        <Button title={cancelText} variant="outline" onPress={onCancel} disabled={loading} />
        <Button title={confirmText} variant={variant} onPress={onConfirm} loading={loading} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  message: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
