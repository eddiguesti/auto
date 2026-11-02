// API service connecting to existing Express backend
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getChapterById } from '../data/chapters'

const TOKEN_KEY = 'authToken'
let migrationDone = false

// Use the Mac's LAN address on a physical device; Android emulator uses 10.0.2.2.
const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? 'http://localhost:3001/api' : 'https://easymemoir.co.uk/api')
).replace(/\/$/, '')

export interface AudioUpload {
  audioUrl: string
  transcript: string
  duration?: number
}

export interface MemoryHistoryItem {
  id: number
  promptText: string
  answer: string
  createdAt: string
  audioUrl?: string
  collection?: string
}

class ApiService {
  private token: string | null = null

  get baseUrl() {
    return API_BASE_URL
  }

  async audioSource(uri: string): Promise<{ uri: string; headers?: Record<string, string> }> {
    const origin = new URL(API_BASE_URL).origin
    const resolved = uri.startsWith('/') ? `${origin}${uri}` : uri
    if (resolved.startsWith(`${origin}/api/`)) {
      const token = await this.getToken()
      return { uri: resolved, headers: token ? { Authorization: `Bearer ${token}` } : {} }
    }
    return { uri: resolved }
  }

  async setToken(token: string) {
    this.token = token
    await SecureStore.setItemAsync(TOKEN_KEY, token)
  }

  async getToken(): Promise<string | null> {
    if (!this.token) {
      this.token = await SecureStore.getItemAsync(TOKEN_KEY)

      // One-time migration: move token from AsyncStorage to SecureStore
      if (!this.token && !migrationDone) {
        migrationDone = true
        try {
          const legacyToken = await AsyncStorage.getItem(TOKEN_KEY)
          if (legacyToken) {
            await SecureStore.setItemAsync(TOKEN_KEY, legacyToken)
            await AsyncStorage.removeItem(TOKEN_KEY)
            this.token = legacyToken
          }
        } catch {
          // Migration failed — user will need to log in again
        }
      }
    }
    return this.token
  }

