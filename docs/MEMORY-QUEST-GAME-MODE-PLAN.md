# Memory Quest: Complete Game Mode Design

## Executive Summary

**Memory Quest** transforms Easy Memoir from "a big project to complete someday" into "a delightful daily ritual that builds a legacy over time."

This design is backed by behavioral psychology research and specifically adapted for older adults. It combines the habit-forming mechanics of Duolingo with the therapeutic benefits of reminiscence — creating engagement without manipulation.

---

## Part 1: Psychology Foundation

### Why This Will Work

**The Core Problem We're Solving:**
- 70+ questions across 10 chapters feels overwhelming
- Users start with enthusiasm but abandon when they see the scale
- No mechanism to bring users back after they leave
- Progress feels slow and unrewarding

**The Psychology We're Leveraging:**

| Principle | How We Use It |
|-----------|---------------|
| **Zeigarnik Effect** | Started memories create mental "open loops" that drive users to return |
| **Goal Gradient Effect** | Show progress toward small milestones to accelerate motivation |
| **Loss Aversion** | Gentle streaks create investment without harsh punishment |
| **Variable Rewards** | Surprise elements keep the experience fresh |
| **Reminiscence Bump** | Focus prompts on ages 10-30 for richest memory recall |
| **Self-Determination Theory** | Support autonomy, competence, and relatedness |
| **Flow State** | Match prompt difficulty to user's comfort level |

### Senior-Specific Adaptations

**Research shows older adults respond differently to gamification:**

✅ **What Works for Seniors:**
- Socializing and family connection (primary motivator)
- Collaboration over competition
- Meaningful progress (not arbitrary points)
- Simple, single-layer navigation
- Voice input options
- Cognitive benefits framing

❌ **What We're Avoiding:**
- Meaningless badges and points
- Public leaderboards (creates pressure)
- Complex nested navigation
- Competitive elements
- Artificial scarcity or urgency
- Harsh punishment for missed days

---

## Part 2: Core Game Mechanics

### 2.1 Daily Memory Prompts

Instead of facing 70+ questions, users receive **one delightful prompt per day**.

**Prompt Categories:**

```
QUICK MEMORIES (1-2 minutes)
├── Sensory Triggers: "What smell takes you back to childhood?"
├── Simple Facts: "What was your first pet's name?"
├── Either/Or: "Beach holidays or countryside? Why?"
└── Fill-in-the-blank: "The song that defined my teenage years was..."

STORY MEMORIES (5-10 minutes)
├── Micro-stories: "Tell me about a meal you'll never forget"
├── People snapshots: "Describe your grandmother in 3 sentences"
├── Place memories: "Walk me through your childhood kitchen"
└── Moment captures: "What's the funniest thing that happened at school?"

DEEP REFLECTIONS (10-15 minutes) — Weekend prompts
├── Life lessons: "What do you know now that you wish you knew at 25?"
├── Relationships: "Who shaped who you became?"
└── Legacy thoughts: "What do you want your grandchildren to know?"
```

**Daily Prompt Selection Algorithm:**

```
1. Check user's current streak length
   - New users (0-7 days): Only Quick Memories
   - Building (7-30 days): Mix of Quick + Story
   - Established (30+ days): Full variety including Deep

2. Check day of week
   - Weekdays: Lighter prompts
   - Weekends: Deeper reflection prompts (more time available)

3. Check user's progress
   - Prioritize chapters with gaps
   - Surface prompts related to entities they've mentioned
   - Avoid topics they've recently covered

4. Personalize based on context
   - Use birth year to reference era-appropriate content
   - Reference people/places from their Memory Graph
   - Match to their stated input preference (voice vs type)
```

**Daily Prompt Examples (Personalized):**

> "You mentioned your grandmother made incredible Sunday roasts. What other foods take you back to her kitchen?"

> "It's 1967, and you're 15. What song is playing on the radio?"

> "You told us about your first day at [school name]. What about your last day there?"

---

### 2.2 Streak System (Gentle but Motivating)

**The "Memory Flame"** — not a harsh counter, but a warm, growing presence.

```
Day 1-6:    🕯️  Small candle
Day 7-13:   🔥  Growing flame
Day 14-29:  🔥🔥 Stronger flame
Day 30-59:  🔥🔥🔥 Bright fire
Day 60-89:  ✨🔥✨ Glowing hearth
Day 90+:    🌟 Eternal flame
```

**Key Design Decisions:**

1. **Forgiving Grace Period**
   - Miss 1 day: Streak preserved, gentle reminder
   - Miss 2 days: "Memory Shield" activates (one free save per week)
   - Miss 3+ days: Streak resets, but "longest streak" badge remains forever

