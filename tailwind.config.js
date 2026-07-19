/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-primary': '#2fb6f5',
        'game-silver': '#b8c4cc',
        'game-dark': '#0a0e14',
        'game-card': '#131a22',
        'game-accent': '#2c3a48',
        'game-highlight': '#dc2626',
        'game-leadership': '#e0a938',
        'game-standard': '#2f8fae',
      },
    },
  },
  plugins: [],
}
