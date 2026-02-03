/**
 * CelebrationScreen
 * Premium celebration experience after completing a memory
 *
 * Design principles:
 * - Delightful, rewarding animations
 * - Confetti burst for dopamine hit
 * - Haptic feedback for tactile celebration
 * - Progressive reveal of stats
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import { springs, easings, durations } from '../utils/animations';
import haptics from '../utils/haptics';
import { AnimatedButton, ConfettiExplosion, IconCheck, IconFlame, IconStar } from '../components';

const { width, height } = Dimensions.get('window');

export default function CelebrationScreen({ navigation, route }: any) {
  const gameState = useGame();
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation values
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkRotate = useRef(new Animated.Value(-0.2)).current;
  const mainOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  // Stats animations
  const statsScale = useRef(new Animated.Value(0.9)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsTranslateY = useRef(new Animated.Value(40)).current;

  // Level bar animation
  const levelBarWidth = useRef(new Animated.Value(0)).current;
  const levelOpacity = useRef(new Animated.Value(0)).current;

  // Button animation
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;

  // Individual stat card animations
  const streakScale = useRef(new Animated.Value(0)).current;
  const xpScale = useRef(new Animated.Value(0)).current;

  // Progress bar shimmer
  const shimmerPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    runCelebrationSequence();
  }, []);

  const runCelebrationSequence = async () => {
    // Initial haptic burst
    haptics.celebrate();

    // Show confetti
    setShowConfetti(true);

    // Phase 1: Checkmark bounces in with rotation
    Animated.parallel([
      Animated.spring(checkScale, {
        toValue: 1,
        ...springs.bouncy,
      }),
      Animated.spring(checkRotate, {
        toValue: 0,
        ...springs.gentle,
      }),
      Animated.timing(mainOpacity, {
        toValue: 1,
        duration: durations.fast,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Title appears (after small delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(titleScale, {
          toValue: 1,
          ...springs.gentle,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: durations.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }, 200);

    // Phase 3: Stats slide up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: durations.normal,
          useNativeDriver: true,
        }),
        Animated.spring(statsTranslateY, {
          toValue: 0,
          ...springs.gentle,
        }),
        Animated.spring(statsScale, {
          toValue: 1,
          ...springs.gentle,
        }),
      ]).start();

      // Stagger individual stat cards
      Animated.stagger(100, [
        Animated.spring(streakScale, {
          toValue: 1,
          ...springs.bouncy,
        }),
        Animated.spring(xpScale, {
          toValue: 1,
          ...springs.bouncy,
        }),
      ]).start();

      // Haptic for stats
      haptics.lightTap();
    }, 400);

    // Phase 4: Level bar fills
    setTimeout(() => {
      Animated.timing(levelOpacity, {
        toValue: 1,
        duration: durations.fast,
        useNativeDriver: true,
      }).start();

      // Animate the bar fill
      Animated.timing(levelBarWidth, {
        toValue: levelProgress,
        duration: 800,
        easing: easings.easeOut,
        useNativeDriver: false,
      }).start();

      // Shimmer effect
      Animated.loop(
        Animated.timing(shimmerPosition, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();

      haptics.selection();
    }, 700);

    // Phase 5: Button appears
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: durations.normal,
          useNativeDriver: true,
        }),
        Animated.spring(buttonTranslateY, {
          toValue: 0,
          ...springs.gentle,
        }),
      ]).start();
    }, 1000);
  };

  const handleContinue = () => {
    haptics.mediumTap();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  // Calculate XP
  const xpEarned = 25;
  const bonusXp = gameState.currentStreak >= 7 ? 10 : 0;
  const totalXpEarned = xpEarned + bonusXp;
  const levelProgress = gameState.totalXp % 100;
  const isNewStreak = gameState.currentStreak === 1;
  const isStreakMilestone = [3, 7, 14, 30, 100].includes(gameState.currentStreak);

  const checkRotation = checkRotate.interpolate({
    inputRange: [-0.2, 0],
    outputRange: ['-20deg', '0deg'],
  });

  const barWidthInterpolated = levelBarWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Confetti explosion */}
      <ConfettiExplosion
        active={showConfetti}
        duration={2500}
        origin={{ x: width / 2, y: height * 0.25 }}
        onComplete={() => setShowConfetti(false)}
      />

      <View style={styles.content}>
        {/* Main celebration */}
        <Animated.View
          style={[
            styles.celebrationMain,
            {
              opacity: mainOpacity,
            },
          ]}
        >
          {/* Checkmark circle */}
          <Animated.View
            style={[
              styles.checkCircle,
              {
                transform: [
                  { scale: checkScale },
                  { rotate: checkRotation },
                ],
              },
            ]}
          >
            <IconCheck size={52} color={colors.textOnPrimary} />
          </Animated.View>

          {/* Title and subtitle */}
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ scale: titleScale }],
            }}
          >
            <Text style={styles.title}>Amazing!</Text>
            <Text style={styles.subtitle}>Memory captured forever</Text>
          </Animated.View>
        </Animated.View>

        {/* Stats cards */}
        <Animated.View
          style={[
            styles.statsRow,
            {
              opacity: statsOpacity,
              transform: [
                { translateY: statsTranslateY },
                { scale: statsScale },
              ],
            },
          ]}
        >
          {/* Streak card */}
          <Animated.View
            style={[
              styles.statCard,
              { transform: [{ scale: streakScale }] },
            ]}
          >
            <IconFlame size={32} color={colors.streak} />
            <Text style={styles.statValue}>{gameState.currentStreak || 1}</Text>
            <Text style={styles.statLabel}>
              {gameState.currentStreak === 1 ? 'Day streak!' : 'Day streak'}
            </Text>
            {isStreakMilestone && (
              <View style={styles.milestoneBadge}>
                <Text style={styles.milestoneText}>Milestone!</Text>
              </View>
            )}
          </Animated.View>

          {/* XP card */}
          <Animated.View
            style={[
              styles.statCard,
              styles.statCardHighlight,
              { transform: [{ scale: xpScale }] },
            ]}
          >
            <IconStar size={32} color={colors.gold} />
            <Text style={[styles.statValue, styles.statValueHighlight]}>
              +{totalXpEarned}
            </Text>
            <Text style={styles.statLabel}>XP earned</Text>
            {bonusXp > 0 && (
              <View style={styles.bonusBadge}>
                <Text style={styles.bonusText}>+{bonusXp} streak bonus!</Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>

        {/* Level progress */}
        <Animated.View
          style={[
            styles.levelSection,
            { opacity: levelOpacity },
          ]}
        >
          <View style={styles.levelHeader}>
            <Text style={styles.levelLabel}>Level {gameState.currentLevel}</Text>
            <Text style={styles.levelXp}>{levelProgress}/100 XP</Text>
          </View>
          <View style={styles.levelBarBg}>
            <Animated.View
              style={[
                styles.levelBarFill,
                { width: barWidthInterpolated },
              ]}
            />
          </View>
        </Animated.View>

        {/* Encouraging message */}
        <Animated.View style={{ opacity: levelOpacity }}>
          <Text style={styles.encouragement}>
            {gameState.totalMemories === 1
              ? "You've started your memory journey!"
              : gameState.totalMemories < 10
              ? `${gameState.totalMemories} memories captured. Keep going!`
              : gameState.totalMemories < 50
              ? `${gameState.totalMemories} memories strong. You're building something beautiful.`
              : `${gameState.totalMemories} memories. What an incredible journey!`}
          </Text>
        </Animated.View>
      </View>

      {/* Continue button */}
      <Animated.View
        style={[
          styles.footer,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          },
        ]}
      >
        <AnimatedButton
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          size="lg"
          fullWidth
          hapticType="heavy"
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Main celebration
  celebrationMain: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  checkCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderBottomWidth: 6,
    borderBottomColor: colors.primaryDark,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    minWidth: 140,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardHighlight: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary + '30',
  },
  statValue: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statValueHighlight: {
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  bonusBadge: {
    backgroundColor: colors.streak,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  bonusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  milestoneBadge: {
    backgroundColor: colors.xp,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  milestoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },

  // Level
  levelSection: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  levelLabel: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  levelXp: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
  },
  levelBarBg: {
    height: 12,
    backgroundColor: colors.borderLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    backgroundColor: colors.xp,
    borderRadius: 6,
  },

  // Encouragement
  encouragement: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Footer
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
