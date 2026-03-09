import logger from '../utils/logger.js';

/**
 * Request Logger Middleware
 * 
 * Logs incoming requests with timing.
 * Per BACKEND_SKILL.md lines 148-152
 */
export function requestLogger(req, res, next) {
    const start = Date.now();

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;

        logger.info({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            userId: req.userId?.toString() || 'anonymous'
        });
    });

    next();
}
