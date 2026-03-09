/**
 * Ack Watcher Job Processor
 * Monitors unacknowledged reminders and triggers SMS fallback
 */

import { ackWatcherQueue, queueSms, queueCaregiverAlert } from './queues.js';
import ReminderEvent from '../models/ReminderEvent.js';
import Caregiver from '../models/Caregiver.js';

/**
 * Process ack watcher job
 * Checks if reminder was acknowledged, triggers SMS fallback if not
 */
ackWatcherQueue.process(async (job) => {
    const {
        reminderId,
        profileId,
        medicationName,
        dosage,
        userPhone,
        immediateSms
    } = job.data;

    // Get current reminder status
    const reminder = await ReminderEvent.findById(reminderId);

    if (!reminder) {
        return { skipped: true, reason: 'Reminder not found' };
    }

    // If already acknowledged, no action needed
    if (reminder.status === 'acknowledged') {
        return { skipped: true, reason: 'Already acknowledged' };
    }

    // If immediate SMS requested or reminder not acknowledged after timeout
    if (immediateSms || reminder.status === 'sent') {
        // Queue SMS reminder
        await queueSms({
            to: userPhone,
            message: `MediBuddy Reminder: Time to take ${medicationName} (${dosage}). Reply TAKEN when done.`,
            metadata: {
                reminderId,
                profileId,
                type: 'medication_reminder'
            }
        });

        // Update reminder status
        await ReminderEvent.findByIdAndUpdate(reminderId, {
            status: 'sms_sent'
        });

        // Check if we should alert caregivers (after 2 missed reminders in a row)
        const recentReminders = await ReminderEvent.find({
            profileId,
            status: { $in: ['missed', 'sms_sent'] },
            scheduledTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).sort({ scheduledTime: -1 }).limit(2);

        if (recentReminders.length >= 2) {
            // Get caregivers for this profile
            const caregivers = await Caregiver.find({
                profileId,
                isActive: true,
                alertOnMissed: true
            });

            for (const caregiver of caregivers) {
                await queueCaregiverAlert({
                    caregiverId: caregiver._id.toString(),
                    caregiverPhone: caregiver.phone,
                    caregiverName: caregiver.name,
                    profileId,
                    medicationName,
                    reason: 'multiple_missed_reminders'
                });
            }
        }

        return { success: true, smsSent: true };
    }

    return { skipped: true, reason: 'Unknown status' };
});

export default ackWatcherQueue;