2. **No Guilt, Only Encouragement**
   - Instead of "You broke your streak!"
   - Say "Welcome back! Your memories were waiting for you."
   - Show what they've already accomplished, not what they lost

3. **Streak Milestones with Meaning**
   - 7 days: "One week of memories captured"
   - 30 days: "A month of your story preserved"
   - 100 days: "100 days — that's dedication to your legacy"
   - 365 days: "A year of memories — you're writing history"

---

### 2.3 Progress System (Not Points)

**We're NOT using arbitrary XP.** Instead, progress is inherently meaningful.

**Memory Counts (Primary Progress):**
```
┌─────────────────────────────────────────┐
│  Your Memory Collection                 │
│                                         │
│  47 memories captured                   │
│  ████████████░░░░░░░░  47%             │
│                                         │
│  People remembered: 23                  │
│  Places described: 15                   │
│  Moments preserved: 47                  │
└─────────────────────────────────────────┘
```

**Chapter Progress (Visual Journey):**
Instead of progress bars, show a visual "life journey map":

```
🌒 Earliest Memories ████████░░ 80%
   ↓
🌓 Childhood ██████████ 100% ✨
   ↓
🌔 School Days ████░░░░░░ 40%
   ↓
🌕 Teenage Years ██░░░░░░░░ 20%
   ↓
○ Key People (not started)
   ↓
○ Young Adulthood (not started)
   ...
```

**Collections (Unlockable Sets):**
Group memories by theme — completing a set reveals special artwork:

```
FAMILY COLLECTION          PLACES COLLECTION
├── Mother's story ✓      ├── Childhood home ✓
├── Father's story ✓      ├── School ✓
├── Siblings ✓            ├── First flat ✓
├── Grandparents ○        ├── Family home ○
└── Extended family ○     └── Favourite holiday spot ○

Progress: 3/5             Progress: 3/5
[Unlock family portrait]  [Unlock places montage]
```

---

### 2.4 Rewards & Celebrations

**Micro-Celebrations (Immediate Feedback):**

After each memory submission:
- Warm confirmation: "Beautiful. That memory is now preserved forever."
- Gentle animation: Memory "filing" into the collection
- Occasional surprise: "That's your 25th memory! Your story is growing."

**Milestone Celebrations:**

| Milestone | Celebration |
|-----------|-------------|
| First memory | "You've started your legacy. This is the first chapter." |
| 10 memories | Animated "Memory Album" showing all 10 as thumbnails |
| Complete a chapter | Reveal personalized AI artwork for that chapter |
| Complete a collection | Special themed artwork unlocks |
| 7-day streak | "Memory Shield" granted (streak protection) |
| 30-day streak | Exclusive "Legacy Keeper" badge |
| 50% complete | "Halfway through your story" celebration + preview of book |
| 100% complete | Full completion ceremony + certificate |

**Surprise Delights (Variable Rewards):**

Randomly (1 in 10 memories), trigger a special moment:
- "That reminded me of something..." — AI suggests a related memory prompt
- "Family connection!" — Show how this memory links to another
- "Time capsule unlocked" — Reveal a historical fact from their era
- "Memory chain!" — Show the web of people/places they've mentioned

---

### 2.5 The Memory Graph (Made Visible)

Turn the existing memory_entities system into a visible, growing "web of memories":

```
                    [Grandmother Rose]
                         /    \
                        /      \
           [Sunday Roasts]    [Christmas 1965]
                  |                  |
                  |                  |
           [Family Kitchen]    [First Snow Memory]
                  \                  /
                   \                /
                    [Childhood Home]
```

**User sees:**
- People appearing as nodes when mentioned
- Connections forming between memories
- The web growing richer over time
- Prompts suggesting "unexplored connections"

---

### 2.6 Family Collaboration Mode

**The "Memory Circle"** — invite family to participate:

**Roles:**
- **Story Keeper** (primary user): The person whose memoir this is
- **Memory Helpers** (invited family): Can prompt questions, add their own recollections
- **Readers** (view-only): Can see progress and encourage

**How It Works:**

1. **Shared Prompts**
   - Family member sends a question: "Dad, tell us about how you met Mum"
   - Shows up as a "special prompt" in the daily queue
   - Answer goes into the memoir, credited to who asked

2. **Memory Additions**
   - Helper can add: "I remember you told me that story differently!"
   - Appears as a "footnote" or "family note" in the memoir
   - Creates richer, multi-perspective stories

