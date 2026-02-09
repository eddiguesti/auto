# TODO-04: Voice UI Screens

## Objective

Build the complete voice-first user interface screens.

## Duration: 2 weeks

## Dependencies

- TODO-02 (Voice Recording)
- TODO-03 (Transcription)

---

## Tasks

### Task 4.1: Create Home Screen (Dashboard)

**Create:** `src/screens/HomeScreen.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import SpeakPromptButton from '../components/voice/SpeakPromptButton';
import StreakBadge from '../components/gamification/StreakBadge';
import { colors, spacing } from '../utils/theme';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [gameState, setGameState] = useState(null);
  const [todayPrompt, setTodayPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [state, prompt] = await Promise.all([
        api.getGameState(),
        api.getTodayPrompt(),
      ]);
      setGameState(state.data);
      setTodayPrompt(prompt.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Streak */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning!</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
        <StreakBadge count={gameState?.currentStreak || 0} />
      </View>

      {/* Today's Prompt Card */}
      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>Today's Memory Prompt</Text>

        {/* Speak button */}
        {todayPrompt && (
          <SpeakPromptButton text={todayPrompt.text} />
        )}

        {/* Prompt text */}
        <Text style={styles.promptText}>
          {todayPrompt?.text || 'Loading prompt...'}
        </Text>

        {/* Hint if available */}
        {todayPrompt?.hint && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>💡 {todayPrompt.hint}</Text>
          </View>
        )}

        {/* Big Voice Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('VoicePrompt', { prompt: todayPrompt })}
        >
          <Text style={styles.startButtonIcon}>🎙️</Text>
          <Text style={styles.startButtonText}>Start Speaking</Text>
        </TouchableOpacity>

        {/* Text fallback */}
        <TouchableOpacity
          style={styles.textFallback}
          onPress={() => navigation.navigate('TextPrompt', { prompt: todayPrompt })}
        >
          <Text style={styles.textFallbackText}>✏️ I'd rather type</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{gameState?.totalMemories || 0}</Text>
          <Text style={styles.statLabel}>Memories</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{gameState?.currentStreak || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{gameState?.achievements?.length || 0}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.parchment,
  },
  loadingText: {
    color: colors.sepia,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.ink,
  },
  date: {
    fontSize: 14,
    color: colors.sepia,
    marginTop: 4,
  },
  promptCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  promptLabel: {
    fontSize: 12,
    color: colors.sepia,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  promptText: {
    fontSize: 24,
    fontFamily: 'Georgia',
    color: colors.ink,
    lineHeight: 34,
    marginVertical: spacing.lg,
  },
  hintBox: {
    backgroundColor: `${colors.sepia}10`,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  hintText: {
    fontSize: 14,
    color: colors.sepia,
  },
  startButton: {
    backgroundColor: colors.sepia,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.sm,
  },
  startButtonIcon: {
    fontSize: 24,
  },
  startButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  textFallback: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  textFallbackText: {
    color: colors.sepia,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.ink,
  },
  statLabel: {
    fontSize: 12,
    color: colors.sepia,
    marginTop: 4,
  },
});
```

- [ ] Create HomeScreen with prompt card
- [ ] Add streak badge
- [ ] Add speak prompt button
- [ ] Add "Start Speaking" CTA
- [ ] Add "I'd rather type" fallback

---

### Task 4.2: Create Voice Prompt Screen

**Create:** `src/screens/VoicePromptScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import VoiceButton from '../components/voice/VoiceButton';
import AudioWaveform from '../components/voice/AudioWaveform';
import TranscriptDisplay from '../components/voice/TranscriptDisplay';
import SpeakPromptButton from '../components/voice/SpeakPromptButton';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useTranscription } from '../hooks/useTranscription';
import { colors, spacing } from '../utils/theme';

export default function VoicePromptScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { prompt } = route.params;

  const recorder = useVoiceRecorder();
  const transcription = useTranscription();

  // Start recording + transcription
  const handlePressIn = async () => {
    await Promise.all([
      recorder.startRecording(),
      transcription.startListening(),
    ]);
  };

  // Stop and navigate to review
  const handlePressOut = async () => {
    const [audioPath] = await Promise.all([
      recorder.stopRecording(),
      transcription.stopListening(),
    ]);

    if (audioPath && transcription.transcript) {
      navigation.navigate('Review', {
        prompt,
        audioPath,
        transcript: transcription.transcript,
        duration: recorder.duration,
      });
    } else if (audioPath) {
      // Recording exists but no transcript
      navigation.navigate('Review', {
        prompt,
        audioPath,
        transcript: '',
        duration: recorder.duration,
      });
    }
  };

  // Cancel recording
  const handleCancel = () => {
    Alert.alert(
      'Cancel Recording?',
      'Your recording will be lost.',
      [
        { text: 'Keep Recording', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            recorder.cancelRecording();
            transcription.cancelListening();
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {recorder.isRecording ? 'Recording...' : 'Your Memory'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Prompt */}
      <View style={styles.promptSection}>
        <SpeakPromptButton text={prompt.text} />
        <Text style={styles.promptText}>"{prompt.text}"</Text>
      </View>

      {/* Waveform */}
      <AudioWaveform
        isRecording={recorder.isRecording}
        duration={recorder.duration}
      />

      {/* Live Transcript */}
      <View style={styles.transcriptSection}>
        <TranscriptDisplay
          transcript={transcription.transcript}
          interimTranscript={transcription.interimTranscript}
          isListening={transcription.isListening}
          placeholder="Hold the button and start speaking..."
        />
      </View>

      {/* Voice Button */}
      <View style={styles.buttonSection}>
        <VoiceButton
          isRecording={recorder.isRecording}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        />
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>
        {recorder.isRecording
          ? 'Release when you're finished'
          : 'Press and hold to record your memory'}
      </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  cancelText: {
    color: colors.sepia,
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  promptSection: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  promptText: {
    fontSize: 20,
    fontFamily: 'Georgia',
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 28,
  },
  transcriptSection: {
    flex: 1,
    padding: spacing.lg,
  },
  buttonSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  instructions: {
    textAlign: 'center',
    color: colors.sepia,
    fontSize: 14,
    paddingBottom: spacing.xl,
  },
});
```

