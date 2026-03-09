import { z } from 'zod';

/**
 * Summary Validators
 * 
 * Zod schemas for consultation summary endpoints.
 */

export const generateSummarySchema = z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
    message: 'Start date must be before end date'
});

export const summaryParamsSchema = z.object({
    profileId: z.string().min(1),
    summaryId: z.string().min(1)
});
