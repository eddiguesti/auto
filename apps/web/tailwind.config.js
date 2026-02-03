/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Warm, muted olive/forest green (literary)
        primary: {
          DEFAULT: '#4A7C59',
          light: '#6B9B7A',
          dark: '#3A6147',
          muted: '#E8F0EA',
        },
        // Accent - Warm burgundy/wine
        accent: {
          DEFAULT: '#8B4557',
          light: '#A85D6F',
          muted: '#F5EAEC',
        },
        // Secondary - Soft gold for achievements
        secondary: {
          DEFAULT: '#C4A35A',
          light: '#D4B86A',
          muted: '#FCF8EF',
        },
        // Backgrounds - Warm, paper-like tones
        parchment: '#FDFBF7',
        cream: '#F7F4EF',
        surface: '#FFFFFF',
        // Text - Warm, readable ink colors
        ink: '#2D2A26',
        sepia: '#5A5651',
        warmgray: '#8A857D',
        // Legacy compatibility
        background: '#FDFBF7',
      },
      fontFamily: {
        // Cormorant - elegant serif for headings and display text
        display: ['Cormorant', 'Georgia', 'serif'],
        // Literata - optimized reading font for body text
        serif: ['Literata', 'Georgia', 'serif'],
        // System sans-serif for UI elements
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(45, 42, 38, 0.08)',
        'medium': '0 4px 12px rgba(45, 42, 38, 0.1)',
        'button': '0 3px 0 #3A6147',
      },
    },
  },
  plugins: [],
}
