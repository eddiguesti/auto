/**
 * Clio — "The Comma" — configuration.
 *
 * Four states, each a palette + posture profile, continuously blended.
 * Colors are a calm frosted-mineral blue family (blue reads as trust and
 * warmth-of-intelligence for assistant characters; anchored to the design
 * system's info blue).
 *
 * colA = light tone (inner light, catchlights)
 * colB = mid tone  (body)
 * colC = deep tone (edge density, features)
 * rim  = rim light | aura = contact-shadow tint
 *
 * Posture (slots shared with the shader):
 *  wobble = micro-jelly aliveness (barely visible)
 *  lobe   = LEAN — she tilts in when listening
 *  petal  = SQUASH — gentle bounce with the voice
 *  auraAmt = grounded contact-shadow strength
 *  shape  = her body: 'bubble' (here to chat) | 'headphones' (listening) |
 *           'heart' (holding your memories) | 'pen' (writing it down)
 */

export const orbStates = {
  // At rest — quiet frosted pearl, upright, slow breath
  idle: {
    colA: '#F5FAFE',
    colB: '#B9D4EC',
    colC: '#7E92BC',
    rim: '#EAF3FB',
    aura: '#75879E',
    flow: 0.6,
    wobble: 0.004,
    lobe: 0.0,
    petal: 0.0,
    rimAmt: 0.55,
    auraAmt: 0.3,
    spark: 0,
    breath: 0.012,
    shape: 'bubble'
  },
  // Listening — brighter sky; she leans in, attentive
  active: {
    colA: '#EFF8FF',
    colB: '#A0CCF0',
    colC: '#5F80B4',
    rim: '#E2F1FE',
    aura: '#68809C',
    flow: 1.0,
    wobble: 0.01,
    lobe: 0.45,
    petal: 0.15,
    rimAmt: 0.75,
    auraAmt: 0.32,
    spark: 0,
    breath: 0.01,
    shape: 'heart'
  },
  // User speaking — vivid azure heart, beating gently with your voice
  detected: {
    colA: '#E9F6FF',
    colB: '#82BCF0',
    colC: '#48659E',
    rim: '#D5EAFD',
    aura: '#5A7594',
    flow: 1.3,
    wobble: 0.012,
    lobe: 0.08,
    petal: 0.9,
    rimAmt: 0.9,
    auraAmt: 0.34,
    spark: 0,
    breath: 0.008,
    shape: 'pen'
  },
  // Clio speaking — twilight blue; upright, talking, lip-synced
  speaking: {
    colA: '#C3DCF2',
    colB: '#63819F',
    colC: '#374F7E',
    rim: '#A9CBE8',
    aura: '#485E76',
    flow: 1.1,
    wobble: 0.006,
    lobe: 0.15,
    petal: 0.55,
    rimAmt: 0.8,
    auraAmt: 0.34,
    spark: 0,
    breath: 0.008,
    shape: 'pen'
  }
}

// Legacy export name kept so existing imports keep resolving
export const defaultColorSchemes = orbStates

export const defaultSizes = {
  sm: { width: 120, height: 120 },
  md: { width: 160, height: 160 },
  lg: { width: 200, height: 200 }
}
