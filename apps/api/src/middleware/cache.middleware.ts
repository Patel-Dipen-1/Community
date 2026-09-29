import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  expiry: number;
  size: number;
}

const MAX_CACHE_ENTRIES = 500;
const MAX_PAYLOAD_BYTES = 250 * 1024; // 250 KB limit per entry
const memoryCache = new Map<string, CacheEntry>();

/**
 * Clean expired cache items
 */
const cleanExpiredEntries = () => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now >= entry.expiry) {
      memoryCache.delete(key);
    }
  }
};

/**
 * Bounded LRU-style cache middleware for small public GET responses.
 * Prevents memory growth while avoiding unnecessary database reads.
 */
export const cacheResponse = (durationSeconds: number = 60) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // 2. Do NOT cache requests containing user authorization unless safe
    if (req.headers.authorization && !req.query.public) {
      return next();
    }

    const key = `cache:${req.originalUrl || req.url}`;
    const cached = memoryCache.get(key);

    if (cached) {
      if (Date.now() < cached.expiry) {
        // LRU refresh: delete and re-insert to move key to end of Map order
        memoryCache.delete(key);
        memoryCache.set(key, cached);

        res.setHeader('X-Cache-Status', 'HIT');
        return res.json(cached.data);
      } else {
        memoryCache.delete(key);
      }
    }

    // 3. Intercept res.json to store in bounded cache
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode === 200 && body !== undefined && body !== null) {
        try {
          const payloadString = typeof body === 'string' ? body : JSON.stringify(body);
          const payloadSize = Buffer.byteLength(payloadString);

          if (payloadSize <= MAX_PAYLOAD_BYTES) {
            if (memoryCache.size >= MAX_CACHE_ENTRIES) {
              cleanExpiredEntries();
              if (memoryCache.size >= MAX_CACHE_ENTRIES) {
                const oldestKey = memoryCache.keys().next().value;
                if (oldestKey) memoryCache.delete(oldestKey);
              }
            }

            memoryCache.set(key, {
              data: body,
              expiry: Date.now() + durationSeconds * 1000,
              size: payloadSize,
            });
          }
        } catch {
          // Ignore stringify errors on non-serializable objects
        }
      }
      res.setHeader('X-Cache-Status', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

/**
 * Clear Cache entries matching a pattern string
 */
export const clearCacheByPattern = (pattern: string) => {
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
};

