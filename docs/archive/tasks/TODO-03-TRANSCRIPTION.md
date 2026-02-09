# TODO-03: Speech-to-Text Transcription

## Objective

Implement real-time and final transcription of voice recordings.

## Duration: 1-2 weeks

## Dependencies

- TODO-02 (Voice Recording)

---

## Transcription Strategy

```
┌─────────────────────────────────────────────────────────┐
│                  TRANSCRIPTION FLOW                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. LIVE TRANSCRIPTION (while recording)                │
│     └── Native iOS/Android speech recognition           │
│     └── Shows words as user speaks                      │
│     └── Good enough for preview                         │
│                                                          │
│  2. FINAL TRANSCRIPTION (after recording)               │
│     └── Upload audio to server                          │
│     └── Whisper API for accuracy                        │
│     └── Replace live transcript with final              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Tasks

### Task 3.1: Create Live Transcription Hook

**Create:** `src/hooks/useTranscription.ts`

```typescript
import { useState, useCallback, useEffect } from 'react'
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice'

interface TranscriptionState {
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
}

export function useTranscription() {
  const [state, setState] = useState<TranscriptionState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null
  })

  useEffect(() => {
    // Setup voice recognition callbacks
    Voice.onSpeechStart = () => {
      setState(s => ({ ...s, isListening: true }))
    }

    Voice.onSpeechEnd = () => {
      setState(s => ({ ...s, isListening: false }))
    }

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setState(s => ({
          ...s,
          transcript: e.value![0],
          interimTranscript: ''
        }))
      }
    }

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setState(s => ({
          ...s,
          interimTranscript: e.value![0]
        }))
      }
    }

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setState(s => ({
        ...s,
        error: e.error?.message || 'Speech recognition error',
        isListening: false
      }))
    }

    // Cleanup
    return () => {
      Voice.destroy().then(Voice.removeAllListeners)
    }
  }, [])

  // Start listening
  const startListening = useCallback(async () => {
    try {
      setState(s => ({
        ...s,
        transcript: '',
        interimTranscript: '',
        error: null
      }))

      await Voice.start('en-GB') // British English
    } catch (error) {
      setState(s => ({
        ...s,
        error: 'Failed to start speech recognition'
      }))
    }
  }, [])

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      await Voice.stop()
    } catch (error) {
      // Ignore stop errors
    }
  }, [])

  // Cancel listening
  const cancelListening = useCallback(async () => {
    try {
      await Voice.cancel()
      setState(s => ({
        ...s,
        isListening: false,
        interimTranscript: ''
      }))
    } catch (error) {
      // Ignore cancel errors
    }
  }, [])

  // Reset state
  const reset = useCallback(() => {
    setState({
      isListening: false,
      transcript: '',
      interimTranscript: '',
      error: null
    })
  }, [])

  // Get display text (final + interim)
  const displayText =
    state.transcript + (state.interimTranscript ? ' ' + state.interimTranscript : '')

  return {
    ...state,
    displayText,
    startListening,
    stopListening,
    cancelListening,
    reset
  }
}
```

- [ ] Create useTranscription hook
- [ ] Test live transcription on iOS
- [ ] Test live transcription on Android
- [ ] Verify British English recognition

---

### Task 3.2: Create Transcript Display Component

**Create:** `src/components/voice/TranscriptDisplay.tsx`

```typescript
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { colors, spacing } from '../../utils/theme';

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  placeholder?: string;
}

