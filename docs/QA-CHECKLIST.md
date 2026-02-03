# Memory Quest QA Checklist

Use this checklist before each deployment to verify all Memory Quest features are working correctly.

---

## Backend API Tests

### Game State API
- [ ] `GET /api/game/state` returns valid game state
- [ ] `POST /api/game/enable` enables game mode
- [ ] `POST /api/game/disable` disables game mode
- [ ] `PUT /api/game/settings` updates preferences
- [ ] `GET /api/game/achievements` returns achievements
- [ ] `POST /api/game/streak/use-shield` consumes shield

### Daily Prompts API
- [ ] `GET /api/game/prompt/today` returns/creates today's prompt
- [ ] Prompt is personalized based on user context
- [ ] `POST /api/game/prompt/:id/complete` saves answer
- [ ] Completing updates streak correctly
- [ ] Completing awards appropriate achievements
- [ ] `POST /api/game/prompt/:id/skip` skips prompt
- [ ] `GET /api/game/prompts/history` returns past prompts

### Collections API
- [ ] `GET /api/game/collections` returns all collections
- [ ] Items show correct completion status
- [ ] `POST /api/game/collections/sync` syncs progress

### Family API
- [ ] `POST /api/game/circle/create` creates circle
- [ ] `GET /api/game/circle` returns circle data
- [ ] `POST /api/game/circle/join/:code` joins circle
- [ ] `POST /api/game/circle/prompt` sends family prompt
- [ ] Family prompts can be answered

---

## Frontend Flow Tests

### Mode Switching
- [ ] Dashboard shows mode switch
- [ ] Clicking enables Memory Quest
- [ ] Dashboard changes to Quest view
- [ ] Switching back shows Classic view

### Daily Prompt Flow
- [ ] Today's prompt displays on dashboard
- [ ] Clicking "Start Writing" goes to prompt page
- [ ] Can type answer in textarea
- [ ] Word count updates
- [ ] Submitting shows celebration
- [ ] Celebration shows streak
- [ ] New achievements animate
- [ ] Returns to dashboard correctly

### Collections Flow
- [ ] Collections page loads
- [ ] Shows 8 collections
- [ ] Progress bars accurate
- [ ] Clicking opens detail modal
- [ ] Can navigate to answer questions

### Achievements Flow
- [ ] Achievements page loads
- [ ] Earned achievements show as unlocked
- [ ] Unearned show as locked
- [ ] Correct icons display

### Family Flow
- [ ] Can create a circle
- [ ] Invite code generates
- [ ] Can join with code
- [ ] Members list shows
- [ ] Can send prompt to member
- [ ] Received prompts display
- [ ] Can answer family prompt

### History Flow
- [ ] History page loads
- [ ] Filter buttons work (all, completed, skipped)
- [ ] Grouped by month correctly
- [ ] Expanding card shows full answer

---

## Streak Logic Tests

### Normal Flow
- [ ] Day 1: Complete prompt -> streak = 1
- [ ] Day 2: Complete prompt -> streak = 2
- [ ] Day 3: Complete prompt -> streak = 3

### Missed Day (No Shield)
- [ ] Miss a day -> streak resets to 0
- [ ] Next completion -> streak = 1

### Missed Day (With Shield)
- [ ] Miss a day, use shield -> streak preserved
- [ ] Shield count decreases by 1
- [ ] Next completion -> streak continues

### Shield Restoration
- [ ] Monday reset adds 1 shield
- [ ] Max shields = 3

---

## Edge Cases

### Empty States
- [ ] New user sees empty dashboard gracefully
- [ ] No achievements shows "keep going" message
- [ ] No family circle shows create/join options

### Error Handling
- [ ] API errors show user-friendly messages
- [ ] Network failure doesn't crash app
- [ ] Invalid prompt ID handled

### Concurrent Operations
- [ ] Can't complete same prompt twice
- [ ] Can't use shield if none available

---

## Performance Tests

- [ ] Dashboard loads under 2 seconds
- [ ] Prompt page loads under 1 second
- [ ] Celebration animation smooth (60fps)
- [ ] Collections page loads under 2 seconds

---

## Accessibility Tests

### Senior-Friendly Checks
- [ ] Text is readable (16px+ body text)
- [ ] Touch targets are 44px+
- [ ] Color contrast passes WCAG AA
- [ ] No time pressure in UI
- [ ] Clear navigation (single-level)
- [ ] Error messages are helpful

### Screen Reader
- [ ] Buttons have aria-labels
- [ ] Form inputs have labels
- [ ] Modals trap focus correctly

---

## Test User Scenarios

### Scenario 1: New User Enables Quest Mode
1. Register new account
2. Complete onboarding
3. Go to dashboard
4. Click "Try Memory Quest"
5. See today's prompt
6. Answer prompt
7. See celebration (Day 1 streak)
8. Check achievements (First Memory unlocked)

### Scenario 2: Returning User Maintains Streak
1. Log in (Day 2)
2. See streak badge (1 day)
3. Complete today's prompt
4. See celebration (Day 2 streak)
5. Check streak = 2

### Scenario 3: User Misses Day But Uses Shield
1. Miss one day
2. Log in next day
3. See streak warning
4. Use shield
5. Complete today's prompt
6. Streak continues (not reset)

### Scenario 4: Family Collaboration
1. User A creates circle
2. User A shares invite code
3. User B joins circle
4. User A sends prompt to User B
5. User B sees prompt notification
6. User B answers prompt
7. User A sees activity feed update

---

## Sign-Off

| Area | Tested By | Date | Notes |
|------|-----------|------|-------|
| Backend API | | | |
| Frontend Flows | | | |
| Streak Logic | | | |
| Edge Cases | | | |
| Performance | | | |
| Accessibility | | | |

---

**Ready for deployment when all items checked and signed off.**
