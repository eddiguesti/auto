/**
 * VoicePromptScreen
 * Premium voice recording experience
 *
 * Design principles:
 * - Immersive, focused recording interface
 * - Clear visual feedback during recording
 * - Smooth, fluid animations
 * - Haptic feedback for tactile response
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import api from '../services/api';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import { springs, easings, durations } from '../utils/animations';
import haptics from '../utils/haptics';
import { GlowingVoiceButton, SkeletonPrompt, IconClose } from '../components';

const { width, height } = Dimensions.get('window');

interface Prompt {
  id: number;
  text: string;
  hint?: string;
  collection?: string;
}

export default function VoicePromptScreen({ navigation, route }: any) {
  const recorder = useVoiceRecorder();
  const [prompt, setPrompt] = useState<Prompt | null>(route?.params?.prompt || null);

  // Entrance animations
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const promptScale = useRef(new Animated.Value(0.95)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  // Recording state animations
  const timerOpacity = useRef(new Animated.Value(0)).current;
  const timerScale = useRef(new Animated.Value(0.8)).current;
  const recordingDotOpacity = useRef(new Animated.Value(1)).current;
  const backgroundPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!prompt) fetchTodayPrompt();
    runEntranceAnimations();
  }, []);

  // Recording dot blink animation
  useEffect(() => {
    if (recorder.isRecording) {
      // Show timer with animation
      Animated.parallel([
        Animated.timing(timerOpacity, {
          toValue: 1,
          duration: durations.fast,
          useNativeDriver: true,
        }),
        Animated.spring(timerScale, {
          toValue: 1,
          ...springs.bouncy,
        }),
      ]).start();

      // Blinking recording dot
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingDotOpacity, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingDotOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Subtle background pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(backgroundPulse, {
            toValue: 0.03,
            duration: 1000,
            easing: easings.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(backgroundPulse, {
            toValue: 0,
            duration: 1000,
            easing: easings.easeInOut,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Hide timer
      timerOpacity.setValue(0);
      timerScale.setValue(0.8);
      recordingDotOpacity.stopAnimation();
      backgroundPulse.stopAnimation();
      backgroundPulse.setValue(0);
    }
  }, [recorder.isRecording]);

  const runEntranceAnimations = () => {
    Animated.stagger(80, [
      // Content fades up
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: durations.normal,
          easing: easings.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslateY, {
          toValue: 0,
          ...springs.gentle,
        }),
        Animated.spring(promptScale, {
          toValue: 1,
          ...springs.gentle,
        }),
      ]),
      // Button pops in
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: durations.fast,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          ...springs.bouncy,
        }),
      ]),
    ]).start();
  };

  const fetchTodayPrompt = async () => {
    try {
      const response = await api.getTodayPrompt();
      setPrompt(response.data);
    } catch (error) {
      setPrompt({
        id: 1,
        text: "What made you smile today?",
        collection: 'Daily Life',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePressIn = useCallback(async () => {
    const success = await recorder.startRecording();
    if (!success && recorder.error) {
      haptics.error();
      Alert.alert(
        'Microphone Access Needed',
        'Please allow microphone access to record your memory.',
        [{ text: 'OK' }]
      );
    }
  }, [recorder]);

  const handlePressOut = useCallback(async () => {
    if (recorder.isRecording && recorder.duration >= 1) {
      const uri = await recorder.stopRecording();
      if (uri) {
        haptics.success();
        navigation.navigate('Review', {
          prompt,
          audioUri: uri,
          duration: recorder.duration,
        });
      }
    } else if (recorder.isRecording) {
      await recorder.cancelRecording();
      haptics.warning();
    }
  }, [recorder, prompt, navigation]);

  const handleCancel = useCallback(async () => {
    haptics.lightTap();
    await recorder.cancelRecording();
    navigation.goBack();
  }, [recorder, navigation]);

  const handleTypeInstead = useCallback(() => {
    haptics.lightTap();
    navigation.navigate('TextInput', { prompt });
  }, [navigation, prompt]);

  if (!prompt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <SkeletonPrompt />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Recording background pulse */}
      <Animated.View
        style={[
          styles.recordingBackground,
          {
            opacity: backgroundPulse,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <IconClose size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Recording timer (shown when recording) */}
          <Animated.View
            style={[
              styles.timerContainer,
              {
                opacity: timerOpacity,
                transform: [{ scale: timerScale }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.recordingDot,
                { opacity: recordingDotOpacity },
              ]}
            />
            <Text style={styles.timerText}>{formatDuration(recorder.duration)}</Text>
          </Animated.View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Prompt Section */}
        <Animated.View
          style={[
            styles.promptSection,
            { transform: [{ scale: promptScale }] },
          ]}
        >
          <View style={styles.promptBadge}>
            <Text style={styles.promptBadgeText}>TODAY'S PROMPT</Text>
          </View>
          <Text style={styles.promptText}>{prompt.text}</Text>
          {prompt.hint && (
            <Text style={styles.promptHint}>{prompt.hint}</Text>
          )}
        </Animated.View>

        {/* Recording feedback area */}
        <View style={styles.feedbackArea}>
          {recorder.isRecording ? (
            <View style={styles.recordingFeedback}>
              <Text style={styles.recordingHint}>Release when you're done</Text>
              <Text style={styles.recordingSubHint}>
                Take your time — every detail matters
              </Text>
            </View>
          ) : (
            <View style={styles.instructionArea}>
              <Text style={styles.instruction}>Hold to record</Text>
              <Text style={styles.subInstruction}>
                Speak naturally — your story is worth telling
              </Text>
            </View>
          )}
        </View>

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
            isRecording={recorder.isRecording}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            audioLevel={recorder.audioLevel}
          />
        </Animated.View>

        {/* Alternative action */}
        {!recorder.isRecording && (
          <TouchableOpacity
            style={styles.altAction}
            onPress={handleTypeInstead}
            activeOpacity={0.7}
          >
            <Text style={styles.altActionText}>I'd prefer to type</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  recordingBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.error,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
    fontVariant: ['tabular-nums'],
  },
  headerSpacer: {
    width: 44,
  },

  // Prompt
  promptSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
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
    fontWeight: '700',
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

  // Feedback area
  feedbackArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  recordingFeedback: {
    alignItems: 'center',
  },
  recordingHint: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  recordingSubHint: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  instructionArea: {
    alignItems: 'center',
  },
  instruction: {
    fontSize: 20,
    fontFamily: fonts.displayMedium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subInstruction: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Button section
  buttonSection: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },

  // Alternative action
  altAction: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  altActionText: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
  },
});
