/**
 * DashboardGamePanel — displays streak and achievement summary on the dashboard.
 * Fetches its own data via useGameState so Home.jsx doesn't need to own this state.
 */

import { useGameState } from '../queries/gameQueries'

export default function DashboardGamePanel() {
  const { data: gameState, isLoading } = useGameState()

  if (isLoading || !gameState) return null

  const { current_streak, total_memories, level } = gameState

  // Only render if the user has any game activity
  if (!total_memories) return null

  return (
    <div className="flex items-center justify-center gap-6 py-3 px-4 bg-amber-50/50 rounded-xl border border-amber-100/60 text-sm">
      {current_streak > 0 && (
        <div className="flex items-center gap-1.5 text-amber-700">
          <span className="text-base">🔥</span>
          <span className="font-medium">{current_streak}-day streak</span>
        </div>
      )}
      {total_memories > 0 && (
        <div className="flex items-center gap-1.5 text-sepia/70">
          <span className="text-base">✍️</span>
          <span>
            {total_memories} {total_memories === 1 ? 'memory' : 'memories'}
          </span>
        </div>
      )}
      {level && (
        <div className="flex items-center gap-1.5 text-sepia/70">
          <span className="text-base">⭐</span>
          <span>Level {level}</span>
        </div>
      )}
    </div>
  )
}
