import { Router } from 'express';

import { auth, validate, validateParams } from '../middleware/index.js';
import {
    createCaregiverSchema,
    updateCaregiverSchema,
    caregiverParamsSchema
} from '../validators/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import { ApiError } from '../utils/apiError.js';
import Caregiver from '../models/Caregiver.js';
import Profile from '../models/Profile.js';

const router = Router({ mergeParams: true });

/**
 * GET /profiles/:profileId/caregivers
 * List caregivers for a profile
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

    const caregivers = await Caregiver.find({
        profileId: req.params.profileId,
        isActive: true
    }).sort({ createdAt: -1 });

    sendSuccess(res, caregivers);
}));

/**
 * POST /profiles/:profileId/caregivers
 * Add a caregiver
 */
router.post('/', auth, validate(createCaregiverSchema), asyncHandler(async (req, res) => {
    // Verify profile access
    const profile = await Profile.findOne({
        _id: req.params.profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    const caregiver = await Caregiver.create({
        profileId: req.params.profileId,
        ...req.validated
    });

    sendSuccess(res, caregiver, 'Caregiver added successfully', 201);
}));

/**
 * PATCH /profiles/:profileId/caregivers/:caregiverId
 * Update caregiver
 */
router.patch('/:caregiverId', auth, validateParams(caregiverParamsSchema), validate(updateCaregiverSchema), asyncHandler(async (req, res) => {
    // Verify profile access
    const profile = await Profile.findOne({
        _id: req.params.profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    const caregiver = await Caregiver.findOneAndUpdate(
        {
            _id: req.params.caregiverId,
            profileId: req.params.profileId
        },
        { $set: req.validated },
        { new: true }
    );

    if (!caregiver) {
        throw ApiError.notFound('Caregiver not found');
    }

    sendSuccess(res, caregiver, 'Caregiver updated successfully');
}));

/**
 * DELETE /profiles/:profileId/caregivers/:caregiverId
 * Remove caregiver (soft delete)
 */
router.delete('/:caregiverId', auth, validateParams(caregiverParamsSchema), asyncHandler(async (req, res) => {
    // Verify profile access
    const profile = await Profile.findOne({
        _id: req.params.profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    const caregiver = await Caregiver.findOneAndUpdate(
        {
            _id: req.params.caregiverId,
            profileId: req.params.profileId
        },
        { $set: { isActive: false } },
        { new: true }
    );

    if (!caregiver) {
        throw ApiError.notFound('Caregiver not found');
    }

    sendSuccess(res, null, 'Caregiver removed successfully');
}));

export default router;
