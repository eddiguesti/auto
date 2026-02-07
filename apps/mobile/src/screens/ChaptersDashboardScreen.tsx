/**
 * ChaptersDashboardScreen
 * Grid of 10 memoir chapters with progress tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import api from '../services/api';
import { chapters, Chapter } from '../data/chapters';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import haptics from '../utils/haptics';
import { IconCheck, IconLock, IconBook, IconChevronRight } from '../components';

interface ChapterProgress {
  id: string;
  completedQuestions: number;
  totalQuestions: number;
  percentage: number;
  status: 'complete' | 'in_progress' | 'not_started';
}

// Animated Chapter Card
function ChapterCard({
  chapter,
  progress,
  index,
  onPress,
  isLocked,
}: {
  chapter: Chapter;
  progress?: ChapterProgress;
  index: number;
  onPress: () => void;
  isLocked: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        tension: 60,
        friction: 12,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    if (!isLocked) {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!isLocked) {
      haptics.lightTap();
      onPress();
    } else {
      haptics.warning();
    }
  };

  const percentage = progress?.percentage || 0;
  const isComplete = progress?.status === 'complete';
  const isInProgress = progress?.status === 'in_progress';

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.chapterCard,
          isComplete && styles.chapterCardComplete,
          isLocked && styles.chapterCardLocked,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={isLocked ? 1 : 0.9}
      >
        {/* Chapter number badge */}
        <View style={[styles.chapterBadge, isComplete && styles.chapterBadgeComplete]}>
          {isComplete ? (
            <IconCheck size={16} color={colors.background} />
          ) : (
            <Text style={[styles.chapterIcon, isComplete && styles.chapterIconComplete]}>
              {chapter.icon}
            </Text>
          )}
        </View>

        {/* Chapter info */}
        <View style={styles.chapterInfo}>
          <Text style={[styles.chapterTitle, isLocked && styles.chapterTitleLocked]}>
            {chapter.title}
          </Text>
          <Text style={styles.chapterSubtitle}>{chapter.subtitle}</Text>

          {/* Progress bar */}
          {!isLocked && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percentage}%` },
                    isComplete && styles.progressFillComplete,
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {progress?.completedQuestions || 0}/{chapter.questions.length}
              </Text>
            </View>
          )}
        </View>

        {/* Right indicator */}
        <View style={styles.chapterAction}>
          {isLocked ? (
            <View style={styles.lockBadge}>
              <IconLock size={16} color={colors.textMuted} />
            </View>
          ) : (
            <IconChevronRight size={20} color={colors.textMuted} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ChaptersDashboardScreen({ navigation }: any) {
  const gameState = useGame();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chapterProgress, setChapterProgress] = useState<Record<string, ChapterProgress>>({});
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      // Use the memoir progress from game state
      if (gameState.memoirProgress) {
        const progressMap: Record<string, ChapterProgress> = {};
        gameState.memoirProgress.chapters.forEach((ch: any) => {
          progressMap[ch.id] = {
            id: ch.id,
            completedQuestions: ch.completedQuestions,
            totalQuestions: ch.totalQuestions,
            percentage: ch.percentage,
            status: ch.status,
          };
        });
        setChapterProgress(progressMap);
      }

      // Check premium status
      const meResponse = await api.getMe();
      if (meResponse.user?.premium_until) {
        setIsPremium(new Date(meResponse.user.premium_until) > new Date());
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await gameState.refreshGameState();
    await fetchProgress();
  }, [gameState]);

  const handleChapterPress = (chapter: Chapter) => {
    navigation.navigate('Chapter', { chapter });
  };

  // First chapter is always free
  const isChapterLocked = (index: number) => {
    return index > 0 && !isPremium;
  };

  const overallProgress = gameState.memoirProgress?.overall;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Your Memoir</Text>
          <View style={styles.headerBadge}>
            <IconBook size={16} color={colors.primary} />
            <Text style={styles.headerBadgeText}>10 Chapters</Text>
          </View>
        </View>

        {/* Overall progress */}
        {overallProgress && (
          <View style={styles.overallProgress}>
            <View style={styles.overallProgressBar}>
              <View
                style={[
                  styles.overallProgressFill,
                  { width: `${overallProgress.percentage}%` },
                ]}
              />
            </View>
            <View style={styles.overallStats}>
              <Text style={styles.overallPercentage}>
                {overallProgress.percentage}% complete
              </Text>
              <Text style={styles.overallCount}>
                {overallProgress.answeredQuestions} of {overallProgress.totalQuestions} questions
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Chapters list */}
      <FlatList
        data={chapters}
        renderItem={({ item, index }) => (
          <ChapterCard
            chapter={item}
            progress={chapterProgress[item.id]}
            index={index}
            onPress={() => handleChapterPress(item)}
            isLocked={isChapterLocked(index)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fonts.displaySemiBold,
    color: colors.text,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  headerBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: colors.primary,
  },

  // Overall progress
  overallProgress: {
    marginTop: spacing.sm,
  },
  overallProgressBar: {
    height: 8,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallPercentage: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  overallCount: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },

  // List
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Chapter Card
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chapterCardComplete: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chapterCardLocked: {
    opacity: 0.6,
  },
  chapterBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  chapterBadgeComplete: {
    backgroundColor: colors.success,
  },
  chapterIcon: {
    fontSize: 16,
    fontFamily: fonts.displaySemiBold,
    color: colors.background,
  },
  chapterIconComplete: {
    color: colors.background,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 16,
    fontFamily: fonts.displayMedium,
    color: colors.text,
    marginBottom: 2,
  },
  chapterTitleLocked: {
    color: colors.textMuted,
  },
  chapterSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressFillComplete: {
    backgroundColor: colors.success,
  },
  progressText: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
    minWidth: 30,
    textAlign: 'right',
  },
  chapterAction: {
    marginLeft: spacing.sm,
  },
  lockBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
