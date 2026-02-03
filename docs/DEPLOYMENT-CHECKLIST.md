# Memory Quest Deployment Checklist

## Pre-Deployment

### Code Quality
- [ ] No unnecessary console.log statements in production code
- [ ] Error handling in place for all API endpoints
- [ ] No hardcoded secrets in code

### Environment Variables
Required variables for Railway dashboard:
- `DATABASE_URL` - PostgreSQL connection string (already set)
- `JWT_SECRET` - Already set
- `RESEND_API_KEY` or `SENDGRID_API_KEY` - For email notifications (optional)

### Database
- [ ] Backup production database before migration
- [ ] Test migration locally first

---

## Deployment Steps

### 1. Database Migration
The new tables will be created automatically when the server starts via `initDatabase()`.

Tables created:
- `user_game_state` - User game progress and settings
- `daily_prompts` - Daily prompt assignments
- `daily_prompt_library` - Prompt library (seeded with 108 prompts)
- `achievements` - User achievements
- `streak_history` - Streak tracking
- `prompt_collections` - Collection definitions (seeded with 8 collections)
- `family_circles` - Family circle groups
- `family_circle_members` - Circle membership
- `family_prompts` - Family-sent prompts
- `family_encouragements` - Encouragement messages
- `notification_queue` - Email notification queue

### 2. Deploy Backend
```bash
git add .
git commit -m "Add Memory Quest gamification feature"
git push origin main
```

Railway will auto-deploy from GitHub.

### 3. Verify Deployment
```bash
# Check health
curl https://your-app.up.railway.app/api/health

# Check logs in Railway dashboard for:
# - "Database initialized successfully"
# - "Collections seeded successfully"
# - "Prompts seeded: 108 prompts"
# - "Cron jobs initialized"
```

### 4. Verify Cron Jobs
Check server logs for:
```
Cron jobs initialized:
  - Midnight UTC: Daily reset
  - 6pm UK: Evening reminders
  - 11pm UK: Streak check
  - Monday 6am UK: Weekly tasks
```

---

## Post-Deployment Smoke Test

### Authentication
- [ ] Can login
- [ ] Google OAuth works

### Memory Quest Flow
- [ ] Mode switch visible on dashboard
- [ ] Can enable Memory Quest
- [ ] Today's prompt displays
- [ ] Can complete prompt
- [ ] Celebration shows with streak
- [ ] Dashboard updates correctly

### Classic Mode
- [ ] Can switch back to Classic
- [ ] Chapter grid displays
- [ ] Answers save correctly

---

## Monitoring (First 24 Hours)

### Error Monitoring
- [ ] Check Railway logs for errors
- [ ] Check for 5xx responses
- [ ] Monitor database connections

### Performance
- [ ] Response times acceptable
- [ ] No memory leaks
- [ ] Database queries performant

### Railway Metrics
- [ ] CPU/Memory usage normal
- [ ] No resource limits being hit

---

## Rollback Plan

### Quick Fix - Rollback Deployment
1. Go to Railway dashboard
2. Navigate to Deployments
3. Click on previous successful deployment
4. Click "Redeploy"

### Database Rollback (if needed)
```sql
-- Only use if absolutely necessary
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS family_encouragements CASCADE;
DROP TABLE IF EXISTS family_prompts CASCADE;
DROP TABLE IF EXISTS family_circle_members CASCADE;
DROP TABLE IF EXISTS family_circles CASCADE;
DROP TABLE IF EXISTS streak_history CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS daily_prompts CASCADE;
DROP TABLE IF EXISTS daily_prompt_library CASCADE;
DROP TABLE IF EXISTS prompt_collections CASCADE;
DROP TABLE IF EXISTS user_game_state CASCADE;
```

---

## Sign-Off

| Step | Completed By | Date | Notes |
|------|--------------|------|-------|
| Pre-deployment checks | | | |
| Database backup | | | |
| Code deployed | | | |
| Smoke tests passed | | | |
| Monitoring confirmed | | | |

**Deployment approved by:** _______________

**Date:** _______________