3. **Encouragement**
   - Family sees when Story Keeper completes a memory
   - Can send "hearts" or encouraging messages
   - Weekly digest: "Dad added 5 memories this week!"

4. **Collaborative Streaks**
   - "Family streak" — at least one family member active per day
   - Shared milestone celebrations
   - "Your family has captured 200 memories together!"

---

## Part 3: User Interface Design

### 3.1 New Dashboard (Memory Quest Mode)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Good morning, Margaret                      🔥 Day 23       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  TODAY'S MEMORY                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  "What game did you play most as a child?              │ │
│  │   Who did you play it with?"                           │ │
│  │                                                        │ │
│  │  ⏱️ Usually takes 3-5 minutes                          │ │
│  │                                                        │ │
│  │  [  Start Writing  ]  [  Record Voice  ]              │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  YOUR PROGRESS                                               │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │    47    │  │    23    │  │    15    │  │   3/10   │    │
│  │ memories │  │  people  │  │  places  │  │ chapters │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  [View Memory Map]  [See Collections]  [Preview Book]       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  RECENT MEMORIES                                             │
│                                                              │
│  Yesterday: "My grandmother's kitchen smelled like..."      │
│  2 days ago: "The first record I ever bought was..."        │
│  3 days ago: "My best friend at school was called..."       │
│                                                              │
│  [See All Memories]                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Daily Prompt Experience

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ← Back                              Save Draft              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    December 15, 2024                         │
│                                                              │
│          "What game did you play most as a child?           │
│                Who did you play it with?"                    │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  💡 Memory triggers:                                         │
│     • You mentioned your brother Peter earlier...           │
│     • Your childhood home had a garden...                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  We used to play marbles in the back garden...        │ │
│  │  _                                                     │ │
│  │                                                        │ │
│  │                                                        │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [🎤 Switch to Voice]                                        │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [  Save Memory  ]                                           │
│                                                              │
│  Skip today (keeps streak) · Answer later                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Post-Submission Celebration

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                         ✨                                   │
│                                                              │
│              Memory Preserved Forever                        │
│                                                              │
│         "Playing marbles with Peter in the garden"          │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│         🔥 23 day streak                                     │
│         📚 48 memories captured                              │
│         👨‍👩‍👧 Peter now has 5 mentions in your story           │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  💭 "Want to tell me more about Peter?"                      │
│     [Yes, ask me more]  [Maybe tomorrow]                     │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│                    [Back to Home]                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 Memory Map Visualization

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Your Memory Map                                    🔍 Zoom  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                      [Mother - Mary]                         │
│                       /    |    \                            │
│                      /     |     \                           │
│      [Grandmother]──      |      ──[Father - John]          │
│            |              |              |                   │
│            |        [Childhood Home]     |                   │
│            |         /    |    \         |                   │
│      [Sunday Roasts]     |    [Garden Games]                │
│                          |         |                         │
│                    [Christmas]  [Brother Peter]              │
│                                    |                         │
│                              [School Days]                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  PEOPLE: 23  ·  PLACES: 15  ·  MOMENTS: 47                  │
│                                                              │
│  Tap any node to see related memories                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.5 Collections View

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Your Memory Collections                                     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │  👨‍👩‍👧 FAMILY          │  │  🏠 PLACES          │           │
│  │                     │  │                     │           │
│  │  ████████░░  4/5    │  │  ██████░░░░  3/5    │           │
│  │                     │  │                     │           │
│  │  Almost complete!   │  │  Keep going...      │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │  🎄 TRADITIONS      │  │  💼 WORK            │           │
│  │                     │  │                     │           │
│  │  ██░░░░░░░░  1/5    │  │  ░░░░░░░░░░  0/5    │           │
│  │                     │  │                     │           │
│  │  Just started       │  │  Tap to begin       │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │  ❤️ LOVE & ROMANCE  │  │  🌍 ADVENTURES      │           │
│  │                     │  │                     │           │
│  │  ██████████ 5/5  ✨ │  │  ████░░░░░░  2/5    │           │
│  │                     │  │                     │           │
│  │  COMPLETE!          │  │  Halfway there      │           │
│  │  [View Artwork]     │  │                     │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Part 4: Database Schema

### 4.1 New Tables

