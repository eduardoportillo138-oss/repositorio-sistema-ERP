export const colors = {
  primary: '#602CF5',
  primaryDark: '#4820BF',
  primaryLight: '#F0EBFF',
  background: '#F7F8FC',
  surface: '#FFFFFF',
  textPrimary: '#1D2333',
  textSecondary: '#606779',
  border: '#E7E9F1',
  success: '#137A56',
  warning: '#8A5800',
  danger: '#B42336',
  successLight: '#E8F6EF',
  warningLight: '#FFF4D8',
  dangerLight: '#FFF0F1',
  text: '#1D2333',
  textLight: '#606779',
  secondary: '#606779',
  error: '#B42336',
  divider: '#E7E9F1',
  overlay: 'rgba(21, 18, 40, 0.45)',
} as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { small: 8, medium: 12, large: 20, card: 20, full: 9999 } as const;
export const typography = {
  Heading1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  Heading2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  Heading3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  Body: { fontSize: 15, lineHeight: 23 },
  Caption: { fontSize: 12, lineHeight: 18 },
  Label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 20 },
} as const;
export const breakpoints = { mobile: 768, desktop: 1100 } as const;
export const theme = {
  colors,
  spacing,
  borderRadius: { sm: 8, md: 12, lg: 20, xl: 24, full: 9999 },
  fontSize: { xs: 12, sm: 13, md: 15, lg: 18, xl: 24, xxl: 32 },
} as const;
export const borderRadius = theme.borderRadius;
export const fontSize = theme.fontSize;
