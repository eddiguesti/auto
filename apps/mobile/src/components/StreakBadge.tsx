/**
 * StreakBadge
 * Premium animated streak counter with sophisticated visual effects
 *
 * Inspired by: Duolingo, Snapchat, Apple Fitness rings
 *
 * Features:
 * - Animated flame with realistic flicker
 * - Glow pulse for milestone streaks
 * - Glass-morphism container
 * - Spring physics animations
 * - Haptic celebration on increment
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import { springs, easings } from '../utils/animations';
import haptics from '../utils/haptics';

interface StreakBadgeProps {
  streak: number;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
}

export default function StreakBadge({
  streak,
  onPress,
  size = 'md',
  showGlow = true,
}: StreakBadgeProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flameScale = useRef(new Animated.Value(1)).current;
  const flameRotate = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const numberScale = useRef(new Animated.Value(1)).current;
  const prevStreak = useRef(streak);

  // Sophisticated flame animation
  useEffect(() => {
    // Scale flicker
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameScale, {
          toValue: 1.15,
          duration: 250,
          easing: easings.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(flameScale, {
          toValue: 0.92,
          duration: 180,
          easing: easings.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(flameScale, {
          toValue: 1.08,
          duration: 220,
          easing: easings.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(flameScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle rotation flicker
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameRotate, {
          toValue: 0.05,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(flameRotate, {
          toValue: -0.05,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(flameRotate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow pulse for hot streaks
    if (streak >= 7 && showGlow) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(glowOpacity, {
              toValue: 0.7,
              duration: 1200,
              easing: easings.easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.3,
              duration: 1200,
              easing: easings.easeInOut,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(glowScale, {
              toValue: 1.1,
              duration: 1200,
              easing: easings.easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(glowScale, {
              toValue: 1,
              duration: 1200,
              easing: easings.easeInOut,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }
  }, [streak]);

  // Celebration animation when streak increases
  useEffect(() => {
    if (streak > prevStreak.current) {
      haptics.streakUp();

      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.25,
            tension: 300,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(numberScale, {
            toValue: 1.4,
            tension: 400,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(numberScale, {
            toValue: 1,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
    prevStreak.current = streak;
  }, [streak]);

  const handlePress = () => {
    haptics.lightTap();

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        tension: 400,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  const flameRotation = flameRotate.interpolate({
    inputRange: [-0.05, 0, 0.05],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  const sizeConfig = {
    sm: {
      container: { paddingHorizontal: 10, paddingVertical: 5 },
      icon: 16,
      number: { fontSize: 14 },
      gap: 3,
    },
    md: {
      container: { paddingHorizontal: 14, paddingVertical: 8 },
      icon: 20,
      number: { fontSize: 17 },
      gap: 5,
    },
    lg: {
      container: { paddingHorizontal: 18, paddingVertical: 10 },
      icon: 26,
      number: { fontSize: 22 },
      gap: 6,
    },
  };

  const config = sizeConfig[size];
  const isHotStreak = streak >= 7;
  const isMilestone = [3, 7, 14, 30, 100, 365].includes(streak);

  return (
    <Pressable onPress={handlePress} disabled={!onPress}>
      <Animated.View
        style={[
          styles.container,
          config.container,
          { gap: config.gap },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Background gradient */}
        <LinearGradient
          colors={
            isHotStreak
              ? ['#FFF3E0', '#FFE0B2', '#FFCC80']
              : ['#FFF8F0', '#FFF3E6', '#FFEDDC']
          }
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Glow effect for hot streaks */}
        {isHotStreak && showGlow && (
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
                backgroundColor: isMilestone ? '#FF6B00' : colors.streak,
              },
            ]}
          />
        )}

        {/* Flame icon */}
        <Animated.View
          style={{
            transform: [
              { scale: flameScale },
              { rotate: flameRotation },
            ],
          }}
        >
          <MaterialCommunityIcons
            name="fire"
            size={config.icon}
            color={isHotStreak ? '#FF6B00' : colors.streak}
          />
        </Animated.View>

        {/* Streak number */}
        <Animated.Text
          style={[
            styles.number,
            config.number,
            isHotStreak && styles.numberHot,
            isMilestone && styles.numberMilestone,
            { transform: [{ scale: numberScale }] },
          ]}
        >
          {streak}
        </Animated.Text>

        {/* Border highlight */}
        <View
          style={[
            styles.borderHighlight,
            isHotStreak && styles.borderHighlightHot,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    position: 'relative',
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.full,
  },
  number: {
    fontFamily: fonts.display,
    color: colors.streak,
    zIndex: 1,
  },
  numberHot: {
    color: '#E65100',
  },
  numberMilestone: {
    color: '#BF360C',
  },
  borderHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(196, 163, 90, 0.3)',
  },
  borderHighlightHot: {
    borderColor: 'rgba(255, 107, 0, 0.4)',
  },
});
