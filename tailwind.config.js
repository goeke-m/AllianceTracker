/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-gold': '#f4c430',
        'game-silver': '#C0C0C0',
        'game-dark': '#0a0f12',
        'game-card': '#1a1209',
        'game-accent': '#3d2b1a',
        'game-highlight': '#cc2200',
        'game-leadership': '#c9a227',
        'game-standard': '#1a7a8a',
      },
    },
  },
  plugins: [],
}
