/**
 * Twilio SMS Adapter
 * Implements SmsAdapter interface for Twilio
 */

import logger from '../../utils/logger.js';

/**
 * Send SMS via Twilio
 * @param {Object} params - SMS parameters
 * @param {string} params.to - Recipient phone number (E.164 format)
 * @param {string} params.message - Message body
 * @param {Object} [params.metadata] - Optional metadata for logging
 * @returns {Promise<{status: string, providerId: string}>}
 */
export async function sendSms({ to, message, metadata = {} }) {
    logger.info('Sending SMS via Twilio', { to, metadata });

    const accountSid = process.env.TWILIO_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Twilio credentials not configured');
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', fromNumber);
    params.append('Body', message);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Twilio error: ${data.message || 'Unknown error'}`);
    }

    return {
        status: data.status,
        providerId: data.sid
    };
}

export default { sendSms };
