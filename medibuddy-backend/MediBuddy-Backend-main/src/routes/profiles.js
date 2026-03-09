import { Router } from 'express';

import { auth, validate, validateParams, idempotency } from '../middleware/index.js';
import {
    createProfileSchema,
    updateProfileSchema,
    profileIdParamSchema
} from '../validators/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import { ApiError } from '../utils/apiError.js';
import Profile from '../models/Profile.js';

// Import sub-routes
import medicationRoutes from './medications.js';
import symptomRoutes from './symptoms.js';
import reminderRoutes from './reminders.js';
import summaryRoutes from './summaries.js';
import caregiverRoutes from './caregivers.js';

const router = Router();

// Mount sub-routes
router.use('/:profileId/medications', medicationRoutes);
router.use('/:profileId/symptoms', symptomRoutes);
router.use('/:profileId/reminders', reminderRoutes);
router.use('/:profileId/summaries', summaryRoutes);
router.use('/:profileId/caregivers', caregiverRoutes);

/**
 * GET /profiles
 * List user's profiles
 */
router.get('/', auth, asyncHandler(async (req, res) => {
    const profiles = await Profile.find({ ownerId: req.userId })
        .sort({ createdAt: -1 });

    sendSuccess(res, profiles);
}));

/**
 * POST /profiles
 * Create a new profile
 */
router.post('/', auth, validate(createProfileSchema), idempotency(), asyncHandler(async (req, res) => {
    const profile = await Profile.create({
        ownerId: req.userId,
        ...req.validated
    });

    sendSuccess(res, profile, 'Profile created successfully', 201);
}));

/**
 * GET /profiles/:profileId
 * Get profile by ID
 */
router.get('/:profileId', auth, validateParams(profileIdParamSchema), asyncHandler(async (req, res) => {
    const profile = await Profile.findOne({
        _id: req.params.profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    sendSuccess(res, profile);
}));

/**
 * PUT /profiles/:profileId
 * Update profile
 */
router.put('/:profileId', auth, validateParams(profileIdParamSchema), validate(updateProfileSchema), asyncHandler(async (req, res) => {
    const profile = await Profile.findOneAndUpdate(
        { _id: req.params.profileId, ownerId: req.userId },
        { $set: req.validated },
        { new: true }
    );

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    sendSuccess(res, profile, 'Profile updated successfully');
}));

/**
 * DELETE /profiles/:profileId
 * Soft delete profile
 */
router.delete('/:profileId', auth, validateParams(profileIdParamSchema), asyncHandler(async (req, res) => {
    const profile = await Profile.findOneAndUpdate(
        { _id: req.params.profileId, ownerId: req.userId },
        { $set: { deletedAt: new Date() } },
        { new: true }
    );

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    sendSuccess(res, null, 'Profile deleted successfully');
}));

export default router;
