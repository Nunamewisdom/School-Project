/**
 * SMS Sender Job Processor
 * Processes SMS notification queue
 */

import { smsQueue, caregiverAlertQueue } from './queues.js';
import { sendSms } from '../adapters/sms/index.js';
import { trackCaregiverAlertSent } from '../services/telemetry.js';
import ReminderEvent from '../models/ReminderEvent.js';
import logger from '../utils/logger.js';

/**
 * Process SMS job
 */
smsQueue.process(async (job) => {
    const { to, message, metadata } = job.data;

    try {
        const result = await sendSms({ to, message, metadata });

        // Update reminder event if this was a reminder SMS
        if (metadata?.reminderId) {
            await ReminderEvent.findByIdAndUpdate(metadata.reminderId, {
                smsSentAt: new Date(),
                smsDeliveredAt: result.status === 'delivered' ? new Date() : undefined
            });
        }

        return {
            success: true,
            providerId: result.providerId,
            status: result.status
        };
    } catch (error) {
        // Log error and allow retry
        logger.error('SMS send failed:', { error: error.message });
        throw error;
    }
});

/**
 * Process caregiver alert job
 */
caregiverAlertQueue.process(async (job) => {
    const {
        caregiverId,
        caregiverPhone,
        caregiverName,
        profileId,
        medicationName,
        reason
    } = job.data;

    const greeting = caregiverName ? `Hi ${caregiverName}, ` : '';
    const message = reason === 'multiple_missed_reminders'
        ? `${greeting}MediBuddy Alert: Multiple medication reminders have been missed. Please check in on your loved one. Medication: ${medicationName}`
        : `${greeting}MediBuddy Alert: A medication reminder was missed. Medication: ${medicationName}`;

    try {
        const result = await sendSms({
            to: caregiverPhone,
            message,
            metadata: {
                caregiverId,
                profileId,
                type: 'caregiver_alert',
                reason
            }
        });

        trackCaregiverAlertSent({ caregiverId, reason });

        return {
            success: true,
            providerId: result.providerId,
            caregiverId
        };
    } catch (error) {
        logger.error('Caregiver alert failed:', { error: error.message });
        throw error;
    }
});

export default { smsQueue, caregiverAlertQueue };
