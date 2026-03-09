import { z } from 'zod';

/**
 * Symptom Validators
 * 
 * Zod schemas for symptom logging endpoints.
 */

export const createSymptomSchema = z.object({
    symptom: z.string().min(1, 'Symptom is required').max(200),
    severity: z.number().int().min(1).max(5),
    duration: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
    voiceNoteUrl: z.string().url().optional(),
    clientId: z.string().optional(),
    clientTs: z.string().datetime()
});

export const listSymptomsQuerySchema = z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0)
});
