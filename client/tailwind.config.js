/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEEDFE',
          100: '#CECBF6',
          200: '#AFA9EC',
          300: '#9090E4',
          400: '#7F77DD',
          500: '#6B62CA',
          600: '#534AB7',
          700: '#453D99',
          800: '#3C3489',
          900: '#26215C',
        },
        neon: {
          purple: '#7F77DD',
          teal: '#1D9E75',
          amber: '#EF9F27',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      animation: {
        'pulse-soft': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up': 'slideUp .25s ease',
        pop: 'pop .15s ease',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)',
        'gradient-dark': 'linear-gradient(180deg, #09090B 0%, #18181B 100%)',
      },
    },
  },
  plugins: [],
};
