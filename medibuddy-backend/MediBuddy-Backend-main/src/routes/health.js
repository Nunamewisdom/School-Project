import { Router } from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';

const router = Router();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient;

try {
    redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true
    });
    redisClient.on('error', () => {});
} catch {
    redisClient = null;
}

/**
 * Health Check Endpoint
 *
 * Per BACKEND_SKILL.md line 386
 */
router.get('/', async (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    let redisStatus = 'disconnected';
    if (redisClient) {
        try {
            await redisClient.ping();
            redisStatus = 'connected';
        } catch {
            redisStatus = 'disconnected';
        }
    }

    const isHealthy = mongoStatus === 'connected';

    res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: {
            status: isHealthy ? 'ok' : 'degraded',
            mongo: mongoStatus,
            redis: redisStatus,
            uptime: process.uptime()
        },
        serverTime: new Date().toISOString()
    });
});

export default router;
