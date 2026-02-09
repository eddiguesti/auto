# TODO-11: App Store Preparation

## Objective

Prepare assets and metadata for App Store and Google Play submission.

## Duration: 1 week

## Dependencies

- TODO-10 (Premium Features)

---

## Tasks

### Task 11.1: App Icons

Create app icon in all required sizes:

**iOS:**

- 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024
- @1x, @2x, @3x variants

**Android:**

- mipmap-mdpi: 48x48
- mipmap-hdpi: 72x72
- mipmap-xhdpi: 96x96
- mipmap-xxhdpi: 144x144
- mipmap-xxxhdpi: 192x192
- Play Store: 512x512

**Design requirements:**

- No transparency (iOS)
- No rounded corners (iOS adds them)
- Simple, recognizable at small sizes

- [ ] Design app icon
- [ ] Export all iOS sizes
- [ ] Export all Android sizes
- [ ] Add to project

---

### Task 11.2: Splash Screen

**iOS (LaunchScreen.storyboard):**

- Simple centered logo
- Background color: #FDF8F3 (parchment)

**Android (res/drawable/launch_screen.xml):**

- Centered logo
- Background color: #FDF8F3

- [ ] Design splash screen
- [ ] Configure iOS LaunchScreen
- [ ] Configure Android splash

---

### Task 11.3: Screenshots

**Required screenshots:**

| Device         | Size        | Count |
| -------------- | ----------- | ----- |
| iPhone 6.7"    | 1290 x 2796 | 5-10  |
| iPhone 6.5"    | 1242 x 2688 | 5-10  |
| iPhone 5.5"    | 1242 x 2208 | 5-10  |
| iPad Pro 12.9" | 2048 x 2732 | 5-10  |
| Android Phone  | 1080 x 1920 | 5-10  |
| Android 7"     | 1200 x 1920 | 5-10  |
| Android 10"    | 1600 x 2560 | 5-10  |

**Screenshot content:**

1. Home screen with prompt
2. Voice recording in action
3. Review/playback screen
4. Celebration with streak
5. Collections overview
6. Family circle

- [ ] Create screenshot designs
- [ ] Export for all device sizes
- [ ] Add captions/annotations

---

### Task 11.4: App Store Metadata

**App Name:** Memory Quest - Voice Memoir

**Subtitle (iOS):** Capture Family Stories Daily

**Short Description (Android):**
Preserve your life stories with voice recordings. 5 minutes a day builds a legacy.

**Full Description:**

```
Memory Quest makes preserving your life stories as easy as having a conversation.

🎙️ VOICE-FIRST DESIGN
Simply hold a button and speak your memories. No typing required. Perfect for seniors and anyone who prefers talking over typing.

📝 DAILY PROMPTS
Each day, receive a thoughtful prompt to spark a memory. From childhood adventures to life lessons learned.

🔥 STREAK MOTIVATION
Build a daily habit with streak tracking. Stay motivated with achievements and see your progress grow.

👨‍👩‍👧 FAMILY CIRCLES
Connect with family members. Send them prompts, receive encouragement, and build your family's story together.

📚 THEMED COLLECTIONS
Explore 8+ curated collections: Childhood Memories, Family Traditions, Life Lessons, and more.

🎧 AUDIO PRESERVED
Your actual voice recordings are saved alongside transcripts. Your grandchildren will hear your voice telling your stories.

Perfect for:
• Seniors wanting to preserve their life stories
• Families recording oral histories
• Anyone building a personal memoir
• Grandparents sharing wisdom with grandchildren

Start your 5-minute daily habit today and build a legacy that lasts generations.
```

**Keywords (iOS):** memoir, voice recording, family history, life stories, diary, journal, autobiography, grandparents, memories, oral history

**Category:** Lifestyle (primary), Entertainment (secondary)

**Age Rating:** 4+

- [ ] Write app description
- [ ] Prepare keywords
- [ ] Set categories
- [ ] Complete age rating questionnaire

---

### Task 11.5: Privacy Policy & Terms

**Privacy Policy must include:**

- Data collected (recordings, transcripts, profile)
- How data is used
- Data storage location
- Third-party services (Firebase, AWS, OpenAI)
- User rights (deletion, export)
- Children's privacy (COPPA if applicable)

**Host at:** https://memoryquest.app/privacy

- [ ] Write privacy policy
- [ ] Write terms of service
- [ ] Host on website
- [ ] Add URLs to app stores

---

### Task 11.6: iOS Specific

**App Store Connect:**

- [ ] Create app record
- [ ] Configure in-app purchases
- [ ] Set up App Privacy questionnaire
- [ ] Configure Sign in with Apple
- [ ] Submit for review

**Info.plist entries:**

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Memory Quest records your voice to preserve your memories</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>Memory Quest transcribes your voice recordings into text</string>
```

- [ ] Complete App Privacy questionnaire
- [ ] Add required Info.plist entries
- [ ] Test on TestFlight

---

### Task 11.7: Android Specific

**Google Play Console:**

- [ ] Create app listing
- [ ] Configure in-app purchases
- [ ] Complete Data Safety questionnaire
- [ ] Set up content rating
- [ ] Submit for review

**Required:**

- Feature graphic (1024 x 500)
- Promo video (optional but recommended)

- [ ] Complete Data Safety form
- [ ] Create feature graphic
- [ ] Test on internal track

---

## Submission Checklist

### iOS

- [ ] App icon added
- [ ] Screenshots uploaded (all sizes)
- [ ] Description complete
- [ ] Keywords added
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] App Privacy questionnaire
- [ ] Age rating complete
- [ ] In-app purchases configured
- [ ] Build uploaded via Xcode

### Android

- [ ] App icon added
- [ ] Screenshots uploaded (all sizes)
- [ ] Feature graphic uploaded
- [ ] Description complete
- [ ] Privacy policy URL
- [ ] Data Safety complete
- [ ] Content rating complete
- [ ] In-app purchases configured
- [ ] AAB uploaded

---

## Next Step

When complete, proceed to **TODO-12-TESTING.md**