```sql
-- User gamification state
CREATE TABLE user_game_state (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Streak tracking
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_shields_available INTEGER DEFAULT 1,  -- Free passes
    streak_shields_used_this_week INTEGER DEFAULT 0,

    -- Progress counts
    total_memories INTEGER DEFAULT 0,
    total_people_mentioned INTEGER DEFAULT 0,
    total_places_mentioned INTEGER DEFAULT 0,

    -- Engagement tracking
    daily_prompt_completed_today BOOLEAN DEFAULT false,
    prompts_completed_this_week INTEGER DEFAULT 0,

    -- Feature flags
    game_mode_enabled BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{"daily_reminder": true, "streak_warning": true, "family_activity": true}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily prompts shown and answered
CREATE TABLE daily_prompts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Prompt details
    prompt_date DATE NOT NULL,
    prompt_type TEXT NOT NULL,  -- 'quick', 'story', 'deep'
    prompt_category TEXT,       -- 'sensory', 'people', 'places', 'moments', 'reflection'
    prompt_text TEXT NOT NULL,
    prompt_hint TEXT,           -- Helper text

    -- Linked to existing questions (optional)
    linked_chapter_id TEXT,
    linked_question_id TEXT,

    -- Personalization context
    personalization_context JSONB,  -- What made this prompt personalized

    -- Response tracking
    status TEXT DEFAULT 'pending',  -- 'pending', 'completed', 'skipped'
    answered_at TIMESTAMP,
    answer_story_id INTEGER REFERENCES stories(id),
    time_to_complete_seconds INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, prompt_date)
);

-- Achievements/milestones earned
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    achievement_type TEXT NOT NULL,  -- 'streak', 'collection', 'milestone', 'special'
    achievement_key TEXT NOT NULL,   -- 'streak_7', 'collection_family', 'memories_50'
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    achievement_icon TEXT,

    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    seen_by_user BOOLEAN DEFAULT false,

    UNIQUE(user_id, achievement_key)
);

-- Collections (themed memory groups)
CREATE TABLE collections (
    id SERIAL PRIMARY KEY,
    collection_key TEXT UNIQUE NOT NULL,  -- 'family', 'places', 'traditions', etc.
    collection_name TEXT NOT NULL,
    collection_description TEXT,
    collection_icon TEXT,
    required_items INTEGER DEFAULT 5,
    reward_artwork_prompt TEXT,  -- Prompt for generating completion artwork
    display_order INTEGER DEFAULT 0
);

-- Collection items (what memories complete a collection)
CREATE TABLE collection_items (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,  -- 'mother', 'father', 'siblings'
    item_name TEXT NOT NULL,
    item_description TEXT,

    -- How this item gets marked complete
    completion_type TEXT NOT NULL,  -- 'question', 'entity_type', 'chapter'
    completion_criteria JSONB,      -- {"chapter_id": "key-people", "question_id": "mother"}

    display_order INTEGER DEFAULT 0,
    UNIQUE(collection_id, item_key)
);

-- User progress on collections
CREATE TABLE user_collection_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,

    items_completed INTEGER DEFAULT 0,
    completed_items JSONB DEFAULT '[]',  -- Array of item_keys completed
    is_complete BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    reward_artwork_url TEXT,  -- Generated artwork when complete

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, collection_id)
);

-- Family collaboration
CREATE TABLE memory_circles (
    id SERIAL PRIMARY KEY,
    owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    circle_name TEXT DEFAULT 'My Memory Circle',
    invite_code TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memory_circle_members (
    id SERIAL PRIMARY KEY,
    circle_id INTEGER REFERENCES memory_circles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,  -- 'owner', 'helper', 'reader'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(circle_id, user_id)
);

CREATE TABLE family_prompts (
    id SERIAL PRIMARY KEY,
    circle_id INTEGER REFERENCES memory_circles(id) ON DELETE CASCADE,
    from_user_id INTEGER REFERENCES users(id),
    for_user_id INTEGER REFERENCES users(id),  -- The story keeper

    prompt_text TEXT NOT NULL,
    prompt_note TEXT,  -- "I'd love to hear about this!"

    status TEXT DEFAULT 'pending',  -- 'pending', 'answered', 'declined'
    answered_story_id INTEGER REFERENCES stories(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE family_encouragements (
    id SERIAL PRIMARY KEY,
    circle_id INTEGER REFERENCES memory_circles(id) ON DELETE CASCADE,
    from_user_id INTEGER REFERENCES users(id),
    for_user_id INTEGER REFERENCES users(id),

    encouragement_type TEXT,  -- 'heart', 'message'
    message TEXT,

    seen_by_recipient BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Streak history (for analytics and recovery)
CREATE TABLE streak_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    had_activity BOOLEAN DEFAULT false,
    streak_on_this_day INTEGER,
    shield_used BOOLEAN DEFAULT false,

    UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX idx_user_game_state_user ON user_game_state(user_id);
CREATE INDEX idx_daily_prompts_user_date ON daily_prompts(user_id, prompt_date);
CREATE INDEX idx_achievements_user ON achievements(user_id);
CREATE INDEX idx_collection_progress_user ON user_collection_progress(user_id);
CREATE INDEX idx_memory_circles_owner ON memory_circles(owner_user_id);
CREATE INDEX idx_memory_circle_members_user ON memory_circle_members(user_id);
CREATE INDEX idx_family_prompts_for_user ON family_prompts(for_user_id, status);
CREATE INDEX idx_streak_history_user_date ON streak_history(user_id, date);
```

