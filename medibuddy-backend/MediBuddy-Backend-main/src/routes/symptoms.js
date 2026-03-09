import { Router } from 'express';

import { auth, validate, validateQuery, idempotency } from '../middleware/index.js';
import { createSymptomSchema, listSymptomsQuerySchema } from '../validators/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import { ApiError } from '../utils/apiError.js';
import { trackSymptomLogged } from '../services/telemetry.js';
import SymptomLog from '../models/SymptomLog.js';
import Profile from '../models/Profile.js';
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
 * GET /profiles/:profileId/symptoms
 * List symptoms for a profile
 */
router.get('/', auth, asyncHandler(verifyProfileAccess), validateQuery(listSymptomsQuerySchema), asyncHandler(async (req, res) => {
    const { start, end, limit, offset } = req.validated;

    const query = { profileId: req.params.profileId };

    if (start || end) {
        query.createdAt = {};
        if (start) query.createdAt.$gte = new Date(start);
        if (end) query.createdAt.$lte = new Date(end);
    }

    const [symptoms, total] = await Promise.all([
        SymptomLog.find(query)
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit),
        SymptomLog.countDocuments(query)
    ]);

    sendSuccess(res, {
        symptoms,
        pagination: {
            total,
            limit,
            offset,
            hasMore: offset + symptoms.length < total
        }
    });
}));

/**
 * POST /profiles/:profileId/symptoms
 * Log a symptom
 */
router.post('/', auth, asyncHandler(verifyProfileAccess), validate(createSymptomSchema), idempotency(), asyncHandler(async (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'];

    // Check for duplicate by idempotency key
    if (idempotencyKey) {
        const existing = await SymptomLog.findOne({ idempotencyKey });
        if (existing) {
            logger.info(`Returning existing symptom log for idempotency key: ${idempotencyKey}`);
            return sendSuccess(res, existing, 'Symptom already logged', 200);
        }
    }

    const symptomLog = await SymptomLog.create({
        profileId: req.params.profileId,
        idempotencyKey,
        ...req.validated
    });

    // Track telemetry event
    trackSymptomLogged({
        profileId: req.params.profileId,
        symptomId: symptomLog._id,
        severity: symptomLog.severity
    });

    sendSuccess(res, symptomLog, 'Symptom logged successfully', 201);
}));

export default router;
