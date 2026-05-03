/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0b',
          secondary: '#111113',
          card: '#18181b',
          'card-hover': '#1f1f23',
        },
        accent: {
          DEFAULT: '#d4a853',
          hover: '#e0b964',
          dim: 'rgba(212,168,83,0.15)',
        },
        text: {
          primary: '#f5f5f0',
          secondary: '#a1a1aa',
          muted: '#71717a',
        },
        border: {
          DEFAULT: '#27272a',
          light: '#3f3f46',
        },
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', '"Times New Roman"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.4em',
        kicker: '0.35em',
        category: '0.3em',
        button: '0.15em',
        wide2: '0.1em',
      },
      borderRadius: {
        DEFAULT: '0',
        sm: '0',
        md: '2px',
        lg: '4px',
      },
    },
  },
  plugins: [],
}