### 4.2 Seed Data for Collections

```sql
-- Core collections
INSERT INTO collections (collection_key, collection_name, collection_description, collection_icon, required_items, display_order) VALUES
('family', 'Family Portrait', 'The people who shaped you', '👨‍👩‍👧', 5, 1),
('places', 'Places of the Heart', 'Where your memories live', '🏠', 5, 2),
('traditions', 'Family Traditions', 'The rituals that made you unique', '🎄', 5, 3),
('firsts', 'Book of Firsts', 'First times that changed everything', '⭐', 5, 4),
('love', 'Love Stories', 'Romance and relationships', '❤️', 5, 5),
('adventures', 'Adventures', 'Journeys and discoveries', '🌍', 5, 6),
('work', 'Working Life', 'Career and accomplishments', '💼', 5, 7),
('wisdom', 'Wisdom Collection', 'Lessons learned', '📖', 5, 8);

-- Family collection items
INSERT INTO collection_items (collection_id, item_key, item_name, completion_type, completion_criteria, display_order) VALUES
(1, 'mother', 'Mother''s Story', 'question', '{"chapter_id": "key-people", "question_id": "mother"}', 1),
(1, 'father', 'Father''s Story', 'question', '{"chapter_id": "key-people", "question_id": "father"}', 2),
(1, 'siblings', 'Brothers & Sisters', 'question', '{"chapter_id": "key-people", "question_id": "siblings"}', 3),
(1, 'grandparents', 'Grandparents', 'question', '{"chapter_id": "key-people", "question_id": "grandparents"}', 4),
(1, 'extended', 'Extended Family', 'question', '{"chapter_id": "key-people", "question_id": "extended-family"}', 5);

-- Places collection items
INSERT INTO collection_items (collection_id, item_key, item_name, completion_type, completion_criteria, display_order) VALUES
(2, 'childhood_home', 'Childhood Home', 'question', '{"chapter_id": "earliest-memories", "question_id": "childhood-home"}', 1),
(2, 'school', 'School', 'question', '{"chapter_id": "school-days", "question_id": "school-building"}', 2),
(2, 'first_flat', 'First Home Alone', 'question', '{"chapter_id": "young-adulthood", "question_id": "young-adult-living"}', 3),
(2, 'family_home', 'Family Home', 'question', '{"chapter_id": "family-career", "question_id": "family-home"}', 4),
(2, 'favourite_place', 'Favourite Travel Spot', 'question', '{"chapter_id": "passions-beliefs", "question_id": "travel"}', 5);

-- (Continue for other collections...)
```

---

## Part 5: API Endpoints

### 5.1 New Routes

```javascript
// routes/game.js

// Get user's game state and today's prompt
GET /api/game/state
Response: {
  streak: { current: 23, longest: 45, shieldsAvailable: 1 },
  todaysPrompt: { id, text, type, hint, personalization },
  stats: { totalMemories: 47, people: 23, places: 15 },
  recentAchievements: [...],
  familyActivity: [...]  // If in a Memory Circle
}

// Complete today's prompt
POST /api/game/prompt/:promptId/complete
Body: { answer: "...", voiceRecording: null }
Response: {
  success: true,
  newStreak: 24,
  celebration: { type: 'memory_saved', message: '...' },
  newAchievements: [...],
  followUpSuggestion: { text: '...', entityMentioned: 'Peter' }
}

// Skip today's prompt (preserves streak)
POST /api/game/prompt/:promptId/skip
Response: { success: true, streakPreserved: true }

// Get collections progress
GET /api/game/collections
Response: {
  collections: [
    { key: 'family', name: 'Family Portrait', progress: 4, total: 5, items: [...] },
    ...
  ]
}

// Get achievement history
GET /api/game/achievements
Response: {
  achievements: [...],
  availableAchievements: [...]  // What they can still earn
}

// Memory Circle endpoints
POST /api/game/circle/create
GET /api/game/circle
POST /api/game/circle/invite
POST /api/game/circle/join/:inviteCode
POST /api/game/circle/prompt  // Family member sends a prompt
POST /api/game/circle/encourage  // Send encouragement
GET /api/game/circle/activity  // Recent family activity

// Streak management
POST /api/game/streak/use-shield
GET /api/game/streak/history
```

