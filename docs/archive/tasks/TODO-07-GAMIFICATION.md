# TODO-07: Gamification Features

## Objective

Implement Duolingo-style gamification: XP system, levels, leagues, and enhanced streaks.

## Duration: 2-3 weeks

## Dependencies

- TODO-06 (Backend Voice)

---

## Tasks

### Task 7.1: Add XP & Levels to Database

```sql
-- Add XP and leveling columns
ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;
ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS league VARCHAR(20) DEFAULT 'Bronze';
ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS weekly_xp INTEGER DEFAULT 0;
ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS last_league_reset DATE;

-- XP history for tracking
CREATE TABLE IF NOT EXISTS xp_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  reason VARCHAR(50),  -- 'prompt_complete', 'streak_bonus', 'collection_complete', etc
  created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] Add XP columns to user_game_state
- [ ] Create xp_history table

---

### Task 7.2: Create XP System

**Create:** `/life-story/server/utils/xpSystem.js`

```javascript
import pool from '../db/index.js'

// XP rewards
const XP_REWARDS = {
  promptComplete: 10, // Base XP for completing prompt
  bonusPerWord: 0.1, // 0.1 XP per word over 50
  streakDay: 5, // Bonus per streak day (max 50)
  collectionComplete: 50, // Complete a collection
  achievementUnlock: 25, // Unlock achievement
  familyPromptAnswer: 15, // Answer family prompt
  perfectWeek: 100 // 7 days in a row
}

// Level thresholds
const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Memory Novice' },
  { level: 2, xpRequired: 50, title: 'Memory Novice' },
  { level: 3, xpRequired: 150, title: 'Memory Novice' },
  { level: 4, xpRequired: 300, title: 'Memory Novice' },
  { level: 5, xpRequired: 500, title: 'Story Seeker' },
  { level: 10, xpRequired: 1500, title: 'Memory Keeper' },
  { level: 15, xpRequired: 3500, title: 'Memory Keeper' },
  { level: 20, xpRequired: 6000, title: 'Legacy Builder' },
  { level: 30, xpRequired: 12000, title: 'Legacy Builder' },
  { level: 40, xpRequired: 20000, title: 'Family Historian' },
  { level: 50, xpRequired: 30000, title: 'Family Historian' }
]

// League tiers
const LEAGUES = [
  'Bronze',
  'Silver',
  'Gold',
  'Sapphire',
  'Ruby',
  'Emerald',
  'Amethyst',
  'Pearl',
  'Obsidian',
  'Diamond'
]

export async function awardXP(userId, amount, reason) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Record XP history
    await client.query(`INSERT INTO xp_history (user_id, xp_amount, reason) VALUES ($1, $2, $3)`, [
      userId,
      amount,
      reason
    ])

    // Update totals
    const result = await client.query(
      `UPDATE user_game_state
       SET total_xp = total_xp + $1,
           weekly_xp = weekly_xp + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING total_xp, current_level`,
      [amount, userId]
    )

    const { total_xp, current_level } = result.rows[0]

    // Check for level up
    const newLevel = calculateLevel(total_xp)
    let leveledUp = false

    if (newLevel > current_level) {
      await client.query(`UPDATE user_game_state SET current_level = $1 WHERE user_id = $2`, [
        newLevel,
        userId
      ])
      leveledUp = true
    }

    await client.query('COMMIT')

    return {
      xpEarned: amount,
      totalXp: total_xp,
      newLevel: newLevel,
      leveledUp,
      levelTitle: getLevelTitle(newLevel)
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export function calculateLevel(totalXp) {
  let level = 1
  for (const l of LEVELS) {
    if (totalXp >= l.xpRequired) {
      level = l.level
    } else {
      break
    }
  }
  return level
}

export function getLevelTitle(level) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (level >= LEVELS[i].level) {
      return LEVELS[i].title
    }
  }
  return 'Memory Novice'
}

export function getXPToNextLevel(totalXp, currentLevel) {
  const nextLevel = LEVELS.find(l => l.level > currentLevel)
  if (!nextLevel) return 0
  return nextLevel.xpRequired - totalXp
}

export function calculatePromptXP(wordCount, streakDays) {
  let xp = XP_REWARDS.promptComplete

  // Bonus for longer answers
  if (wordCount > 50) {
    xp += Math.floor((wordCount - 50) * XP_REWARDS.bonusPerWord)
  }

  // Streak multiplier (max 2x at 10+ days)
  const streakBonus = Math.min(streakDays * XP_REWARDS.streakDay, 50)
  xp += streakBonus

  return Math.round(xp)
}
```

- [ ] Create XP system
- [ ] Define level thresholds
- [ ] Calculate XP for prompts

---

### Task 7.3: Update Prompt Completion with XP

Update the prompt complete logic to award XP:

```javascript
// In routes/game.js POST /prompt/:id/complete

