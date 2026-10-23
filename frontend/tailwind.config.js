/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef2ff',
          100: '#e0e8ff',
          200: '#c7d4fd',
          300: '#a4b5fb',
          400: '#7f8ef6',
          500: '#5c67ee',
          600: '#3f48e2',
          700: '#2f37c9',
          800: '#1e225a',
          900: '#111536',
          950: '#080a1f',
        },
        primary: {
          DEFAULT: '#1e3a8a',
          light: '#2563eb',
          dark: '#1e2a5e',
        },
        accent: '#f59e0b',
        success: '#10b981',
        danger:  '#ef4444',
        warning: '#f59e0b',
        info:    '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        panel: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
      },
    },
  },
  plugins: [],
}
