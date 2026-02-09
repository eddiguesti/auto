/**
 * Redis client with graceful fallback to in-memory cache.
 * If REDIS_URL is not set, everything works the same — just uses memory.
 * When you're ready, sign up at https://upstash.com (free tier) and add REDIS_URL to .env.
 */

import Redis from 'ioredis'

let redis = null
let isConnected = false

const REDIS_URL = process.env.REDIS_URL

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null // stop retrying after 5 attempts
      return Math.min(times * 200, 2000)
    },
    lazyConnect: true
  })

  redis.on('connect', () => {
    isConnected = true
    console.log('Redis connected')
  })

  redis.on('error', err => {
    if (isConnected) {
      console.error('Redis connection lost:', err.message)
    }
    isConnected = false
  })

  redis.on('close', () => {
    isConnected = false
  })

  // Connect without blocking server startup
  redis.connect().catch(err => {
    console.warn('Redis unavailable, falling back to in-memory cache:', err.message)
    isConnected = false
  })
}

/**
 * Get a value from Redis (falls back to null if Redis is unavailable)
 */
export async function redisGet(key) {
  if (!redis || !isConnected) return null
  try {
    const val = await redis.get(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

/**
 * Set a value in Redis with TTL in seconds
 */
export async function redisSet(key, value, ttlSeconds = 300) {
  if (!redis || !isConnected) return false
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    return true
  } catch {
    return false
  }
}

/**
 * Delete a key from Redis
 */
export async function redisDel(key) {
  if (!redis || !isConnected) return false
  try {
    await redis.del(key)
    return true
  } catch {
    return false
  }
}

/**
 * Delete all keys matching a pattern (e.g. "progress:123*")
 */
export async function redisDelPattern(pattern) {
  if (!redis || !isConnected) return false
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    return true
  } catch {
    return false
  }
}

/**
 * Increment a key (for rate limiting). Returns the new count.
 * Sets TTL on first increment.
 */
export async function redisIncr(key, ttlSeconds = 60) {
  if (!redis || !isConnected) return null
  try {
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, ttlSeconds)
    }
    return count
  } catch {
    return null
  }
}

export function isRedisAvailable() {
  return isConnected
}

export default redis
