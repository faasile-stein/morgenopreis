import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../utils/validation';

/**
 * Standard rate limiter for general API endpoints
 */
export const rateLimiter = rateLimit({
  windowMs: RATE_LIMITS.standard.windowMs,
  max: RATE_LIMITS.standard.max,
  message: RATE_LIMITS.standard.message,
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID if authenticated, otherwise IP
  keyGenerator: (req) => {
    return (req as any).user?.id || req.ip || 'unknown';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.auth.windowMs,
  max: RATE_LIMITS.auth.max,
  message: RATE_LIMITS.auth.message,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  // Always use IP for auth to prevent brute force
  keyGenerator: (req) => req.ip || 'unknown',
});

/**
 * Rate limiter for expensive operations (searches, wheel spins)
 */
export const expensiveOperationLimiter = rateLimit({
  windowMs: RATE_LIMITS.expensive.windowMs,
  max: RATE_LIMITS.expensive.max,
  message: RATE_LIMITS.expensive.message,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as any).user?.id || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for admin endpoints
 */
export const adminRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.admin.windowMs,
  max: RATE_LIMITS.admin.max,
  message: RATE_LIMITS.admin.message,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as any).user?.id || 'unknown';
  },
});
