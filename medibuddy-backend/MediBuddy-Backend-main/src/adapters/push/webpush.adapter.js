/**
 * Web Push Adapter
 * Implements PushAdapter interface using web-push with VAPID
 */

import webpush from 'web-push';

// Configure VAPID keys on module load
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@medibuddy.com';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Send push notification
 * @param {Object} params - Push parameters
 * @param {Object} params.subscription - PushSubscription object from client
 * @param {string} params.subscription.endpoint - Push endpoint
 * @param {Object} params.subscription.keys - Auth and p256dh keys
 * @param {Object} params.payload - Notification payload
 * @param {string} params.payload.title - Notification title
 * @param {string} params.payload.body - Notification body
 * @param {string} [params.payload.icon] - Icon URL
 * @param {string} [params.payload.tag] - Notification tag for grouping
 * @param {Object} [params.payload.data] - Custom data for click handling
 * @param {Object} [params.payload.actions] - Notification actions
 * @returns {Promise<{success: boolean, statusCode: number}>}
 */
export async function sendPush({ subscription, payload }) {
    if (!vapidPublicKey || !vapidPrivateKey) {
        throw new Error('VAPID keys not configured');
    }

    if (!subscription || !subscription.endpoint) {
        throw new Error('Invalid push subscription');
    }

    const notificationPayload = JSON.stringify({
        title: payload.title || 'MediBuddy',
        body: payload.body || '',
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        tag: payload.tag,
        data: payload.data || {},
        actions: payload.actions || []
    });

    const options = {
        TTL: payload.ttl || 60 * 60, // 1 hour default
        urgency: payload.urgency || 'high'
    };

    try {
        const result = await webpush.sendNotification(subscription, notificationPayload, options);
        return {
            success: true,
            statusCode: result.statusCode
        };
    } catch (error) {
        // Handle expired subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
            return {
                success: false,
                statusCode: error.statusCode,
                expired: true
            };
        }
        throw error;
    }
}

/**
 * Send medication reminder push notification
 * @param {Object} params - Reminder parameters
 * @param {Object} params.subscription - Push subscription
 * @param {string} params.medicationName - Name of medication
 * @param {string} params.dosage - Dosage info
 * @param {string} params.reminderId - Reminder event ID
 * @param {string} params.profileId - Profile ID
 * @returns {Promise<{success: boolean, statusCode: number}>}
 */
export async function sendReminderPush({ subscription, medicationName, dosage, reminderId, profileId }) {
    return sendPush({
        subscription,
        payload: {
            title: 'Time for your medication',
            body: `${medicationName} - ${dosage}`,
            tag: `reminder-${reminderId}`,
            icon: '/icons/pill-icon.png',
            data: {
                type: 'medication_reminder',
                reminderId,
                profileId,
                medicationName
            },
            actions: [
                { action: 'taken', title: 'Taken' },
                { action: 'snooze', title: 'Snooze' },
                { action: 'skip', title: 'Skip' }
            ]
        }
    });
}

/**
 * Get VAPID public key for client subscription
 * @returns {string}
 */
export function getPublicKey() {
    return vapidPublicKey;
}

export default { sendPush, sendReminderPush, getPublicKey };
