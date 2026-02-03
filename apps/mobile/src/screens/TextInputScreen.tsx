import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { useGame } from '../context/GameContext';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import { IconMic, IconCheck, IconClose } from '../components';
import haptics from '../utils/haptics';

export default function TextInputScreen({ navigation, route }: any) {
  const { prompt } = route.params;
  const { refreshGameState } = useGame();

  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const characterCount = text.length;
  const minCharacters = 50;
  const isValid = characterCount >= minCharacters;

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Entrance animations
  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate progress bar
  useEffect(() => {
    const progress = Math.min(characterCount / minCharacters, 1);
    Animated.spring(progressAnim, {
      toValue: progress,
      tension: 100,
      friction: 10,
      useNativeDriver: false,
    }).start();

    // Animate checkmark when valid
    if (isValid && checkmarkScale._value === 0) {
      haptics.success();
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 300,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else if (!isValid && checkmarkScale._value !== 0) {
      Animated.timing(checkmarkScale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [characterCount]);

  const handleSubmit = async () => {
    if (!isValid) {
      haptics.error();
      Alert.alert(
        'Too Short',
        `Please write at least ${minCharacters} characters to save your memory.`
      );
      return;
    }

    haptics.mediumTap();
    setIsSubmitting(true);
    try {
      await api.completePrompt(prompt.id, text);
      await refreshGameState();

      navigation.replace('Celebration', {
        prompt,
        transcript: text,
      });
    } catch (error) {
      console.error('Submit failed:', error);
      haptics.error();
      Alert.alert(
        'Submission Failed',
        'Failed to save your memory. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (text.length > 0) {
      Alert.alert(
        'Discard Memory?',
        'Your written memory will be lost.',
        [
          { text: 'Keep Writing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleSwitchToVoice = () => {
    if (text.length > 0) {
      Alert.alert(
        'Switch to Voice?',
        'Your written text will be lost.',
        [
          { text: 'Keep Writing', style: 'cancel' },
          {
            text: 'Use Voice',
            onPress: () => navigation.replace('VoicePrompt', { prompt }),
          },
        ]
      );
    } else {
      navigation.replace('VoicePrompt', { prompt });
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const progressColor = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [colors.textMuted, colors.secondary, colors.primary],
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <IconClose size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write Memory</Text>
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitHeaderButton,
              !isValid && styles.submitDisabled,
              pressed && { opacity: 0.7 },
            ]}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.submitHeaderText, !isValid && styles.submitTextDisabled]}>
                Save
              </Text>
            )}
          </Pressable>
        </Animated.View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Prompt */}
          <Animated.View style={[styles.promptCard, { opacity: contentOpacity }]}>
            {prompt.collection && (
              <View style={styles.collectionBadgeWrapper}>
                <Text style={styles.collectionBadge}>{prompt.collection}</Text>
              </View>
            )}
            <Text style={styles.promptText}>{prompt.text}</Text>
          </Animated.View>

          {/* Text Input */}
          <Animated.View style={[styles.inputContainer, { opacity: contentOpacity }]}>
            <TextInput
              style={styles.textInput}
              multiline
              placeholder="Write your memory here..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              autoFocus
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Animated Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressWidth,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>
            <View style={styles.progressInfo}>
              <Text style={[styles.countText, isValid && styles.countValid]}>
                {characterCount} / {minCharacters}
              </Text>
              <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
                {isValid && <IconCheck size={18} color={colors.primary} />}
              </Animated.View>
            </View>
          </View>

          {/* Switch to Voice */}
          <TouchableOpacity
            style={styles.switchToVoice}
            onPress={handleSwitchToVoice}
            activeOpacity={0.7}
          >
            <View style={styles.switchIconWrapper}>
              <IconMic size={18} color={colors.primary} />
            </View>
            <Text style={styles.switchText}>I'd rather speak</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.backgroundAlt,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.displaySemiBold,
    color: colors.text,
  },
  submitHeaderButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryMuted,
    borderRadius: borderRadius.full,
  },
  submitDisabled: {
    backgroundColor: colors.backgroundAlt,
    opacity: 0.6,
  },
  submitHeaderText: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
  submitTextDisabled: {
    color: colors.textMuted,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  promptCard: {
    backgroundColor: colors.primaryMuted,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  collectionBadgeWrapper: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  collectionBadge: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  promptText: {
    fontSize: 20,
    fontFamily: fonts.displayMedium,
    color: colors.text,
    lineHeight: 28,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    minHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.text,
    lineHeight: 26,
    minHeight: 220,
  },
  progressSection: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  countText: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
  },
  countValid: {
    color: colors.primary,
  },
  switchToVoice: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  switchIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
  },
});
