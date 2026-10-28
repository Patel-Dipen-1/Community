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

    // 2. Bypass cache if client explicitly asks for fresh data
    if (req.headers['cache-control'] === 'no-cache' || req.headers['cache-control'] === 'no-store') {
      return next();
    }

    // 3. Determine partition scope to isolate public vs authenticated users (BUG-025 & BUG-026)
    let userScope = 'public';
    if (req.headers.authorization) {
      // Authenticated requests must NEVER share public cache partition
      const authUser = (req as any).user?.userId || (req as any).user?.id || (req as any).userId;
      if (authUser) {
        userScope = `user:${authUser}`;
      } else {
        const token = req.headers.authorization.replace(/^Bearer\s+/i, '').trim();
        userScope = `auth:${token.slice(-24)}`;
      }
    }

    const key = `cache:${userScope}:${req.originalUrl || req.url}`;
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

