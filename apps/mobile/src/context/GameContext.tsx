import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import api from '../services/api';

interface ChapterProgress {
  id: string;
  title: string;
  subtitle: string;
  totalQuestions: number;
  completedQuestions: number;
  percentage: number;
  status: 'complete' | 'in_progress' | 'not_started';
}

interface MemoirProgress {
  overall: {
    totalQuestions: number;
    answeredQuestions: number;
    percentage: number;
    chaptersComplete: number;
    chaptersInProgress: number;
    chaptersNotStarted: number;
  };
  chapters: ChapterProgress[];
  suggestedGaps: Array<{
    chapterId: string;
    chapterTitle: string;
    reason: string;
  }>;
  nextRecommendedChapter: string | null;
}

interface GameState {
  isGameModeEnabled: boolean;
  currentStreak: number;
  longestStreak: number;
  totalMemories: number;
  totalXp: number;
  currentLevel: number;
  streakShieldsAvailable: number;
  dailyPromptCompleted: boolean;
  isLoading: boolean;
  // Memoir progress tracking
  memoirProgress: MemoirProgress | null;
}

interface GameContextType extends GameState {
  refreshGameState: () => Promise<void>;
  refreshMemoirProgress: () => Promise<void>;
  enableGameMode: () => Promise<void>;
  disableGameMode: () => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

const initialState: GameState = {
  isGameModeEnabled: true, // Default to game mode for this app
  currentStreak: 0,
  longestStreak: 0,
  totalMemories: 0,
  totalXp: 0,
  currentLevel: 1,
  streakShieldsAvailable: 0,
  dailyPromptCompleted: false,
  isLoading: true,
  memoirProgress: null,
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);

  const refreshMemoirProgress = useCallback(async () => {
    try {
      const response = await api.getMemoirProgress();
      setState(s => ({
        ...s,
        memoirProgress: response.data,
      }));
    } catch (error) {
      console.error('Failed to fetch memoir progress:', error);
    }
  }, []);

  const refreshGameState = useCallback(async () => {
    try {
      const response = await api.getGameState();
      const data = response.data;

      setState(s => ({
        ...s,
        isGameModeEnabled: data.gameModeEnabled ?? true,
        currentStreak: data.currentStreak ?? 0,
        longestStreak: data.longestStreak ?? 0,
        totalMemories: data.totalMemories ?? 0,
        totalXp: data.totalXp ?? 0,
        currentLevel: data.currentLevel ?? 1,
        streakShieldsAvailable: data.streakShieldsAvailable ?? 0,
        dailyPromptCompleted: data.dailyPromptCompletedToday ?? false,
        isLoading: false,
      }));

      // Also fetch memoir progress when refreshing game state
      refreshMemoirProgress();
    } catch (error) {
      console.error('Failed to fetch game state:', error);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [refreshMemoirProgress]);

  const enableGameMode = useCallback(async () => {
    await api.enableGameMode();
    await refreshGameState();
  }, [refreshGameState]);

  const disableGameMode = useCallback(async () => {
    await api.disableGameMode();
    await refreshGameState();
  }, [refreshGameState]);

  return (
    <GameContext.Provider
      value={{
        ...state,
        refreshGameState,
        refreshMemoirProgress,
        enableGameMode,
        disableGameMode,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
