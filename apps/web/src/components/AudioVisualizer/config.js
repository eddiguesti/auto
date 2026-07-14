/**
 * Clio Orb configuration.
 *
 * Four states, each a full palette + behaviour + shape profile. The component
 * lerps every value continuously, so states melt into each other. Colors are a friendly
 * "morning sky" blue family anchored to the design system's info blue —
 * blue reads as trust and calm for assistant orbs.
 *
 * colA = light tone (veins, sparkles, core glow)
 * colB = mid tone   (body)
 * colC = deep tone  (depths)
 * rim  = fresnel rim light | aura = outer halo
 *
 * Shape language:
 *  wobble = fine organic texture (always subtle)
 *  lobe   = soft jelly lobes — the orb "leans in" while listening
 *  petal  = rhythmic radial waves — sound rippling out while speaking
 */

export const orbStates = {
  // At rest — a calm cream pearl, slow breath
  idle: {
    colA: '#EDF4FA',
    colB: '#AACBE4',
    colC: '#5F8AA9',
    rim: '#E1EDF6',
    aura: '#BFD7E6',
    flow: 0.5,
    wobble: 0.02,
    lobe: 0.012,
    petal: 0.0,
    rimAmt: 0.38,
    auraAmt: 0.3,
    spark: 0.18,
    breath: 0.013
  },
  // Listening — warm honey; soft lobes slowly morph (attentive jelly)
  active: {
    colA: '#E6F3FD',
    colB: '#8FC0E2',
    colC: '#4C7CA0',
    rim: '#D2E8F8',
    aura: '#9CC8E8',
    flow: 0.85,
    wobble: 0.022,
    lobe: 0.1,
    petal: 0.0,
    rimAmt: 0.65,
    auraAmt: 0.55,
    spark: 0.4,
    breath: 0.01
  },
  // User speaking — friendly gold, lobes ripple with the voice
  detected: {
    colA: '#E0F1FF',
    colB: '#6BAEE0',
    colC: '#35688F',
    rim: '#C4E2F9',
    aura: '#79B9E8',
    flow: 1.25,
    wobble: 0.035,
    lobe: 0.09,
    petal: 0.02,
    rimAmt: 0.6,
    auraAmt: 0.55,
    spark: 0.75,
    breath: 0.008
  },
  // Clio speaking — warm ink with bronze veins; petal waves pulse outward
  speaking: {
    colA: '#A9CDE9',
    colB: '#4C6E8B',
    colC: '#26415A',
    rim: '#86B4D8',
    aura: '#5D89AC',
    flow: 1.5,
    wobble: 0.025,
    lobe: 0.015,
    petal: 0.075,
    rimAmt: 0.85,
    auraAmt: 0.7,
    spark: 0.5,
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
