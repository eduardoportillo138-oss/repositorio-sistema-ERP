// ============================================
// Tema del ERP
// ============================================

export const colors = {
  primary: '#0066CC',
  primaryDark: '#0052A3',
  secondary: '#6C757D',
  secondaryDark: '#545B62',
  background: '#F5F6FA',
  surface: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  error: '#DC3545',
  errorLight: '#FFF3CD',
  success: '#28A745',
  successLight: '#D4EDDA',
  warning: '#FFC107',
  warningLight: '#FFF3CD',
  border: '#E0E0E0',
  divider: '#EEEEEE',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
} as const;