export default function TranscriptDisplay({
  transcript,
  interimTranscript,
  isListening,
  placeholder = 'Start speaking...',
}: TranscriptDisplayProps) {
  const scrollRef = useRef<ScrollView>(null);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // Blinking cursor animation
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      cursorOpacity.setValue(0);
    }
  }, [isListening, cursorOpacity]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [transcript, interimTranscript]);

  const hasContent = transcript || interimTranscript;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {hasContent ? (
          <Text style={styles.transcript}>
            {transcript}
            {interimTranscript && (
              <Text style={styles.interim}> {interimTranscript}</Text>
            )}
            {isListening && (
              <Animated.Text
                style={[styles.cursor, { opacity: cursorOpacity }]}
              >
                |
              </Animated.Text>
            )}
          </Text>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
      </ScrollView>

      {/* Live indicator */}
      {isListening && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Listening...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.sepia}20`,
    minHeight: 150,
    maxHeight: 250,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  transcript: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.ink,
    fontFamily: 'Georgia', // Serif for memoir feel
  },
  interim: {
    color: colors.gray,
    fontStyle: 'italic',
  },
  cursor: {
    color: colors.sepia,
    fontWeight: 'bold',
  },
  placeholder: {
    fontSize: 18,
    color: colors.gray,
    fontStyle: 'italic',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: `${colors.sepia}10`,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.recording,
    marginRight: spacing.sm,
  },
  liveText: {
    fontSize: 12,
    color: colors.sepia,
  },
});
```

- [ ] Create TranscriptDisplay component
- [ ] Test blinking cursor animation
- [ ] Test auto-scroll
- [ ] Test interim text styling

---

### Task 3.3: Create Whisper Transcription Service

**Create:** `src/services/transcription.ts`

```typescript
import api from './api'

interface TranscriptionResult {
  transcript: string
  confidence: number
  duration: number
}

/**
 * Transcribe audio using server-side Whisper API
 * Falls back to provided live transcript if server fails
 */
export async function transcribeAudio(
  audioPath: string,
  liveTranscript: string
): Promise<TranscriptionResult> {
  try {
    // Create form data with audio file
    const formData = new FormData()
    formData.append('audio', {
      uri: audioPath,
      type: 'audio/m4a',
      name: 'recording.m4a'
    } as any)
    formData.append('liveTranscript', liveTranscript)

    const response = await fetch(`${api.baseUrl}/voice/transcribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await api.getToken()}`,
        'Content-Type': 'multipart/form-data'
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error('Transcription failed')
    }

    const data = await response.json()
    return {
      transcript: data.transcript,
      confidence: data.confidence || 0.95,
      duration: data.duration || 0
    }
  } catch (error) {
    console.warn('Whisper transcription failed, using live transcript')
    // Fallback to live transcript
    return {
      transcript: liveTranscript,
      confidence: 0.8,
      duration: 0
    }
  }
}

/**
 * Check if transcription service is available
 */
export async function checkTranscriptionAvailable(): Promise<boolean> {
  try {
    const response = await api.request('/voice/status')
    return response.available === true
  } catch {
    return false
  }
}
```

- [ ] Create transcription service
- [ ] Test audio upload
- [ ] Test fallback to live transcript

---

### Task 3.4: Create Text-to-Speech Service

**Create:** `src/services/tts.ts`

```typescript
import Tts from 'react-native-tts'
import { Platform } from 'react-native'

class TextToSpeechService {
  private initialized = false

  async init() {
    if (this.initialized) return

    try {
      // Configure TTS
      await Tts.setDefaultLanguage('en-GB')
      await Tts.setDefaultRate(0.45) // Slower for seniors
      await Tts.setDefaultPitch(1.0)

      // Use neural voice if available
      if (Platform.OS === 'ios') {
        const voices = await Tts.voices()
        const britishVoice = voices.find(v => v.language === 'en-GB' && v.quality === 500)
        if (britishVoice) {
          await Tts.setDefaultVoice(britishVoice.id)
        }
      }

      this.initialized = true
    } catch (error) {
      console.warn('TTS initialization failed:', error)
    }
  }

  async speak(text: string): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      Tts.speak(text)

      const finishHandler = Tts.addEventListener('tts-finish', () => {
        finishHandler.remove()
        resolve()
      })

      const errorHandler = Tts.addEventListener('tts-error', error => {
        errorHandler.remove()
        reject(error)
      })
    })
  }

  stop() {
    Tts.stop()
  }

  async getAvailableVoices() {
    return Tts.voices()
  }
}

export default new TextToSpeechService()
```

- [ ] Create TTS service
- [ ] Test prompt readout on iOS
- [ ] Test prompt readout on Android
- [ ] Verify slower speech rate for seniors

---

### Task 3.5: Create Speak Prompt Button

**Create:** `src/components/voice/SpeakPromptButton.tsx`

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import tts from '../../services/tts';
import { colors, spacing } from '../../utils/theme';

interface SpeakPromptButtonProps {
  text: string;
}

export default function SpeakPromptButton({ text }: SpeakPromptButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handlePress = async () => {
    if (isSpeaking) {
      tts.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      try {
        await tts.speak(text);
      } finally {
        setIsSpeaking(false);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, isSpeaking && styles.buttonActive]}
      onPress={handlePress}
    >
      {isSpeaking ? (
        <>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.text}>Stop</Text>
        </>
      ) : (
        <>
          <Text style={styles.icon}>🔊</Text>
          <Text style={styles.text}>Tap to hear prompt</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.sepia}15`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.sm,
  },
  buttonActive: {
    backgroundColor: colors.sepia,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    fontSize: 14,
    color: colors.sepia,
  },
});
```

- [ ] Create SpeakPromptButton component
- [ ] Test play/stop toggle
- [ ] Test accessibility for visually impaired

---

### Task 3.6: Integrate Transcription with Recording

Update the VoicePromptScreen to use both recording and transcription:

```typescript
// In VoicePromptScreen.tsx
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useTranscription } from '../hooks/useTranscription';
import { transcribeAudio } from '../services/transcription';

export default function VoicePromptScreen() {
  const recorder = useVoiceRecorder();
  const transcription = useTranscription();
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Start recording + live transcription
  const handlePressIn = async () => {
    await Promise.all([
      recorder.startRecording(),
      transcription.startListening(),
    ]);
  };

  // Stop recording + get final transcription
  const handlePressOut = async () => {
    const [audioPath] = await Promise.all([
      recorder.stopRecording(),
      transcription.stopListening(),
    ]);

    if (audioPath) {
      setIsProcessing(true);
      try {
        // Get accurate transcription from Whisper
        const result = await transcribeAudio(
          audioPath,
          transcription.transcript
        );
        setFinalTranscript(result.transcript);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    // ... UI with transcript display
  );
}
```

- [ ] Integrate recording with live transcription
- [ ] Test simultaneous recording + transcription
- [ ] Test Whisper transcription after recording
- [ ] Verify fallback when Whisper fails

---

### Task 3.7: Handle Transcription Edge Cases

```typescript
// Add to useTranscription.ts

// Handle when device doesn't support speech recognition
const checkAvailability = async (): Promise<boolean> => {
  try {
    const available = await Voice.isAvailable()
    return available === 1
  } catch {
    return false
  }
}

// Handle long recordings (native speech may timeout)
const handleTimeout = () => {
  // Native speech recognition typically times out after 60s
  // For longer recordings, rely on Whisper for final transcript
}

// Handle background/interruption
const handleInterruption = () => {
  // Stop gracefully if app goes to background
}
```

- [ ] Handle device without speech recognition
- [ ] Handle long recording timeouts
- [ ] Handle app interruptions

---

## Verification Checklist

- [ ] Live transcription shows words as spoken
- [ ] Interim (partial) results appear quickly
- [ ] Final transcript is accurate
- [ ] Whisper transcription improves accuracy
- [ ] TTS reads prompts clearly
- [ ] TTS speed is appropriate for seniors
- [ ] Fallback works when services fail
- [ ] Works offline (live transcription only)

---

## Next Step

When complete, proceed to **TODO-04-VOICE-UI.md**
