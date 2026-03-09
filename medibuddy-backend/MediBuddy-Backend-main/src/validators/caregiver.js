import { z } from 'zod';

/**
 * Caregiver Validators
 * 
 * Zod schemas for caregiver endpoints.
 */

const phoneRegex = /^\+?[1-9]\d{9,14}$/;

export const createCaregiverSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
    relation: z.string().max(50).optional(),
    alertOnMissedDose: z.boolean().default(true),
    alertThresholdMinutes: z.number().int().min(5).max(120).default(30)
});

export const updateCaregiverSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().regex(phoneRegex).optional(),
    relation: z.string().max(50).optional(),
    alertOnMissedDose: z.boolean().optional(),
    alertThresholdMinutes: z.number().int().min(5).max(120).optional(),
    isActive: z.boolean().optional()
});

export const caregiverParamsSchema = z.object({
    profileId: z.string().min(1),
    caregiverId: z.string().min(1)
});
