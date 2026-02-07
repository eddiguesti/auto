/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary - Warm, muted olive/forest green (literary)
        primary: {
          DEFAULT: '#4A7C59',
          light: '#6B9B7A',
          dark: '#3A6147',
          muted: '#E8F0EA'
        },
        // Accent - Warm burgundy/wine
        accent: {
          DEFAULT: '#8B4557',
          light: '#A85D6F',
          muted: '#F5EAEC'
        },
        // Secondary - Soft gold for achievements
        secondary: {
          DEFAULT: '#C4A35A',
          light: '#D4B86A',
          muted: '#FCF8EF'
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

        // Design 1 - "Warm Heritage" (optimized for seniors/memoir)
        heritage: {
          // Warm cream backgrounds (less harsh than white)
          cream: '#FBF7F2',
          card: '#FFFCF9',
          // Text - warm tones with high contrast
          ink: '#3D3833',
          text: '#6B6560',
          // Nostalgic sepia tones
          sepia: '#9C7B5C',
          'sepia-light': '#D4C4B0',
          'sepia-dark': '#7A6248',
          // CTA - Terracotta (warm, visible, high conversion)
          cta: '#D97853',
          'cta-hover': '#C4613D',
          'cta-light': '#E8946F',
          // Success - Sage green
          sage: '#7A9B76',
          'sage-light': '#A8C4A4'
        }
      },
      fontFamily: {
        // Boska - elegant serif for headings and display text (Fontshare)
        display: ['Boska', 'Georgia', 'serif'],
        // Lora - warm readable serif for memoir body text
        serif: ['Lora', 'Georgia', 'serif'],
        // General Sans - modern sans-serif for UI elements (Fontshare)
        sans: ['General Sans', 'system-ui', 'sans-serif']
      },
      animation: {
        shimmer: 'shimmer 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite'
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' }
        }
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px'
      },
      boxShadow: {
        soft: '0 2px 8px rgba(45, 42, 38, 0.08)',
        medium: '0 4px 12px rgba(45, 42, 38, 0.1)',
        button: '0 3px 0 #3A6147'
      }
    }
  },
  plugins: []
}
