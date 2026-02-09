# TODO-02: Voice Recording System

## Objective

Implement the core voice recording functionality with a hold-to-speak interface.

## Duration: 2 weeks

## Dependencies

- TODO-01 (Project Setup)

---

## Tasks

### Task 2.1: Create Voice Recorder Hook

**Create:** `src/hooks/useVoiceRecorder.ts`

```typescript
import { useState, useCallback, useRef } from 'react'
import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AudioEncoderAndroidType,
  AudioSourceAndroidType
} from 'react-native-audio-recorder-player'
import { Platform, PermissionsAndroid } from 'react-native'

interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number // in seconds
  audioPath: string | null
  error: string | null
}

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioPath: null,
    error: null
  })

  const recorderRef = useRef<AudioRecorderPlayer>(new AudioRecorderPlayer())

  // Request microphone permission
  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Memory Quest needs access to your microphone to record memories',
          buttonPositive: 'Allow'
        }
      )
      return granted === PermissionsAndroid.RESULTS.GRANTED
    }
    return true // iOS handles permission via Info.plist
  }

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await requestPermission()
      if (!hasPermission) {
        setState(s => ({ ...s, error: 'Microphone permission denied' }))
        return false
      }

      const path = Platform.select({
        ios: `memory_${Date.now()}.m4a`,
        android: `${Date.now()}.mp4`
      })

      const audioSet = {
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
        AVNumberOfChannelsKeyIOS: 1,
        AVFormatIDKeyIOS: AVEncodingOption.aac
      }

      const uri = await recorderRef.current.startRecorder(path, audioSet)

      recorderRef.current.addRecordBackListener(e => {
        setState(s => ({
          ...s,
          duration: Math.floor(e.currentPosition / 1000)
        }))
      })

      setState(s => ({
        ...s,
        isRecording: true,
        audioPath: uri,
        error: null
      }))

      return true
    } catch (error) {
      setState(s => ({ ...s, error: 'Failed to start recording' }))
      return false
    }
  }, [])

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      const uri = await recorderRef.current.stopRecorder()
      recorderRef.current.removeRecordBackListener()

      setState(s => ({
        ...s,
        isRecording: false,
        audioPath: uri
      }))

      return uri
    } catch (error) {
      setState(s => ({ ...s, error: 'Failed to stop recording' }))
      return null
    }
  }, [])

  // Cancel recording
  const cancelRecording = useCallback(async () => {
    try {
      await recorderRef.current.stopRecorder()
      recorderRef.current.removeRecordBackListener()

      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioPath: null,
        error: null
      })
    } catch (error) {
      // Ignore errors when canceling
    }
  }, [])

  // Reset state
  const reset = useCallback(() => {
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioPath: null,
      error: null
    })
  }, [])

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    reset
  }
}
```

- [ ] Create useVoiceRecorder hook
- [ ] Test permission request on Android
- [ ] Test permission request on iOS
- [ ] Test recording creates audio file

---

### Task 2.2: Create Audio Player Hook

**Create:** `src/hooks/useAudioPlayer.ts`

```typescript
import { useState, useCallback, useRef } from 'react'
import AudioRecorderPlayer from 'react-native-audio-recorder-player'

interface PlayerState {
  isPlaying: boolean
  currentPosition: number // in seconds
  duration: number // in seconds
  error: string | null
}

export function useAudioPlayer() {
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentPosition: 0,
    duration: 0,
    error: null
  })

  const playerRef = useRef<AudioRecorderPlayer>(new AudioRecorderPlayer())

  // Play audio
  const play = useCallback(async (audioPath: string) => {
    try {
      await playerRef.current.startPlayer(audioPath)

      playerRef.current.addPlayBackListener(e => {
        setState(s => ({
          ...s,
          currentPosition: Math.floor(e.currentPosition / 1000),
          duration: Math.floor(e.duration / 1000)
        }))

        // Auto-stop at end
        if (e.currentPosition >= e.duration) {
          playerRef.current.stopPlayer()
          setState(s => ({ ...s, isPlaying: false, currentPosition: 0 }))
        }
      })

      setState(s => ({ ...s, isPlaying: true, error: null }))
    } catch (error) {
      setState(s => ({ ...s, error: 'Failed to play audio' }))
    }
  }, [])

  // Pause audio
  const pause = useCallback(async () => {
    try {
      await playerRef.current.pausePlayer()
      setState(s => ({ ...s, isPlaying: false }))
    } catch (error) {
      // Ignore pause errors
    }
  }, [])

  // Stop audio
  const stop = useCallback(async () => {
    try {
      await playerRef.current.stopPlayer()
      playerRef.current.removePlayBackListener()
      setState(s => ({ ...s, isPlaying: false, currentPosition: 0 }))
    } catch (error) {
      // Ignore stop errors
    }
  }, [])

  // Seek to position
  const seekTo = useCallback(async (seconds: number) => {
    try {
      await playerRef.current.seekToPlayer(seconds * 1000)
      setState(s => ({ ...s, currentPosition: seconds }))
    } catch (error) {
      // Ignore seek errors
    }
  }, [])

  return {
    ...state,
    play,
    pause,
    stop,
    seekTo
  }
}
```