### 5.2 Cron Jobs / Scheduled Tasks

```javascript
// Daily tasks (run at midnight user's timezone, or 00:00 UTC)

// 1. Generate daily prompts for all users
async function generateDailyPrompts() {
  // For each active user:
  // - Check their progress, memory graph, preferences
  // - Select appropriate prompt
  // - Insert into daily_prompts table
}

// 2. Process streak updates
async function processStreaks() {
  // For each user:
  // - If no activity yesterday and no shield used: reset streak
  // - If activity yesterday: increment streak
  // - Update longest_streak if needed
  // - Reset weekly shield count on Mondays
}

// 3. Send reminder notifications
async function sendReminders() {
  // Users who haven't answered today's prompt by 6pm:
  // - Send gentle push notification / email
  // "Your memory is waiting! Just 2 minutes to preserve today's story."
}

// 4. Weekly digest emails
async function sendWeeklyDigests() {
  // Every Sunday:
  // - Send summary of memories captured this week
  // - Streak status
  // - Family activity (if in circle)
  // - Teaser for next week's prompts
}
```

---

## Part 6: Daily Prompt Library

### 6.1 Prompt Categories & Examples

**QUICK MEMORIES** (1-2 minutes, low cognitive load)

```javascript
const quickPrompts = {
  sensory: [
    "What smell instantly takes you back to childhood?",
    "What song makes you think of being a teenager?",
    "What taste reminds you of your grandmother?",
    "What sound do you miss from your childhood home?",
    "What texture reminds you of comfort?",
  ],
  simple_facts: [
    "What was the first album or record you ever bought?",
    "What was your favourite TV show as a child?",
    "What was your first pet's name?",
    "What was the first film you saw at the cinema?",
    "What was your childhood phone number? (You might still remember!)",
  ],
  either_or: [
    "Beach holiday or countryside getaway? Why?",
    "Early bird or night owl? Has it changed?",
    "Tea or coffee? When did that start?",
    "Dogs or cats? Is there a story there?",
    "City life or country life? What do you prefer now?",
  ],
  fill_in_blank: [
    "The song that defined my teenage years was...",
    "My favourite hiding spot as a child was...",
    "The teacher I'll never forget is...",
    "The best meal I ever ate was...",
    "The place I felt most at home was...",
  ]
};
```

**STORY MEMORIES** (5-10 minutes)

```javascript
const storyPrompts = {
  micro_stories: [
    "Tell me about a meal you'll never forget.",
    "Describe a birthday that stands out in your memory.",
    "What's the funniest thing that happened at school?",
    "Tell me about getting lost somewhere.",
    "Describe a time you were really scared.",
    "What's a small act of kindness you've never forgotten?",
  ],
  people_snapshots: [
    "Describe your grandmother in three sentences.",
    "What did your father's hands look like?",
    "What did your mother say most often?",
    "Describe your best childhood friend.",
    "What made your favourite teacher special?",
  ],
  place_memories: [
    "Walk me through your childhood kitchen.",
    "Describe the view from your bedroom window as a child.",
    "What did your school playground look like?",
    "Describe the street you grew up on.",
    "What did your grandparents' house smell like?",
  ],
  moment_captures: [
    "Describe the moment you first held your child.",
    "Tell me about a perfect summer day.",
    "What's a moment of pure joy you remember?",
    "Describe falling in love for the first time.",
    "What moment made you feel truly proud?",
  ]
};
```

**DEEP REFLECTIONS** (10-15 minutes, weekends)

```javascript
const deepPrompts = {
  life_lessons: [
    "What do you know now that you wish you knew at 25?",
    "What's the best advice you ever received? Did you follow it?",
    "What mistake taught you the most?",
    "What would you tell your younger self about love?",
    "What have you learned about happiness?",
  ],
  relationships: [
    "Who shaped who you became? How?",
    "What did marriage teach you?",
    "How did becoming a parent change you?",
    "Who do you wish you'd thanked?",
    "What relationship surprised you most?",
  ],
  legacy: [
    "What do you want your grandchildren to know?",
    "How do you want to be remembered?",
    "What values did you try to pass on?",
    "What traditions do you hope continue?",
    "What's the most important thing you've learned about life?",
  ]
};
```

### 6.2 Personalization Triggers

