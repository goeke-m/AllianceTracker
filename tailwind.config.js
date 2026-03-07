/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-gold': '#FFD700',
        'game-silver': '#C0C0C0',
        'game-dark': '#0d0d1a',
        'game-card': '#16213e',
        'game-accent': '#1a3a6e',
        'game-highlight': '#e94560',
        'game-leadership': '#c9a227',
        'game-standard': '#4a90d9',
      },
    },
  },
  plugins: [],
}
