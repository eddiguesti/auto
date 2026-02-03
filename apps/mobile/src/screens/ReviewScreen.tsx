import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import api from '../services/api';
import { useGame } from '../context/GameContext';
import { colors, spacing, borderRadius } from '../utils/theme';

export default function ReviewScreen({ navigation, route }: any) {
  const { prompt, audioUri, duration } = route.params;
  const { refreshGameState } = useGame();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [transcript, setTranscript] = useState(route.params.transcript || '');
  const [isTranscribing, setIsTranscribing] = useState(!route.params.transcript);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSound();
    if (!route.params.transcript) {
      transcribeAudio();
    }

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

  const transcribeAudio = async () => {
    setIsTranscribing(true);
    try {
      // Upload audio and get transcription
      const response = await api.uploadAudio(audioUri);
      if (response.data?.transcript) {
        setTranscript(response.data.transcript);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      // Allow user to continue without transcript
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Upload audio and complete prompt
      const uploadResponse = await api.uploadAudio(audioUri);
      await api.completePrompt(prompt.id, transcript, uploadResponse.data?.audioUrl);

      // Refresh game state to update XP, streak, etc.
      await refreshGameState();

      // Navigate to celebration screen
      navigation.replace('Celebration', {
        prompt,
        transcript,
      });
    } catch (error) {
      console.error('Submit failed:', error);
      Alert.alert(
        'Submission Failed',
        'Failed to save your memory. Please try again.',
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
        <TouchableOpacity onPress={handleReRecord} style={styles.backButton}>
          <Text style={styles.backText}>← Re-record</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Prompt */}
        <View style={styles.promptCard}>
          <Text style={styles.promptLabel}>Prompt</Text>
          <Text style={styles.promptText}>{prompt.text}</Text>
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
          <Text style={styles.transcriptLabel}>Transcript</Text>
          {isTranscribing ? (
            <View style={styles.transcribingContainer}>
              <ActivityIndicator size="small" color={colors.sepia} />
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
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || isTranscribing}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Save Memory</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream,
  },
  backButton: {
    padding: spacing.sm,
  },
  backText: {
    color: colors.sepia,
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  headerSpacer: {
    width: 80,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  promptCard: {
    backgroundColor: colors.cream,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  promptLabel: {
    fontSize: 12,
    color: colors.sepia,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  promptText: {
    fontSize: 18,
    color: colors.ink,
    lineHeight: 26,
  },
  playerCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.sepia,
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
    backgroundColor: colors.cream,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.sepia,
    borderRadius: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  timeText: {
    fontSize: 12,
    color: colors.sepia,
  },
  transcriptCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    minHeight: 150,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transcriptLabel: {
    fontSize: 12,
    color: colors.sepia,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  transcribingText: {
    color: colors.sepia,
    fontSize: 14,
  },
  transcriptText: {
    fontSize: 16,
    color: colors.ink,
    lineHeight: 24,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cream,
  },
  submitButton: {
    backgroundColor: colors.sepia,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
