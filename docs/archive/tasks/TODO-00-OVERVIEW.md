# Memory Quest Mobile App - Development Overview

## Project Summary

Build a **voice-first** mobile app for capturing family memories. Like Duolingo, but for preserving life stories through natural speech.

**Core Principle**: Voice first, text optional. Seniors speak their memories, we transcribe and preserve both audio and text.

---

## Tech Stack

| Layer              | Technology                              |
| ------------------ | --------------------------------------- |
| Mobile Framework   | React Native                            |
| Navigation         | React Navigation                        |
| Voice Recording    | react-native-audio-recorder-player      |
| Speech-to-Text     | @react-native-voice/voice + Whisper API |
| Text-to-Speech     | react-native-tts                        |
| State Management   | React Context + AsyncStorage            |
| Backend            | Existing Express.js API                 |
| Audio Storage      | AWS S3                                  |
| Transcription      | OpenAI Whisper                          |
| Push Notifications | Firebase Cloud Messaging                |

---

## Development Phases

| Phase | Name               | Duration  | Priority |
| ----- | ------------------ | --------- | -------- |
| 01    | Project Setup      | 1 week    | Critical |
| 02    | Voice Recording    | 2 weeks   | Critical |
| 03    | Transcription      | 1-2 weeks | Critical |
| 04    | Voice UI Screens   | 2 weeks   | Critical |
| 05    | Text Fallback      | 1 week    | Critical |
| 06    | Backend Voice API  | 1-2 weeks | Critical |
| 07    | Gamification       | 2-3 weeks | High     |
| 08    | Push Notifications | 1-2 weeks | High     |
| 09    | Offline Support    | 2 weeks   | Medium   |
| 10    | Premium Features   | 2 weeks   | Medium   |
| 11    | App Store Prep     | 1 week    | High     |
| 12    | Testing            | 1-2 weeks | Critical |
| 13    | Launch             | 1 week    | Critical |

**Total MVP (Phases 01-08): ~12-14 weeks**

---

## TODO Files

```
TODO-00-OVERVIEW.md          ← You are here
TODO-01-PROJECT-SETUP.md     ← React Native initialization
TODO-02-VOICE-RECORDING.md   ← Audio capture
TODO-03-TRANSCRIPTION.md     ← Speech-to-text
TODO-04-VOICE-UI.md          ← Voice screens
TODO-05-TEXT-FALLBACK.md     ← Typing option
TODO-06-BACKEND-VOICE.md     ← API endpoints
TODO-07-GAMIFICATION.md      ← Streaks, XP, levels
TODO-08-PUSH-NOTIFICATIONS.md← Reminders
TODO-09-OFFLINE.md           ← Offline mode
TODO-10-PREMIUM.md           ← IAP & subscriptions
TODO-11-APP-STORE.md         ← Store submission
TODO-12-TESTING.md           ← QA checklist
TODO-13-LAUNCH.md            ← Go-live checklist
```

---

## App Structure

```
/memory-quest-app/
├── src/
│   ├── screens/
│   │   ├── SplashScreen.js
│   │   ├── OnboardingScreen.js
│   │   ├── LoginScreen.js
│   │   ├── HomeScreen.js           # Dashboard + today's prompt
│   │   ├── VoicePromptScreen.js    # Primary voice recording
│   │   ├── TextPromptScreen.js     # Fallback text input
│   │   ├── ReviewScreen.js         # Review recording + transcript
│   │   ├── CelebrationScreen.js    # Streak celebration
│   │   ├── CollectionsScreen.js
│   │   ├── AchievementsScreen.js
│   │   ├── FamilyScreen.js
│   │   ├── HistoryScreen.js        # Past memories + audio playback
│   │   └── SettingsScreen.js
│   ├── components/
│   │   ├── VoiceButton.js          # Big hold-to-speak button
│   │   ├── AudioWaveform.js        # Recording visualization
│   │   ├── TranscriptDisplay.js    # Live transcription
│   │   ├── AudioPlayer.js          # Playback controls
│   │   ├── StreakBadge.js
│   │   └── PromptCard.js
│   ├── services/
│   │   ├── api.js                  # REST API calls
│   │   ├── voiceRecorder.js        # Audio recording logic
│   │   ├── transcription.js        # Speech-to-text
│   │   ├── audioStorage.js         # S3 upload/download
│   │   └── notifications.js        # Push notification handling
│   ├── context/
│   │   ├── AuthContext.js
│   │   ├── GameContext.js
│   │   └── VoiceContext.js         # Recording state
│   ├── hooks/
│   │   ├── useVoiceRecorder.js
│   │   ├── useTranscription.js
│   │   └── useAudioPlayer.js
│   └── utils/
│       ├── storage.js              # AsyncStorage helpers
│       └── permissions.js          # Microphone permissions
├── assets/
│   ├── sounds/                     # UI sounds
│   ├── animations/                 # Lottie files
│   └── images/
├── ios/
├── android/
└── app.json
```

---

## Voice-First User Flow

```
1. Open App
   ↓
2. See Today's Prompt + 🔊 "Tap to hear"
   ↓
3. Press & Hold Big Mic Button 🎙️
   ↓
4. Speak Memory (see live transcription)
   ↓
5. Release to Stop
   ↓
6. Review: Play Audio + Edit Transcript
   ↓
7. Save Memory
   ↓
8. Celebration! 🎉 (streak updated)
   ↓
9. Return to Dashboard
```

---

## Key Metrics

| Metric                 | Target         |
| ---------------------- | -------------- |
| Voice vs Text usage    | 80%+ voice     |
| Avg recording length   | 60-120 seconds |
| Transcription accuracy | 95%+           |
| 7-day retention        | 40%+           |
| App Store rating       | 4.5+           |

---

## Start Here

Begin with **TODO-01-PROJECT-SETUP.md** to initialize the React Native project.
