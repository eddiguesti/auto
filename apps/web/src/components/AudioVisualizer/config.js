/**
 * AudioVisualizer Configuration
 *
 * Customize colors, sizes, and particle counts
 * Palette is harmonized with the Keepsake system: sepia (#9C7E5D),
 * bronze (#B88336 / #CC9C52) and ink (#292420) only.
 */

export const defaultColorSchemes = {
  // Idle state - quiet warm sepia
  idle: {
    primary: '#9C7E5D',
    secondary: 'rgba(156, 126, 93, 0.65)',
    glow: 'rgba(156, 126, 93, 0.4)',
    center: 'rgba(156, 126, 93, 0.15)'
  },
  // Active/listening - soft bronze, ready to receive
  active: {
    primary: '#CC9C52',
    secondary: 'rgba(204, 156, 82, 0.75)',
    glow: 'rgba(204, 156, 82, 0.45)',
    center: 'rgba(204, 156, 82, 0.18)'
  },
  // AI/Clio speaking - deep ink
  speaking: {
    primary: '#292420',
    secondary: 'rgba(41, 36, 32, 0.7)',
    glow: 'rgba(41, 36, 32, 0.45)',
    center: 'rgba(41, 36, 32, 0.18)'
  },
  // User speaking detected - burnished bronze
  detected: {
    primary: '#B88336',
    secondary: '#CC9C52',
    glow: 'rgba(184, 131, 54, 0.6)',
    center: 'rgba(184, 131, 54, 0.25)'
  }
}

export const defaultSizes = {
  sm: { width: 120, height: 120, particlesPerLayer: [8, 12, 16] },
  md: { width: 160, height: 160, particlesPerLayer: [12, 16, 20] },
  lg: { width: 200, height: 200, particlesPerLayer: [16, 20, 24] }
}
