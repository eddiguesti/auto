/** @type {import('tailwindcss').Config} */

// ─────────────────────────────────────────────────────────────────────────────
// Easy Memoir Design System — "Keepsake"
//
// One warm, literary palette. Ink for text and primary actions, bronze as the
// single accent, parchment neutrals for surfaces, quiet semantic colors.
// Legacy token names (sepia, heritage, primary…) are kept and re-pointed to
// harmonized values so every existing class resolves inside the new system.
// ─────────────────────────────────────────────────────────────────────────────

const ink = {
  DEFAULT: '#292420',
  soft: '#453E37',
  muted: '#6B6259'
}

// Warm brown workhorse — used across the app as text mid-tone, borders, fills.
const sepia = {
  50: '#FAF6F0',
  100: '#F3ECE1',
  200: '#E5D8C6',
  300: '#D2BEA4',
  400: '#B99C7C',
  500: '#9C7E5D',
  600: '#85684B',
  700: '#6C533C',
  800: '#54402F',
  900: '#3E2F23',
  DEFAULT: '#85684B'
}

// The single brand accent — burnished bronze. Progress, highlights, links.
const bronze = {
  50: '#FBF5EC',
  100: '#F5E9D5',
  200: '#EAD3AB',
  300: '#DCB87C',
  400: '#CC9C52',
  500: '#B88336',
  600: '#9E6C29',
  700: '#7F5522',
  800: '#61411D',
  900: '#463019',
  DEFAULT: '#B88336'
}

const semantic = {
  success: { DEFAULT: '#4E7A5A', soft: '#EDF3EE', strong: '#3C6147' },
  warning: { DEFAULT: '#A8741F', soft: '#FAF3E3', strong: '#8A5D15' },
  error: { DEFAULT: '#B0442C', soft: '#F9EDEA', strong: '#8F3320' },
  info: { DEFAULT: '#54708C', soft: '#EEF2F6', strong: '#41586F' }
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Core system ────────────────────────────────────────────────────
        ink,
        sepia,
        bronze,
        brand: bronze,
        success: semantic.success,
        warning: semantic.warning,
        error: semantic.error,
        info: semantic.info,

        // ── Surfaces ───────────────────────────────────────────────────────
        parchment: '#FBF8F3',
        cream: '#F5EFE6',
        surface: '#FFFFFF',
        background: '#FBF8F3',

        // ── Legacy aliases (harmonized, do not use in new code) ────────────
        warmgray: '#8C8579',
        primary: {
          DEFAULT: semantic.success.DEFAULT,
          light: '#6E947A',
          dark: semantic.success.strong,
          muted: semantic.success.soft
        },
        accent: {
          DEFAULT: '#8A4A54',
          light: '#A5666F',
          muted: '#F6ECED'
        },
        secondary: {
          DEFAULT: bronze[400],
          light: bronze[300],
          muted: bronze[50]
        },
        heritage: {
          cream: '#FBF8F3',
          card: '#FFFFFF',
          ink: ink.DEFAULT,
          text: ink.muted,
          sepia: sepia[500],
          'sepia-light': sepia[200],
          'sepia-dark': sepia[700],
          cta: bronze[500],
          'cta-hover': bronze[600],
          'cta-light': bronze[300],
          sage: semantic.success.DEFAULT,
          'sage-light': '#A9C2AC'
        }
      },
      fontFamily: {
        display: ['Boska', 'Georgia', 'serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['General Sans', 'system-ui', 'sans-serif']
      },
      fontSize: {
        // Senior-friendly reading sizes with tuned line heights
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        sm: ['0.9375rem', { lineHeight: '1.45rem' }],
        base: ['1.0625rem', { lineHeight: '1.65rem' }],
        lg: ['1.1875rem', { lineHeight: '1.8rem' }],
        xl: ['1.3125rem', { lineHeight: '1.85rem' }],
        '2xl': ['1.5625rem', { lineHeight: '2rem' }],
        '3xl': ['1.9375rem', { lineHeight: '2.35rem' }],
        '4xl': ['2.375rem', { lineHeight: '2.75rem' }],
        '5xl': ['3rem', { lineHeight: '3.3rem' }],
        '6xl': ['3.75rem', { lineHeight: '1.05' }],
        '7xl': ['4.5rem', { lineHeight: '1.03' }]
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px'
      },
      boxShadow: {
        // Layered, warm-tinted elevation — soft depth, never heavy
        xs: '0 1px 2px rgba(41, 36, 32, 0.05)',
        soft: '0 1px 2px rgba(41, 36, 32, 0.04), 0 2px 8px rgba(41, 36, 32, 0.05)',
        card: '0 1px 2px rgba(41, 36, 32, 0.04), 0 4px 16px rgba(41, 36, 32, 0.06)',
        lifted: '0 2px 4px rgba(41, 36, 32, 0.05), 0 8px 24px rgba(41, 36, 32, 0.09)',
        modal: '0 4px 12px rgba(41, 36, 32, 0.08), 0 24px 64px rgba(41, 36, 32, 0.18)',
        // Legacy aliases
        medium: '0 1px 2px rgba(41, 36, 32, 0.04), 0 4px 16px rgba(41, 36, 32, 0.06)',
        button: '0 1px 2px rgba(41, 36, 32, 0.12)'
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out both',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) both',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.21, 1.02, 0.73, 1) both',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' }
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' }
        }
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.21, 1.02, 0.73, 1)'
      },
      letterSpacing: {
        caps: '0.08em'
      },
      maxWidth: {
        page: '42rem',
        reading: '65ch'
      }
    }
  },
  plugins: []
}
