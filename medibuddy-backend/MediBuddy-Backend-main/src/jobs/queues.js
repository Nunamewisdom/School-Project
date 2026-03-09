/**
 * Bull Queue Definitions
 * Defines all job queues for MediBuddy
 */

import Bull from 'bull';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Default job options
const defaultJobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 2000
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500 // Keep last 500 failed jobs
};

/**
 * Reminder Queue
 * Processes scheduled medication reminders
 */
export const reminderQueue = new Bull('reminders', redisUrl, {
    defaultJobOptions
});

/**
 * SMS Queue
 * Processes SMS notifications (fallback for unacknowledged reminders)
 */
export const smsQueue = new Bull('sms', redisUrl, {
    defaultJobOptions
});

/**
 * PDF Queue
 * Processes consultation summary PDF generation
 */
export const pdfQueue = new Bull('pdf-generation', redisUrl, {
    defaultJobOptions: {
        ...defaultJobOptions,
        timeout: 60000 // 60 second timeout for PDF generation
    }
});

/**
 * Ack Watcher Queue
 * Checks for unacknowledged reminders after timeout
 */
export const ackWatcherQueue = new Bull('ack-watcher', redisUrl, {
    defaultJobOptions
});

/**
 * Caregiver Alert Queue
 * Sends alerts to caregivers for missed medications
 */
export const caregiverAlertQueue = new Bull('caregiver-alerts', redisUrl, {
    defaultJobOptions
});

/**
 * Schedule a reminder job
 * @param {Object} data - Reminder data
 * @param {Date|number} scheduledTime - When to send the reminder
 */
export async function scheduleReminder(data, scheduledTime) {
    const delay = new Date(scheduledTime).getTime() - Date.now();

    if (delay <= 0) {
        // If time has passed, process immediately
        return reminderQueue.add(data);
    }

    return reminderQueue.add(data, { delay });
}

/**
 * Schedule an ack watcher job
 * @param {Object} data - Reminder data to check
 * @param {number} delayMinutes - Minutes to wait before checking
 */
export async function scheduleAckWatcher(data, delayMinutes = 30) {
    const delay = delayMinutes * 60 * 1000;
    return ackWatcherQueue.add(data, { delay });
}

/**
 * Queue an SMS to be sent
 * @param {Object} data - SMS data
 */
export async function queueSms(data) {
    return smsQueue.add(data);
}

/**
 * Queue a PDF generation job
 * @param {Object} data - PDF generation data
 */
export async function queuePdfGeneration(data) {
    return pdfQueue.add(data);
}

/**
 * Queue a caregiver alert
 * @param {Object} data - Alert data
 */
export async function queueCaregiverAlert(data) {
    return caregiverAlertQueue.add(data);
}

export default {
    reminderQueue,
    smsQueue,
    pdfQueue,
    ackWatcherQueue,
    caregiverAlertQueue,
    scheduleReminder,
    scheduleAckWatcher,
    queueSms,
    queuePdfGeneration,
    queueCaregiverAlert
};
