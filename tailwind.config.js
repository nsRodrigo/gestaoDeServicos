/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#141414',
        'surface-hover': '#1c1c1c',
        border: '#262626',
        gold: {
          DEFAULT: '#d4af37',
          light: '#e8cc6a',
          dark: '#a8862a',
        },
        foreground: '#f5f5f5',
        muted: '#9a9a9a',
        success: '#22c55e',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(212,175,55,0.35)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'toast-in': {
          from: { transform: 'translateY(0.5rem)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
