/**
 * Reminder Scheduler Job Processor
 * Schedules and sends medication reminder notifications
 */
/* global Intl */

import { reminderQueue, scheduleAckWatcher } from './queues.js';
import { sendReminderPush } from '../adapters/push/index.js';
import ReminderEvent from '../models/ReminderEvent.js';
import Medication from '../models/Medication.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import logger from '../utils/logger.js';

/**
 * Process reminder job
 * Sends push notification and creates ReminderEvent record
 */
reminderQueue.process(async (job) => {
    const { medicationId, profileId, scheduledTime } = job.data;

    // Get medication details
    const medication = await Medication.findById(medicationId);
    if (!medication || !medication.isActive) {
        return { skipped: true, reason: 'Medication not found or inactive' };
    }

    // Get profile and owner user for push subscription
    const profile = await Profile.findById(profileId);
    if (!profile) {
        return { skipped: true, reason: 'Profile not found' };
    }

    const user = await User.findById(profile.ownerId);
    if (!user) {
        return { skipped: true, reason: 'User not found' };
    }

    // Create reminder event record
    const reminderEvent = await ReminderEvent.create({
        profileId,
        medicationId,
        scheduledTime: new Date(scheduledTime),
        status: 'pending',
        serverTs: new Date()
    });

    // Attempt push notification if user has subscription
    if (user.pushSubscription?.endpoint) {
        try {
            const result = await sendReminderPush({
                subscription: user.pushSubscription,
                medicationName: medication.name,
                dosage: medication.dosage,
                reminderId: reminderEvent._id.toString(),
                profileId: profileId.toString()
            });

            if (result.success) {
                await ReminderEvent.findByIdAndUpdate(reminderEvent._id, {
                    status: 'sent',
                    pushSentAt: new Date()
                });

                // Schedule ack watcher to check if acknowledged within 30 minutes
                await scheduleAckWatcher({
                    reminderId: reminderEvent._id.toString(),
                    profileId: profileId.toString(),
                    medicationId: medicationId.toString(),
                    medicationName: medication.name,
                    dosage: medication.dosage,
                    userPhone: user.phone
                }, 30);

                return { success: true, reminderId: reminderEvent._id };
            }

            // Push subscription expired - mark for SMS fallback
            if (result.expired) {
                await User.findByIdAndUpdate(user._id, {
                    $unset: { pushSubscription: 1 }
                });
            }
        } catch (error) {
            // Log error but continue - will fall back to SMS via ack watcher
            logger.error('Push notification failed:', { error: error.message });
        }
    }

    // If no push subscription or push failed, schedule immediate SMS fallback
    if (medication.channels.includes('sms')) {
        await scheduleAckWatcher({
            reminderId: reminderEvent._id.toString(),
            profileId: profileId.toString(),
            medicationId: medicationId.toString(),
            medicationName: medication.name,
            dosage: medication.dosage,
            userPhone: user.phone,
            immediateSms: true
        }, 0);
    }

    return { success: true, reminderId: reminderEvent._id, pushFailed: true };
});

/**
 * Convert a wall-clock time (HH:MM) in a given IANA timezone to the next
 * occurring UTC Date (today or tomorrow in that timezone).
 */
function getNextOccurrenceUtc(hours, minutes, timezone) {
    const now = new Date();

    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
        const refDate = new Date(now.getTime() + dayOffset * 86400000);

        // Get the date in the target timezone (YYYY-MM-DD)
        const dateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(refDate);
        const [y, m, d] = dateStr.split('-').map(Number);

        // Create a UTC timestamp assuming hours:minutes were UTC
        const utcGuess = Date.UTC(y, m - 1, d, hours, minutes, 0, 0);

        // Determine what the wall-clock time actually is in the timezone at that UTC instant
        const wallParts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', hour12: false
        }).formatToParts(new Date(utcGuess));

        const get = (type) => {
            const v = wallParts.find(p => p.type === type).value;
            return type === 'hour' && v === '24' ? 0 : +v;
        };

        // Compute the offset: wall-clock UTC representation minus our guess
        const wallMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
        const offsetMs = wallMs - utcGuess;

        // Correct for the offset to get the true UTC time
        const scheduledUtc = new Date(utcGuess - offsetMs);

        if (scheduledUtc > now) {
            return scheduledUtc;
        }
    }

    // Fallback: schedule ~24h from now (should not normally reach here)
    return new Date(Date.now() + 86400000);
}

/**
 * Schedule reminders for a medication
 * Called when medication is created or updated
 */
export async function scheduleMedicationReminders(medication) {
    const { _id: medicationId, profileId, times, timezone } = medication;
    const tz = timezone || 'UTC';

    // For each time in the medication schedule
    for (const time of times) {
        const [hours, minutes] = time.split(':').map(Number);

        // Calculate next occurrence in the user's timezone
        const now = new Date();
        const scheduledTime = getNextOccurrenceUtc(hours, minutes, tz);

        // Add job to queue
        await reminderQueue.add({
            medicationId: medicationId.toString(),
            profileId: profileId.toString(),
            scheduledTime: scheduledTime.toISOString(),
            time
        }, {
            delay: scheduledTime.getTime() - now.getTime(),
            jobId: `reminder-${medicationId}-${time}-${scheduledTime.toISOString().split('T')[0]}`
        });
    }
}

/**
 * Cancel scheduled reminders for a medication
 */
export async function cancelMedicationReminders(medicationId) {
    const jobs = await reminderQueue.getJobs(['delayed', 'waiting']);

    for (const job of jobs) {
        if (job.data.medicationId === medicationId.toString()) {
            await job.remove();
        }
    }
}

export default {
    scheduleMedicationReminders,
    cancelMedicationReminders
};
