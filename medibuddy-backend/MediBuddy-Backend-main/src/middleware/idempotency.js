import IdempotencyRecord from '../models/IdempotencyRecord.js';
import logger from '../utils/logger.js';

/**
 * Idempotency Middleware
 * 
 * Prevents duplicate processing of requests with the same idempotency key.
 * Per BACKEND_SKILL.md lines 107-116
 */
export function idempotency(options = {}) {
    const { ttlHours = 24 } = options;

    return async (req, res, next) => {
        const idempotencyKey = req.headers['idempotency-key'];

        // No key provided - proceed normally
        if (!idempotencyKey) {
            return next();
        }

        try {
            // Check if we've already processed this key
            const existing = await IdempotencyRecord.findOne({ key: idempotencyKey });

            if (existing) {
                logger.info(`Idempotency hit: ${idempotencyKey}`);

                // Return cached response
                return res.status(existing.responseStatus).json(existing.responseBody);
            }

            // Override res.json to capture response
            const originalJson = res.json.bind(res);
            res.json = async (body) => {
                // Store the response for future duplicate requests
                try {
                    await IdempotencyRecord.create({
                        key: idempotencyKey,
                        userId: req.userId,
                        endpoint: req.path,
                        method: req.method,
                        responseStatus: res.statusCode,
                        responseBody: body,
                        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000)
                    });
                } catch (err) {
                    // Log but don't fail the request if we can't store
                    logger.error(`Failed to store idempotency record: ${err.message}`);
                }

                return originalJson(body);
            };

            next();
        } catch (error) {
            logger.error(`Idempotency check failed: ${error.message}`);
            // Proceed even if idempotency check fails
            next();
        }
    };
}
