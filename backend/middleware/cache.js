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
            cache.set(key, body, duration);
            return originalJson(body);
        };

        next();
    };
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
    clearCache,
    clearAllCache,
    getCacheStats
};
