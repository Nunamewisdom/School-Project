/**
 * Africa's Talking SMS Adapter
 * Implements SmsAdapter interface for Africa's Talking (Nigeria/Africa)
 */

import logger from '../../utils/logger.js';

const AT_API_URL = 'https://api.africastalking.com/version1/messaging';
const AT_SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging';

/**
 * Send SMS via Africa's Talking
 * @param {Object} params - SMS parameters
 * @param {string} params.to - Recipient phone number (E.164 format)
 * @param {string} params.message - Message body
 * @param {Object} [params.metadata] - Optional metadata for logging
 * @returns {Promise<{status: string, providerId: string}>}
 */
export async function sendSms({ to, message, metadata = {} }) {
    logger.info('Sending SMS via Africa\'s Talking', { to, metadata });

    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;

    if (!username || !apiKey) {
        throw new Error('Africa\'s Talking credentials not configured');
    }

    // Use sandbox URL for sandbox username
    const url = username === 'sandbox' ? AT_SANDBOX_URL : AT_API_URL;

    const params = new URLSearchParams();
    params.append('username', username);
    params.append('to', to);
    params.append('message', message);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apiKey': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: params
    });

    const data = await response.json();

    if (!response.ok || data.SMSMessageData?.Recipients?.[0]?.status === 'Failed') {
        const errorMessage = data.SMSMessageData?.Recipients?.[0]?.status || 'Unknown error';
        throw new Error(`Africa's Talking error: ${errorMessage}`);
    }

    const recipient = data.SMSMessageData?.Recipients?.[0];

    return {
        status: recipient?.status || 'sent',
        providerId: recipient?.messageId || data.SMSMessageData?.Message || 'unknown'
    };
}

export default { sendSms };