- [ ] Create useAudioPlayer hook
- [ ] Test playback of recorded audio
- [ ] Test pause/resume
- [ ] Test seek functionality

---

### Task 2.3: Create Voice Button Component

**Create:** `src/components/voice/VoiceButton.tsx`

```typescript
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Vibration,
} from 'react-native';
import { colors, spacing } from '../../utils/theme';

interface VoiceButtonProps {
  isRecording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
}

export default function VoiceButton({
  isRecording,
  onPressIn,
  onPressOut,
  disabled,
}: VoiceButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation while recording
  React.useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const handlePressIn = () => {
    if (disabled) return;

    Vibration.vibrate(50); // Haptic feedback
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
    onPressIn();
  };

  const handlePressOut = () => {
    if (disabled) return;

    Vibration.vibrate(50);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onPressOut();
  };

  return (
    <View style={styles.container}>
      {/* Pulse ring (visible when recording) */}
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}

      {/* Main button */}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <Animated.View
          style={[
            styles.button,
            isRecording && styles.buttonRecording,
            disabled && styles.buttonDisabled,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.icon}>{isRecording ? '🔴' : '🎙️'}</Text>
        </Animated.View>
      </Pressable>

      {/* Label */}
      <Text style={styles.label}>
        {isRecording ? 'Release to finish' : 'Hold to speak'}
      </Text>
    </View>
  );
}

const BUTTON_SIZE = 120;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 40,
    height: BUTTON_SIZE + 40,
    borderRadius: (BUTTON_SIZE + 40) / 2,
    backgroundColor: 'rgba(239, 68, 68, 0.2)', // red with opacity
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.sepia,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonRecording: {
    backgroundColor: colors.recording,
  },
  buttonDisabled: {
    backgroundColor: colors.gray,
    opacity: 0.5,
  },
  icon: {
    fontSize: 48,
  },
  label: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.sepia,
    fontWeight: '500',
  },
});
```

- [ ] Create VoiceButton component
- [ ] Test hold-to-speak interaction
- [ ] Test pulse animation
- [ ] Test haptic feedback

---

### Task 2.4: Create Audio Waveform Component

**Create:** `src/components/voice/AudioWaveform.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../../utils/theme';

interface AudioWaveformProps {
  isRecording: boolean;
  duration: number;  // in seconds
}

export default function AudioWaveform({ isRecording, duration }: AudioWaveformProps) {
  const bars = 20;
  const animations = useRef(
    Array.from({ length: bars }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isRecording) {
      // Animate bars randomly to simulate waveform
      const animateBar = (index: number) => {
        Animated.sequence([
          Animated.timing(animations[index], {
            toValue: Math.random() * 0.7 + 0.3, // 0.3 to 1.0
            duration: 100 + Math.random() * 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isRecording) {
            animateBar(index);
          }
        });
      };

      animations.forEach((_, index) => animateBar(index));
    } else {
      // Reset all bars
      animations.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [isRecording, animations]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {animations.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                transform: [{ scaleY: anim }],
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.timeContainer}>
        <View style={[styles.dot, isRecording && styles.dotRecording]} />
        <Animated.Text style={styles.time}>
          {formatTime(duration)}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    gap: 4,
  },
  bar: {
    width: 4,
    height: 40,
    backgroundColor: colors.sepia,
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray,
    marginRight: 8,
  },
  dotRecording: {
    backgroundColor: colors.recording,
  },
  time: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});
```