```javascript
// Prompt personalization based on user context
function personalizePrompt(basePrompt, userContext) {
  const {
    birthYear,
    birthPlace,
    memoryGraph,
    answeredQuestions,
    currentSeason,
    specialDates  // birthdays, anniversaries
  } = userContext;

  // Era-specific personalization
  if (basePrompt.includes('[era]')) {
    const teenageYears = birthYear + 15;
    basePrompt = basePrompt.replace('[era]', teenageYears + 's');
  }

  // Person-specific callbacks
  if (memoryGraph.people.length > 0) {
    const mentionedPerson = memoryGraph.people[0];
    if (basePrompt.allowsCallback) {
      basePrompt = `You mentioned ${mentionedPerson.name}. ${basePrompt}`;
    }
  }

  // Location callbacks
  if (memoryGraph.places.length > 0) {
    const mentionedPlace = memoryGraph.places[0];
    // Reference in prompt if relevant
  }

  // Seasonal relevance
  if (currentSeason === 'winter' && basePrompt.category === 'traditions') {
    // Prioritize winter/Christmas prompts
  }

  return basePrompt;
}
```

---

## Part 7: Notifications & Engagement

### 7.1 Push Notification Schedule

```javascript
const notificationSchedule = {
  daily_reminder: {
    time: "18:00",  // 6pm local time
    condition: "!completedTodaysPrompt",
    message: [
      "Your memory is waiting! Just 2 minutes to preserve a story.",
      "One quick memory before bed? Your future family will thank you.",
      "Day {streak} — don't break the chain! Today's prompt is waiting."
    ]
  },

  streak_celebration: {
    condition: "streak % 7 === 0",
    message: [
      "🔥 {streak} days! You're building something beautiful.",
      "A week of memories! Your story is growing.",
      "{streak} days of captured memories. Remarkable!"
    ]
  },

  streak_at_risk: {
    time: "20:00",
    condition: "!completedTodaysPrompt && streak > 7",
    message: [
      "Your {streak}-day streak needs you! Quick 2-minute memory?",
      "Don't let Day {streak} slip away — one memory to keep going."
    ]
  },

  family_activity: {
    condition: "familyMemberActive",
    message: [
      "{name} just captured a memory! Send them some encouragement.",
      "{name} asked you a question: \"{promptPreview}...\""
    ]
  },

  milestone_achieved: {
    condition: "newAchievement",
    message: [
      "🎉 New milestone: {achievementName}!",
      "You've reached {count} memories. That's a whole chapter of your life!"
    ]
  },

  weekly_digest: {
    day: "Sunday",
    time: "10:00",
    message: "Your weekly memory roundup is ready — {count} new memories this week!"
  }
};
```

### 7.2 Email Templates

**Daily Reminder (if enabled)**

```
Subject: Your memory is waiting, {name}

Hi {name},

Today's memory prompt:

"{promptText}"

Just 2-3 minutes could preserve this memory forever.

[Answer Now →]

Your streak: 🔥 {streak} days
Memories captured: {totalMemories}

---
Easy Memoir — Preserving your story, one memory at a time.
```

**Weekly Digest**

```
Subject: Your Week in Memories — {weekRange}

Hi {name},

This week you captured {newMemoriesCount} memories.
Here's what you preserved:

📝 {memory1Preview}...
📝 {memory2Preview}...
📝 {memory3Preview}...

Your progress:
• Current streak: 🔥 {streak} days
• Total memories: {totalMemories}
• People mentioned: {peopleCount}
• Places described: {placesCount}

{familyActivitySection — if applicable}

Next week's prompts will explore: {nextWeekTheme}

[Continue Your Story →]

---
Easy Memoir — Your legacy, one memory at a time.
```

---

## Part 8: Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Core streak and daily prompt system

- [ ] Add database tables: `user_game_state`, `daily_prompts`, `streak_history`
- [ ] Create prompt library (50+ prompts across categories)
- [ ] Build daily prompt selection algorithm
- [ ] Create `/api/game/state` and `/api/game/prompt` endpoints
- [ ] Build new dashboard UI with daily prompt card
- [ ] Implement streak tracking logic
- [ ] Add "Memory Saved" celebration screen

**Deliverable:** Users can answer daily prompts and see streak count

### Phase 2: Progress & Rewards (Week 3-4)
**Goal:** Visible progress and milestone celebrations

- [ ] Add `achievements` table and achievement definitions
- [ ] Build collections system (tables + logic)
- [ ] Create Memory Map visualization component
- [ ] Create Collections view UI
- [ ] Implement milestone celebration animations
- [ ] Add achievement notification system
- [ ] Connect achievements to existing chapter completion

**Deliverable:** Users see collections, achievements, and memory map

### Phase 3: Engagement Loop (Week 5-6)
**Goal:** Keep users coming back

