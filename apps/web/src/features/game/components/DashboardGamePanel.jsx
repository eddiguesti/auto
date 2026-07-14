/**
 * DashboardGamePanel — displays streak and achievement summary on the dashboard.
 * Fetches its own data via useGameState so Home.jsx doesn't need to own this state.
 */

import { IconFlame, IconPencil, IconStar } from '@tabler/icons-react'
import { useGameState } from '../queries/gameQueries'

export default function DashboardGamePanel() {
  const { data: gameState, isLoading } = useGameState()

  if (isLoading || !gameState) return null

  const { current_streak, total_memories, level } = gameState

  // Only render if the user has any game activity
  if (!total_memories) return null

  return (
    <div className="flex items-center justify-center gap-6 py-3 px-4 bg-bronze-50 rounded-xl border border-bronze-200/60 text-sm">
      {current_streak > 0 && (
        <div className="flex items-center gap-1.5 text-bronze-700">
          <IconFlame size={18} stroke={1.75} />
          <span className="font-medium">{current_streak}-day streak</span>
        </div>
      )}
      {total_memories > 0 && (
        <div className="flex items-center gap-1.5 text-sepia-600">
          <IconPencil size={16} stroke={1.75} />
          <span>
            {total_memories} {total_memories === 1 ? 'memory' : 'memories'}
          </span>
        </div>
      )}
      {level && (
        <div className="flex items-center gap-1.5 text-sepia-600">
          <IconStar size={16} stroke={1.75} />
          <span>Level {level}</span>
        </div>
      )}
    </div>
  )
}