- [ ] Create AudioWaveform component
- [ ] Test animation while recording
- [ ] Test time display

---

### Task 2.5: Create Audio Player Component

**Create:** `src/components/voice/AudioPlayer.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../utils/theme';

interface AudioPlayerProps {
  audioPath: string;
  isPlaying: boolean;
  currentPosition: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek?: (position: number) => void;
}

export default function AudioPlayer({
  isPlaying,
  currentPosition,
  duration,
  onPlay,
  onPause,
}: AudioPlayerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentPosition / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Play/Pause Button */}
      <TouchableOpacity
        style={styles.playButton}
        onPress={isPlaying ? onPause : onPlay}
      >
        <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(currentPosition)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: spacing.md,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sepia,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  playIcon: {
    fontSize: 20,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.sepia,
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    color: colors.gray,
    fontVariant: ['tabular-nums'],
  },
});
```

- [ ] Create AudioPlayer component
- [ ] Test play/pause toggle
- [ ] Test progress bar

---

### Task 2.6: Create Voice Context

**Create:** `src/context/VoiceContext.tsx`

```typescript
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VoiceState {
  audioPath: string | null;
  duration: number;
  transcript: string;
  isTranscribing: boolean;
}

interface VoiceContextType {
  state: VoiceState;
  setAudioPath: (path: string | null) => void;
  setDuration: (duration: number) => void;
  setTranscript: (transcript: string) => void;
  setIsTranscribing: (value: boolean) => void;
  reset: () => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

const initialState: VoiceState = {
  audioPath: null,
  duration: 0,
  transcript: '',
  isTranscribing: false,
};

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VoiceState>(initialState);

  const setAudioPath = (path: string | null) => {
    setState(s => ({ ...s, audioPath: path }));
  };

  const setDuration = (duration: number) => {
    setState(s => ({ ...s, duration }));
  };

  const setTranscript = (transcript: string) => {
    setState(s => ({ ...s, transcript }));
  };

  const setIsTranscribing = (value: boolean) => {
    setState(s => ({ ...s, isTranscribing: value }));
  };

  const reset = () => {
    setState(initialState);
  };

  return (
    <VoiceContext.Provider
      value={{
        state,
        setAudioPath,
        setDuration,
        setTranscript,
        setIsTranscribing,
        reset,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within VoiceProvider');
  }
  return context;
}
```

- [ ] Create VoiceContext
- [ ] Wrap app with VoiceProvider

---

### Task 2.7: Test Recording Flow

Create a test screen to verify the complete recording flow:

```typescript
// Temporary test in HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import VoiceButton from '../components/voice/VoiceButton';
import AudioWaveform from '../components/voice/AudioWaveform';
import AudioPlayer from '../components/voice/AudioPlayer';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

export default function HomeScreen() {
  const recorder = useVoiceRecorder();
  const player = useAudioPlayer();

  const handlePressIn = async () => {
    await recorder.startRecording();
  };

  const handlePressOut = async () => {
    const path = await recorder.stopRecording();
    if (path) {
      Alert.alert('Recording saved!', `Duration: ${recorder.duration}s`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Recording Test</Text>

      <AudioWaveform
        isRecording={recorder.isRecording}
        duration={recorder.duration}
      />

      <VoiceButton
        isRecording={recorder.isRecording}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      />

      {recorder.audioPath && !recorder.isRecording && (
        <AudioPlayer
          audioPath={recorder.audioPath}
          isPlaying={player.isPlaying}
          currentPosition={player.currentPosition}
          duration={player.duration}
          onPlay={() => player.play(recorder.audioPath!)}
          onPause={player.pause}
        />
      )}
    </View>
  );
}
```

- [ ] Record audio successfully
- [ ] See waveform animation while recording
- [ ] Play back recorded audio
- [ ] Duration displays correctly
- [ ] Works on iOS
- [ ] Works on Android

---

## Verification Checklist

- [ ] useVoiceRecorder hook working
- [ ] useAudioPlayer hook working
- [ ] VoiceButton hold-to-speak works
- [ ] AudioWaveform animates while recording
- [ ] AudioPlayer plays recorded audio
- [ ] VoiceContext stores recording state
- [ ] Microphone permissions work on both platforms
- [ ] Audio files are created and saved

---

## Next Step

When complete, proceed to **TODO-03-TRANSCRIPTION.md**
