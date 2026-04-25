/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F172A',
        surface: '#1E293B',
        buy: '#22C55E',
        hold: '#F59E0B',
        sell: '#EF4444',
        primary: '#F1F5F9',
        secondary: '#94A3B8',
      },
    },
  },
  plugins: [],
}
