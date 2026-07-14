/**
 * Clio Orb configuration.
 *
 * Four states, each a full palette + behaviour profile. The component lerps
 * every value continuously, so state changes melt into each other instead of
 * switching. All colors stay inside the Keepsake palette:
 * sepia (#9C7E5D ramp), bronze (#B88336 / #CC9C52 ramp), ink (#292420).
 *
 * colA = light tone (veins, sparkles, core glow)
 * colB = mid tone   (body)
 * colC = deep tone  (depths)
 * rim  = fresnel rim light | aura = outer halo
 */

export const orbStates = {
  // At rest — a quiet warm pearl, slow breath, faint life
  idle: {
    colA: '#F2E4C4',
    colB: '#C8A87A',
    colC: '#755A3E',
    rim: '#E8D9C0',
    aura: '#C9AF87',
    flow: 0.5,
    wobble: 0.022,
    rimAmt: 0.38,
    auraAmt: 0.3,
    spark: 0.18,
    breath: 0.013
  },
  // Listening — soft bronze, open and receptive
  active: {
    colA: '#F0DDB6',
    colB: '#CC9C52',
    colC: '#7F5522',
    rim: '#E3C68C',
    aura: '#CC9C52',
    flow: 0.9,
    wobble: 0.032,
    rimAmt: 0.7,
    auraAmt: 0.55,
    spark: 0.4,
    breath: 0.01
  },
  // User speaking — burnished bronze, energized, wobbling with the voice
  detected: {
    colA: '#F5E3BE',
    colB: '#B88336',
    colC: '#61411D',
    rim: '#EAD3AB',
    aura: '#B88336',
    flow: 1.3,
    wobble: 0.05,
    rimAmt: 1.0,
    auraAmt: 0.85,
    spark: 0.8,
    breath: 0.008
  },
  // Clio speaking — deep ink body threaded with bronze veins
  speaking: {
    colA: '#CC9C52',
    colB: '#453E37',
    colC: '#17130F',
    rim: '#B88336',
    aura: '#9E6C29',
    flow: 1.6,
    wobble: 0.04,
    rimAmt: 0.9,
    auraAmt: 0.7,
    spark: 0.55,
    breath: 0.008
  }
}

// Legacy export name kept so existing imports keep resolving
export const defaultColorSchemes = orbStates

export const defaultSizes = {
  sm: { width: 120, height: 120 },
  md: { width: 160, height: 160 },
  lg: { width: 200, height: 200 }
}
