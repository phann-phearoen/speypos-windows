import { logger } from '../utils/logger.js';

// In-memory, per-process sliding-window limiter. Resets on restart; acceptable for a
// single-process local POS server where the goal is slowing down brute-force guesses.
const attemptsByKey = new Map();

export function createRateLimiter({ windowMs, max, keyFn }) {
  return function rateLimiter(req, res, next) {
    const key = keyFn(req);
    if (!key) {
      return next();
    }

    const now = Date.now();
    const entry = attemptsByKey.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    attemptsByKey.set(key, entry);

    if (entry.count > max) {
      logger.warn('Rate limit exceeded', { key, path: req.originalUrl, ip: req.ip });
      return res.status(429).json({ error: 'Too many attempts. Please wait and try again.' });
    }

    next();
  };
}
