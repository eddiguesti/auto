/**
 * QuickMemoScreen
 * Free-form voice recording for quick thoughts and memories
 *
 * Design principles:
 * - Simple, distraction-free interface
 * - No prompt required - just record whatever you want
 * - Same premium recording experience as VoicePromptScreen
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import { springs, easings, durations } from '../utils/animations';
import haptics from '../utils/haptics';
import { GlowingVoiceButton, IconClose } from '../components';

const { width, height } = Dimensions.get('window');

export default function QuickMemoScreen({ navigation }: any) {
  const recorder = useVoiceRecorder();
  const [title, setTitle] = useState('');

  // Entrance animations
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  // Recording state animations
  const timerOpacity = useRef(new Animated.Value(0)).current;
  const timerScale = useRef(new Animated.Value(0.8)).current;
  const recordingDotOpacity = useRef(new Animated.Value(1)).current;
  const backgroundPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    runEntranceAnimations();
  }, []);

  // Recording dot blink animation
  useEffect(() => {
    if (recorder.isRecording) {
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
      timerOpacity.setValue(0);
      timerScale.setValue(0.8);
      recordingDotOpacity.stopAnimation();
      backgroundPulse.stopAnimation();
      backgroundPulse.setValue(0);
    }
  }, [recorder.isRecording]);

  const runEntranceAnimations = () => {
    Animated.stagger(80, [
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
      ]),
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
        'Please allow microphone access to record your memo.',
        [{ text: 'OK' }]
      );
    }
  }, [recorder]);

  const handlePressOut = useCallback(async () => {
    if (recorder.isRecording && recorder.duration >= 1) {
      const uri = await recorder.stopRecording();
      if (uri) {
        haptics.success();
        navigation.navigate('MemoReview', {
          audioUri: uri,
          duration: recorder.duration,
          title: title.trim() || undefined,
        });
      }
    } else if (recorder.isRecording) {
      await recorder.cancelRecording();
      haptics.warning();
    }
  }, [recorder, title, navigation]);

  const handleCancel = useCallback(async () => {
    haptics.lightTap();
    await recorder.cancelRecording();
    navigation.goBack();
  }, [recorder, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Recording background pulse */}
      <Animated.View
        style={[
          styles.recordingBackground,
          { opacity: backgroundPulse },
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

          {/* Recording timer */}
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
              style={[styles.recordingDot, { opacity: recordingDotOpacity }]}
            />
            <Text style={styles.timerText}>{formatDuration(recorder.duration)}</Text>
          </Animated.View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.memoBadge}>
            <Text style={styles.memoBadgeText}>QUICK MEMO</Text>
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Add a title (optional)"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            editable={!recorder.isRecording}
          />
        </View>

        {/* Feedback area */}
        <View style={styles.feedbackArea}>
          {recorder.isRecording ? (
            <View style={styles.recordingFeedback}>
              <Text style={styles.recordingHint}>Release when you're done</Text>
              <Text style={styles.recordingSubHint}>
                Speak freely — capture any thought or memory
              </Text>
            </View>
          ) : (
            <View style={styles.instructionArea}>
              <Text style={styles.instruction}>Hold to record</Text>
              <Text style={styles.subInstruction}>
                Record a quick thought, story, or memory
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

        {/* Info text */}
        {!recorder.isRecording && (
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              Memos are transcribed and saved for you to revisit anytime
            </Text>
          </View>
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

  // Title Section
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  memoBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  memoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  titleInput: {
    fontSize: 24,
    fontFamily: fonts.displayMedium,
    color: colors.text,
    textAlign: 'center',
    width: '100%',
    paddingVertical: spacing.sm,
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

  // Info section
  infoSection: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
