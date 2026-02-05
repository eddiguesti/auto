/**
 * AudioVisualizer Configuration
 *
 * Customize colors, sizes, and particle counts
 */

export const defaultColorSchemes = {
  // Idle state - warm sepia tones
  idle: {
    primary: '#9B8B7A',
    secondary: '#B8A99A',
    glow: 'rgba(155, 139, 122, 0.4)',
    center: 'rgba(155, 139, 122, 0.15)'
  },
  // Active/listening - subtle green, ready to receive
  active: {
    primary: '#5A9B6B',
    secondary: '#7AB88A',
    glow: 'rgba(90, 155, 107, 0.45)',
    center: 'rgba(90, 155, 107, 0.18)'
  },
  // AI/Clio speaking - soft blue/violet
  speaking: {
    primary: '#6B8DD9',
    secondary: '#8BA8E8',
    glow: 'rgba(107, 141, 217, 0.55)',
    center: 'rgba(107, 141, 217, 0.22)'
  },
  // User speaking detected - vibrant emerald green
  detected: {
    primary: '#10B981',
    secondary: '#34D399',
    glow: 'rgba(16, 185, 129, 0.6)',
    center: 'rgba(16, 185, 129, 0.25)'
  }
}

export const defaultSizes = {
  sm: { width: 120, height: 120, particlesPerLayer: [8, 12, 16] },
  md: { width: 160, height: 160, particlesPerLayer: [12, 16, 20] },
  lg: { width: 200, height: 200, particlesPerLayer: [16, 20, 24] }
}
