import { Router } from 'express';

import { auth, validate, validateParams, idempotency } from '../middleware/index.js';
import { ackReminderSchema, reminderParamsSchema } from '../validators/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import { ApiError } from '../utils/apiError.js';
import { trackReminderAck } from '../services/telemetry.js';
import ReminderEvent from '../models/ReminderEvent.js';
import Profile from '../models/Profile.js';

const router = Router({ mergeParams: true });

/**
 * POST /profiles/:profileId/reminders/:reminderId/ack
 * Acknowledge a reminder
 */
router.post('/:reminderId/ack', auth, validateParams(reminderParamsSchema), validate(ackReminderSchema), idempotency(), asyncHandler(async (req, res) => {
    // Verify profile access
    const profile = await Profile.findOne({
        _id: req.params.profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    const { action, deviceId, clientTs } = req.validated;

    // Find and update reminder
    const reminder = await ReminderEvent.findOneAndUpdate(
        {
            _id: req.params.reminderId,
            profileId: req.params.profileId,
            status: { $in: ['pending', 'sent'] }
        },
        {
            $set: {
                status: 'acknowledged',
                ackAction: action,
                ackAt: new Date(),
                deviceId,
                clientTs: clientTs ? new Date(clientTs) : undefined,
                serverTs: new Date()
            }
        },
        { new: true }
    );

    if (!reminder) {
        // Check if already acknowledged
        const existing = await ReminderEvent.findById(req.params.reminderId);
        if (existing && existing.status === 'acknowledged') {
            return sendSuccess(res, existing, 'Reminder already acknowledged');
        }
        throw ApiError.notFound('Reminder not found or already processed');
    }

    // Track telemetry event
    trackReminderAck({
        profileId: req.params.profileId,
        medId: reminder.medicationId,
        reminderId: reminder._id,
        action
    });

    sendSuccess(res, reminder, 'Reminder acknowledged');
}));

/**
 * GET /profiles/:profileId/reminders
 * List reminders for a profile (upcoming and recent)
 */
router.get('/', auth, asyncHandler(async (req, res) => {
    // Verify profile access
    const profile = await Profile.findOne({
        _id: req.params.profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneDayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const reminders = await ReminderEvent.find({
        profileId: req.params.profileId,
        scheduledTime: { $gte: oneDayAgo, $lte: oneDayAhead }
    })
        .populate('medicationId', 'name dosage')
        .sort({ scheduledTime: 1 });

    sendSuccess(res, reminders);
}));

export default router;
