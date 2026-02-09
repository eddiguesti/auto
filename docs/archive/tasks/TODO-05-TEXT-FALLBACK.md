# TODO-05: Text Input Fallback

## Objective

Create text input option for users who prefer typing over speaking.

## Duration: 1 week

## Dependencies

- TODO-04 (Voice UI)

---

## Tasks

### Task 5.1: Create Text Prompt Screen

**Create:** `src/screens/TextPromptScreen.tsx`

```typescript
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import SpeakPromptButton from '../components/voice/SpeakPromptButton';
import api from '../services/api';
import { colors, spacing } from '../utils/theme';

export default function TextPromptScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { prompt } = route.params;

  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  const handleSave = async () => {
    if (!text.trim()) return;

    setIsSaving(true);
    try {
      const result = await api.completePrompt(prompt.id, text.trim());
      if (result.success) {
        navigation.navigate('Celebration', {
          data: result.data,
          prompt,
        });
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchToVoice = () => {
    navigation.replace('VoicePrompt', { prompt });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Write Your Memory</Text>
          <TouchableOpacity onPress={handleSave} disabled={!text.trim() || isSaving}>
            <Text style={[styles.saveText, !text.trim() && styles.saveTextDisabled]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Prompt */}
          <View style={styles.promptSection}>
            <SpeakPromptButton text={prompt.text} />
            <Text style={styles.promptText}>"{prompt.text}"</Text>
          </View>

          {/* Switch to voice */}
          <TouchableOpacity style={styles.voiceSwitch} onPress={handleSwitchToVoice}>
            <Text style={styles.voiceSwitchText}>🎙️ Switch to voice recording</Text>
          </TouchableOpacity>

          {/* Text input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="Start writing your memory here..."
              placeholderTextColor={colors.gray}
              multiline
              autoFocus
              textAlignVertical="top"
            />
          </View>

          {/* Word count */}
          <View style={styles.footer}>
            <Text style={styles.wordCount}>{wordCount} words</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.sepia}10`,
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
  saveText: {
    color: colors.sepia,
    fontSize: 16,
    fontWeight: '600',
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  promptSection: {
    padding: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: `${colors.sepia}10`,
  },
  promptText: {
    fontSize: 20,
    fontFamily: 'Georgia',
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 28,
  },
  voiceSwitch: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: `${colors.sepia}05`,
  },
  voiceSwitchText: {
    color: colors.sepia,
    fontSize: 14,
  },
  inputContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  textInput: {
    fontSize: 18,
    fontFamily: 'Georgia',
    color: colors.ink,
    lineHeight: 28,
    minHeight: 300,
  },
  footer: {
    padding: spacing.md,
    alignItems: 'flex-end',
  },
  wordCount: {
    color: colors.gray,
    fontSize: 14,
  },
});
```

- [ ] Create TextPromptScreen
- [ ] Add word count
- [ ] Add "switch to voice" option
- [ ] Handle keyboard properly

---

### Task 5.2: Add Navigation Between Voice/Text

Update navigation to allow seamless switching:

```typescript
// In VoicePromptScreen - add switch to text button
<TouchableOpacity
  style={styles.switchToText}
  onPress={() => navigation.replace('TextPrompt', { prompt })}
>
  <Text>✏️ Switch to typing</Text>
</TouchableOpacity>
```

- [ ] Add switch button in VoicePromptScreen
- [ ] Add switch button in TextPromptScreen
- [ ] Preserve any partial content when switching

---

### Task 5.3: Add Large Font Size Option

For seniors who prefer text but need larger fonts:

**Create:** `src/context/AccessibilityContext.tsx`

```typescript
import React, { createContext, useContext, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xlarge'
  highContrast: boolean
}

const defaults: AccessibilitySettings = {
  fontSize: 'normal',
  highContrast: false
}

const fontSizes = {
  normal: { body: 16, title: 24, prompt: 20 },
  large: { body: 20, title: 28, prompt: 24 },
  xlarge: { body: 24, title: 32, prompt: 28 }
}

// ... context implementation
```

- [ ] Create AccessibilityContext
- [ ] Add font size selector in Settings
- [ ] Apply font sizes throughout app

---

## Verification Checklist

- [ ] Text input screen works
- [ ] Can switch between voice and text
- [ ] Word count updates correctly
- [ ] Large font option available
- [ ] Keyboard handling works properly

---

## Next Step

When complete, proceed to **TODO-06-BACKEND-VOICE.md**
