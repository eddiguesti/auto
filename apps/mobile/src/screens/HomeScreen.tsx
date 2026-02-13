/**
 * HomeScreen
 * Simple hub matching web Home.jsx - greeting, progress, action cards
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, spacing, borderRadius, fonts, shadows } from '../utils/theme';
import { durations, easings, springs } from '../utils/animations';
import haptics from '../utils/haptics';
import {
  StreakBadge,
  SkeletonHome,
  IconEdit,
  IconPhone,
  IconMic,
  IconBook,
  IconFeather,
  IconSettings,
  IconChevronRight,
} from '../components';

// Chapter data matching web
const TOTAL_QUESTIONS = 100; // Approximate total from chapters data

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();

  const [progress, setProgress] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const firstName = user?.name?.split(' ')[0] || 'Friend';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  const { totalAnswered, totalProgress } = useMemo(() => {
    const answered = Object.values(progress).reduce((sum, count) => sum + count, 0);
    return {
      totalAnswered: answered,
      totalProgress: Math.round((answered / TOTAL_QUESTIONS) * 100),
    };
  }, [progress]);

  useEffect(() => {
    fetchProgress();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: durations.normal,
          easing: easings.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          ...springs.gentle,
        }),
      ]).start();
    }
  }, [isLoading]);

  const fetchProgress = async () => {
    try {
      setError(null);
      const res = await api.getStoriesProgress();
      setProgress(res.progress || res);
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError('Unable to load your progress. Pull to refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    haptics.lightTap();
    await fetchProgress();
    setIsRefreshing(false);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <SkeletonHome />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.greeting}>
              <Text style={styles.greetingText}>
                {greeting}, {firstName}
              </Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => {
                haptics.lightTap();
                navigation.navigate('ProfileTab');
              }}
              activeOpacity={0.7}
            >
              <IconSettings size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Progress */}
          <View style={styles.progressSection}>
            <Text style={styles.progressPercent}>{totalProgress}%</Text>
            <Text style={styles.progressLabel}>
              {totalAnswered} of {TOTAL_QUESTIONS} stories captured
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${totalProgress}%` }]}
              />
            </View>
          </View>

          {/* Primary Actions */}
          <View style={styles.actionsSection}>
            {/* Tell a Story - Primary CTA */}
            <TouchableOpacity
              style={styles.primaryCard}
              onPress={() => {
                haptics.mediumTap();
                navigation.navigate('QuickStory');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.primaryCardIcon}>
                <IconEdit size={24} color={colors.textOnPrimary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.primaryCardTitle}>Tell a Story</Text>
                <Text style={styles.primaryCardSub}>Write whatever's on your mind</Text>
              </View>
            </TouchableOpacity>

            {/* Call Me */}
            <TouchableOpacity
              style={styles.secondaryCard}
              onPress={() => {
                haptics.lightTap();
                navigation.navigate('CallMe');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.secondaryCardIcon, { backgroundColor: '#F0FDF4' }]}>
                <IconPhone size={20} color="#16A34A" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.secondaryCardTitle}>Call Me</Text>
                <Text style={styles.secondaryCardSub}>Get a phone call to chat about your life</Text>
              </View>
              <IconChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Talk (Voice Mode) */}
            <TouchableOpacity
              style={styles.secondaryCard}
              onPress={() => {
                haptics.lightTap();
                navigation.navigate('VoicePrompt', { prompt: null });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.secondaryCardIcon, { backgroundColor: '#FFFBEB' }]}>
                <IconMic size={20} color="#D97706" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.secondaryCardTitle}>Talk</Text>
                <Text style={styles.secondaryCardSub}>Voice conversation to capture memories</Text>
              </View>
              <IconChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Secondary Actions */}
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.smallCard}
              onPress={() => {
                haptics.lightTap();
                navigation.navigate('HistoryTab');
              }}
              activeOpacity={0.7}
            >
              <IconBook size={20} color={colors.textMuted} />
              <Text style={styles.smallCardText}>Preview Book</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.smallCard}
              onPress={() => {
                haptics.lightTap();
                navigation.navigate('MemoirTab');
              }}
              activeOpacity={0.7}
            >
              <IconFeather size={20} color={colors.textMuted} />
              <Text style={styles.smallCardText}>Write by Chapter</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
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
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error
  errorBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#DC2626',
    textAlign: 'center',
  },

  // Progress
  progressSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  progressPercent: {
    fontSize: 48,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },

  // Actions
  actionsSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  // Primary card (Tell a Story)
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.lg,
    shadowColor: colors.primary,
  },
  primaryCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
  },
  primaryCardTitle: {
    fontSize: 18,
    fontFamily: fonts.displayMedium,
    color: colors.textOnPrimary,
    marginBottom: 2,
  },
  primaryCardSub: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: 'rgba(255,255,255,0.7)',
  },

  // Secondary cards (Call Me, Talk)
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg - 4,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  secondaryCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryCardTitle: {
    fontSize: 16,
    fontFamily: fonts.displayMedium,
    color: colors.text,
    marginBottom: 2,
  },
  secondaryCardSub: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },

  // Secondary actions row
  secondaryActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  smallCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
  },
  smallCardText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
});
