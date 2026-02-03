/**
 * Theme System
 * Premium memoir aesthetic with elegant typography
 *
 * Design: Luxurious, literary, warm, sophisticated
 * Typography: Cormorant (headings) + Literata (body)
 * Inspired by: Luxury publishing, hardcover books, The New Yorker
 */

import { Platform } from 'react-native';

// Premium font families
export const fonts = {
  // Cormorant - elegant serif for headings and display text
  display: 'Cormorant_700Bold',
  displayMedium: 'Cormorant_600SemiBold',
  displayRegular: 'Cormorant_500Medium',

  // Literata - optimized reading font for body text
  body: 'Literata_400Regular',
  bodyMedium: 'Literata_500Medium',
  bodySemiBold: 'Literata_600SemiBold',
  bodyBold: 'Literata_700Bold',

  // System sans-serif for UI elements
  sans: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: '-apple-system, BlinkMacSystemFont, sans-serif',
  }) as string,

  // Mono for numbers/stats
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'SF Mono, Menlo, monospace',
  }) as string,

  // Fallbacks for web
  serifFallback: Platform.select({
    web: 'Cormorant, Georgia, serif',
    default: 'Cormorant_400Regular',
  }) as string,
};

// Memoir-inspired color palette
export const colors = {
  // Primary - Warm, muted olive/forest green (literary)
  primary: '#4A7C59',
  primaryLight: '#6B9B7A',
  primaryDark: '#3A6147',
  primaryMuted: '#E8F0EA',

  // Accent - Warm burgundy/wine for highlights
  accent: '#8B4557',
  accentLight: '#A85D6F',
  accentMuted: '#F5EAEC',

  // Secondary - Soft gold for achievements
  secondary: '#C4A35A',
  secondaryLight: '#D4B86A',
  secondaryMuted: '#FCF8EF',

  // Backgrounds - Warm, paper-like tones
  background: '#FDFBF7',
  backgroundAlt: '#F7F4EF',
  backgroundWarm: '#FBF8F3',
  surface: '#FFFFFF',
  surfaceHover: '#FAF8F5',

  // Text - Warm, readable ink colors
  text: '#2D2A26',
  textSecondary: '#5A5651',
  textMuted: '#8A857D',
  textOnPrimary: '#FFFFFF',

  // Semantic
  success: '#4A7C59',
  warning: '#C4A35A',
  error: '#B54B4B',
  info: '#5B7B8C',

  // Gamification (subtle, not garish)
  streak: '#C4A35A',
  xp: '#5B7B8C',
  gold: '#C4A35A',
  heart: '#8B4557',

  // UI Elements
  border: '#E5E1DA',
  borderLight: '#F0EDE8',
  divider: '#EAE6E0',
  overlay: 'rgba(45, 42, 38, 0.5)',

  // Legacy (for compatibility)
  parchment: '#FDFBF7',
  cream: '#F7F4EF',
  sepia: '#5A5651',
  ink: '#2D2A26',
  amber: '#C4A35A',
  white: '#FFFFFF',
  black: '#1A1917',
  gray: '#8A857D',
  lightGray: '#F0EDE8',
  green: '#4A7C59',
  red: '#B54B4B',
  recording: '#B54B4B',
  waveform: '#4A7C59',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

// Elegant, subtle shadows
export const shadows = {
  sm: {
    shadowColor: '#2D2A26',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#2D2A26',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#2D2A26',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    shadowColor: '#4A7C59',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 3,
  },
};

// Premium typography with Cormorant + Literata
export const typography = {
  // Display headings - elegant Cormorant
  display: {
    fontSize: 38,
    fontFamily: fonts.display,
    lineHeight: 46,
    color: colors.text,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 32,
    fontFamily: fonts.display,
    lineHeight: 40,
    color: colors.text,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 26,
    fontFamily: fonts.displayMedium,
    lineHeight: 34,
    color: colors.text,
  },
  h3: {
    fontSize: 22,
    fontFamily: fonts.displayMedium,
    lineHeight: 30,
    color: colors.text,
  },

  // Body text - Literata for readability
  bodySerif: {
    fontSize: 18,
    fontFamily: fonts.body,
    lineHeight: 30,
    color: colors.text,
  },
  bodySerifMedium: {
    fontSize: 18,
    fontFamily: fonts.bodyMedium,
    lineHeight: 30,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontFamily: fonts.sans,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: colors.text,
  },
  bodyLarge: {
    fontSize: 18,
    fontFamily: fonts.body,
    lineHeight: 28,
    color: colors.text,
  },

  // UI text - clean sans-serif
  caption: {
    fontSize: 14,
    fontFamily: fonts.sans,
    fontWeight: '500' as const,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  small: {
    fontSize: 12,
    fontFamily: fonts.sans,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: colors.textMuted,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.sans,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: colors.textMuted,
  },

  // Button text
  button: {
    fontSize: 16,
    fontFamily: fonts.sans,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  buttonLarge: {
    fontSize: 18,
    fontFamily: fonts.sans,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: 0.3,
  },

  // Numbers
  stat: {
    fontSize: 32,
    fontFamily: fonts.mono,
    fontWeight: '600' as const,
    lineHeight: 40,
    color: colors.text,
  },

  // Prompt text - elegant serif
  prompt: {
    fontSize: 24,
    fontFamily: fonts.displayMedium,
    lineHeight: 34,
    color: colors.text,
    letterSpacing: -0.2,
  },

  // Quote/memoir text
  quote: {
    fontSize: 20,
    fontFamily: fonts.body,
    fontStyle: 'italic' as const,
    lineHeight: 32,
    color: colors.textSecondary,
  },
};

// Elegant microcopy for memoir context
export const microcopy = {
  greeting: [
    "What story will you tell today?",
    "Your memories are waiting...",
    "Let's capture a moment.",
    "Time for reflection.",
  ],
  encouragement: [
    "Beautifully written.",
    "A moment preserved.",
    "Your story matters.",
    "Wonderful.",
  ],
  streakMessages: {
    1: "You've begun.",
    3: "Three days of stories.",
    7: "A week of memories.",
    14: "Two weeks strong.",
    30: "A month of your life, captured.",
  },
};
