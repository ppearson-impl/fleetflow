import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

// Redis is optional — if no server is available the client will silently
// skip operations rather than crashing the app.
function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 0,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null, // don't retry — fail fast and silently
  })

  client.on('error', () => {
    // Suppress connection errors so the app boots without Redis
  })

  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export default redis
