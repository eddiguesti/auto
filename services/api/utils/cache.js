/**
 * Simple in-memory cache with TTL support
 * For hot data that's frequently accessed but rarely changes
 */

class MemoryCache {
  constructor() {
    this.cache = new Map()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Get a cached value
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined if not found/expired
   */
  get(key) {
    const item = this.cache.get(key)
    if (!item) {
      this.stats.misses++
      return undefined
    }

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      return undefined
    }

    this.stats.hits++
    return item.value
  }

  /**
   * Set a cached value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 5 minutes)
   */
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
      createdAt: Date.now()
    })
  }

  /**
   * Delete a cached value
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key)
  }

  /**
   * Delete all cached values matching a pattern
   * @param {string} pattern - Key prefix to match
   */
  deletePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cached values
   */
  clear() {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
      : 0
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch data if not cached
   * @param {number} ttlSeconds - TTL in seconds
   */
  async getOrSet(key, fetchFn, ttlSeconds = 300) {
    const cached = this.get(key)
    if (cached !== undefined) {
      return cached
    }

    const value = await fetchFn()
    this.set(key, value, ttlSeconds)
    return value
  }
}

// Singleton instance
const cache = new MemoryCache()

// Cache key builders for consistency
export const cacheKeys = {
  userGameState: (userId) => `game:state:${userId}`,
  userCollections: (userId) => `collections:${userId}`,
  userMemoryContext: (userId) => `memory:context:${userId}`,
  userProgress: (userId) => `progress:${userId}`,
  chapters: () => 'static:chapters',
  prompts: () => 'static:prompts'
}

// Invalidate user-related cache when data changes
export function invalidateUserCache(userId) {
  cache.deletePattern(`game:state:${userId}`)
  cache.deletePattern(`collections:${userId}`)
  cache.deletePattern(`memory:context:${userId}`)
  cache.deletePattern(`progress:${userId}`)
}

export default cache
