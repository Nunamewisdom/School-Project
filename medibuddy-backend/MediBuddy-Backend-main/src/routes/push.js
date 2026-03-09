import { Router } from 'express';
import { auth } from '../middleware/index.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js';
import { sendPush } from '../adapters/push/webpush.adapter.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Push Notification Routes
 *
 * GET  /push/public-key   – VAPID public key (public)
 * POST /push/subscribe    – Save subscription (authed)
 * POST /push/unsubscribe  – Remove subscription (authed)
 * POST /push/test         – Fire a test notification (authed)
 */
const router = Router();

/* ───────── public ───────── */

/**
 * GET /push/public-key
 * Returns the VAPID public key for client-side push subscription.
 */
router.get('/public-key', (req, res) => {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
        return sendError(res, 500, 'VAPID public key not configured', 'VAPID_NOT_CONFIGURED');
    }

    sendSuccess(res, { publicKey: vapidPublicKey });
});

/* ───────── authed ───────── */

/**
 * POST /push/subscribe
 * Save the browser PushSubscription on the user document.
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 */
router.post('/subscribe', auth, asyncHandler(async (req, res) => {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return sendError(res, 400, 'Invalid push subscription object', 'INVALID_SUBSCRIPTION');
    }

    await User.findByIdAndUpdate(req.userId, {
        pushSubscription: {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
            }
        }
    });

    logger.info(`Push subscription saved for user ${req.userId}`);
    sendSuccess(res, null, 'Push subscription saved');
}));

/**
 * POST /push/unsubscribe
 * Remove the stored PushSubscription from the user document.
 */
router.post('/unsubscribe', auth, asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.userId, {
        $unset: { pushSubscription: 1 }
    });

    logger.info(`Push subscription removed for user ${req.userId}`);
    sendSuccess(res, null, 'Push subscription removed');
}));

/**
 * POST /push/test
 * Send a test push notification to the calling user.
 */
router.post('/test', auth, asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);

    if (!user?.pushSubscription?.endpoint) {
        return sendError(res, 400, 'No push subscription found for this user', 'NO_SUBSCRIPTION');
    }

    const result = await sendPush({
        subscription: user.pushSubscription,
        payload: {
            title: 'MediBuddy Test',
            body: 'Push notifications are working!',
            tag: 'test-notification'
        }
    });

    if (result.expired) {
        await User.findByIdAndUpdate(req.userId, { $unset: { pushSubscription: 1 } });
        return sendError(res, 410, 'Push subscription expired — please re-subscribe', 'SUBSCRIPTION_EXPIRED');
    }

    sendSuccess(res, { statusCode: result.statusCode }, 'Test notification sent');
}));

export default router;
