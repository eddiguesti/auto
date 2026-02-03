/**
 * Professional Animation System
 * Inspired by: Apple HIG, Stripe, Linear, Notion, Duolingo
 *
 * Key principles:
 * - Spring physics for natural feel
 * - Consistent timing across the app
 * - Meaningful motion that guides attention
 */

import { Animated, Easing } from 'react-native';

// ============================================
// SPRING CONFIGURATIONS (Apple-style physics)
// ============================================

export const springs = {
  // Snappy - buttons, toggles, quick feedback
  snappy: {
    tension: 400,
    friction: 30,
    useNativeDriver: true,
  },
  // Gentle - cards, modals, page transitions
  gentle: {
    tension: 200,
    friction: 20,
    useNativeDriver: true,
  },
  // Bouncy - celebrations, success states
  bouncy: {
    tension: 300,
    friction: 10,
    useNativeDriver: true,
  },
  // Smooth - subtle movements, breathing
  smooth: {
    tension: 120,
    friction: 14,
    useNativeDriver: true,
  },
  // Stiff - precise movements
  stiff: {
    tension: 500,
    friction: 35,
    useNativeDriver: true,
  },
};

// ============================================
// TIMING CONFIGURATIONS
// ============================================

export const durations = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

export const easings = {
  // Standard ease out - most common for entrances
  easeOut: Easing.bezier(0.25, 0.1, 0.25, 1),
  // Ease in out - for seamless transitions
  easeInOut: Easing.bezier(0.4, 0, 0.2, 1),
  // Decelerate - items coming to rest
  decelerate: Easing.out(Easing.cubic),
  // Accelerate - items leaving
  accelerate: Easing.in(Easing.cubic),
  // Elastic - playful, gamified
  elastic: Easing.elastic(1),
  // Anticipate - wind up before action
  anticipate: Easing.bezier(0.36, 0, 0.66, -0.56),
};

// ============================================
// ANIMATION PRESETS
// ============================================

/**
 * Fade in with optional slide
 */
export const fadeIn = (
  value: Animated.Value,
  duration = durations.normal,
  delay = 0
) => {
  return Animated.timing(value, {
    toValue: 1,
    duration,
    delay,
    easing: easings.easeOut,
    useNativeDriver: true,
  });
};

/**
 * Fade out
 */
export const fadeOut = (
  value: Animated.Value,
  duration = durations.fast
) => {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    easing: easings.easeOut,
    useNativeDriver: true,
  });
};

/**
 * Scale spring - for button presses
 */
export const scaleSpring = (
  value: Animated.Value,
  toValue: number,
  config = springs.snappy
) => {
  return Animated.spring(value, {
    toValue,
    ...config,
  });
};

/**
 * Slide up entrance
 */
export const slideUp = (
  translateY: Animated.Value,
  opacity: Animated.Value,
  distance = 30,
  duration = durations.normal,
  delay = 0
) => {
  translateY.setValue(distance);
  opacity.setValue(0);

  return Animated.parallel([
    Animated.timing(translateY, {
      toValue: 0,
      duration,
      delay,
      easing: easings.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      easing: easings.easeOut,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Pop in - scale from small to normal with bounce
 */
export const popIn = (
  scale: Animated.Value,
  opacity: Animated.Value,
  delay = 0
) => {
  scale.setValue(0.5);
  opacity.setValue(0);

  return Animated.parallel([
    Animated.spring(scale, {
      toValue: 1,
      delay,
      ...springs.bouncy,
    }),
    Animated.timing(opacity, {
      toValue: 1,
      duration: durations.fast,
      delay,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Breathing animation - subtle pulse for attention
 */
export const breathe = (value: Animated.Value, min = 0.97, max = 1.03) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: max,
        duration: 1500,
        easing: easings.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: min,
        duration: 1500,
        easing: easings.easeInOut,
        useNativeDriver: true,
      }),
    ])
  );
};

/**
 * Glow pulse - for glowing ring effects
 */
export const glowPulse = (value: Animated.Value, min = 0.2, max = 0.5) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: max,
        duration: 1200,
        easing: easings.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: min,
        duration: 1200,
        easing: easings.easeInOut,
        useNativeDriver: true,
      }),
    ])
  );
};

