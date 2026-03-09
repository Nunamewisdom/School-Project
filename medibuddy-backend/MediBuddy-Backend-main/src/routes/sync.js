import { Router } from 'express';

import { auth, validate, validateQuery } from '../middleware/index.js';
import { batchSyncSchema, changesQuerySchema } from '../validators/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import SymptomLog from '../models/SymptomLog.js';
import ReminderEvent from '../models/ReminderEvent.js';
import Medication from '../models/Medication.js';
import Profile from '../models/Profile.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /sync/batch
 * Process batch of client operations
 * Per BACKEND_SKILL.md lines 279-284
 */
router.post('/batch', auth, validate(batchSyncSchema), asyncHandler(async (req, res) => {
    const { operations } = req.validated;
    const results = [];

    // Get user's profile IDs for authorization
    const profiles = await Profile.find({ ownerId: req.userId }).select('_id');
    const profileIds = profiles.map(p => p._id.toString());

    for (const op of operations) {
        try {
            let result;

            switch (op.type) {
                case 'symptom_log':
                    // Verify profile access
                    if (!profileIds.includes(op.payload.profileId)) {
                        throw new Error('Unauthorized profile access');
                    }

                    // Check for existing by idempotency key
                    const existingSymptom = await SymptomLog.findOne({
                        idempotencyKey: op.idempotencyKey
                    });

                    if (existingSymptom) {
                        result = { status: 'duplicate', data: existingSymptom };
                    } else {
                        const symptom = await SymptomLog.create({
                            ...op.payload,
                            idempotencyKey: op.idempotencyKey,
                            clientId: op.clientId,
                            clientTs: new Date(op.clientTs)
                        });
                        result = { status: 'created', data: symptom };
                    }
                    break;

                case 'reminder_ack':
                    const reminder = await ReminderEvent.findOneAndUpdate(
                        {
                            _id: op.payload.reminderId,
                            profileId: { $in: profileIds }
                        },
                        {
                            $set: {
                                status: 'acknowledged',
                                ackAction: op.payload.action,
                                ackAt: new Date(),
                                clientTs: new Date(op.clientTs),
                                serverTs: new Date()
                            }
                        },
                        { new: true }
                    );
                    result = reminder
                        ? { status: 'updated', data: reminder }
                        : { status: 'not_found' };
                    break;

                case 'medication_create':
                    if (!profileIds.includes(op.payload.profileId)) {
                        throw new Error('Unauthorized profile access');
                    }

                    const existingMed = await Medication.findOne({
                        idempotencyKey: op.idempotencyKey
                    });

                    if (existingMed) {
                        result = { status: 'duplicate', data: existingMed };
                    } else {
                        const medication = await Medication.create({
                            ...op.payload,
                            idempotencyKey: op.idempotencyKey,
                            clientId: op.clientId,
                            clientTs: new Date(op.clientTs)
                        });
                        result = { status: 'created', data: medication };
                    }
                    break;

                default:
                    result = { status: 'unknown_type' };
            }

            results.push({
                idempotencyKey: op.idempotencyKey,
                clientId: op.clientId,
                ...result
            });

        } catch (error) {
            logger.error(`Sync operation failed: ${error.message}`, {
                idempotencyKey: op.idempotencyKey,
                type: op.type
            });

            results.push({
                idempotencyKey: op.idempotencyKey,
                clientId: op.clientId,
                status: 'error',
                error: error.message
            });
        }
    }

    sendSuccess(res, { results });
}));

/**
 * GET /sync/changes
 * Get server changes since timestamp
 */
router.get('/changes', auth, validateQuery(changesQuerySchema), asyncHandler(async (req, res) => {
    const { since, limit } = req.validated;
    const sinceDate = new Date(since);

    // Get user's profile IDs
    const profiles = await Profile.find({ ownerId: req.userId }).select('_id');
    const profileIds = profiles.map(p => p._id);

    // Fetch changes from all relevant collections
    const [medications, symptoms, reminders] = await Promise.all([
        Medication.find({
            profileId: { $in: profileIds },
            serverTs: { $gt: sinceDate }
        })
            .sort({ serverTs: 1 })
            .limit(limit),

        SymptomLog.find({
            profileId: { $in: profileIds },
            serverTs: { $gt: sinceDate }
        })
            .sort({ serverTs: 1 })
            .limit(limit),

        ReminderEvent.find({
            profileId: { $in: profileIds },
            serverTs: { $gt: sinceDate }
        })
            .sort({ serverTs: 1 })
            .limit(limit)
    ]);

    // Combine and sort by serverTs
    const allChanges = [
        ...medications.map(m => ({ type: 'medication', data: m, serverTs: m.serverTs })),
        ...symptoms.map(s => ({ type: 'symptom', data: s, serverTs: s.serverTs })),
        ...reminders.map(r => ({ type: 'reminder', data: r, serverTs: r.serverTs }))
    ].sort((a, b) => a.serverTs - b.serverTs);

    const changes = allChanges.slice(0, limit);
    const lastServerTs = changes.length > 0
        ? changes[changes.length - 1].serverTs
        : sinceDate;

    sendSuccess(res, {
        changes,
        lastServerTs,
        hasMore: allChanges.length > limit
    });
}));

export default router;
