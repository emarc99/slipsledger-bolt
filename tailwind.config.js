/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf6ee',
          100: '#f3ead3',
          200: '#e6d3a8',
          300: '#d9bc7d',
          400: '#cda35c',
          500: '#b8893d',
          600: '#9c6f2e',
          700: '#7d5826',
          800: '#644822',
          900: '#4d381d',
          950: '#2b1f10',
        },
        surface: {
          50: '#faf9f7',
          100: '#f3f1ed',
          200: '#e5e2db',
          300: '#d0cbc1',
          400: '#a39d90',
          500: '#736d60',
          600: '#524d43',
          700: '#3b372f',
          800: '#26231e',
          900: '#181613',
          950: '#0e0d0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(24,22,19,.06), 0 1px 3px rgba(24,22,19,.1)',
        lift: '0 8px 24px rgba(24,22,19,.14)',
        glow: '0 0 40px rgba(184,137,61,.25), 0 0 80px rgba(184,137,61,.1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'stamp-in': {
          '0%': { opacity: '0', transform: 'scale(1.6) rotate(-14deg)' },
          '60%': { opacity: '1', transform: 'scale(.95) rotate(-8deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(-8deg)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.55' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s ease-out both',
        'stamp-in': 'stamp-in .45s cubic-bezier(.2,1.4,.4,1) both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2.8s linear infinite',
      },
    },
  },
  plugins: [],
};
