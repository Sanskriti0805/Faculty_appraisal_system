const NodeCache = require('node-cache');

// Create cache instance with TTL of 5 minutes (300 seconds)
const cache = new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false
});

/**
 * Cache middleware for GET requests
 * @param {number} duration - Cache duration in seconds
 */
const cacheMiddleware = (duration = 300) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `${req.originalUrl || req.url}`;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            console.log(`Cache HIT for: ${key}`);
            return res.json(cachedResponse);
        }

        console.log(`Cache MISS for: ${key}`);

        // Store original res.json
        const originalJson = res.json.bind(res);

        // Override res.json to cache the response
        res.json = (body) => {
            // Never cache error responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, body, duration);
            }
            return originalJson(body);
        };

        next();
    };
};

/**
 * Express middleware: flush the response cache after any successful write
 * (POST/PUT/PATCH/DELETE) so lists never show stale data after save/delete.
 */
const invalidateOnWrite = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                cache.flushAll();
            }
        });
    }
    next();
};

/**
 * Clear cache for specific pattern
 * @param {string} pattern - Pattern to match keys
 */
const clearCache = (pattern) => {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));

    matchingKeys.forEach(key => {
        cache.del(key);
        console.log(`Cache cleared for: ${key}`);
    });

    return matchingKeys.length;
};

/**
 * Clear all cache
 */
const clearAllCache = () => {
    cache.flushAll();
    console.log('All cache cleared');
};

/**
 * Get cache stats
 */
const getCacheStats = () => {
    return cache.getStats();
};

module.exports = {
    cache,
    cacheMiddleware,
    invalidateOnWrite,
    clearCache,
    clearAllCache,
    getCacheStats
};
