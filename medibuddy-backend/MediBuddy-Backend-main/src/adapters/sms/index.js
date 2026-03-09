/**
 * SMS Adapter Factory
 * Routes SMS operations to the configured provider
 */

import { sendSms as sendTwilio } from './twilio.adapter.js';
import { sendSms as sendAfricasTalking } from './africastalking.adapter.js';

/**
 * Send SMS via the configured provider
 * @param {Object} params - SMS parameters
 * @param {string} params.to - Recipient phone number (E.164 format)
 * @param {string} params.message - Message body
 * @param {Object} [params.metadata] - Optional metadata for logging
 * @returns {Promise<{status: string, providerId: string}>}
 */
export function sendSms(params) {
    const provider = process.env.SMS_PROVIDER || 'twilio';

    switch (provider.toLowerCase()) {
        case 'twilio':
            return sendTwilio(params);
        case 'africastalking':
            return sendAfricasTalking(params);
        default:
            throw new Error(`Unknown SMS provider: ${provider}`);
    }
}

/**
 * Get the current SMS provider name
 * @returns {string}
 */
export function getProvider() {
    return process.env.SMS_PROVIDER || 'twilio';
}

export default { sendSms, getProvider };
