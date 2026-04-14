/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: 'var(--color-bg-app)',
        surface: 'var(--color-bg-surface)',
        primary: '#8a1c22',
        main: 'var(--color-text-main)',
        muted: 'var(--color-text-muted)',
        border: 'var(--color-border)',
        brand: {
          maroon: '#8a1c22',
          gold: '#fbbf24',
          black: '#1f1f1f',
        },
      }
    },
  },
  plugins: [],
}
