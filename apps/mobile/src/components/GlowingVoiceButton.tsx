/**
 * GlowingVoiceButton
 * Ultra-premium voice recording button with sophisticated multi-layer effects
 *
 * Inspired by: Apple Siri, iOS Dynamic Island, Spotify Now Playing
 *
 * Features:
 * - Multi-layer animated glow rings with staggered timing
 * - Smooth spring physics transitions
 * - Real-time waveform visualization
 * - Sophisticated shadow system
 * - Haptic feedback integration
 * - Glass-morphism inner highlight
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors } from '../utils/theme';
import { springs, easings, durations } from '../utils/animations';
import haptics from '../utils/haptics';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width * 0.42, 160);
const GLOW_RING_COUNT = 4;

interface GlowingVoiceButtonProps {
  isRecording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
  size?: number;
  audioLevel?: number; // 0-1 normalized audio level from microphone
}

export default function GlowingVoiceButton({
  isRecording,
  onPressIn,
  onPressOut,
  disabled = false,
  size = BUTTON_SIZE,
  audioLevel = 0,
}: GlowingVoiceButtonProps) {
  // Main button animations
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Glow ring animations
  const glowRings = useRef(
    Array.from({ length: GLOW_RING_COUNT }, () => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // Recording pulse animations
  const recordingPulse = useRef(new Animated.Value(1)).current;
  const innerGlow = useRef(new Animated.Value(0)).current;
  const outerGlow = useRef(new Animated.Value(0.1)).current;

  // Waveform bars
  const waveformBars = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0.2))
  ).current;

  // Icon animation
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;

  // Entrance animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  // Recording state animations
  useEffect(() => {
    if (isRecording) {
      // Icon fade out
      Animated.timing(iconOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();

      // Start sophisticated glow ring ripples
      glowRings.forEach((ring, index) => {
        const delay = index * 300;
        const duration = 1800;

        ring.scale.setValue(1);
        ring.opacity.setValue(0);

        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(ring.scale, {
                toValue: 2.2,
                duration,
                easing: easings.easeOut,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(ring.opacity, {
                  toValue: 0.6 - index * 0.1,
                  duration: duration * 0.2,
                  useNativeDriver: true,
                }),
                Animated.timing(ring.opacity, {
                  toValue: 0,
                  duration: duration * 0.8,
                  easing: easings.easeOut,
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ])
        ).start();
      });

      // Subtle breathing pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, {
            toValue: 1.04,
            duration: 800,
            easing: easings.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(recordingPulse, {
            toValue: 1,
            duration: 800,
            easing: easings.easeInOut,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Inner glow intensifies
      Animated.timing(innerGlow, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Outer ambient glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(outerGlow, {
            toValue: 0.25,
            duration: 1000,
            easing: easings.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(outerGlow, {
            toValue: 0.15,
            duration: 1000,
            easing: easings.easeInOut,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Audio-reactive waveform animation
      // Initial animation to show bars when recording starts
      waveformBars.forEach((bar, index) => {
        const baseHeight = 0.2 + (index === 3 ? 0.1 : Math.abs(3 - index) * 0.05);
        Animated.timing(bar, {
          toValue: baseHeight,
          duration: 150,
          easing: easings.easeOut,
          useNativeDriver: true,
        }).start();
      });

      haptics.recordingStart();
    } else {
      // Icon fade in
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Stop all animations gracefully
      glowRings.forEach(ring => {
        ring.scale.stopAnimation();
        ring.opacity.stopAnimation();
        Animated.timing(ring.opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });

      recordingPulse.stopAnimation();
      Animated.spring(recordingPulse, {
        toValue: 1,
        ...springs.gentle,
      }).start();

      Animated.timing(innerGlow, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      outerGlow.stopAnimation();
      Animated.timing(outerGlow, {
        toValue: 0.1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      waveformBars.forEach(bar => {
        bar.stopAnimation();
        Animated.timing(bar, {
          toValue: 0.2,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [isRecording]);

  // Audio-reactive waveform visualization
  useEffect(() => {
    if (!isRecording) return;

    // Animate waveform bars based on audio level
    // Each bar gets a slightly different response for organic look
    waveformBars.forEach((bar, index) => {
      // Center bars (index 3) respond more, outer bars less
      const centerWeight = 1 - Math.abs(3 - index) * 0.12;
      // Add slight variation per bar for natural feel
      const variation = Math.sin(Date.now() / 100 + index * 0.5) * 0.1;

      // Calculate bar height based on audio level
      const baseHeight = 0.15;
      const audioContribution = audioLevel * centerWeight * 0.85;
      const targetHeight = Math.min(1, baseHeight + audioContribution + variation * audioLevel);

      Animated.timing(bar, {
        toValue: targetHeight,
        duration: 50, // Fast response for real-time feel
        easing: easings.easeOut,
        useNativeDriver: true,
      }).start();
    });
  }, [audioLevel, isRecording]);

  const handlePressIn = () => {
    if (disabled) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.94,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 0.9,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();

    haptics.mediumTap();
    onPressIn();
  };

  const handlePressOut = () => {
    if (disabled) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    if (isRecording) {
      haptics.recordingStop();
    }
    onPressOut();
  };

  const primaryColor = isRecording ? colors.error : colors.primary;
  const primaryColorDark = isRecording ? '#9A2E2E' : colors.primaryDark;
  const primaryColorLight = isRecording ? '#E85B5B' : colors.primaryLight;

  return (
    <View style={[styles.container, { width: size + 80, height: size + 80 }]}>
      {/* Outer ambient glow */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            width: size + 60,
            height: size + 60,
            borderRadius: (size + 60) / 2,
            backgroundColor: primaryColor,
            opacity: outerGlow,
          },
        ]}
      />

      {/* Glow rings */}
      {glowRings.map((ring, index) => (
        <Animated.View
          key={index}
          style={[
            styles.glowRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: primaryColor,
              borderWidth: 2 - index * 0.3,
              opacity: ring.opacity,
              transform: [{ scale: ring.scale }],
            },
          ]}
        />
      ))}

      {/* Main button */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            shadowColor: primaryColor,
            transform: [
              { scale: Animated.multiply(scaleAnim, recordingPulse) },
            ],
          },
        ]}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
        >
          <View
            style={[
              styles.button,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          >
            {/* Gradient background */}
            <LinearGradient
              colors={[primaryColorLight, primaryColor, primaryColorDark]}
              locations={[0, 0.5, 1]}
              style={[styles.gradient, { borderRadius: size / 2 }]}
            />

            {/* Top highlight for 3D effect */}
            <View style={[styles.topHighlight, { borderRadius: size / 2 }]} />

            {/* Inner glow when recording */}
            <Animated.View
              style={[
                styles.innerGlow,
                {
                  borderRadius: size / 2,
                  backgroundColor: primaryColorLight,
                  opacity: innerGlow,
                },
              ]}
            />

            {/* Icon or waveform */}
            {isRecording ? (
              <View style={styles.waveformContainer}>
                {waveformBars.map((bar, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.waveformBar,
                      {
                        height: 36,
                        transform: [{ scaleY: bar }],
                      },
                    ]}
                  />
                ))}
              </View>
            ) : (
              <Animated.View
                style={{
                  transform: [{ scale: iconScale }],
                  opacity: iconOpacity,
                }}
              >
                <Feather
                  name="mic"
                  size={size * 0.35}
                  color={colors.textOnPrimary}
                />
              </Animated.View>
            )}
          </View>
        </Pressable>
      </Animated.View>

      {/* Bottom shadow for depth */}
      <Animated.View
        style={[
          styles.bottomShadow,
          {
            width: size * 0.6,
            height: 8,
            borderRadius: size * 0.3,
            backgroundColor: primaryColorDark,
            bottom: 4,
            opacity: Animated.subtract(1, innerGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            })),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
  },
  glowRing: {
    position: 'absolute',
  },
  buttonWrapper: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.textOnPrimary,
  },
  bottomShadow: {
    position: 'absolute',
  },
});
