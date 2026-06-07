/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        eco: {
          50: '#E6F5EF',
          100: '#C2E6D6',
          200: '#8ED1B1',
          300: '#56B788',
          400: '#2DA168',
          500: '#0F4C3A',
          600: '#0D4232',
          700: '#0A3629',
          800: '#082B20',
          900: '#051C15',
          950: '#0A1612',
        },
        warning: {
          400: '#FF8F5E',
          500: '#FF6B35',
          600: '#E5551A',
        },
        data: {
          400: '#5A8EF0',
          500: '#2D6CDF',
          600: '#1A55C2',
        },
        kitchen: '#F59E0B',
        recyclable: '#10B981',
        hazardous: '#EF4444',
        other: '#6B7280',
      },
      fontFamily: {
        sans: ['"Source Han Sans CN"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'count-up': 'countUp 0.8s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(15, 76, 58, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(15, 76, 58, 0.8), 0 0 30px rgba(15, 76, 58, 0.4)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.25)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.35)',
        'glow-eco': '0 0 20px rgba(45, 161, 104, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
