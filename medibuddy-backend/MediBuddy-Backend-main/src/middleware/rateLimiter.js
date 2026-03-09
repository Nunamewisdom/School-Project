import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter Factory
 *
 * Reusable rate-limit presets per BACKEND_SKILL.md:
 * "Rate-limit sensitive endpoints (OTP, login, sync)."
 *
 * Each preset returns an express-rate-limit middleware instance.
 * All limiters return the standard error envelope.
 */

function envelope(code, message) {
    return {
        success: false,
        error: message,
        code,
        serverTime: new Date().toISOString()
    };
}

/**
 * General API limiter — applied globally in app.js
 *   100 requests / 15 min per IP
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: envelope('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later')
});

/**
 * Auth-sensitive limiter — login verification, token refresh
 *   20 requests / 15 min per IP
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: envelope('AUTH_RATE_LIMIT_EXCEEDED', 'Too many authentication attempts, please try again later')
});

/**
 * OTP limiter — stricter for OTP issuance
 *   5 requests / 10 min per IP  (configurable via env)
 */
export const otpLimiter = rateLimit({
    windowMs: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MINUTES || '10') * 60 * 1000,
    max: parseInt(process.env.OTP_RATE_LIMIT_REQUESTS || '5'),
    standardHeaders: true,
    legacyHeaders: false,
    message: envelope('OTP_RATE_LIMIT_EXCEEDED', 'Too many OTP requests, please try again later')
});

/**
 * Sync limiter — prevent sync spam
 *   30 requests / 5 min per IP
 */
export const syncLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: envelope('SYNC_RATE_LIMIT_EXCEEDED', 'Too many sync requests, please try again later')
});

/**
 * Write limiter — for mutation-heavy endpoints (POST / PUT / DELETE)
 *   60 requests / 15 min per IP
 */
export const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: envelope('WRITE_RATE_LIMIT_EXCEEDED', 'Too many write requests, please try again later')
});
