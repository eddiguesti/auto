/**
 * ConfettiExplosion
 * Premium celebration animation
 *
 * Inspired by: Duolingo, Headspace, gaming apps
 *
 * Features:
 * - Physics-based particle system
 * - Multiple particle types (circles, squares, ribbons)
 * - Randomized trajectories
 * - Fade out with gravity
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { easings, durations } from '../utils/animations';
import haptics from '../utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PARTICLE_COLORS = [
  '#58CC02', // Green
  '#1CB0F6', // Blue
  '#FF9600', // Orange
  '#CE82FF', // Purple
  '#FFC800', // Gold
  '#FF4B4B', // Red
  '#89E219', // Light green
];

const PARTICLE_COUNT = 50;

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  color: string;
  shape: 'circle' | 'square' | 'ribbon';
  size: number;
}

interface ConfettiExplosionProps {
  active: boolean;
  duration?: number;
  origin?: { x: number; y: number };
  onComplete?: () => void;
}

export default function ConfettiExplosion({
  active,
  duration = 2000,
  origin = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 3 },
  onComplete,
}: ConfettiExplosionProps) {
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotation: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      shape: (['circle', 'square', 'ribbon'] as const)[Math.floor(Math.random() * 3)],
      size: 6 + Math.random() * 10,
    }))
  ).current;

  useEffect(() => {
    if (!active) return;

    // Trigger haptic
    haptics.celebrate();

    // Reset all particles
    particles.forEach(particle => {
      particle.x.setValue(0);
      particle.y.setValue(0);
      particle.rotation.setValue(0);
      particle.scale.setValue(0);
      particle.opacity.setValue(1);
    });

    // Animate particles
    const animations = particles.map((particle, index) => {
      // Random trajectory
      const angle = Math.random() * Math.PI * 2;
      const velocity = 200 + Math.random() * 300;
      const targetX = Math.cos(angle) * velocity;
      const targetY = Math.sin(angle) * velocity * 0.6 - 100; // Bias upward initially

      // Stagger start times
      const delay = (index / PARTICLE_COUNT) * 200;

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          // Horizontal movement
          Animated.timing(particle.x, {
            toValue: targetX,
            duration: duration,
            easing: easings.decelerate,
            useNativeDriver: true,
          }),
          // Vertical movement with gravity
          Animated.sequence([
            Animated.timing(particle.y, {
              toValue: targetY,
              duration: duration * 0.4,
              easing: easings.decelerate,
              useNativeDriver: true,
            }),
            Animated.timing(particle.y, {
              toValue: SCREEN_HEIGHT,
              duration: duration * 0.6,
              easing: easings.accelerate,
              useNativeDriver: true,
            }),
          ]),
          // Rotation
          Animated.timing(particle.rotation, {
            toValue: (Math.random() - 0.5) * 720,
            duration: duration,
            useNativeDriver: true,
          }),
          // Scale in and hold
          Animated.sequence([
            Animated.spring(particle.scale, {
              toValue: 1,
              tension: 300,
              friction: 10,
              useNativeDriver: true,
            }),
          ]),
          // Fade out
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: duration,
            delay: duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  }, [active]);

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: origin.x,
              top: origin.y,
              opacity: particle.opacity,
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                {
                  rotate: particle.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
                { scale: particle.scale },
              ],
            },
          ]}
        >
          <View
            style={[
              particle.shape === 'circle' && styles.circle,
              particle.shape === 'square' && styles.square,
              particle.shape === 'ribbon' && styles.ribbon,
              {
                backgroundColor: particle.color,
                width: particle.shape === 'ribbon' ? particle.size * 2.5 : particle.size,
                height: particle.shape === 'ribbon' ? particle.size * 0.4 : particle.size,
                borderRadius: particle.shape === 'circle' ? particle.size / 2 : 2,
              },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

// Preset configurations for different celebration types
export const confettiPresets = {
  // Standard celebration
  standard: {
    duration: 2000,
    origin: { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 3 },
  },
  // Bottom burst (for completing prompts)
  bottomBurst: {
    duration: 2500,
    origin: { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 100 },
  },
  // Side cannons
  sideCannons: {
    duration: 2000,
    origin: { x: 0, y: SCREEN_HEIGHT / 2 },
  },
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  particle: {
    position: 'absolute',
  },
  circle: {},
  square: {},
  ribbon: {},
});
