import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F4EE',
        ink: '#191612',
        pine: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#450A0A',
        },
        brass: {
          100: '#F5EBD7',
          500: '#A97B2F',
          600: '#8F6524',
          700: '#75511D',
        },
        clay: '#C4552B',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(25 22 18 / 0.04), 0 1px 3px rgb(25 22 18 / 0.06)',
        lift: '0 8px 24px rgb(25 22 18 / 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
