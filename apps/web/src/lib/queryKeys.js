/**
 * Query key factory — centralizes all React Query cache keys so they're
 * consistent across queries, mutations, and cache invalidations.
 *
 * Conventions:
 *  - Top-level key matches the domain/resource name (plural)
 *  - Sub-keys narrow the scope: chapter, single item, etc.
 *  - Functions accept identifiers to keep keys parameterized
 */
export const queryKeys = {
  stories: {
    all: ['stories'],
    chapter: (chapterId, userId) => ['stories', userId, 'chapter', chapterId],
    byId: storyId => ['stories', storyId]
  },
  game: {
    state: userId => ['game', userId, 'state'],
    achievements: userId => ['game', userId, 'achievements']
  },
  user: {
    profile: userId => ['user', userId],
    onboarding: userId => ['user', userId, 'onboarding']
  },
  payments: {
    status: userId => ['payments', userId, 'status'],
    history: userId => ['payments', userId, 'history']
  },
  dashboard: {
    progress: userId => ['dashboard', userId, 'progress']
  }
}
