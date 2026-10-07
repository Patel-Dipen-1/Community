/**
 * Global Centralized Design System & Theme Configuration
 * 
 * Changing tokens here updates colors, typography, spacing, borders,
 * buttons, cards, inputs, and UI styles across the entire application.
 */

export const colors = {
  // Brand Colors
  primary: '#f0e73dff',
  primaryLight: '#818cf8',
  primaryDark: '#312e81',
  secondary: '#38bdf8',
  secondaryDark: '#0284c7',
  accent: '#00a572',
  accentLight: '#4edea3',
  accentDark: '#16a34a',

  // Background & Surfaces
  background: '#020617',
  surface: '#0f172a',
  surfaceLight: '#1e293b',
  surfaceHighlight: '#151b2d',
  card: '#0f172a',

  // Borders
  border: '#1e293b',
  borderLight: '#334155',
  borderHighlight: '#475569',

  // Typography / Text Colors
  textMain: '#ffffff',
  textSecondary: '#f8fafc',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  textLight: '#cbd5e1',

  // Feedback & Status Colors
  success: '#16a34a',
  successLight: '#4ade80',
  successBg: 'rgba(16, 185, 129, 0.15)',

  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningBg: 'rgba(245, 158, 11, 0.15)',

  error: '#e11d48',
  errorLight: '#fb7185',
  errorBg: 'rgba(225, 29, 72, 0.15)',

  info: '#38bdf8',
  infoBg: 'rgba(56, 189, 248, 0.15)',

  // Overlays & Special Effects
  overlay: 'rgba(2, 6, 23, 0.85)',
  glassCard: 'rgba(15, 23, 42, 0.9)',
};

export const typography = {
  fontSize: {
    xs: 10,
    sm: 11,
    base: 13,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    title: 26,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '700' as const,
    bold: '800' as const,
    heavy: '900' as const,
  },
  lineHeight: {
    tight: 16,
    normal: 20,
    relaxed: 24,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
};

export default theme;
