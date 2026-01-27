/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: '#f5f0e6',
        sepia: '#8b7355',
        ink: '#2c1810',
      }
    },
  },
  plugins: [],
}
