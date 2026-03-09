import { z } from 'zod';

/**
 * Profile Validators
 * 
 * Zod schemas for profile endpoints.
 */

export const createProfileSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    dob: z.string().datetime().optional(),
    relation: z.enum(['self', 'family', 'other']).default('self'),
    conditions: z.array(z.string()).optional().default([])
});

export const updateProfileSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    dob: z.string().datetime().optional(),
    conditions: z.array(z.string()).optional()
});

export const profileIdParamSchema = z.object({
    profileId: z.string().min(1, 'Profile ID is required')
});
