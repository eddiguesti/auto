# TODO-09: Offline Support

## Objective

Allow users to record memories offline and sync when back online.

## Duration: 2 weeks

## Dependencies

- TODO-08 (Push Notifications)

---

## Tasks

### Task 9.1: Create Offline Storage

**Create:** `src/services/offlineStorage.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import RNFS from 'react-native-fs'

const KEYS = {
  PENDING_MEMORIES: 'offline_pending_memories',
  CACHED_PROMPT: 'offline_cached_prompt',
  USER_STATE: 'offline_user_state'
}

interface PendingMemory {
  id: string
  promptId: number
  promptText: string
  transcript: string
  audioLocalPath: string
  createdAt: string
  synced: boolean
}

export async function savePendingMemory(memory: Omit<PendingMemory, 'id' | 'synced'>) {
  const existing = await getPendingMemories()
  const newMemory: PendingMemory = {
    ...memory,
    id: `offline_${Date.now()}`,
    synced: false
  }
  existing.push(newMemory)
  await AsyncStorage.setItem(KEYS.PENDING_MEMORIES, JSON.stringify(existing))
  return newMemory
}

export async function getPendingMemories(): Promise<PendingMemory[]> {
  const data = await AsyncStorage.getItem(KEYS.PENDING_MEMORIES)
  return data ? JSON.parse(data) : []
}

export async function markMemorySynced(id: string) {
  const memories = await getPendingMemories()
  const updated = memories.map(m => (m.id === id ? { ...m, synced: true } : m))
  await AsyncStorage.setItem(KEYS.PENDING_MEMORIES, JSON.stringify(updated))
}

export async function clearSyncedMemories() {
  const memories = await getPendingMemories()
  const pending = memories.filter(m => !m.synced)
  await AsyncStorage.setItem(KEYS.PENDING_MEMORIES, JSON.stringify(pending))

  // Delete synced audio files
  for (const m of memories.filter(m => m.synced)) {
    try {
      await RNFS.unlink(m.audioLocalPath)
    } catch (e) {
      // File may already be deleted
    }
  }
}

export async function cacheCurrentPrompt(prompt: any) {
  await AsyncStorage.setItem(
    KEYS.CACHED_PROMPT,
    JSON.stringify({
      ...prompt,
      cachedAt: new Date().toISOString()
    })
  )
}

export async function getCachedPrompt() {
  const data = await AsyncStorage.getItem(KEYS.CACHED_PROMPT)
  return data ? JSON.parse(data) : null
}

export async function cacheUserState(state: any) {
  await AsyncStorage.setItem(KEYS.USER_STATE, JSON.stringify(state))
}

export async function getCachedUserState() {
  const data = await AsyncStorage.getItem(KEYS.USER_STATE)
  return data ? JSON.parse(data) : null
}
```

- [ ] Create offline storage service
- [ ] Store pending memories locally
- [ ] Cache current prompt

---

### Task 9.2: Create Network Status Hook

**Create:** `src/hooks/useNetworkStatus.ts`

```typescript
import { useState, useEffect } from 'react'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const [isInternetReachable, setIsInternetReachable] = useState(true)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true)
      setIsInternetReachable(state.isInternetReachable ?? true)
    })

    return () => unsubscribe()
  }, [])

  return {
    isConnected,
    isInternetReachable,
    isOffline: !isConnected || !isInternetReachable
  }
}
```

- [ ] Install @react-native-community/netinfo
- [ ] Create network status hook

---

### Task 9.3: Create Sync Service

**Create:** `src/services/syncService.ts`

```typescript
import api from './api'
import { getPendingMemories, markMemorySynced, clearSyncedMemories } from './offlineStorage'

class SyncService {
  private isSyncing = false

  async syncPendingMemories(): Promise<number> {
    if (this.isSyncing) return 0

    this.isSyncing = true
    let syncedCount = 0

    try {
      const pending = await getPendingMemories()
      const unsynced = pending.filter(m => !m.synced)

      for (const memory of unsynced) {
        try {
          // Upload audio first
          const audioUrl = await this.uploadLocalAudio(memory.audioLocalPath)

          // Complete prompt
          await api.completePrompt(memory.promptId, memory.transcript, audioUrl)

          await markMemorySynced(memory.id)
          syncedCount++
        } catch (error) {
          console.error(`Failed to sync memory ${memory.id}:`, error)
          // Continue with next memory
        }
      }

      // Clean up synced memories
      await clearSyncedMemories()

      return syncedCount
    } finally {
      this.isSyncing = false
    }
  }

  private async uploadLocalAudio(localPath: string): Promise<string> {
    const formData = new FormData()
    formData.append('audio', {
      uri: localPath,
      type: 'audio/m4a',
      name: 'recording.m4a'
    } as any)

    const response = await fetch(`${api.baseUrl}/voice/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await api.getToken()}`
      },
      body: formData
    })

    const data = await response.json()
    return data.data.audioUrl
  }
}

export default new SyncService()
```

- [ ] Create sync service
- [ ] Upload local audio files
- [ ] Handle sync errors gracefully

---

### Task 9.4: Update Voice Recording for Offline

```typescript
// In VoicePromptScreen.tsx

import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { savePendingMemory, cacheCurrentPrompt } from '../services/offlineStorage'
import syncService from '../services/syncService'

export default function VoicePromptScreen() {
  const { isOffline } = useNetworkStatus()

  // When saving...
  const handleSave = async () => {
    if (isOffline) {
      // Save locally
      await savePendingMemory({
        promptId: prompt.id,
        promptText: prompt.text,
        transcript: transcription.transcript,
        audioLocalPath: recorder.audioPath,
        createdAt: new Date().toISOString()
      })

      // Show offline confirmation
      navigation.navigate('OfflineConfirmation')
    } else {
      // Normal online flow
      // ...
    }
  }
}
```

- [ ] Detect offline state
- [ ] Save memory locally when offline
- [ ] Show offline confirmation

---

### Task 9.5: Create Offline Indicator Component

**Create:** `src/components/common/OfflineIndicator.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { colors } from '../../utils/theme';

export default function OfflineIndicator() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>📴 You're offline</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.amber,
    padding: 8,
    alignItems: 'center',
  },
  text: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
```

- [ ] Create offline indicator
- [ ] Show at top of screen when offline

---

### Task 9.6: Auto-Sync on Reconnect

```typescript
// In App.tsx or a top-level component

import { useEffect } from 'react'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import syncService from './services/syncService'

function SyncManager() {
  const { isOffline } = useNetworkStatus()
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (wasOffline && !isOffline) {
      // Just came back online
      syncService.syncPendingMemories().then(count => {
        if (count > 0) {
          // Show toast: "Synced X memories"
        }
      })
    }
    setWasOffline(isOffline)
  }, [isOffline])

  return null
}
```

- [ ] Detect reconnection
- [ ] Auto-sync pending memories
- [ ] Show sync toast

---

## Verification Checklist

- [ ] Can record memory while offline
- [ ] Memory saved locally with audio
- [ ] Offline indicator shows when disconnected
- [ ] Auto-sync triggers on reconnect
- [ ] Synced memories appear in history
- [ ] Local audio files cleaned up after sync

---

## Next Step

When complete, proceed to **TODO-10-PREMIUM.md**
