import { z } from 'zod';

/**
 * Medication Validators
 * 
 * Zod schemas for medication endpoints.
 */

// Time format: HH:mm
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const createMedicationSchema = z.object({
    name: z.string().min(1, 'Medication name is required').max(200),
    dosage: z.string().max(100).optional(),
    times: z.array(
        z.string().regex(timeRegex, 'Time must be in HH:mm format')
    ).min(1, 'At least one reminder time is required'),
    timezone: z.string().default('Africa/Lagos'),
    channels: z.array(z.enum(['push', 'sms'])).default(['push']),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    clientId: z.string().optional(),
    clientTs: z.string().datetime().optional()
});

export const updateMedicationSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    dosage: z.string().max(100).optional(),
    times: z.array(
        z.string().regex(timeRegex, 'Time must be in HH:mm format')
    ).min(1).optional(),
    channels: z.array(z.enum(['push', 'sms'])).optional(),
    isActive: z.boolean().optional(),
    endDate: z.string().datetime().optional()
});

export const medicationParamsSchema = z.object({
    profileId: z.string().min(1),
    medId: z.string().min(1)
});
