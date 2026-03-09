import { z } from 'zod';

/**
 * Sync Validators
 * 
 * Zod schemas for offline sync endpoints.
 * Per BACKEND_SKILL.md lines 279-284
 */

const syncOperationSchema = z.object({
    type: z.enum(['symptom_log', 'reminder_ack', 'medication_create']),
    payload: z.record(z.any()),
    idempotencyKey: z.string().min(1),
    clientId: z.string(),
    clientTs: z.string().datetime()
});

export const batchSyncSchema = z.object({
    operations: z.array(syncOperationSchema).min(1).max(100)
});

export const changesQuerySchema = z.object({
    since: z.string().datetime(),
    limit: z.coerce.number().int().min(1).max(500).default(100)
});
