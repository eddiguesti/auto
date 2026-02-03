# Memory Quest Mobile App Roadmap

Transform Memory Quest into a standalone Duolingo-style mobile app for capturing family memories.

---

## Vision

**"5 minutes a day to preserve a lifetime of memories"**

A **voice-first** mobile app that makes memoir capture as easy as having a conversation. Like Duolingo for language learning, but for capturing life stories through natural speech.

### Core Principle: Voice First, Text Optional

**Why Voice-First?**
- Seniors find speaking easier than typing on small keyboards
- More natural storytelling - people tell stories, they don't type them
- Captures emotion, tone, and personality in recordings
- Accessibility for those with vision or motor difficulties
- Faster - speak 150 words/minute vs type 40 words/minute

---

## Phase 1: Voice-First Foundation (6-8 weeks)

### 1.1 Project Setup
```
/memory-quest-app/
├── src/
│   ├── screens/           # Mobile screens
│   ├── components/        # Reusable components
│   ├── navigation/        # React Navigation
│   ├── context/           # State management
│   ├── services/          # API calls, voice processing
│   ├── hooks/             # Custom hooks
│   └── utils/             # Helpers
├── assets/                # Images, fonts, sounds
├── ios/                   # iOS native code
└── android/               # Android native code
```

### 1.2 Core Dependencies
```bash
npx react-native init MemoryQuest
npm install @react-navigation/native @react-navigation/stack
npm install react-native-reanimated react-native-gesture-handler
npm install @react-native-async-storage/async-storage
npm install react-native-push-notification
npm install lottie-react-native  # For animations
npm install react-native-sound   # For sound effects

# Voice-First Dependencies
npm install @react-native-voice/voice          # Speech-to-text
npm install react-native-audio-recorder-player # Audio recording
npm install react-native-tts                   # Text-to-speech (read prompts)
npm install @react-native-firebase/ml          # On-device transcription (optional)
```

