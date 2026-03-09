/**
 * Push Adapter Factory
 * Routes push operations to the configured provider
 */

import {
    sendPush as sendWebPush,
    sendReminderPush as sendWebReminderPush,
    getPublicKey as getWebPushPublicKey
} from './webpush.adapter.js';

/**
 * Send push notification
 * @param {Object} params - Push parameters
 * @returns {Promise<{success: boolean, statusCode: number}>}
 */
export function sendPush(params) {
    const provider = process.env.PUSH_PROVIDER || 'webpush';

    switch (provider.toLowerCase()) {
        case 'webpush':
            return sendWebPush(params);
        default:
            throw new Error(`Unknown push provider: ${provider}`);
    }
}

/**
 * Send medication reminder push notification
 * @param {Object} params - Reminder parameters
 * @returns {Promise<{success: boolean, statusCode: number}>}
 */
export function sendReminderPush(params) {
    const provider = process.env.PUSH_PROVIDER || 'webpush';

    switch (provider.toLowerCase()) {
        case 'webpush':
            return sendWebReminderPush(params);
        default:
            throw new Error(`Unknown push provider: ${provider}`);
    }
}

/**
 * Get public key for push subscription
 * @returns {string}
 */
export function getPublicKey() {
    const provider = process.env.PUSH_PROVIDER || 'webpush';

    switch (provider.toLowerCase()) {
        case 'webpush':
            return getWebPushPublicKey();
        default:
            throw new Error(`Unknown push provider: ${provider}`);
    }
}

export default { sendPush, sendReminderPush, getPublicKey };