- [ ] Build notification system (push + email)
- [ ] Create daily/weekly digest emails
- [ ] Implement streak shields (forgiveness system)
- [ ] Add "Memory Triggers" based on Memory Graph
- [ ] Create personalized prompt generation using user context
- [ ] Build prompt skip/defer functionality

**Deliverable:** Automated engagement system running

### Phase 4: Family Features (Week 7-8)
**Goal:** Social/collaborative features

- [ ] Add `memory_circles`, `memory_circle_members` tables
- [ ] Build Memory Circle creation and invite flow
- [ ] Create family prompt system
- [ ] Add encouragement/heart reactions
- [ ] Build family activity feed
- [ ] Create family streak tracking

**Deliverable:** Families can collaborate on memoirs

### Phase 5: Polish & Optimize (Week 9-10)
**Goal:** Refine based on usage data

- [ ] A/B test prompt types and notification timing
- [ ] Optimize prompt selection algorithm based on completion rates
- [ ] Add analytics for engagement funnel
- [ ] Refine celebration animations
- [ ] Accessibility improvements for seniors
- [ ] Performance optimization

**Deliverable:** Production-ready game mode

---

## Part 9: Success Metrics

### Key Performance Indicators

| Metric | Current (Est.) | Target | Why It Matters |
|--------|----------------|--------|----------------|
| Daily Active Users (DAU) | ~5% of signups | 25%+ | Core engagement |
| Day 7 Retention | ~20% | 50%+ | Early habit formation |
| Day 30 Retention | ~5% | 25%+ | Sustained engagement |
| Memoir Completion Rate | ~2% | 15%+ | Ultimate goal |
| Average Streak Length | N/A | 14+ days | Habit strength |
| Memories per User | ~5 | 50+ | Content depth |

### Tracking Implementation

```javascript
// Analytics events to track
const gameAnalytics = {
  // Prompt engagement
  'prompt_shown': { promptId, promptType, dayInStreak },
  'prompt_started': { promptId, inputMethod },
  'prompt_completed': { promptId, timeToComplete, wordCount },
  'prompt_skipped': { promptId, reason },
  'prompt_abandoned': { promptId, timeSpent },

  // Streak events
  'streak_started': { },
  'streak_continued': { newLength },
  'streak_shield_used': { streakLength },
  'streak_lost': { previousLength, daysMissed },

  // Achievement events
  'achievement_earned': { achievementKey },
  'achievement_viewed': { achievementKey },
  'collection_progress': { collectionKey, newProgress },
  'collection_completed': { collectionKey },

  // Family events
  'circle_created': { },
  'circle_joined': { role },
  'family_prompt_sent': { },
  'family_prompt_answered': { },
  'encouragement_sent': { },

  // Conversion events
  'game_mode_enabled': { },
  'game_mode_disabled': { },
  'export_initiated_from_game': { }
};
```

---

## Part 10: Risk Mitigation

### Potential Issues & Solutions

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Seniors find it confusing | Medium | High | Extensive user testing with 65+ users; simplify relentlessly |
| Streaks feel punishing | Medium | High | Multiple shield opportunities; celebrate return, don't shame |
| Gamification feels shallow | Medium | Medium | Focus on meaningful progress (memories, not points) |
| Prompt fatigue | Low | Medium | Large prompt library; smart rotation; skip option |
| Family features underused | Medium | Low | Make solo experience complete; family is bonus |
| Notification fatigue | Medium | Medium | Careful timing; easy opt-out; preference controls |

### Senior-Specific Testing Checklist

- [ ] Text size sufficient (test with 65+ users)
- [ ] Contrast ratios pass WCAG AA
- [ ] Touch targets ≥44px
- [ ] Voice input works reliably
- [ ] Navigation is single-layer (no nested menus)
- [ ] Error messages are clear and helpful
- [ ] No time pressure or urgency language
- [ ] Progress feels warm, not competitive

---

## Summary

Memory Quest transforms Easy Memoir from an overwhelming project into a **delightful daily ritual**. By combining:

1. **Duolingo's habit mechanics** (streaks, celebrations, progress)
2. **Senior-appropriate design** (collaboration over competition, simplicity)
3. **Reminiscence psychology** (memory triggers, era-specific prompts)
4. **Family connection** (shared experience, encouragement)

...we create a system where completing a memoir becomes **inevitable** rather than **aspirational**.

The user starts each day with one simple question. Over months, those answers accumulate into a complete life story — without ever feeling like work.

**The goal isn't gamification for its own sake. It's making the deeply meaningful act of preserving memories feel easy, rewarding, and sustainable.**