- [ ] Create VoicePromptScreen
- [ ] Integrate voice recording
- [ ] Integrate live transcription
- [ ] Handle navigation to Review screen

---

### Task 4.3: Create Review Screen

**Create:** `src/screens/ReviewScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AudioPlayer from '../components/voice/AudioPlayer';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { transcribeAudio } from '../services/transcription';
import api from '../services/api';
import { colors, spacing } from '../utils/theme';

export default function ReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { prompt, audioPath, transcript: initialTranscript, duration } = route.params;

  const player = useAudioPlayer();
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Get final transcription from Whisper
  useEffect(() => {
    const getFinalTranscript = async () => {
      if (!initialTranscript || initialTranscript.length < 20) {
        setIsTranscribing(true);
        try {
          const result = await transcribeAudio(audioPath, initialTranscript);
          setTranscript(result.transcript);
        } finally {
          setIsTranscribing(false);
        }
      }
    };
    getFinalTranscript();
  }, []);

  // Save memory
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Upload audio first
      const audioUrl = await uploadAudio(audioPath);

      // Complete prompt with transcript and audio
      const result = await api.completePrompt(prompt.id, transcript, audioUrl);

      if (result.success) {
        navigation.navigate('Celebration', {
          data: result.data,
          prompt,
        });
      }
    } catch (error) {
      console.error('Failed to save:', error);
      Alert.alert('Error', 'Failed to save your memory. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Re-record
  const handleReRecord = () => {
    navigation.replace('VoicePrompt', { prompt });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review Your Memory</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Prompt reminder */}
        <Text style={styles.promptText}>"{prompt.text}"</Text>

        {/* Audio Player */}
        <View style={styles.playerSection}>
          <AudioPlayer
            audioPath={audioPath}
            isPlaying={player.isPlaying}
            currentPosition={player.currentPosition}
            duration={player.duration || duration}
            onPlay={() => player.play(audioPath)}
            onPause={player.pause}
          />
        </View>

        {/* Transcript */}
        <View style={styles.transcriptSection}>
          <View style={styles.transcriptHeader}>
            <Text style={styles.transcriptLabel}>Transcript</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={styles.editButton}>
                {isEditing ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {isTranscribing ? (
            <View style={styles.transcribing}>
              <ActivityIndicator color={colors.sepia} />
              <Text style={styles.transcribingText}>
                Improving transcription...
              </Text>
            </View>
          ) : isEditing ? (
            <TextInput
              style={styles.transcriptInput}
              value={transcript}
              onChangeText={setTranscript}
              multiline
              autoFocus
            />
          ) : (
            <Text style={styles.transcriptText}>{transcript}</Text>
          )}

          <Text style={styles.wordCount}>
            {transcript.split(/\s+/).filter(Boolean).length} words
          </Text>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.reRecordButton}
          onPress={handleReRecord}
        >
          <Text style={styles.reRecordText}>🎙️ Re-record</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving || !transcript}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveText}>✓ Save Memory</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  backText: {
    color: colors.sepia,
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  promptText: {
    fontSize: 18,
    fontFamily: 'Georgia',
    color: colors.sepia,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  playerSection: {
    marginBottom: spacing.lg,
  },
  transcriptSection: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.sepia,
  },
  editButton: {
    color: colors.sepia,
    fontSize: 14,
  },
  transcribing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  transcribingText: {
    color: colors.sepia,
  },
  transcriptInput: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: colors.ink,
    lineHeight: 26,
    minHeight: 150,
  },
  transcriptText: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: colors.ink,
    lineHeight: 26,
  },
  wordCount: {
    fontSize: 12,
    color: colors.gray,
    marginTop: spacing.md,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.sepia}10`,
  },
  reRecordButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sepia,
    alignItems: 'center',
  },
  reRecordText: {
    color: colors.sepia,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.sepia,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] Create ReviewScreen
