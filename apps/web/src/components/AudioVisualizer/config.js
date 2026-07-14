/**
 * Clio Orb configuration.
 *
 * Four states, each a full palette + behaviour + shape profile. The component
 * lerps every value continuously, so states melt into each other. All colors
 * stay inside the Keepsake palette family (sepia / bronze / ink, softened).
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
    colA: '#F6ECD8',
    colB: '#D9BE97',
    colC: '#9A7B57',
    rim: '#EFE2CC',
    aura: '#DCC49E',
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
    colA: '#F8EACB',
    colB: '#E0BE85',
    colC: '#9A7443',
    rim: '#F0DCB0',
    aura: '#E3C48F',
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
    colA: '#F8E7C2',
    colB: '#D9A952',
    colC: '#8A6228',
    rim: '#EFD9A8',
    aura: '#D9A952',
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
    colA: '#D9AE66',
    colB: '#5C5045',
    colC: '#322B24',
    rim: '#C99B4E',
    aura: '#B08A4E',
    flow: 1.5,
    wobble: 0.025,
    lobe: 0.015,
    petal: 0.1,
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
