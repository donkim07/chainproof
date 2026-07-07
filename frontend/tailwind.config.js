/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9ecff',
          200: '#bcdeff',
          300: '#8ecaff',
          400: '#59abff',
          500: '#3388fc',
          600: '#1d6af1',
          700: '#1555de',
          800: '#1845b4',
          900: '#1a3d8e',
          950: '#152756',
        },
        surface: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
          card: '#1e293b',
          border: '#334155',
        },
        accent: {
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
  animation: {
    'fade-in': 'fadeIn 0.5s ease-out forwards',
    'slide-up': 'slideUp 0.4s ease-out forwards',
    'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
    'float': 'float 6s ease-in-out infinite',
    'float-delayed': 'float 6s ease-in-out 2s infinite',
    'scale-in': 'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    'shimmer': 'shimmer 2.5s linear infinite',
  },
  keyframes: {
    fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
    slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
    scaleIn: { '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' }, '100%': { opacity: '1', transform: 'scale(1) translateY(0)' } },
    pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
    float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
    shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
  },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
