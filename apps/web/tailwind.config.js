/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
        },
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        background: 'var(--bg-main)',
        surface: 'var(--color-surface)',
        card: {
          DEFAULT: 'var(--bg-card)',
          hover: 'var(--bg-card-hover)',
        },
        border: 'var(--border-color)',
        textMain: 'var(--text-main)',
        textMuted: 'var(--text-muted)',
        textSubtle: 'var(--color-text-subtle)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
      },
      fontFamily: {
        outfit: ['var(--font-family-base)', 'Outfit', 'sans-serif'],
        sans: ['var(--font-family-base)', 'sans-serif'],
      },
      borderRadius: {
        theme: 'var(--radius-base)',
      }
    },
  },
  plugins: [],
};
