/**
 * Global Centralized Web Design System Theme Configuration
 * 
 * Changing tokens here or in app/globals.css updates colors, typography, spacing,
 * borders, buttons, cards, inputs, and UI styles across the entire Web application.
 */

export const theme = {
  colors: {
    primary: 'var(--color-primary, #6365f1ff)',
    primaryHover: 'var(--color-primary-hover, #4e46e5ff)',
    primaryLight: 'var(--color-primary-light, #818cf8)',
    secondary: 'var(--color-secondary, #38bdf8)',
    accent: 'var(--color-accent, #10b981)',

    background: 'var(--color-background, #090d16)',
    surface: 'var(--color-surface, #0f172a)',
    card: 'var(--color-card, rgba(15, 23, 42, 0.75))',
    cardHover: 'var(--color-card-hover, rgba(30, 41, 59, 0.85))',

    border: 'var(--color-border, rgba(255, 255, 255, 0.08))',

    textMain: 'var(--color-text-main, #f8fafc)',
    textMuted: 'var(--color-text-muted, #94a3b8)',
    textSubtle: 'var(--color-text-subtle, #64748b)',

    success: 'var(--color-success, #10b981)',
    warning: 'var(--color-warning, #f59e0b)',
    error: 'var(--color-error, #ef4444)',
  },
  fontFamily: {
    sans: "var(--font-family-base, 'Outfit', -apple-system, sans-serif)",
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
};

export default theme;
