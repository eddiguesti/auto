/**
 * HomeScreen
 * Premium voice-first interface for daily memory capture
 *
 * Design principles:
 * - Single primary action (voice recording)
 * - Minimal cognitive load
 * - Delightful micro-interactions
 * - Smooth, Apple-quality animations
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import api from '../services/api';
import { colors, spacing, borderRadius, fonts, typography } from '../utils/theme';
import { springs, easings, durations } from '../utils/animations';
import haptics from '../utils/haptics';
import {
  GlowingVoiceButton,
  StreakBadge,
  AnimatedButton,
  SkeletonHome,
  IconDocument,
  IconStar,
  IconGem,
  IconCheck,
} from '../components';

const { width, height } = Dimensions.get('window');

interface Prompt {
  id: number;
  text: string;
  hint?: string;
  category?: string;
  status?: string;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const gameState = useGame();

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Staggered entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const promptOpacity = useRef(new Animated.Value(0)).current;
  const promptTranslateY = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsTranslateY = useRef(new Animated.Value(30)).current;

  // Ambient animations
  const ambientGlow = useRef(new Animated.Value(0.05)).current;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      runEntranceAnimations();
      startAmbientAnimations();
    }
  }, [isLoading]);

  const runEntranceAnimations = () => {
    // Staggered entrance sequence
    Animated.stagger(100, [
      // Header slides down
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: durations.normal,
          easing: easings.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(headerTranslateY, {
          toValue: 0,
          ...springs.gentle,
        }),
      ]),
      // Prompt fades up
      Animated.parallel([
        Animated.timing(promptOpacity, {
          toValue: 1,
          duration: durations.normal,
          easing: easings.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(promptTranslateY, {
          toValue: 0,
          ...springs.gentle,
        }),
      ]),
      // Button pops in
      Animated.parallel([
        Animated.spring(buttonScale, {
          toValue: 1,
          ...springs.bouncy,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: durations.fast,
          useNativeDriver: true,
        }),
      ]),
      // Stats slide up
      Animated.parallel([
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: durations.normal,
          easing: easings.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(statsTranslateY, {
          toValue: 0,
          ...springs.gentle,
        }),
      ]),
    ]).start();
  };

  const startAmbientAnimations = () => {
    // Subtle background glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(ambientGlow, {
          toValue: 0.1,
          duration: 3000,
          easing: easings.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(ambientGlow, {
          toValue: 0.05,
          duration: 3000,
          easing: easings.easeInOut,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const fetchData = async () => {
    try {
      const [promptRes] = await Promise.all([
        api.getTodayPrompt(),
        gameState.refreshGameState(),
      ]);
      setPrompt(promptRes.data);
    } catch (error) {
      // Fallback prompt
      setPrompt({
        id: 1,
        text: "What made you smile today?",
        category: 'Daily Life',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    haptics.lightTap();
    await fetchData();
    setIsRefreshing(false);
  }, []);

  const handleVoicePress = () => {
    haptics.mediumTap();
    navigation.navigate('VoicePrompt', { prompt });
  };

  const handleTypePress = () => {
    haptics.lightTap();
    navigation.navigate('TextInput', { prompt });
  };

  const handleStreakPress = () => {
    haptics.lightTap();
    navigation.navigate('ProfileTab');
  };

  const handleHistoryPress = () => {
    haptics.lightTap();
    navigation.navigate('HistoryTab');
  };

  const promptCompleted = prompt?.status === 'completed' || gameState.dailyPromptCompleted;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <SkeletonHome />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient background glow */}
      <Animated.View
        style={[
          styles.ambientGlow,
          { opacity: ambientGlow },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          {/* Greeting */}
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
            </Text>
            <Text style={styles.dateText}>{formatDate()}</Text>
          </View>

          {/* Streak badge */}
          <StreakBadge
            streak={gameState.currentStreak || 0}
            onPress={handleStreakPress}
            size="md"
          />
        </Animated.View>

        {/* Prompt Section */}
        <Animated.View
          style={[
            styles.promptSection,
            {
              opacity: promptOpacity,
              transform: [{ translateY: promptTranslateY }],
            },
          ]}
        >
          <View style={styles.promptBadge}>
            <Text style={styles.promptBadgeText}>TODAY'S PROMPT</Text>
          </View>
          <Text style={styles.promptText}>{prompt?.text}</Text>
          {prompt?.hint && (
            <Text style={styles.promptHint}>{prompt.hint}</Text>
          )}
        </Animated.View>

        {/* Voice Button */}
        <Animated.View
          style={[
            styles.buttonSection,
            {
              opacity: buttonOpacity,
              transform: [{ scale: buttonScale }],
            },
          ]}
        >
          <GlowingVoiceButton
            isRecording={false}
            onPressIn={handleVoicePress}
            onPressOut={() => {}}
            disabled={promptCompleted}
          />

          <Text style={styles.tapHint}>
            {promptCompleted ? 'Completed for today!' : 'Tap to speak your memory'}
          </Text>

          {/* Type alternative */}
          {!promptCompleted && (
            <TouchableOpacity
              style={styles.typeButton}
              onPress={handleTypePress}
              activeOpacity={0.7}
            >
              <Text style={styles.typeButtonText}>or type instead</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Stats Section */}
        <Animated.View
          style={[
            styles.statsSection,
            {
              opacity: statsOpacity,
              transform: [{ translateY: statsTranslateY }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.statPill}
            onPress={handleHistoryPress}
            activeOpacity={0.7}
          >
            <IconDocument size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>
              {gameState.totalMemories} {gameState.totalMemories === 1 ? 'memory' : 'memories'}
            </Text>
          </TouchableOpacity>

          <View style={styles.statPill}>
            <IconStar size={14} color={colors.gold} />
            <Text style={styles.statText}>Level {gameState.currentLevel}</Text>
          </View>

          <View style={styles.statPill}>
            <IconGem size={14} color={colors.xp} />
            <Text style={styles.statText}>{gameState.totalXp} XP</Text>
          </View>
        </Animated.View>

        {/* Memoir Progress Card */}
        {gameState.memoirProgress && (
          <Animated.View
            style={[
              styles.memoirProgressCard,
              {
                opacity: statsOpacity,
                transform: [{ translateY: statsTranslateY }],
              },
            ]}
          >
            <View style={styles.memoirHeader}>
              <Text style={styles.memoirTitle}>Your Memoir</Text>
              <Text style={styles.memoirPercentage}>
                {gameState.memoirProgress.overall.percentage}% complete
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.memoirProgressBar}>
              <View
                style={[
                  styles.memoirProgressFill,
                  { width: `${gameState.memoirProgress.overall.percentage}%` },
                ]}
              />
            </View>

            {/* Chapter summary */}
            <View style={styles.chapterSummary}>
              <Text style={styles.chapterSummaryText}>
                {gameState.memoirProgress.overall.chaptersComplete} of 10 chapters complete
              </Text>
            </View>

            {/* Current focus */}
            {gameState.memoirProgress.suggestedGaps[0] && (
              <View style={styles.currentFocus}>
                <Text style={styles.currentFocusLabel}>Today's focus:</Text>
                <Text style={styles.currentFocusText}>
                  {gameState.memoirProgress.suggestedGaps[0].reason}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Completed overlay */}
      {promptCompleted && (
        <View style={styles.completedOverlay}>
          <BlurView intensity={95} style={styles.blurView}>
            <View style={styles.completedCard}>
              <View style={styles.completedIconWrapper}>
                <IconCheck size={40} color={colors.textOnPrimary} />
              </View>
              <Text style={styles.completedTitle}>Done for today!</Text>
              <Text style={styles.completedSubtitle}>
                You're building something beautiful.{'\n'}
                Come back tomorrow for your next prompt.
              </Text>

              <AnimatedButton
                title="View your memories"
                onPress={handleHistoryPress}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: spacing.lg }}
              />
            </View>
          </BlurView>
        </View>
      )}
    </SafeAreaView>
  );
}

// Helpers
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  ambientGlow: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.5 - 150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },

  // Prompt
  promptSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  promptBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  promptBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 1,
  },
  promptText: {
    fontSize: 28,
    fontFamily: fonts.displayMedium,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 40,
  },
  promptHint: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },

  // Button section
  buttonSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    minHeight: 300,
  },
  tapHint: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xl,
  },
  typeButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  typeButtonText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },

  // Stats
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Completed overlay
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  completedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  completedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  completedTitle: {
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  completedSubtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Memoir Progress
  memoirProgressCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memoirHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  memoirTitle: {
    fontSize: 16,
    fontFamily: fonts.displaySemiBold,
    color: colors.text,
  },
  memoirPercentage: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  memoirProgressBar: {
    height: 8,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  memoirProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  chapterSummary: {
    marginBottom: spacing.sm,
  },
  chapterSummaryText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  currentFocus: {
    backgroundColor: colors.primaryMuted,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  currentFocusLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
    marginBottom: 2,
  },
  currentFocusText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.text,
  },
});
