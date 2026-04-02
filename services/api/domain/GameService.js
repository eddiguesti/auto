/**
 * GameService — domain facade for gamification operations.
 * Thin re-export of the underlying service so domain consumers
 * import from a consistent domain/ path.
 */

export {
  getOrCreateGameState,
  checkAndAwardAchievements,
  awardAchievement,
  updateCollectionProgress
} from '../services/gameService.js'
