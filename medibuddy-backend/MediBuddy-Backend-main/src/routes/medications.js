import { Router } from 'express';

import { auth, validate, validateParams, idempotency } from '../middleware/index.js';
import {
    createMedicationSchema,
    updateMedicationSchema,
    medicationParamsSchema
} from '../validators/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import { ApiError } from '../utils/apiError.js';
import Medication from '../models/Medication.js';
import Profile from '../models/Profile.js';
import { scheduleMedicationReminders, cancelMedicationReminders } from '../jobs/reminder.scheduler.js';
import logger from '../utils/logger.js';

const router = Router({ mergeParams: true });

/**
 * Middleware to verify profile access
 */
async function verifyProfileAccess(req, res, next) {
    const profile = await Profile.findOne({
        _id: req.params.profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    req.profile = profile;
    next();
}

/**
 * GET /profiles/:profileId/medications
 * List medications for a profile
 */
router.get('/', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const medications = await Medication.find({
        profileId: req.params.profileId,
        deletedAt: { $exists: false }
    }).sort({ createdAt: -1 });

    sendSuccess(res, medications);
}));

/**
 * POST /profiles/:profileId/medications
 * Create a medication
 */
router.post('/', auth, asyncHandler(verifyProfileAccess), validate(createMedicationSchema), idempotency(), asyncHandler(async (req, res) => {
    const medication = await Medication.create({
        profileId: req.params.profileId,
        idempotencyKey: req.headers['idempotency-key'],
        ...req.validated
    });

    // Schedule reminder jobs for this medication
    if (medication.times?.length && medication.isActive !== false) {
        try {
            await scheduleMedicationReminders(medication);
        } catch (err) {
            logger.error('Failed to schedule reminders', { medicationId: medication._id, error: err.message });
        }
    }

    sendSuccess(res, medication, 'Medication created successfully', 201);
}));

/**
 * GET /profiles/:profileId/medications/:medId
 * Get medication by ID
 */
router.get('/:medId', auth, asyncHandler(verifyProfileAccess), validateParams(medicationParamsSchema), asyncHandler(async (req, res) => {
    const medication = await Medication.findOne({
        _id: req.params.medId,
        profileId: req.params.profileId,
        deletedAt: { $exists: false }
    });

    if (!medication) {
        throw ApiError.notFound('Medication not found');
    }

    sendSuccess(res, medication);
}));

/**
 * PUT /profiles/:profileId/medications/:medId
 * Update medication
 */
router.put('/:medId', auth, asyncHandler(verifyProfileAccess), validateParams(medicationParamsSchema), validate(updateMedicationSchema), asyncHandler(async (req, res) => {
    const medication = await Medication.findOneAndUpdate(
        {
            _id: req.params.medId,
            profileId: req.params.profileId,
            deletedAt: { $exists: false }
        },
        { $set: req.validated },
        { new: true }
    );

    if (!medication) {
        throw ApiError.notFound('Medication not found');
    }

    // Reschedule reminder jobs if schedule-related fields changed
    if (medication.times?.length && medication.isActive !== false) {
        try {
            await cancelMedicationReminders(medication._id);
            await scheduleMedicationReminders(medication);
        } catch (err) {
            logger.error('Failed to update reminders', { medicationId: medication._id, error: err.message });
        }
    }

    sendSuccess(res, medication, 'Medication updated successfully');
}));

/**
 * DELETE /profiles/:profileId/medications/:medId
 * Soft delete medication
 */
router.delete('/:medId', auth, asyncHandler(verifyProfileAccess), validateParams(medicationParamsSchema), asyncHandler(async (req, res) => {
    const medication = await Medication.findOneAndUpdate(
        {
            _id: req.params.medId,
            profileId: req.params.profileId,
            deletedAt: { $exists: false }
        },
        { $set: { deletedAt: new Date(), isActive: false } },
        { new: true }
    );

    if (!medication) {
        throw ApiError.notFound('Medication not found');
    }

    // Cancel scheduled reminder jobs
    try {
        await cancelMedicationReminders(medication._id);
    } catch (err) {
        logger.error('Failed to cancel reminders', { medicationId: medication._id, error: err.message });
    }

    sendSuccess(res, null, 'Medication deleted successfully');
}));

export default router;
