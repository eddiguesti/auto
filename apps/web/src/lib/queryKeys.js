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
    chapter: chapterId => ['stories', 'chapter', chapterId],
    byId: storyId => ['stories', storyId]
  },
  game: {
    state: ['game', 'state'],
    achievements: ['game', 'achievements']
  },
  user: {
    profile: userId => ['user', userId],
    onboarding: userId => ['user', userId, 'onboarding']
  },
  payments: {
    status: ['payments', 'status'],
    history: ['payments', 'history']
  },
  dashboard: {
    progress: userId => ['dashboard', userId, 'progress']
  }
}
