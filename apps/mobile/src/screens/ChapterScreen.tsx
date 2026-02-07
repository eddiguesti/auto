/**
 * ChapterScreen
 * View and answer questions within a chapter
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { Chapter, Question } from '../data/chapters';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import haptics from '../utils/haptics';
import { IconChevronLeft, IconChevronRight, IconCheck, IconMic, IconArrowLeft, IconFeather, IconLightbulb } from '../components';
import MemoryTriggersSheet from '../components/MemoryTriggersSheet';

interface Answer {
  id?: number;
  answer: string;
}

export default function ChapterScreen({ navigation, route }: any) {
  const { chapter } = route.params as { chapter: Chapter };
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showMemoryTriggers, setShowMemoryTriggers] = useState(false);

  // Current question
  const currentQuestion = chapter.questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id]?.answer || '';

  // Save timer for debounce
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Progress indicator animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchAnswers();
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Animate progress indicator
    Animated.timing(progressAnim, {
      toValue: (currentIndex + 1) / chapter.questions.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  const fetchAnswers = async () => {
    try {
      const stories = await api.getChapterStories(chapter.id);
      const answerMap: Record<string, Answer> = {};
      if (Array.isArray(stories)) {
        stories.forEach((story: any) => {
          answerMap[story.question_id] = {
            id: story.id,
            answer: story.answer || '',
          };
        });
      }
      setAnswers(answerMap);

      // Start at first unanswered question
      const firstUnanswered = chapter.questions.findIndex(
        (q) => !answerMap[q.id]?.answer
      );
      if (firstUnanswered > 0) {
        setCurrentIndex(firstUnanswered);
      }
    } catch (error) {
      console.error('Failed to fetch answers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnswer = useCallback(async (questionId: string, text: string) => {
    if (!text.trim()) return;

    setSaveStatus('saving');
    try {
      await api.saveStory({
        chapter_id: chapter.id,
        question_id: questionId,
        answer: text,
        total_questions: chapter.questions.length,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [chapter.id, chapter.questions.length]);

  const handleTextChange = (text: string) => {
    // Update local state immediately
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        answer: text,
      },
    }));

    // Debounce save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveAnswer(currentQuestion.id, text);
    }, 1000);
  };

  const navigateQuestion = (direction: 'prev' | 'next') => {
    Keyboard.dismiss();

    // Save current answer if there's pending text
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveAnswer(currentQuestion.id, currentAnswer);
    }

    haptics.lightTap();

    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < chapter.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleBack = () => {
    // Save any pending changes
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveAnswer(currentQuestion.id, currentAnswer);
    }
    navigation.goBack();
  };

  const handleVoicePress = () => {
    navigation.navigate('VoicePrompt', {
      prompt: {
        id: `${chapter.id}-${currentQuestion.id}`,
        text: currentQuestion.question,
        hint: currentQuestion.prompt,
      },
    });
  };

  const handleAIAssistantPress = () => {
    haptics.mediumTap();
    navigation.navigate('AIAssistant', {
      context: {
        chapterId: chapter.id,
        question: currentQuestion,
        answer: currentAnswer,
      },
      onInsertText: (text: string) => {
        // Update the answer with AI-generated text
        setAnswers((prev) => ({
          ...prev,
          [currentQuestion.id]: {
            ...prev[currentQuestion.id],
            answer: text,
          },
        }));
        // Save the new answer
        saveAnswer(currentQuestion.id, text);
      },
    });
  };

  const handleMemoryTriggersPress = () => {
    haptics.lightTap();
    setShowMemoryTriggers(true);
  };

  const getAnsweredCount = () => {
    return Object.values(answers).filter((a) => a.answer?.trim()).length;
  };

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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <IconArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.chapterTitle} numberOfLines={1}>
              {chapter.title}
            </Text>
            <Text style={styles.questionCounter}>
              {currentIndex + 1} of {chapter.questions.length}
            </Text>
          </View>

          {/* Save status */}
          <View style={styles.saveStatus}>
            {saveStatus === 'saving' && (
              <Text style={styles.saveStatusText}>Saving...</Text>
            )}
            {saveStatus === 'saved' && (
              <View style={styles.savedIndicator}>
                <IconCheck size={14} color={colors.success} />
                <Text style={[styles.saveStatusText, { color: colors.success }]}>Saved</Text>
              </View>
            )}
            {saveStatus === 'error' && (
              <Text style={[styles.saveStatusText, { color: colors.error }]}>Error</Text>
            )}
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {getAnsweredCount()}/{chapter.questions.length} answered
          </Text>
        </View>

        {/* Question content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Question */}
          <View style={styles.questionSection}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            <Text style={styles.questionPrompt}>{currentQuestion.prompt}</Text>
          </View>

          {/* Answer input */}
          <View style={styles.answerSection}>
            <TextInput
              style={styles.answerInput}
              placeholder="Write your answer here..."
              placeholderTextColor={colors.textMuted}
              value={currentAnswer}
              onChangeText={handleTextChange}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Voice option */}
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={handleVoicePress}
            activeOpacity={0.7}
          >
            <IconMic size={20} color={colors.primary} />
            <Text style={styles.voiceButtonText}>Speak your answer instead</Text>
          </TouchableOpacity>

          {/* AI Assistant and Memory Triggers */}
          <View style={styles.helpButtonsRow}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={handleAIAssistantPress}
              activeOpacity={0.7}
            >
              <IconFeather size={18} color={colors.sepia} />
              <Text style={styles.helpButtonText}>Ask AI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpButton}
              onPress={handleMemoryTriggersPress}
              activeOpacity={0.7}
            >
              <IconLightbulb size={18} color={colors.warning} />
              <Text style={styles.helpButtonText}>Need Ideas?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Memory Triggers Sheet */}
        <MemoryTriggersSheet
          visible={showMemoryTriggers}
          onClose={() => setShowMemoryTriggers(false)}
          chapterId={chapter.id}
        />

        {/* Navigation footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            onPress={() => navigateQuestion('prev')}
            disabled={currentIndex === 0}
          >
            <IconChevronLeft size={24} color={currentIndex === 0 ? colors.textMuted : colors.text} />
            <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          {/* Progress dots */}
          <View style={styles.dotContainer}>
            {chapter.questions.slice(
              Math.max(0, currentIndex - 2),
              Math.min(chapter.questions.length, currentIndex + 3)
            ).map((q, i) => {
              const actualIndex = Math.max(0, currentIndex - 2) + i;
              const isAnswered = !!answers[q.id]?.answer?.trim();
              const isCurrent = actualIndex === currentIndex;
              return (
                <View
                  key={q.id}
                  style={[
                    styles.dot,
                    isCurrent && styles.dotCurrent,
                    isAnswered && styles.dotAnswered,
                  ]}
                />
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex === chapter.questions.length - 1 && styles.navButtonDisabled,
            ]}
            onPress={() => navigateQuestion('next')}
            disabled={currentIndex === chapter.questions.length - 1}
          >
            <Text
              style={[
                styles.navButtonText,
                currentIndex === chapter.questions.length - 1 && styles.navButtonTextDisabled,
              ]}
            >
              Next
            </Text>
            <IconChevronRight
              size={24}
              color={currentIndex === chapter.questions.length - 1 ? colors.textMuted : colors.text}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerCenter: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 16,
    fontFamily: fonts.displayMedium,
    color: colors.text,
  },
  questionCounter: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  saveStatus: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveStatusText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'right',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  questionSection: {
    marginBottom: spacing.lg,
  },
  questionText: {
    fontSize: 24,
    fontFamily: fonts.displayMedium,
    color: colors.text,
    lineHeight: 32,
    marginBottom: spacing.sm,
  },
  questionPrompt: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Answer
  answerSection: {
    marginBottom: spacing.lg,
  },
  answerInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.text,
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Voice option
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  voiceButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.primary,
  },

  // Help buttons row (AI + Memory Triggers)
  helpButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: 4,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  navButtonTextDisabled: {
    color: colors.textMuted,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotCurrent: {
    backgroundColor: colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotAnswered: {
    backgroundColor: colors.success,
  },
});
