import { Router } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/index.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Admin Routes
 *
 * Protected endpoints for operational metrics and monitoring.
 * All routes require authentication + admin role.
 *
 * GET  /admin/metrics  – System & domain metrics snapshot
 */
const router = Router();

/**
 * Admin check middleware.
 * Verifies the authenticated user has the 'admin' role.
 */
const requireAdmin = async (req, res, next) => {
    if (!req.userId) {
        return sendError(res, 403, 'Admin access required', 'FORBIDDEN');
    }

    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'admin') {
        return sendError(res, 403, 'Admin access required', 'FORBIDDEN');
    }

    next();
};

/**
 * GET /admin/metrics
 *
 * Returns:
 *   - system: uptime, memory, mongo status, node version
 *   - domain: counts of users, profiles, medications, etc.
 */
router.get('/metrics', auth, requireAdmin, asyncHandler(async (req, res) => {
    const dbStatus = mongoose.connection.readyState; // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const memUsage = process.memoryUsage();

    // Gather domain counts in parallel
    const collections = mongoose.connection.collections;
    const counts = {};
    const countPromises = Object.entries(collections).map(async ([name, collection]) => {
        try {
            counts[name] = await collection.countDocuments();
        } catch {
            counts[name] = -1; // signal unavailable
        }
    });
    await Promise.all(countPromises);

    // Active users (not soft-deleted)
    let activeUsers = counts.users ?? 0;
    try {
        activeUsers = await User.countDocuments(); // respects pre-find hook
    } catch { /* keep collection count */ }

    const metrics = {
        system: {
            uptime: process.uptime(),
            nodeVersion: process.version,
            memoryMB: {
                rss: +(memUsage.rss / 1024 / 1024).toFixed(1),
                heapUsed: +(memUsage.heapUsed / 1024 / 1024).toFixed(1),
                heapTotal: +(memUsage.heapTotal / 1024 / 1024).toFixed(1)
            },
            mongoStatus: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbStatus] || 'unknown'
        },
        domain: {
            activeUsers,
            collections: counts
        }
    };

    logger.info(`Admin metrics requested by user ${req.userId}`);
    sendSuccess(res, metrics);
}));

export default router;
