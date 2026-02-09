# TODO-12: Testing & QA

## Objective

Thoroughly test the app before launch.

## Duration: 1-2 weeks

## Dependencies

- TODO-11 (App Store Prep)

---

## Test Categories

### 1. Voice Recording Tests

- [ ] Hold button starts recording
- [ ] Release button stops recording
- [ ] Waveform animates while recording
- [ ] Timer updates correctly
- [ ] Cancel button discards recording
- [ ] Long recordings (5+ minutes) work
- [ ] Recording quality is good
- [ ] Works with headphones
- [ ] Works with Bluetooth audio

### 2. Transcription Tests

- [ ] Live transcription appears while speaking
- [ ] Final transcription is accurate
- [ ] Whisper improves transcript after recording
- [ ] Works with different accents
- [ ] Handles silence gracefully
- [ ] Handles background noise
- [ ] Fallback works when Whisper fails

### 3. Audio Playback Tests

- [ ] Recorded audio plays back
- [ ] Play/pause toggle works
- [ ] Progress bar updates
- [ ] Seek works correctly
- [ ] Works with headphones
- [ ] Works with Bluetooth
- [ ] Works in background (if enabled)

### 4. Offline Tests

- [ ] Can record when offline
- [ ] Memory saved locally
- [ ] Offline indicator shows
- [ ] Auto-sync on reconnect
- [ ] Multiple offline memories sync
- [ ] Audio files upload correctly
- [ ] No data loss

### 5. Streak & Gamification Tests

- [ ] Streak increments on completion
- [ ] Streak resets after missed day
- [ ] Streak freeze works
- [ ] XP awarded correctly
- [ ] Level up triggers
- [ ] Achievements unlock
- [ ] Celebration screen shows correct data

### 6. Push Notification Tests

- [ ] Permission request shows
- [ ] Daily reminder received
- [ ] Streak warning received
- [ ] Tapping notification opens app
- [ ] Notification settings respected
- [ ] Works when app killed

### 7. Premium/IAP Tests

- [ ] Paywall displays
- [ ] Purchase flow works
- [ ] Restore purchases works
- [ ] Premium features unlock
- [ ] Free features remain accessible
- [ ] Server-side verification works

### 8. Family Features Tests

- [ ] Create circle works
- [ ] Invite code generates
- [ ] Join circle works
- [ ] Send prompt works
- [ ] Receive prompt notification
- [ ] Family activity shows

### 9. Navigation Tests

- [ ] All screens accessible
- [ ] Back buttons work
- [ ] Tab navigation works
- [ ] Deep links work
- [ ] No crashes on rapid navigation

### 10. Device Tests

**iOS:**

- [ ] iPhone SE (small screen)
- [ ] iPhone 14 (standard)
- [ ] iPhone 14 Pro Max (large)
- [ ] iPad
- [ ] iOS 15+ (minimum supported)

**Android:**

- [ ] Small phone (5")
- [ ] Standard phone (6.5")
- [ ] Tablet (10")
- [ ] Android 10+ (minimum supported)
- [ ] Various manufacturers (Samsung, Pixel, etc.)

### 11. Accessibility Tests

- [ ] VoiceOver works (iOS)
- [ ] TalkBack works (Android)
- [ ] Large font sizes respected
- [ ] Touch targets 44px+
- [ ] Color contrast passes WCAG AA
- [ ] Buttons have accessible labels

### 12. Performance Tests

- [ ] App launches in < 3 seconds
- [ ] Recording starts instantly
- [ ] No jank during recording
- [ ] Smooth animations (60fps)
- [ ] Memory usage acceptable
- [ ] Battery usage reasonable

### 13. Error Handling Tests

- [ ] Network errors show message
- [ ] API errors handled gracefully
- [ ] Recording permission denied handled
- [ ] Storage full handled
- [ ] Invalid token handled (re-login)

### 14. Edge Cases

- [ ] Very long prompt text
- [ ] Very long transcript (1000+ words)
- [ ] Special characters in text
- [ ] Emoji in text
- [ ] App backgrounded during recording
- [ ] Incoming call during recording
- [ ] Low battery during recording

---

## Beta Testing

### TestFlight (iOS)

- [ ] Upload build
- [ ] Add internal testers (team)
- [ ] Add external testers (friends/family)
- [ ] Collect feedback
- [ ] Fix critical issues

### Google Play Internal Testing

- [ ] Upload AAB
- [ ] Add internal testers
- [ ] Collect feedback
- [ ] Fix critical issues

### Beta Feedback Form

Create a simple form for testers:

- Overall experience (1-5)
- Voice recording worked?
- Any crashes?
- What confused you?
- Feature requests?

- [ ] Create feedback form
- [ ] Share with testers
- [ ] Review and prioritize feedback

---

## Bug Tracking

Use GitHub Issues or similar:

- [ ] Create bug template
- [ ] Label: critical, high, medium, low
- [ ] Track all reported issues
- [ ] Fix critical before launch

---

## Sign-Off Checklist

| Area               | Tested By | Date | Status |
| ------------------ | --------- | ---- | ------ |
| Voice Recording    |           |      |        |
| Transcription      |           |      |        |
| Playback           |           |      |        |
| Offline            |           |      |        |
| Gamification       |           |      |        |
| Push Notifications |           |      |        |
| Premium/IAP        |           |      |        |
| Family Features    |           |      |        |
| Navigation         |           |      |        |
| Devices            |           |      |        |
| Accessibility      |           |      |        |
| Performance        |           |      |        |
| Error Handling     |           |      |        |

**Ready for launch when all critical items pass.**

---

## Next Step

When complete, proceed to **TODO-13-LAUNCH.md**
