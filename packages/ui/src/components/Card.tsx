import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius } from '../tokens';
export interface CardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  style?: StyleProp<ViewStyle>;
}
export function Card({
  title,
  subtitle,
  children,
  onPress,
  variant = 'default',
  style,
}: CardProps) {
  const content = (
    <>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </>
  );
  const appearance = [styles.card, variant === 'elevated' && styles.elevated, style];
  return onPress ? (
    <Pressable
      onPress={onPress}
      style={appearance}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {content}
    </Pressable>
  ) : (
    <View style={appearance}>{content}</View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 24,
    minWidth: 0,
  },
  elevated: {
    shadowColor: '#292043',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
});
