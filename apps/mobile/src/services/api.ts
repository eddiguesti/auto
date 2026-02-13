// API service connecting to existing Express backend
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'authToken';
let migrationDone = false;

// Development: Use your local IP or ngrok
// Production: Your Railway URL
const API_BASE_URL = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://easymemoir.co.uk/api';

class ApiService {
  private token: string | null = null;

  get baseUrl() {
    return API_BASE_URL;
  }

  async setToken(token: string) {
    this.token = token;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  async getToken(): Promise<string | null> {
    if (!this.token) {
      this.token = await SecureStore.getItemAsync(TOKEN_KEY);

      // One-time migration: move token from AsyncStorage to SecureStore
      if (!this.token && !migrationDone) {
        migrationDone = true;
        try {
          const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
          if (legacyToken) {
            await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
            await AsyncStorage.removeItem(TOKEN_KEY);
            this.token = legacyToken;
          }
        } catch {
          // Migration failed — user will need to log in again
        }
      }
    }
    return this.token;
  }

  async clearToken() {
    // Notify server of logout (for audit trail)
    if (this.token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}` },
        });
      } catch (err) {
        // Continue with client-side logout even if server call fails
        console.warn('Server logout notification failed:', err);
      }
    }
    this.token = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    // Clean up any legacy AsyncStorage token
    try { await AsyncStorage.removeItem(TOKEN_KEY); } catch {}
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data;
  }

  // ============ Auth ============
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await this.setToken(data.token);
    return data;
  }

  async register(name: string, email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  // ============ Game State ============
  async getGameState() {
    return this.request<{ success: boolean; data: any }>('/game/state');
  }

  // ============ Memoir Progress ============
  async getMemoirProgress() {
    return this.request<{
      success: boolean;
      data: {
        overall: {
          totalQuestions: number;
          answeredQuestions: number;
          percentage: number;
          chaptersComplete: number;
          chaptersInProgress: number;
          chaptersNotStarted: number;
        };
        chapters: Array<{
          id: string;
          title: string;
          subtitle: string;
          totalQuestions: number;
          completedQuestions: number;
          percentage: number;
          status: 'complete' | 'in_progress' | 'not_started';
          answeredQuestionIds: string[];
        }>;
        suggestedGaps: Array<{
          chapterId: string;
          chapterTitle: string;
          reason: string;
        }>;
        nextRecommendedChapter: string | null;
      };
    }>('/game/memoir-progress');
  }

  async enableGameMode() {
    return this.request('/game/enable', { method: 'POST' });
  }

  async disableGameMode() {
    return this.request('/game/disable', { method: 'POST' });
  }

  // ============ Prompts ============
  async getTodayPrompt() {
    return this.request<{ success: boolean; data: any }>('/game/prompt/today');
  }

  async completePrompt(promptId: number, answer: string, audioUrl?: string) {
    return this.request<{ success: boolean; data: any }>(
      `/game/prompt/${promptId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ answer, audioUrl }),
      }
    );
  }

  async skipPrompt(promptId: number) {
    return this.request(`/game/prompt/${promptId}/skip`, { method: 'POST' });
  }

  async getPromptHistory(limit = 50) {
    return this.request<{ success: boolean; data: any }>(
      `/game/prompts/history?limit=${limit}`
    );
  }

  // ============ Collections ============
  async getCollections() {
    return this.request<{ success: boolean; data: any[] }>('/game/collections');
  }

  // ============ Achievements ============
  async getAchievements() {
    return this.request<{ success: boolean; data: any[] }>('/game/achievements');
  }

  // ============ Streak ============
  async useStreakShield() {
    return this.request('/game/streak/use-shield', { method: 'POST' });
  }

  // ============ Family Circle ============
  async getCircle() {
    return this.request<{ success: boolean; data: any }>('/game/circle');
  }

  async createCircle(name: string) {
    return this.request('/game/circle/create', {
      method: 'POST',
      body: JSON.stringify({ circleName: name }),
    });
  }

  async joinCircle(code: string) {
    return this.request(`/game/circle/join/${code}`, { method: 'POST' });
  }

  // ============ Memories ============
  async getMemories(limit = 50) {
    return this.request<{ success: boolean; data: any[] }>(
      `/game/memories?limit=${limit}`
    );
  }

  // ============ Voice (will add S3 upload) ============
  async uploadAudio(audioUri: string): Promise<{ success: boolean; data: { audioUrl: string; transcript?: string } }> {
    const token = await this.getToken();

    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await fetch(`${API_BASE_URL}/voice/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    return data.data;
  }

  // ============ Quick Memos ============
  async getMemos(limit = 50, offset = 0) {
    return this.request<{ success: boolean; data: Memo[] }>(
      `/memos?limit=${limit}&offset=${offset}`
    );
  }

  async getMemo(id: number) {
    return this.request<{ success: boolean; data: Memo }>(`/memos/${id}`);
  }

  async createMemo(data: { audio_url: string; transcript?: string; title?: string; duration?: number }) {
    return this.request<{ success: boolean; data: Memo }>('/memos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMemo(id: number, data: { title?: string }) {
    return this.request<{ success: boolean; data: Memo }>(`/memos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMemo(id: number) {
    return this.request<{ success: boolean }>(`/memos/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ Stories Progress ============
  async getStoriesProgress() {
    return this.request<{ progress: Record<string, number> }>('/stories/progress');
  }

  // ============ Free Stories ============
  async createFreeStory(content: string, title?: string) {
    return this.request<{ success: boolean; data: any }>('/free-stories', {
      method: 'POST',
      body: JSON.stringify({ content, title }),
    });
  }

  // ============ Call Me ============
  async requestCall(phoneNumber: string) {
    return this.request<{ success: boolean; message: string }>('/telnyx/request-call', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  // ============ Stories (Chapter-based) ============
  async getChapterStories(chapterId: string) {
    return this.request<any[]>(`/stories/${chapterId}`);
  }

  async saveStory(data: { chapter_id: string; question_id: string; answer: string; total_questions?: number }) {
    return this.request<{ success: boolean; id: number }>('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAllStories() {
    return this.request<any[]>('/stories/all');
  }

  // ============ AI Assistant ============
  async aiInterview(data: {
    question: string;
    prompt: string;
    existingAnswer?: string;
    gatheredContent?: Array<{ type: string; content: string }>;
    lastResponse?: string;
    history?: Array<{ role: string; content: string }>;
    action: 'start' | 'continue';
  }) {
    return this.request<{ response: string; readyToWrite: boolean }>(
      '/ai/interview',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async aiWriteStory(data: {
    question: string;
    prompt: string;
    existingAnswer?: string;
    gatheredContent: Array<{ type: string; content: string }>;
    conversationHistory: Array<{ role: string; content: string }>;
  }) {
    return this.request<{ story: string }>('/ai/write-story', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Types
export interface Memo {
  id: number;
  title: string | null;
  audio_url: string;
  transcript: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string;
}

export default new ApiService();