- [ ] Add audio playback
- [ ] Add transcript editing
- [ ] Add Whisper transcription improvement
- [ ] Handle save with audio upload

---

### Task 4.4: Create Celebration Screen

**Create:** `src/screens/CelebrationScreen.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { colors, spacing } from '../utils/theme';

export default function CelebrationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { data, prompt } = route.params;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Play success sound
    // Sound.play('celebration.mp3');
  }, []);

  const handleContinue = () => {
    navigation.navigate('Main');
  };

  return (
    <View style={styles.container}>
      {/* Confetti animation */}
      <LottieView
        source={require('../../assets/animations/confetti.json')}
        autoPlay
        loop={false}
        style={styles.confetti}
      />

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Streak badge */}
        <View style={styles.streakBadge}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakNumber}>{data.streak}</Text>
          <Text style={styles.streakLabel}>Day Streak!</Text>
        </View>

        {/* Success message */}
        <Text style={styles.title}>Memory Saved!</Text>
        <Text style={styles.subtitle}>
          You've captured another precious memory
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.wordCount}</Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.totalMemories}</Text>
            <Text style={styles.statLabel}>Total Memories</Text>
          </View>
        </View>

        {/* New achievements */}
        {data.newAchievements?.length > 0 && (
          <Animated.View style={[styles.achievements, { opacity: fadeAnim }]}>
            <Text style={styles.achievementsTitle}>🏆 New Achievement!</Text>
            {data.newAchievements.map((achievement, index) => (
              <View key={index} style={styles.achievementItem}>
                <Text style={styles.achievementIcon}>
                  {achievement.icon}
                </Text>
                <View>
                  <Text style={styles.achievementName}>
                    {achievement.name}
                  </Text>
                  <Text style={styles.achievementDesc}>
                    {achievement.description}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </Animated.View>

      {/* Continue button */}
      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confetti: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  content: {
    alignItems: 'center',
  },
  streakBadge: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  streakIcon: {
    fontSize: 64,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.ink,
  },
  streakLabel: {
    fontSize: 18,
    color: colors.sepia,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.sepia,
    marginBottom: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.ink,
  },
  statLabel: {
    fontSize: 12,
    color: colors.sepia,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: `${colors.sepia}20`,
  },
  achievements: {
    backgroundColor: `${colors.amber}15`,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  achievementIcon: {
    fontSize: 32,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  achievementDesc: {
    fontSize: 14,
    color: colors.sepia,
  },
  continueButton: {
    position: 'absolute',
    bottom: spacing.xl,
    backgroundColor: colors.sepia,
    paddingHorizontal: spacing.xl * 2,
    paddingVertical: spacing.md,
    borderRadius: 30,
  },
  continueText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
```

- [ ] Create CelebrationScreen
- [ ] Add confetti animation
- [ ] Show streak count
- [ ] Show new achievements
- [ ] Add success sound

---

### Task 4.5: Create History Screen with Audio Playback

**Create:** `src/screens/HistoryScreen.tsx`

```typescript
// History screen that shows past memories with audio playback
// Users can listen to their voice recordings

import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import AudioPlayer from '../components/voice/AudioPlayer'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import api from '../services/api'
import { colors, spacing } from '../utils/theme'

// ... implementation similar to web QuestHistory
// with added audio playback for each memory
```

- [ ] Create HistoryScreen
- [ ] Add audio playback for past recordings
- [ ] Group by month
- [ ] Filter by status

---

### Task 4.6: Create Streak Badge Component

**Create:** `src/components/gamification/StreakBadge.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';

interface StreakBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
}

export default function StreakBadge({ count, size = 'medium' }: StreakBadgeProps) {
  const sizes = {
    small: { badge: 32, icon: 14, text: 12 },
    medium: { badge: 48, icon: 20, text: 16 },
    large: { badge: 64, icon: 28, text: 20 },
  };

  const s = sizes[size];

  if (count === 0) return null;

  return (
    <View style={[styles.badge, { width: s.badge, height: s.badge }]}>
      <Text style={[styles.icon, { fontSize: s.icon }]}>🔥</Text>
      <Text style={[styles.count, { fontSize: s.text }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: `${colors.amber}20`,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    top: 2,
  },
  count: {
    fontWeight: 'bold',
    color: colors.ink,
    marginTop: 12,
  },
});
```

- [ ] Create StreakBadge component
- [ ] Test different sizes

---

## Verification Checklist

- [ ] Home screen shows prompt and big voice button
- [ ] "Tap to hear prompt" reads prompt aloud
- [ ] Voice recording screen works end-to-end
- [ ] Review screen shows audio player
- [ ] Transcript can be edited
- [ ] Celebration screen shows streak and achievements
- [ ] History screen plays past recordings
- [ ] Navigation flow is smooth

---

## Next Step

When complete, proceed to **TODO-05-TEXT-FALLBACK.md**
