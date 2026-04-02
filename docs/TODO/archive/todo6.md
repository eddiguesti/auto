# TODO 6: Backend Refactoring

**Priority:** MEDIUM - Do after todo5
**Agent type:** code-reviewer / backend
**Estimated time:** 2-3 days
**Score impact:** Architecture 6/10 -> 8/10
**Depends on:** todo2 (security), todo3 (test infrastructure)

## Context

Backend has 29 route files totaling 11,332 lines, with game.js alone at 2,100 lines.
SQL queries are mixed into route handlers. No migration system. Missing database indexes.
This phase introduces proper architecture without rewriting everything.

## Tasks

### 6.1 Split game.js into Modules

**File:** `services/api/routes/game.js` (2,100 lines)

**Problem:** Single file contains game state, achievements, daily challenges, streaks, leaderboards, collections, and Memory Quest logic.

**Action:**

1. Create `services/api/routes/game/` directory
2. Split into focused modules:
   - `services/api/routes/game/index.js` - router setup, mounts sub-routers (~50 lines)
   - `services/api/routes/game/state.js` - game state CRUD, initialization (~200 lines)
   - `services/api/routes/game/achievements.js` - achievement checking, unlocking (~300 lines)
   - `services/api/routes/game/challenges.js` - daily/weekly challenges (~300 lines)
   - `services/api/routes/game/streaks.js` - streak tracking, rewards (~200 lines)
   - `services/api/routes/game/leaderboard.js` - leaderboard queries (~150 lines)
   - `services/api/routes/game/collections.js` - memory collections (~200 lines)

3. Extract shared game logic to `services/api/services/gameService.js`:
   - `getOrCreateGameState()` (fix N+1 with UPSERT)
   - `calculateLevel()`
   - `checkAchievements()`
   - XP/reward calculation helpers

4. Update the mount in `index.js` to use the new `game/index.js`

**Verification:** All game endpoints work. No functionality changes, only file organization.

### 6.2 Introduce Repository Pattern for Core Entities

**Directory:** `services/api/repositories/`

**Problem:** SQL queries scattered across route files. Same queries duplicated. Cannot unit-test business logic without Express.

**Action:**

1. Create `services/api/repositories/storyRepository.js`:

```javascript
// Consolidate from routes/stories.js, routes/ai.js, routes/export.js
export const storyRepository = {
  async findByUserAndChapter(userId, chapterId) { ... },
  async findAllByUser(userId) { ... },
  async create(userId, data) { ... },
  async update(id, userId, data) { ... },
  async delete(id, userId) { ... },
  async getProgress(userId) { ... }
}
```

2. Create `services/api/repositories/userRepository.js`:

```javascript
// Consolidate from routes/auth.js, routes/user.js
export const userRepository = {
  async findById(id) { ... },
  async findByEmail(email) { ... },
  async create(data) { ... },
  async updateProfile(id, data) { ... },
  async delete(id) { ... },
  async setPremium(id, until) { ... }
}
```

3. Create `services/api/repositories/memoryRepository.js`:

```javascript
// Consolidate from routes/memory.js
export const memoryRepository = {
  async getEntities(userId) { ... },
  async getEntityById(userId, entityId) { ... },
  async createEntity(userId, data) { ... },
  async getRelationships(userId, entityId) { ... },
  async addRelationship(userId, data) { ... }
}
```

4. Update route files to use repositories instead of direct `pool.query()`
5. `storyRepository.js` already exists in utils/ - merge and relocate

**Verification:** All API endpoints return same responses. Routes are shorter and more readable.

### 6.3 Implement Migration System

**Current:** `services/api/db/index.js` uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS`.

**Action:**

1. Install node-pg-migrate:

```bash
npm install node-pg-migrate
```

2. Create baseline migration from current schema:
   - `services/api/db/migrations/001_baseline.js` - contains all current CREATE TABLE statements

3. Configure migration in package.json:

```json
"migrate": "node-pg-migrate",
"migrate:up": "node-pg-migrate up",
"migrate:down": "node-pg-migrate down",
"migrate:create": "node-pg-migrate create"
```

4. Create migration config (`services/api/db/migrate-config.js`):

```javascript
export default {
  databaseUrl: process.env.DATABASE_URL,
  migrationsTable: 'pgmigrations',
  dir: 'services/api/db/migrations',
  direction: 'up'
}
```

5. Modify `initDatabase()` to run migrations instead of raw DDL
6. Create migration for the `lulu_orders` table (from todo2)

**Verification:** `npm run migrate:up` applies all migrations. `npm run migrate:down` rolls back safely.

### 6.4 Add Missing Database Indexes

**File:** `services/api/db/migrations/002_add_indexes.js`

**Action:** Create migration adding:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followups_story_id ON followups(story_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_user_story ON photos(story_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_relationships_entities
  ON memory_relationships(entity1_id, entity2_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date);
```

**Verification:** `EXPLAIN ANALYZE` on key queries shows index usage.

### 6.5 Add LIMIT to Unbounded Queries

**Files:**

- `services/api/routes/memory.js` - entity listing
- `services/api/routes/notifications.js` - notification history

**Action:**

1. Add `LIMIT 500` to memory entity queries (or add pagination)
2. Cap notifications `limit` param: `Math.min(Math.max(parseInt(limit) || 20, 1), 100)`
3. Review all other `SELECT` queries without LIMIT and add sensible defaults

**Verification:** Large datasets don't cause slow responses or OOM.

### 6.6 Extract Cron Jobs to Separate Worker

**Files:** `services/api/cron/`

**Problem:** Cron jobs run in the same process as the API server. A cron OOM kills the API.

**Action:**

1. Create `services/worker/index.js`:

```javascript
import dotenv from 'dotenv'
import { initDatabase } from '../api/db/index.js'
import { startCronJobs } from '../api/cron/index.js'

dotenv.config({ path: '../../.env' })

async function main() {
  await initDatabase()
  startCronJobs()
  console.log('Worker started - cron jobs active')
}

main().catch(console.error)
```

2. Add to package.json:

```json
"worker": "node services/worker/index.js",
"dev:worker": "node --watch services/worker/index.js"
```

3. Remove cron initialization from `services/api/index.js`
4. Update Railway/Render config to run worker as separate service (or same dyno with PM2)

**Verification:** API server starts without cron jobs. Worker runs cron jobs independently.

### 6.7 Fix N+1 Query in Game State

**File:** `services/api/routes/game.js` (or new `game/state.js`)

**Action:** Replace SELECT-then-INSERT with UPSERT:

```javascript
async function getOrCreateGameState(userId) {
  const result = await pool.query(
    `
    INSERT INTO user_game_state (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING *
  `,
    [userId]
  )
  return result.rows[0]
}
```

**Verification:** Game state endpoint makes 1 query instead of 2.

## Definition of Done

- [ ] game.js split into 7 focused modules, each under 400 lines
- [ ] storyRepository, userRepository, memoryRepository created
- [ ] Routes use repositories instead of direct SQL
- [ ] Migration system installed and baseline migration created
- [ ] Missing indexes added via migration
- [ ] Unbounded queries have LIMIT
- [ ] Cron jobs extractable to separate worker
- [ ] N+1 query fixed with UPSERT
- [ ] All existing tests pass
- [ ] API responses unchanged (no breaking changes)
