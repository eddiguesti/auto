/**
 * SkeletonLoader
 * Premium shimmer loading states
 *
 * Inspired by: Facebook, LinkedIn, Stripe
 *
 * Features:
 * - Smooth shimmer animation
 * - Configurable shapes (text, circle, card)
 * - Staggered animation for lists
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, ViewStyle, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: DimensionValue;
  style?: ViewStyle;
}

interface SkeletonCardProps {
  style?: ViewStyle;
}

// Base skeleton with shimmer
function SkeletonBase({
  width = '100%',
  height = 20,
  borderRadius: radius = 8,
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.4)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
}

// Text skeleton with multiple lines
export function SkeletonText({
  lines = 3,
  lineHeight = 16,
  lastLineWidth = '60%',
  style,
}: SkeletonTextProps) {
  return (
    <View style={[styles.textContainer, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBase
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={lineHeight}
          style={{ marginBottom: index < lines - 1 ? spacing.sm : 0 }}
        />
      ))}
    </View>
  );
}

// Circle skeleton (avatars, icons)
export function SkeletonCircle({ size = 48 }: { size?: number }) {
  return (
    <SkeletonBase
      width={size}
      height={size}
      borderRadius={size / 2}
    />
  );
}

// Card skeleton
export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]}>
      {/* Header with avatar and title */}
      <View style={styles.cardHeader}>
        <SkeletonCircle size={40} />
        <View style={styles.cardHeaderText}>
          <SkeletonBase width="60%" height={14} />
          <SkeletonBase width="40%" height={12} style={{ marginTop: 6 }} />
        </View>
      </View>
      {/* Body text */}
      <SkeletonText lines={2} lineHeight={14} style={{ marginTop: spacing.md }} />
      {/* Footer */}
      <View style={styles.cardFooter}>
        <SkeletonBase width={80} height={12} />
        <SkeletonBase width={60} height={12} />
      </View>
    </View>
  );
}

// Prompt skeleton for home screen
export function SkeletonPrompt() {
  return (
    <View style={styles.promptContainer}>
      <SkeletonBase width={100} height={12} style={{ marginBottom: spacing.md }} />
      <SkeletonBase width="90%" height={24} style={{ marginBottom: spacing.sm }} />
      <SkeletonBase width="70%" height={24} />
    </View>
  );
}

// Stats row skeleton
export function SkeletonStats() {
  return (
    <View style={styles.statsRow}>
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.statItem}>
          <SkeletonCircle size={32} />
          <SkeletonBase width={40} height={20} style={{ marginTop: 8 }} />
          <SkeletonBase width={60} height={12} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

// Full screen loading for home
export function SkeletonHome() {
  return (
    <View style={styles.homeContainer}>
      {/* Header */}
      <View style={styles.homeHeader}>
        <View style={{ flex: 1 }} />
        <SkeletonBase width={60} height={32} borderRadius={16} />
      </View>

      {/* Prompt section */}
      <View style={styles.homePrompt}>
        <SkeletonPrompt />
      </View>

      {/* Circle button placeholder */}
      <View style={styles.homeCircle}>
        <SkeletonCircle size={180} />
      </View>

      {/* Bottom stats */}
      <View style={styles.homeStats}>
        <SkeletonBase width={120} height={36} borderRadius={18} />
        <SkeletonBase width={100} height={36} borderRadius={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
  },
  shimmerGradient: {
    flex: 1,
  },
  textContainer: {
    width: '100%',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  promptContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  homeContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
  },
  homePrompt: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  homeCircle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});

export default SkeletonBase;