/**
 * Ripple expand - for touch feedback
 */
export const ripple = (
  scale: Animated.Value,
  opacity: Animated.Value
) => {
  scale.setValue(1);
  opacity.setValue(0.4);

  return Animated.parallel([
    Animated.timing(scale, {
      toValue: 2,
      duration: 600,
      easing: easings.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(opacity, {
      toValue: 0,
      duration: 600,
      easing: easings.easeOut,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Stagger children - for list animations
 */
export const stagger = (
  animations: Animated.CompositeAnimation[],
  delayMs = 50
) => {
  return Animated.stagger(delayMs, animations);
};

/**
 * Shake - for error feedback
 */
export const shake = (value: Animated.Value) => {
  return Animated.sequence([
    Animated.timing(value, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(value, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(value, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(value, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(value, { toValue: 0, duration: 50, useNativeDriver: true }),
  ]);
};

/**
 * Confetti burst - for celebrations
 */
export const confettiBurst = (
  particles: Array<{
    x: Animated.Value;
    y: Animated.Value;
    rotate: Animated.Value;
    scale: Animated.Value;
    opacity: Animated.Value;
  }>,
  config: {
    spreadX?: number;
    spreadY?: number;
    duration?: number;
  } = {}
) => {
  const { spreadX = 150, spreadY = 200, duration = 1000 } = config;

  return Animated.parallel(
    particles.map((particle, index) => {
      const angle = (index / particles.length) * Math.PI * 2;
      const randomSpread = 0.5 + Math.random() * 0.5;
      const targetX = Math.cos(angle) * spreadX * randomSpread;
      const targetY = -spreadY * randomSpread + Math.random() * 100;

      return Animated.parallel([
        Animated.timing(particle.x, {
          toValue: targetX,
          duration,
          easing: easings.decelerate,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particle.y, {
            toValue: targetY,
            duration: duration * 0.6,
            easing: easings.decelerate,
            useNativeDriver: true,
          }),
          Animated.timing(particle.y, {
            toValue: targetY + 100,
            duration: duration * 0.4,
            easing: easings.accelerate,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.rotate, {
          toValue: Math.random() * 720 - 360,
          duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particle.scale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: duration - 100,
            delay: duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration,
          delay: duration * 0.7,
          useNativeDriver: true,
        }),
      ]);
    })
  );
};

// ============================================
// INTERPOLATION HELPERS
// ============================================

/**
 * Create a smooth gradient interpolation
 */
export const interpolateColor = (
  value: Animated.Value,
  inputRange: number[],
  outputRange: string[]
) => {
  return value.interpolate({
    inputRange,
    outputRange,
    extrapolate: 'clamp',
  });
};

/**
 * Progress bar animation
 */
export const animateProgress = (
  value: Animated.Value,
  toValue: number,
  duration = durations.slow
) => {
  return Animated.timing(value, {
    toValue,
    duration,
    easing: easings.easeOut,
    useNativeDriver: false, // width animations can't use native driver
  });
};

// ============================================
// GESTURE RESPONSE HELPERS
// ============================================

export const createPressAnimation = (scale: Animated.Value) => ({
  onPressIn: () => {
    Animated.spring(scale, {
      toValue: 0.95,
      ...springs.snappy,
    }).start();
  },
  onPressOut: () => {
    Animated.spring(scale, {
      toValue: 1,
      ...springs.bouncy,
    }).start();
  },
});

export const createHoverAnimation = (scale: Animated.Value) => ({
  onMouseEnter: () => {
    Animated.spring(scale, {
      toValue: 1.02,
      ...springs.gentle,
    }).start();
  },
  onMouseLeave: () => {
    Animated.spring(scale, {
      toValue: 1,
      ...springs.gentle,
    }).start();
  },
});
