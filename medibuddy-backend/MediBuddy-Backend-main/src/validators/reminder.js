import { z } from 'zod';

/**
 * Reminder Validators
 * 
 * Zod schemas for reminder acknowledgement.
 */

export const ackReminderSchema = z.object({
    action: z.enum(['taken', 'snooze', 'skip']),
    deviceId: z.string().optional(),
    clientTs: z.string().datetime().optional()
});

export const reminderParamsSchema = z.object({
    profileId: z.string().min(1),
    reminderId: z.string().min(1)
});