import { calculatePromptXP, awardXP } from '../utils/xpSystem.js'

// After saving the prompt answer...
const wordCount = answer.split(/\s+/).filter(Boolean).length
const xpAmount = calculatePromptXP(wordCount, gameState.currentStreak)
const xpResult = await awardXP(userId, xpAmount, 'prompt_complete')

// Include XP info in response
res.json({
  success: true,
  data: {
    // ... existing fields
    xpEarned: xpResult.xpEarned,
    totalXp: xpResult.totalXp,
    currentLevel: xpResult.newLevel,
    levelTitle: xpResult.levelTitle,
    leveledUp: xpResult.leveledUp
  }
})
```

- [ ] Calculate XP on prompt complete
- [ ] Award XP and check level up
- [ ] Return XP info in response

---

### Task 7.4: Create XP Display Component (Mobile)

**Create:** `src/components/gamification/XPDisplay.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../utils/theme';

interface XPDisplayProps {
  currentXP: number;
  xpToNextLevel: number;
  currentLevel: number;
  levelTitle: string;
}

export default function XPDisplay({
  currentXP,
  xpToNextLevel,
  currentLevel,
  levelTitle,
}: XPDisplayProps) {
  const progress = xpToNextLevel > 0
    ? ((currentXP % 100) / 100) * 100  // Simplified progress
    : 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelNumber}>{currentLevel}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{levelTitle}</Text>
          <Text style={styles.xp}>{currentXP} XP</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.nextLevel}>
        {xpToNextLevel} XP to Level {currentLevel + 1}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.amber,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  info: {
    marginLeft: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  xp: {
    fontSize: 14,
    color: colors.sepia,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.amber,
  },
  nextLevel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});
```

- [ ] Create XPDisplay component
- [ ] Show level and progress
- [ ] Animate XP gains

---

### Task 7.5: Create XP Earned Animation

**Create:** `src/components/gamification/XPEarnedPopup.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';

interface XPEarnedPopupProps {
  amount: number;
  onComplete: () => void;
}

export default function XPEarnedPopup({ amount, onComplete }: XPEarnedPopupProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -50,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start(onComplete);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Text style={styles.text}>+{amount} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.amber,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
```

- [ ] Create XP popup animation
- [ ] Show on prompt completion

---

### Task 7.6: Add Streak Freeze Feature

```sql
-- Add streak freeze to user_game_state
ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS streak_freezes_available INTEGER DEFAULT 0;
ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS streak_freeze_used_today BOOLEAN DEFAULT FALSE;
```

**API endpoint:**

```javascript
router.post(
  '/streak/freeze',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    // Check if freeze available
    const state = await pool.query(
      `SELECT streak_freezes_available, streak_freeze_used_today
     FROM user_game_state WHERE user_id = $1`,
      [userId]
    )

    if (state.rows[0].streak_freezes_available < 1) {
      return res.status(400).json({ success: false, message: 'No streak freezes available' })
    }

    if (state.rows[0].streak_freeze_used_today) {
      return res.status(400).json({ success: false, message: 'Already used freeze today' })
    }

    // Use freeze
    await pool.query(
      `UPDATE user_game_state
     SET streak_freezes_available = streak_freezes_available - 1,
         streak_freeze_used_today = true
     WHERE user_id = $1`,
      [userId]
    )

    res.json({ success: true })
  })
)
```

- [ ] Add streak freeze columns
- [ ] Create use freeze endpoint
- [ ] Award freezes on premium or achievements

---

### Task 7.7: Weekly League Reset

Add to weekly cron job:

```javascript
// In cron/weeklyTasks.js
export async function resetWeeklyLeagues() {
  // Calculate league promotions/demotions based on weekly XP
  // Top 10% promote, bottom 10% demote, rest stay

  await pool.query(`
    UPDATE user_game_state
    SET weekly_xp = 0,
        last_league_reset = CURRENT_DATE,
        streak_freeze_used_today = false
    WHERE game_mode_enabled = true
  `)
}
```

- [ ] Add league reset to weekly cron
- [ ] Calculate promotions/demotions

---

## Verification Checklist

- [ ] XP awarded on prompt completion
- [ ] Level system working
- [ ] XP display component shows progress
- [ ] XP earned animation plays
- [ ] Streak freeze feature works
- [ ] Weekly league reset works

---

## Next Step

When complete, proceed to **TODO-08-PUSH-NOTIFICATIONS.md**
