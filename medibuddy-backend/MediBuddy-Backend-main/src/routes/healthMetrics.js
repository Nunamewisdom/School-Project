import { Router } from 'express';
import { auth } from '../middleware/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import { ApiError } from '../utils/apiError.js';
import HealthMetric from '../models/HealthMetric.js';
import Profile from '../models/Profile.js';

const router = Router();

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
 * GET /api/health-metrics/:profileId
 * Get all health metrics for a profile
 */
router.get('/:profileId', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { type, startDate, endDate, limit = 50 } = req.query;

    const query = { profile: profileId };

    if (type) {
        query.type = type;
    }

    if (startDate || endDate) {
        query.recordedAt = {};
        if (startDate) query.recordedAt.$gte = new Date(startDate);
        if (endDate) query.recordedAt.$lte = new Date(endDate);
    }

    const metrics = await HealthMetric.find(query)
        .sort({ recordedAt: -1 })
        .limit(parseInt(limit));

    sendSuccess(res, metrics);
}));

/**
 * GET /api/health-metrics/:profileId/latest
 * Get latest metrics of each type for a profile
 */
router.get('/:profileId/latest', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId } = req.params;

    const types = ['steps', 'sleep', 'weight', 'heart_rate'];
    const latestMetrics = {};

    for (const type of types) {
        const metric = await HealthMetric.getLatest(profileId, type);
        if (metric) {
            latestMetrics[type] = metric;
        }
    }

    sendSuccess(res, latestMetrics);
}));

/**
 * GET /api/health-metrics/:profileId/trends
 * Get trend data for a metric type
 */
router.get('/:profileId/trends', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { type = 'steps', days = 7 } = req.query;

    const trends = await HealthMetric.getDailyTrend(
        profileId,
        type,
        parseInt(days)
    );

    sendSuccess(res, {
        type,
        days: parseInt(days),
        data: trends
    });
}));

/**
 * POST /api/health-metrics/:profileId
 * Add a new health metric
 */
router.post('/:profileId', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { type, value, unit, recordedAt, notes, metadata, source } = req.body;

    const validTypes = ['steps', 'sleep', 'weight', 'heart_rate', 'blood_pressure', 'glucose'];
    if (!validTypes.includes(type)) {
        throw new ApiError(400, `Invalid metric type. Valid types: ${validTypes.join(', ')}`, 'VALIDATION_ERROR');
    }

    const metric = await HealthMetric.create({
        profile: profileId,
        user: req.userId,
        type,
        value,
        unit,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        notes,
        metadata,
        source: source || 'manual'
    });

    sendSuccess(res, metric, 'Health metric added', 201);
}));

/**
 * POST /api/health-metrics/:profileId/batch
 * Add multiple health metrics at once
 */
router.post('/:profileId/batch', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { metrics } = req.body;

    if (!Array.isArray(metrics) || metrics.length === 0) {
        throw new ApiError(400, 'Metrics array is required', 'VALIDATION_ERROR');
    }

    const metricsToInsert = metrics.map(m => ({
        profile: profileId,
        user: req.userId,
        type: m.type,
        value: m.value,
        unit: m.unit,
        recordedAt: m.recordedAt ? new Date(m.recordedAt) : new Date(),
        notes: m.notes,
        metadata: m.metadata,
        source: m.source || 'manual'
    }));

    const insertedMetrics = await HealthMetric.insertMany(metricsToInsert);

    sendSuccess(res, {
        count: insertedMetrics.length,
        metrics: insertedMetrics
    }, `${insertedMetrics.length} metrics added`, 201);
}));

/**
 * PUT /api/health-metrics/:profileId/:id
 * Update a health metric
 */
router.put('/:profileId/:id', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { value, unit, recordedAt, notes, metadata } = req.body;

    const metric = await HealthMetric.findOne({
        _id: id,
        user: req.userId
    });

    if (!metric) {
        throw ApiError.notFound('Metric not found');
    }

    if (value !== undefined) metric.value = value;
    if (unit !== undefined) metric.unit = unit;
    if (recordedAt) metric.recordedAt = new Date(recordedAt);
    if (notes !== undefined) metric.notes = notes;
    if (metadata) metric.metadata = { ...metric.metadata, ...metadata };

    await metric.save();
    sendSuccess(res, metric, 'Metric updated');
}));

/**
 * DELETE /api/health-metrics/:profileId/:id
 * Delete a health metric
 */
router.delete('/:profileId/:id', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const metric = await HealthMetric.findOneAndDelete({
        _id: id,
        user: req.userId
    });

    if (!metric) {
        throw ApiError.notFound('Metric not found');
    }

    sendSuccess(res, { id }, 'Metric deleted');
}));

export default router;
