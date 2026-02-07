/**
 * MemoReviewScreen
 * Review and save a quick voice memo
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import api from '../services/api';
import { colors, spacing, borderRadius, fonts } from '../utils/theme';
import haptics from '../utils/haptics';

export default function MemoReviewScreen({ navigation, route }: any) {
  const { audioUri, duration, title: initialTitle } = route.params;

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(initialTitle || '');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    loadSound();
    uploadAndTranscribe();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadSound = async () => {
    try {
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(audioSound);
    } catch (error) {
      console.error('Failed to load sound:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis / 1000);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    }
  };

  const uploadAndTranscribe = async () => {
    setIsTranscribing(true);
    try {
      const response = await api.uploadAudio(audioUri);
      if (response.data?.audioUrl) {
        setAudioUrl(response.data.audioUrl);
      }
      if (response.data?.transcript) {
        setTranscript(response.data.transcript);
      }
    } catch (error) {
      console.error('Upload/Transcription failed:', error);
      setTranscript('(Transcription unavailable - your voice recording will still be saved)');
    } finally {
      setIsTranscribing(false);
    }
  };

  const togglePlayback = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      if (playbackPosition >= duration) {
        await sound.setPositionAsync(0);
      }
      await sound.playAsync();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReRecord = async () => {
    if (sound) {
      await sound.unloadAsync();
    }
    navigation.goBack();
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Memo?',
      'This recording will not be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            if (sound) {
              await sound.unloadAsync();
            }
            haptics.lightTap();
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!audioUrl) {
      Alert.alert('Please wait', 'Audio is still uploading...');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createMemo({
        audio_url: audioUrl,
        transcript: transcript || undefined,
        title: title.trim() || undefined,
        duration: Math.round(duration),
      });

      haptics.success();

      // Navigate back to home with success message
      navigation.navigate('Home');
      Alert.alert('Saved!', 'Your memo has been saved.');
    } catch (error) {
      console.error('Submit failed:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save your memo. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = duration > 0 ? (playbackPosition / duration) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscard} style={styles.backButton}>
          <Text style={styles.backText}>Discard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Memo</Text>
        <TouchableOpacity onPress={handleReRecord} style={styles.backButton}>
          <Text style={styles.reRecordText}>Re-record</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Title Input */}
        <View style={styles.titleCard}>
          <Text style={styles.cardLabel}>Title (optional)</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Add a title for this memo..."
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Audio Player */}
        <View style={styles.playerCard}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={togglePlayback}
            disabled={!sound}
          >
            <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>

        {/* Transcript */}
        <View style={styles.transcriptCard}>
          <Text style={styles.cardLabel}>Transcript</Text>
          {isTranscribing ? (
            <View style={styles.transcribingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.transcribingText}>Transcribing your voice...</Text>
            </View>
          ) : (
            <Text style={styles.transcriptText}>{transcript}</Text>
          )}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (isSubmitting || isTranscribing || !audioUrl) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || isTranscribing || !audioUrl}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>Save Memo</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  backButton: {
    padding: spacing.sm,
  },
  backText: {
    color: colors.error,
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
  },
  reRecordText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.displayMedium,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  titleCard: {
    backgroundColor: colors.backgroundAlt,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  titleInput: {
    fontSize: 18,
    fontFamily: fonts.body,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  playerCard: {
    backgroundColor: colors.backgroundAlt,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  timeText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  transcriptCard: {
    backgroundColor: colors.backgroundAlt,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  transcribingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.body,
  },
  transcriptText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.text,
    lineHeight: 24,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: 18,
    fontFamily: fonts.displayMedium,
  },
});
