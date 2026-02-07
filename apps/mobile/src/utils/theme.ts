/**
 * Theme System - EasyMemoir Mobile
 *
 * Design: Warm heritage aesthetic, optimized for seniors & gift-buyers
 * Typography: Lora (display/body) + System Sans (UI)
 * Colors: Heritage palette (warm cream, terracotta, sepia)
 *
 * Matches web style guide: STYLE_GUIDE.md
 */

import { Platform } from 'react-native';

// Font families - Lora for elegance, system sans for UI
export const fonts = {
  // Lora - elegant serif for headings and display text
  display: 'Lora_700Bold',
  displayMedium: 'Lora_600SemiBold',
  displayRegular: 'Lora_500Medium',

  // Lora - warm readable serif for body/memoir text
  body: 'Lora_400Regular',
  bodyMedium: 'Lora_500Medium',
  bodySemiBold: 'Lora_600SemiBold',
  bodyBold: 'Lora_700Bold',
  bodyItalic: 'Lora_400Regular_Italic',

  // System sans-serif for UI elements (matches General Sans on web)
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
    web: 'Lora, Georgia, serif',
    default: 'Lora_400Regular',
  }) as string,
};

// Heritage color palette - optimized for seniors
// Warm tones are easier for aging eyes to perceive
export const colors = {
  // Heritage backgrounds - warm cream tones
  background: '#FBF7F2',      // heritage-cream
  backgroundAlt: '#FFFCF9',   // heritage-card
  backgroundWarm: '#FBF8F3',
  surface: '#FFFFFF',
  surfaceHover: '#FAF8F5',

  // Heritage text - warm charcoal for high contrast
  text: '#3D3833',            // heritage-ink
  textSecondary: '#6B6560',   // heritage-text
  textMuted: '#8A857D',
  textOnPrimary: '#FFFFFF',

  // Heritage sepia accents - nostalgic, trustworthy
  sepia: '#9C7B5C',           // heritage-sepia
  sepiaLight: '#D4C4B0',      // heritage-sepia-light
  sepiaDark: '#7A6248',       // heritage-sepia-dark

  // CTA - Terracotta (warm, visible to seniors, high conversion)
  cta: '#D97853',             // heritage-cta
  ctaHover: '#C4613D',        // heritage-cta-hover
  ctaLight: '#E8946F',        // heritage-cta-light

  // Primary actions (use CTA for main buttons)
  primary: '#D97853',
  primaryLight: '#E8946F',
  primaryDark: '#C4613D',
  primaryMuted: '#FDF5F2',

  // Success - Sage green
  success: '#7A9B76',         // heritage-sage
  successLight: '#A8C4A4',    // heritage-sage-light

  // Accent - Sepia for secondary elements
  accent: '#9C7B5C',
  accentLight: '#D4C4B0',
  accentMuted: '#F5F0EA',

  // Secondary - Soft gold for achievements
  secondary: '#C4A35A',
  secondaryLight: '#D4B86A',
  secondaryMuted: '#FCF8EF',

  // Semantic colors
  warning: '#C4A35A',
  error: '#B54B4B',
  info: '#5B7B8C',

  // Gamification (subtle, heritage-aligned)
  streak: '#C4A35A',
  xp: '#9C7B5C',
  gold: '#C4A35A',
  heart: '#D97853',

  // UI Elements
  border: '#D4C4B0',          // heritage-sepia-light
  borderLight: '#E8E2DA',
  divider: '#EAE6E0',
  overlay: 'rgba(61, 56, 51, 0.5)',

  // Legacy compatibility
  parchment: '#FBF7F2',
  cream: '#FFFCF9',
  ink: '#3D3833',
  amber: '#C4A35A',
  white: '#FFFFFF',
  black: '#1A1917',
  gray: '#8A857D',
  lightGray: '#F0EDE8',
  green: '#7A9B76',
  red: '#B54B4B',
  recording: '#D97853',
  waveform: '#9C7B5C',
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
  xxl: 24,
  full: 9999,
};

// Elegant, subtle shadows with warm tones
export const shadows = {
  sm: {
    shadowColor: '#3D3833',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#3D3833',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#3D3833',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    shadowColor: '#D97853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Typography system - Lora for heritage feel
export const typography = {
  // Display headings - elegant Lora
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

  // Body text - Lora for warmth and readability
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

  // UI text - clean system sans-serif
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
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: colors.sepia,
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
    fontFamily: fonts.bodyItalic,
    lineHeight: 32,
    color: colors.textSecondary,
  },
};

// Heritage-themed microcopy
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
