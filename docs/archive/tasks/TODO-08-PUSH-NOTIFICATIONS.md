# TODO-08: Push Notifications

## Objective

Implement push notifications for daily reminders and streak warnings.

## Duration: 1-2 weeks

## Dependencies

- TODO-07 (Gamification)

---

## Tasks

### Task 8.1: Setup Firebase Cloud Messaging

```bash
# Install Firebase
npm install @react-native-firebase/app @react-native-firebase/messaging
cd ios && pod install && cd ..
```

**iOS Setup:**

- Add GoogleService-Info.plist to iOS project
- Enable Push Notifications capability in Xcode
- Enable Background Modes > Remote notifications

**Android Setup:**

- Add google-services.json to android/app
- Add Firebase SDK to android/build.gradle

- [ ] Install Firebase packages
- [ ] Configure iOS
- [ ] Configure Android

---

### Task 8.2: Create Notification Service

**Create:** `src/services/notifications.ts`

```typescript
import messaging from '@react-native-firebase/messaging'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from './api'

class NotificationService {
  async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission()
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL

    if (enabled) {
      await this.registerDevice()
    }

    return enabled
  }

  async registerDevice(): Promise<void> {
    try {
      const token = await messaging().getToken()
      await api.registerDevice(token, Platform.OS)
      await AsyncStorage.setItem('pushToken', token)
    } catch (error) {
      console.error('Failed to register device:', error)
    }
  }

  setupListeners(): void {
    // Foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground message:', remoteMessage)
      // Show in-app notification
    })

    // Background/quit message opens app
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened app:', remoteMessage)
      // Navigate to relevant screen
    })

    // Token refresh
    messaging().onTokenRefresh(token => {
      api.registerDevice(token, Platform.OS)
    })
  }
}

export default new NotificationService()
```

- [ ] Create notification service
- [ ] Request permission on app start
- [ ] Register device token with backend

---

### Task 8.3: Backend Push Service

**Create:** `/life-story/server/services/pushNotifications.js`

```javascript
import admin from 'firebase-admin'
import pool from '../db/index.js'

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
})

export async function sendPushNotification(userId, notification) {
  const devices = await pool.query(
    `SELECT device_token, platform FROM user_devices WHERE user_id = $1`,
    [userId]
  )

  for (const device of devices.rows) {
    try {
      await admin.messaging().send({
        token: device.device_token,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'memory-quest'
          }
        }
      })
    } catch (error) {
      console.error(`Push failed for device ${device.device_token}:`, error)
      // Remove invalid tokens
      if (error.code === 'messaging/invalid-registration-token') {
        await pool.query(`DELETE FROM user_devices WHERE device_token = $1`, [device.device_token])
      }
    }
  }
}

export async function sendDailyReminder(userId) {
  await sendPushNotification(userId, {
    title: 'Your daily memory awaits! 📝',
    body: "Take 5 minutes to capture today's memory",
    data: { screen: 'VoicePrompt' }
  })
}

export async function sendStreakWarning(userId, streakDays) {
  await sendPushNotification(userId, {
    title: `Don't lose your ${streakDays} day streak! 🔥`,
    body: "You still have time to answer today's prompt",
    data: { screen: 'VoicePrompt' }
  })
}
```

- [ ] Setup Firebase Admin
- [ ] Create push notification functions
- [ ] Handle invalid tokens

---

### Task 8.4: Device Registration Endpoint

```javascript
// In routes/notifications.js or routes/game.js

router.post(
  '/device/register',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { deviceToken, platform } = req.body

    // Upsert device token
    await pool.query(
      `INSERT INTO user_devices (user_id, device_token, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (device_token) DO UPDATE
     SET user_id = $1, platform = $3, updated_at = NOW()`,
      [userId, deviceToken, platform]
    )

    res.json({ success: true })
  })
)
```

- [ ] Create device registration endpoint
- [ ] Handle token updates

---

### Task 8.5: Schedule Notifications in Cron

Update daily cron to send push notifications:

```javascript
// In cron/dailyTasks.js

import { sendDailyReminder, sendStreakWarning } from '../services/pushNotifications.js'

export async function runEveningReminders() {
  const users = await pool.query(`
    SELECT ugs.user_id, ugs.current_streak
    FROM user_game_state ugs
    JOIN user_devices ud ON ugs.user_id = ud.user_id
    WHERE ugs.game_mode_enabled = true
      AND ugs.daily_prompt_completed_today = false
      AND ugs.notification_preferences->>'daily_reminder' != 'false'
  `)

  for (const user of users.rows) {
    await sendDailyReminder(user.user_id)
  }
}

export async function runStreakCheck() {
  const atRisk = await pool.query(`
    SELECT ugs.user_id, ugs.current_streak
    FROM user_game_state ugs
    JOIN user_devices ud ON ugs.user_id = ud.user_id
    WHERE ugs.game_mode_enabled = true
      AND ugs.current_streak >= 3
      AND ugs.daily_prompt_completed_today = false
  `)

  for (const user of atRisk.rows) {
    await sendStreakWarning(user.user_id, user.current_streak)
  }
}
```

- [ ] Send daily reminders via push
- [ ] Send streak warnings via push

---

### Task 8.6: Notification Settings UI

**Create:** `src/screens/NotificationSettingsScreen.tsx`

```typescript
// Allow users to configure notification preferences
// - Daily reminder time
// - Streak warnings on/off
// - Family activity notifications
```

- [ ] Create settings screen
- [ ] Save preferences to backend
- [ ] Respect user preferences in push logic

---

## Verification Checklist

- [ ] Push permission requested on first launch
- [ ] Device token registered with backend
- [ ] Daily reminder push received
- [ ] Streak warning push received
- [ ] Tapping notification opens correct screen
- [ ] Settings allow disabling notifications

---

## Next Step

When complete, proceed to **TODO-09-OFFLINE.md**