  async clearToken() {
    // Notify server of logout (for audit trail)
    if (this.token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}` }
        })
      } catch (err) {
        // Continue with client-side logout even if server call fails
        console.warn('Server logout notification failed:', err)
      }
    }
    this.token = null
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    // Clean up any legacy AsyncStorage token
    try {
      await AsyncStorage.removeItem(TOKEN_KEY)
    } catch {}
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || `API Error: ${response.status}`)
    }

    return data
  }

  // ============ Auth ============
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    await this.setToken(data.token)
    return data
  }

  async register(name: string, email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    })
    await this.setToken(data.token)
    return data
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me')
  }

  // ============ Game State ============
  async getGameState() {
    return this.request<{ success: boolean; data: any }>('/game/state')
  }

  // ============ Memoir Progress ============
  async getMemoirProgress() {
    return this.request<{
      success: boolean
      data: {
        overall: {
          totalQuestions: number
          answeredQuestions: number
          percentage: number
          chaptersComplete: number
          chaptersInProgress: number
          chaptersNotStarted: number
        }
        chapters: Array<{
          id: string
          title: string
          subtitle: string
          totalQuestions: number
          completedQuestions: number
          percentage: number
          status: 'complete' | 'in_progress' | 'not_started'
          answeredQuestionIds: string[]
        }>
        suggestedGaps: Array<{
          chapterId: string
          chapterTitle: string
          reason: string
        }>
        nextRecommendedChapter: string | null
      }
    }>('/game/memoir-progress')
  }

  async enableGameMode() {
    return this.request('/game/enable', { method: 'POST' })
  }

  async disableGameMode() {
    return this.request('/game/disable', { method: 'POST' })
  }

  // ============ Prompts ============
  async getTodayPrompt() {
    return this.request<{ success: boolean; data: any }>('/game/prompt/today')
  }

  async completePrompt(promptId: number, answer: string, audioUrl?: string) {
    return this.request<{ success: boolean; data: any }>(`/game/prompt/${promptId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ answer, audioUrl })
    })
  }

  async skipPrompt(promptId: number) {
    return this.request(`/game/prompt/${promptId}/skip`, { method: 'POST' })
  }

  async getPromptHistory(limit = 50) {
    return this.request<{ success: boolean; data: any }>(`/game/prompts/history?limit=${limit}`)
  }

  // ============ Collections ============
  async getCollections() {
    return this.request<{ success: boolean; data: any[] }>('/game/collections')
  }

  // ============ Achievements ============
  async getAchievements() {
    return this.request<{ success: boolean; data: any[] }>('/game/achievements')
  }

  // ============ Streak ============
  async useStreakShield() {
    return this.request('/game/streak/use-shield', { method: 'POST' })
  }

  // ============ Family Circle ============
  async getCircle() {
    return this.request<{ success: boolean; data: any }>('/game/circle')
  }

  async createCircle(name: string) {
    return this.request('/game/circle/create', {
      method: 'POST',
      body: JSON.stringify({ circleName: name })
    })
  }

  async joinCircle(code: string) {
    return this.request(`/game/circle/join/${code}`, { method: 'POST' })
  }

  // ============ Memories ============
  async getMemories(limit = 50) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('Memory history limit must be an integer between 1 and 100')
    if (!(await this.getToken())) throw new Error('Please sign in to view your memories')

    // This endpoint derives ownership from the bearer token. Never select an
    // owner in the URL or combine account history with public prompt records.
    const rows = await this.request<unknown>('/stories/all')
    if (!Array.isArray(rows)) throw new Error('Invalid memory history response')
    const memories: MemoryHistoryItem[] = []
    for (const row of rows) {
      if (
        !row ||
        !Number.isSafeInteger(row.id) ||
        row.id < 1 ||
        typeof row.chapter_id !== 'string' ||
        typeof row.question_id !== 'string' ||
        (row.answer != null && typeof row.answer !== 'string')
      )
        throw new Error('Invalid memory history response')
      if (!row.answer?.trim()) continue

      const timestamp = row.created_at || row.updated_at
      if (typeof timestamp !== 'string' || !timestamp.trim())
        throw new Error('Invalid memory history date')
      const created = new Date(timestamp)
      if (!Number.isFinite(created.getTime())) throw new Error('Invalid memory history date')
      const chapter = getChapterById(row.chapter_id)
      const question = chapter?.questions.find(item => item.id === row.question_id)
      memories.push({
        id: row.id,
        promptText: question?.question || chapter?.title || 'Your memory',
        answer: row.answer,
        createdAt: created.toISOString(),
        ...(chapter && { collection: chapter.title }),
        ...(typeof row.audio_url === 'string' && row.audio_url && { audioUrl: row.audio_url })
      })
    }
    memories.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id)
    return { success: true, data: memories.slice(0, limit) }
  }

  // ============ Voice (will add S3 upload) ============
  async uploadAudio(audioUri: string): Promise<AudioUpload> {
    const token = await this.getToken()

    const formData = new FormData()
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a'
    } as any)

    const response = await fetch(`${API_BASE_URL}/voice/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    const data = await response.json()
    if (!response.ok || data.success !== true || typeof data.data?.audioUrl !== 'string') {
      throw new Error(
        data.error || data.message || 'Your recording could not be uploaded. Please try again.'
      )
    }
    return data.data
  }

  // ============ Quick Memos ============
  async getMemos(limit = 50, offset = 0) {
    return this.request<{ success: boolean; data: Memo[] }>(
      `/memos?limit=${limit}&offset=${offset}`
    )
  }

  async getMemo(id: number) {
    return this.request<{ success: boolean; data: Memo }>(`/memos/${id}`)
  }

  async createMemo(data: {
    audio_url?: string
    transcript?: string
    title?: string
    duration?: number
  }) {
    return this.request<{ success: boolean; data: Memo }>('/memos', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateMemo(id: number, data: { title?: string }) {
    return this.request<{ success: boolean; data: Memo }>(`/memos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteMemo(id: number) {
    return this.request<{ success: boolean }>(`/memos/${id}`, {
      method: 'DELETE'
    })
  }

  // ============ Stories Progress ============
  async getStoriesProgress() {
    return this.request<{ progress: Record<string, number> }>('/stories/progress')
  }

  // ============ Free Stories ============
  async createFreeStory(content: string, title?: string) {
    return this.request<{ success: boolean; data: any }>('/free-stories', {
      method: 'POST',
      body: JSON.stringify({ content, title })
    })
  }

  // ============ Call Me ============
  async requestCall(phoneNumber: string) {
    return this.request<{ success: boolean; message: string }>('/telnyx/request-call', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    })
  }

  // ============ Stories (Chapter-based) ============
  async getChapterStories(chapterId: string) {
    return this.request<any[]>(`/stories/${chapterId}`)
  }

  async saveStory(data: {
    chapter_id: string
    question_id: string
    answer: string
    total_questions?: number
  }) {
    return this.request<{ success: boolean; id: number }>('/stories', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getAllStories() {
    return this.request<any[]>('/stories/all')
  }

  // ============ AI Assistant ============
  async aiInterview(data: {
    question: string
    prompt: string
    existingAnswer?: string
    gatheredContent?: Array<{ type: string; content: string }>
    lastResponse?: string
    history?: Array<{ role: string; content: string }>
    action: 'start' | 'continue'
  }) {
    return this.request<{ response: string; readyToWrite: boolean }>('/ai/interview', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async aiWriteStory(data: {
    question: string
    prompt: string
    existingAnswer?: string
    gatheredContent: Array<{ type: string; content: string }>
    conversationHistory: Array<{ role: string; content: string }>
  }) {
    return this.request<{ story: string }>('/ai/write-story', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}

// Types
export interface Memo {
  id: number
  title: string | null
  audio_url: string | null
  transcript: string | null
  duration: number | null
  created_at: string
  updated_at: string
}

export default new ApiService()