### 1.3 Voice-First User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     DAILY PROMPT SCREEN                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   🔊 [Tap to hear prompt]                                   │
│                                                              │
│   "What's your favorite memory                              │
│    from a family holiday?"                                  │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │                  🎙️                                  │   │
│   │            [HOLD TO SPEAK]                          │   │
│   │                                                      │   │
│   │         "Tell me about it..."                       │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│              ─── or ───                                     │
│                                                              │
│        [✏️ I'd rather type]  (small, secondary)            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Voice Recording Screen

```
┌─────────────────────────────────────────────────────────────┐
│                     RECORDING...                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   "What's your favorite memory from a family holiday?"      │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │   ████████████░░░░░░░░░░░░░░░░░░░░░  0:45           │   │
│   │                                                      │   │
│   │   "...and then my father said we should all         │   │
│   │   go down to the beach, and I remember the          │   │
│   │   sand was so warm between my toes..."              │   │
│   │                                                      │   │
│   │              [Live transcription]                   │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│                      🔴 RECORDING                            │
│                                                              │
│        [Release to finish]    [Cancel]                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.5 Post-Recording Review

```
┌─────────────────────────────────────────────────────────────┐
│                   REVIEW YOUR MEMORY                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   🎵 [Play recording]  1:23                                 │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │   "I remember this one summer holiday in Cornwall,  │   │
│   │   I must have been about seven years old. My        │   │
│   │   father said we should all go down to the beach,   │   │
│   │   and I remember the sand was so warm between my    │   │
│   │   toes. My sister and I built the biggest          │   │
│   │   sandcastle we'd ever made..."                     │   │
│   │                                                      │   │
│   │   [Transcription - tap to edit]                     │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌─────────────┐                    ┌─────────────────┐   │
│   │ 🎙️ Re-record │                    │  ✓ Save Memory  │   │
│   └─────────────┘                    └─────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.6 Screens to Build
- [ ] **Splash Screen** - Animated logo with "Speak your story"
- [ ] **Onboarding** - Voice-focused intro (3-4 slides)
- [ ] **Login/Register** - Email + Google/Apple Sign-In
- [ ] **Home Dashboard** - Today's prompt + big voice button + streak
- [ ] **Voice Prompt Screen** - Primary recording interface
- [ ] **Text Prompt Screen** - Secondary writing fallback
- [ ] **Review Screen** - Play recording + edit transcription
- [ ] **Celebration Screen** - Duolingo-style reward animation
- [ ] **Collections** - Themed memory collections
- [ ] **Achievements** - Badge gallery
- [ ] **Family Circle** - Connect with family
- [ ] **Profile/Settings** - Voice preferences, notifications
- [ ] **History** - Past memories with audio playback

### 1.7 Voice Processing Pipeline

```javascript
const voicePipeline = {
  // Step 1: Record audio
  recording: {
    format: 'm4a',           // iOS native, good quality
    sampleRate: 44100,
    channels: 1,             // Mono for speech
    maxDuration: 300,        // 5 minutes max
  },

  // Step 2: Real-time transcription (while recording)
  liveTranscription: {
    provider: 'native',      // iOS/Android native speech recognition
    language: 'en-GB',
    showInterim: true,       // Show words as spoken
  },

  // Step 3: Final transcription (after recording)
  finalTranscription: {
    provider: 'whisper',     // OpenAI Whisper for accuracy
    fallback: 'native',      // Use native if API fails
  },

  // Step 4: Storage
  storage: {
    audio: 's3',             // Store original audio
    transcript: 'postgres',  // Store text in database
    keepAudio: true,         // Preserve voice recordings
  },
};
```

### 1.8 Backend Changes for Voice

```javascript
// New endpoints needed
POST /api/voice/upload         // Upload audio file
POST /api/voice/transcribe     // Transcribe audio (Whisper API)
GET  /api/voice/:memoryId      // Get audio for playback
DELETE /api/voice/:memoryId    // Delete audio recording

// Database changes
ALTER TABLE daily_prompts ADD COLUMN audio_url TEXT;
ALTER TABLE daily_prompts ADD COLUMN audio_duration INTEGER; -- seconds
ALTER TABLE daily_prompts ADD COLUMN transcription_source VARCHAR(20); -- 'voice' or 'typed'
```

### 1.9 Text-to-Speech for Prompts

```javascript
// Read prompts aloud (great for accessibility)
const ttsSettings = {
  enabled: true,
  autoPlay: false,           // User taps to hear
  voice: 'en-GB-Neural',     // Natural British voice
  rate: 0.9,                 // Slightly slower for seniors
  pitch: 1.0,
};

// Usage
<TouchableOpacity onPress={() => readPromptAloud(prompt.text)}>
  <Text>🔊 Tap to hear prompt</Text>
</TouchableOpacity>
```

### 1.10 Reuse Existing Backend
The current Express API works perfectly for mobile:
- `/api/game/state` - Get user state
- `/api/game/prompt/today` - Daily prompt
- `/api/game/prompt/:id/complete` - Submit answer (now includes audio_url)
- All existing endpoints work via REST

---

## Phase 2: Duolingo-Style Gamification (3-4 weeks)

### 2.1 Enhanced Streak System
```javascript
// New features to add
const streakFeatures = {
  streakFreeze: true,        // Like Duolingo's streak freeze
  weekendAmulet: true,       // Protect weekend streaks
  streakSociety: true,       // Leaderboard for top streakers
  milestoneRewards: [7, 30, 100, 365],  // Special rewards
  streakRepair: true,        // One-time streak repair (paid?)
};
```

### 2.2 XP & Leveling System
```javascript
const xpSystem = {
  promptComplete: 10,        // Base XP
  bonusWords: 1,             // Per 50 words over minimum
  streakMultiplier: 1.1,     // 10% bonus per streak day (max 2x)
  collectionBonus: 50,       // Complete a collection
  familyPrompt: 15,          // Answer family prompt
  perfectWeek: 100,          // 7 days in a row
};

const levels = [
  { level: 1, xpRequired: 0, title: 'Memory Novice' },
  { level: 5, xpRequired: 500, title: 'Story Seeker' },
  { level: 10, xpRequired: 1500, title: 'Memory Keeper' },
  { level: 20, xpRequired: 5000, title: 'Legacy Builder' },
  { level: 50, xpRequired: 20000, title: 'Family Historian' },
];
```

### 2.3 Daily Goals & Leagues
```javascript
const dailyGoals = {
  casual: { prompts: 1, xp: 10 },
  regular: { prompts: 1, xp: 20, bonusTask: true },
  serious: { prompts: 2, xp: 50, bonusTask: true },
  intense: { prompts: 3, xp: 100, bonusTask: true },
};

const leagues = [
  'Bronze', 'Silver', 'Gold', 'Sapphire',
  'Ruby', 'Emerald', 'Amethyst', 'Pearl',
  'Obsidian', 'Diamond'
];
```

### 2.4 Sound & Haptics
```javascript
// Sound effects (like Duolingo)
const sounds = {
  promptComplete: 'ding.mp3',
  streakContinue: 'streak.mp3',
  achievementUnlock: 'fanfare.mp3',
  levelUp: 'levelup.mp3',
  buttonTap: 'tap.mp3',
  error: 'whoops.mp3',
};

// Haptic feedback
const haptics = {
  light: 'selection',      // Button taps
  medium: 'impactMedium',  // Completing prompt
  heavy: 'notificationSuccess', // Achievement
};
```

---

## Phase 3: Push Notifications (2 weeks)

### 3.1 Notification Types
```javascript
const notificationSchedule = {
  dailyReminder: {
    time: 'user_preferred_time', // Default 9am
    title: "Your daily memory awaits! 📝",
    body: "Take 5 minutes to capture today's memory",
  },
  streakWarning: {
    time: '20:00', // 8pm if not completed
    title: "Don't lose your {streak} day streak! 🔥",
    body: "You still have time to answer today's prompt",
  },
  streakAtRisk: {
    time: '22:00', // 10pm final warning
    title: "⚠️ Last chance to save your streak!",
    body: "Your {streak} day streak ends at midnight",
  },
  familyActivity: {
    title: "{name} sent you a prompt 💬",
    body: '"{preview}..."',
  },
  weeklyDigest: {
    day: 'Sunday',
    time: '10:00',
    title: "Your week in memories 📚",
    body: "You captured {count} memories this week!",
  },
  achievementUnlocked: {
    title: "Achievement Unlocked! 🏆",
    body: "You earned: {achievement_name}",
  },
};
```

### 3.2 Smart Notification Timing
```javascript
// Learn optimal send times per user
const smartTiming = {
  trackOpenTimes: true,
  adjustToUserBehavior: true,
  quietHours: { start: '22:00', end: '08:00' },
  maxPerDay: 3,
};
```

---

## Phase 4: Offline Support (2-3 weeks)

### 4.1 Local Storage
```javascript
// Cache structure
const offlineCache = {
  currentPrompt: { /* today's prompt */ },
  pendingAnswers: [], // Sync when online
  recentHistory: [],  // Last 7 days
  userState: { /* streak, achievements, etc */ },
  collections: { /* collection progress */ },
};
```

### 4.2 Sync Strategy
```javascript
const syncStrategy = {
  onAppOpen: true,
  onNetworkReconnect: true,
  backgroundSync: '15min',
  conflictResolution: 'server_wins', // Or merge
};
```

---

## Phase 5: Premium Features (Optional Monetization)

### 5.1 Free Tier
- 1 daily prompt
- Basic streak tracking
- 3 collections
- Family circle (up to 3 members)

### 5.2 Premium Tier ($4.99/month or $39.99/year)
- Unlimited prompts
- All 8+ collections
- Streak freezes (2/month)
- Streak repair (1/month)
- Unlimited family members
- Export to PDF book
- Ad-free experience
- Early access to new features

### 5.3 Family Plan ($9.99/month)
- Up to 6 family members
- All premium features
- Shared family collections
- Family leaderboard
- Combined family book export

---

## Phase 6: Advanced Features (Future)

### 6.1 Enhanced Voice Features
```javascript
const advancedVoiceFeatures = {
  // Conversational AI follow-ups
  aiConversation: true,        // AI asks follow-up questions mid-recording
  voiceNavigation: true,       // "Hey Memory Quest, what's today's prompt?"
  emotionDetection: true,      // Detect joy/nostalgia in voice tone

  // Audio enhancements
  noiseReduction: true,        // Clean up background noise
  audioChapters: true,         // Split long recordings into chapters
  voiceCloning: true,          // Preserve user's voice for family (future)

  // Playback features
  familyPlayback: true,        // Family can listen to recordings
  audiobook: true,             // Compile into narrated memoir
};
```

### 6.2 AI Enhancements
```javascript
const aiFeatures = {
  personalizedPrompts: true,   // Based on past answers
  followUpQuestions: true,     // AI asks clarifying questions
  memoryInsights: true,        // "You often mention your grandmother..."
  photoSuggestions: true,      // "Add a photo of this memory?"
  storyConnections: true,      // Link related memories
};
```

### 6.3 Social Features
```javascript
const socialFeatures = {
  shareAchievements: true,     // Share to social media
  friendsLeaderboard: true,    // Compete with friends
  communityPrompts: true,      // User-submitted prompts
  memoryOfTheDay: true,        // Featured public memories (opt-in)
};
```

### 6.4 Apple Watch / Wear OS
- Quick prompt notifications
- Voice recording on watch
- Streak widget
- Complications showing streak count

---

## Technical Architecture

### API Changes Needed
```javascript
// New endpoints for mobile
POST /api/mobile/register-device    // Push notification token
POST /api/mobile/sync               // Offline sync
GET  /api/mobile/bootstrap          // Initial app data load
POST /api/mobile/voice-upload       // Voice recording upload
GET  /api/mobile/leaderboard        // Weekly rankings
POST /api/mobile/purchase           // In-app purchase verification
```

### Database Additions
```sql
-- Device tokens for push notifications
CREATE TABLE user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  device_token TEXT NOT NULL,
  platform VARCHAR(10), -- 'ios' or 'android'
  created_at TIMESTAMP DEFAULT NOW()
);

-- XP and leveling
ALTER TABLE user_game_state ADD COLUMN total_xp INTEGER DEFAULT 0;
ALTER TABLE user_game_state ADD COLUMN current_level INTEGER DEFAULT 1;
ALTER TABLE user_game_state ADD COLUMN league VARCHAR(20) DEFAULT 'Bronze';

-- Premium subscriptions
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  plan VARCHAR(20), -- 'premium', 'family'
  status VARCHAR(20), -- 'active', 'cancelled', 'expired'
  platform VARCHAR(10), -- 'ios', 'android', 'web'
  started_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

---

## Development Timeline

| Phase | Duration | Team | Priority |
|-------|----------|------|----------|
| Phase 1: Voice-First Foundation | 6-8 weeks | 1-2 devs | **CRITICAL** |
| Phase 2: Gamification | 3-4 weeks | 1-2 devs | High |
| Phase 3: Push Notifications | 2 weeks | 1 dev | High |
| Phase 4: Offline Support | 2-3 weeks | 1 dev | Medium |
| Phase 5: Premium/IAP | 2-3 weeks | 1 dev | Medium |
| Phase 6: Advanced Features | Ongoing | Team | Low |

**MVP (Phases 1-3): ~12-14 weeks**

### Voice-First MVP Features (Week 1-8)
1. ✅ Voice recording with hold-to-speak button
2. ✅ Real-time transcription display
3. ✅ Text-to-speech for prompt readout
4. ✅ Audio playback in history
5. ✅ Fallback to text input
6. ✅ Basic streak tracking

---

## App Store Requirements

### iOS (Apple App Store)
- [ ] Apple Developer Account ($99/year)
- [ ] App icons (1024x1024)
- [ ] Screenshots for all device sizes
- [ ] Privacy policy URL
- [ ] App Store description
- [ ] Age rating (4+)
- [ ] Sign in with Apple (required)

### Android (Google Play)
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots for phone/tablet
- [ ] Privacy policy URL
- [ ] Content rating questionnaire

---

## Success Metrics

### Voice-First Metrics
- **Voice vs Text ratio**: Target 80%+ using voice
- **Average recording length**: Target 60-120 seconds
- **Transcription accuracy**: Target 95%+
- **Voice completion rate**: % who finish recording vs abandon

### Engagement
- Daily Active Users (DAU)
- 7-day retention rate (target: 40%+)
- Average streak length
- Prompts completed per user per week

### Growth
- Weekly new installs
- Organic vs paid acquisition
- App Store rating (target: 4.5+)
- Family circle viral coefficient

### Revenue (if premium)
- Conversion rate free → premium
- Monthly Recurring Revenue (MRR)
- Lifetime Value (LTV)
- Churn rate

---

## Voice Storage & Costs

### Audio Storage Estimates
```
Per recording: ~1MB per minute (m4a format)
Average recording: 2 minutes = 2MB
Per user per month: 60 recordings = 120MB
1000 users: 120GB/month

Storage cost (S3): ~$0.023/GB = $2.76/month for 1000 users
Transcription (Whisper): ~$0.006/minute = $7.20/month for 1000 users
```

### Storage Strategy
```javascript
const storageStrategy = {
  // Keep originals for 1 year
  originalAudio: {
    storage: 's3-standard',
    retention: '1 year',
    afterRetention: 'move to glacier',
  },

  // Always keep transcripts
  transcripts: {
    storage: 'postgres',
    retention: 'forever',
  },

  // Option to download all recordings
  export: {
    includeAudio: true,
    format: 'zip with mp3s',
  },
};
```

---

## Competitive Advantages

1. **Voice-First**: Speak memories instead of typing - revolutionary for seniors
2. **Niche Focus**: Only app focused on family memoir capture
3. **Senior-Friendly**: Large buttons, simple navigation, audio playback
4. **Preserve Voices**: Keep actual voice recordings, not just text
5. **Family Connection**: Unique family circle - hear grandma's stories
6. **AI-Powered**: Personalized prompts based on life context
7. **Book + Audiobook**: Physical book AND narrated audiobook output

### Why Voice-First Wins

| Problem | Text Apps | Memory Quest Voice |
|---------|-----------|-------------------|
| Typing is hard for seniors | 😟 Small keyboard | ✅ Just talk |
| Stories feel robotic | 😟 Typed text | ✅ Real voice, emotion |
| Takes too long | 😟 40 words/min typing | ✅ 150 words/min speaking |
| Loses personality | 😟 Plain text | ✅ Tone, pauses, laughter |
| Accessibility issues | 😟 Vision/motor needed | ✅ Just speak |
| Family connection | 😟 Reading text | ✅ Hearing loved one's voice |

---

## Next Steps

1. **Validate demand**: Survey existing users about mobile app interest
2. **MVP scope**: Start with Phases 1-3 only
3. **Beta test**: TestFlight (iOS) / Internal testing (Android)
4. **Iterate**: Gather feedback before public launch
5. **Launch**: Soft launch in one market, then expand

---

*"Every family has a story worth preserving. Let's make it as easy as learning a new word each day."*
