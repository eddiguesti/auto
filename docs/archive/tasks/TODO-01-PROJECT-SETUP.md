# TODO-01: React Native Project Setup

## Objective

Initialize the React Native project with all required dependencies for a voice-first app.

## Duration: 1 week

---

## Tasks

### Task 1.1: Create React Native Project

```bash
# Create new project
npx react-native init MemoryQuest --template react-native-template-typescript

cd MemoryQuest
```

- [ ] Create React Native project
- [ ] Verify iOS simulator runs
- [ ] Verify Android emulator runs

---

### Task 1.2: Install Core Dependencies

```bash
# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Gestures & Animations
npm install react-native-reanimated react-native-gesture-handler

# Storage
npm install @react-native-async-storage/async-storage

# UI Components
npm install lottie-react-native
npm install react-native-linear-gradient

# iOS pods
cd ios && pod install && cd ..
```

- [ ] Install navigation packages
- [ ] Install animation packages
- [ ] Install storage packages
- [ ] Run pod install for iOS

---

### Task 1.3: Install Voice Dependencies

```bash
# Voice Recording
npm install react-native-audio-recorder-player

# Speech-to-Text (live transcription)
npm install @react-native-voice/voice

# Text-to-Speech (read prompts aloud)
npm install react-native-tts

# Sound effects
npm install react-native-sound

# iOS pods
cd ios && pod install && cd ..
```

- [ ] Install audio recorder
- [ ] Install voice recognition
- [ ] Install text-to-speech
- [ ] Install sound effects library

---

### Task 1.4: Configure iOS Permissions

**Edit:** `ios/MemoryQuest/Info.plist`

Add inside `<dict>`:

```xml
<!-- Microphone for voice recording -->
<key>NSMicrophoneUsageDescription</key>
<string>Memory Quest needs microphone access to record your voice memories</string>

<!-- Speech Recognition -->
<key>NSSpeechRecognitionUsageDescription</key>
<string>Memory Quest uses speech recognition to transcribe your memories</string>

<!-- Background Audio (for playback) -->
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

- [ ] Add microphone permission
- [ ] Add speech recognition permission
- [ ] Add background audio mode

---

### Task 1.5: Configure Android Permissions

**Edit:** `android/app/src/main/AndroidManifest.xml`

Add inside `<manifest>`:

```xml
<!-- Microphone -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Storage for audio files -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- Internet for API calls -->
<uses-permission android:name="android.permission.INTERNET" />
```

- [ ] Add microphone permission
- [ ] Add storage permissions
- [ ] Verify internet permission exists

---

### Task 1.6: Create Folder Structure

```bash
mkdir -p src/{screens,components,services,context,hooks,utils}
mkdir -p src/components/{voice,common,gamification}
mkdir -p assets/{sounds,animations,images}
```

**Create structure:**

```
src/
├── screens/
├── components/
│   ├── voice/           # Voice-specific components
│   ├── common/          # Shared components
│   └── gamification/    # Streak, achievements, etc
├── services/
├── context/
├── hooks/
└── utils/
assets/
├── sounds/
├── animations/
└── images/
```

- [ ] Create folder structure
- [ ] Move App.tsx to src/

---

### Task 1.7: Setup Navigation Structure

**Create:** `src/navigation/AppNavigator.tsx`

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens (create placeholder files first)
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import VoicePromptScreen from '../screens/VoicePromptScreen';
import TextPromptScreen from '../screens/TextPromptScreen';
import ReviewScreen from '../screens/ReviewScreen';
import CelebrationScreen from '../screens/CelebrationScreen';
import CollectionsScreen from '../screens/CollectionsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import FamilyScreen from '../screens/FamilyScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Collections" component={CollectionsScreen} />
      <Tab.Screen name="Family" component={FamilyScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="VoicePrompt" component={VoicePromptScreen} />
        <Stack.Screen name="TextPrompt" component={TextPromptScreen} />
        <Stack.Screen name="Review" component={ReviewScreen} />
        <Stack.Screen name="Celebration" component={CelebrationScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] Create AppNavigator.tsx
- [ ] Create placeholder screen files

---

### Task 1.8: Create Placeholder Screens

**Create placeholder for each screen:**

```typescript
// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <Text>Today's prompt will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF8F3', // parchment color
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
```

Create similar placeholders for:

- [ ] SplashScreen.tsx
- [ ] OnboardingScreen.tsx
- [ ] LoginScreen.tsx
- [ ] HomeScreen.tsx
- [ ] VoicePromptScreen.tsx
- [ ] TextPromptScreen.tsx
- [ ] ReviewScreen.tsx
- [ ] CelebrationScreen.tsx
- [ ] CollectionsScreen.tsx
- [ ] AchievementsScreen.tsx
- [ ] FamilyScreen.tsx
- [ ] HistoryScreen.tsx
- [ ] SettingsScreen.tsx

---

### Task 1.9: Setup Theme & Colors

**Create:** `src/utils/theme.ts`

```typescript
export const colors = {
  // Primary palette (matching web app)
  parchment: '#FDF8F3',
  cream: '#FAF7F2',
  sepia: '#8B7355',
  ink: '#2C1810',

  // Accent colors
  amber: '#F59E0B',
  green: '#10B981',
  red: '#EF4444',

  // Voice-specific
  recording: '#EF4444', // Red for recording
  waveform: '#8B7355', // Sepia for waveform

  // UI
  white: '#FFFFFF',
  black: '#000000',
  gray: '#9CA3AF',
  lightGray: '#F3F4F6'
}

export const fonts = {
  display: 'Georgia', // Or custom font
  body: 'System',
  mono: 'Courier'
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
}

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999
}
```

- [ ] Create theme file
- [ ] Match colors to web app

---

### Task 1.10: Setup API Service

**Create:** `src/services/api.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_BASE_URL = __DEV__ ? 'http://localhost:3001/api' : 'https://your-production-url.com/api'

class ApiService {
  private token: string | null = null

  async setToken(token: string) {
    this.token = token
    await AsyncStorage.setItem('authToken', token)
  }

  async getToken() {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('authToken')
    }
    return this.token
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    return response.json()
  }

  // Game endpoints
  getGameState() {
    return this.request('/game/state')
  }

  getTodayPrompt() {
    return this.request('/game/prompt/today')
  }

  completePrompt(promptId: number, answer: string, audioUrl?: string) {
    return this.request(`/game/prompt/${promptId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ answer, audioUrl })
    })
  }

  // Auth endpoints
  login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }
}

export default new ApiService()
```

- [ ] Create API service
- [ ] Configure dev/prod URLs

---

### Task 1.11: Verify Setup

Run the app on both platforms:

```bash
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

- [ ] App runs on iOS simulator
- [ ] App runs on Android emulator
- [ ] Navigation works between screens
- [ ] No red screen errors

---

## Verification Checklist

- [ ] React Native project created
- [ ] All dependencies installed
- [ ] iOS permissions configured
- [ ] Android permissions configured
- [ ] Folder structure created
- [ ] Navigation working
- [ ] All placeholder screens exist
- [ ] Theme/colors set up
- [ ] API service ready
- [ ] App runs on both platforms

---

## Next Step

When complete, proceed to **TODO-02-VOICE-RECORDING.md**
