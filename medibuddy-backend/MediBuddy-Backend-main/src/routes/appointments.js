import { Router } from 'express';
import { auth } from '../middleware/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import { ApiError } from '../utils/apiError.js';
import Appointment from '../models/Appointment.js';
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
 * GET /api/appointments/:profileId
 * Get all appointments for a profile
 */
router.get('/:profileId', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { status, upcoming, past, limit = 20, page = 1 } = req.query;

    const query = { profile: profileId };
    const now = new Date();

    if (upcoming === 'true') {
        query.dateTime = { $gte: now };
        query.status = { $in: ['scheduled', 'confirmed'] };
    } else if (past === 'true') {
        query.dateTime = { $lt: now };
    }

    if (status) {
        query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [appointments, total] = await Promise.all([
        Appointment.find(query)
            .sort({ dateTime: upcoming === 'true' ? 1 : -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Appointment.countDocuments(query)
    ]);

    sendSuccess(res, {
        appointments,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
}));

/**
 * GET /api/appointments/:profileId/upcoming
 * Get upcoming appointments
 */
router.get('/:profileId/upcoming', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { days = 7 } = req.query;

    const appointments = await Appointment.getUpcoming(profileId, parseInt(days));
    sendSuccess(res, appointments);
}));

/**
 * GET /api/appointments/:profileId/:id
 * Get single appointment
 */
router.get('/:profileId/:id', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId, id } = req.params;

    const appointment = await Appointment.findOne({
        _id: id,
        profile: profileId
    });

    if (!appointment) {
        throw ApiError.notFound('Appointment not found');
    }

    sendSuccess(res, appointment);
}));

/**
 * POST /api/appointments/:profileId
 * Create new appointment
 */
router.post('/:profileId', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { doctor, title, dateTime, duration, location, type, notes, reminders } = req.body;

    if (!doctor?.name || !dateTime) {
        throw new ApiError(400, 'Doctor name and date/time are required', 'VALIDATION_ERROR');
    }

    const appointment = await Appointment.create({
        profile: profileId,
        user: req.userId,
        doctor,
        title,
        dateTime: new Date(dateTime),
        duration: duration || 30,
        location,
        type: type || 'in-person',
        notes,
        reminders: reminders || [{ type: 'push', minutesBefore: 60 }]
    });

    sendSuccess(res, appointment, 'Appointment created successfully', 201);
}));

/**
 * PUT /api/appointments/:profileId/:id
 * Update appointment
 */
router.put('/:profileId/:id', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId, id } = req.params;
    const updates = req.body;

    const appointment = await Appointment.findOne({
        _id: id,
        profile: profileId
    });

    if (!appointment) {
        throw ApiError.notFound('Appointment not found');
    }

    const allowedUpdates = ['doctor', 'title', 'dateTime', 'duration', 'location', 'type', 'notes', 'reminders', 'status'];
    allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
            if (field === 'dateTime') {
                appointment[field] = new Date(updates[field]);
            } else {
                appointment[field] = updates[field];
            }
        }
    });

    await appointment.save();
    sendSuccess(res, appointment, 'Appointment updated successfully');
}));

/**
 * PATCH /api/appointments/:profileId/:id/status
 * Update appointment status
 */
router.patch('/:profileId/:id/status', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId, id } = req.params;
    const { status, notes } = req.body;

    const appointment = await Appointment.findOne({
        _id: id,
        profile: profileId
    });

    if (!appointment) {
        throw ApiError.notFound('Appointment not found');
    }

    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Valid: ${validStatuses.join(', ')}`, 'VALIDATION_ERROR');
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;

    await appointment.save();
    sendSuccess(res, appointment, 'Appointment status updated');
}));

/**
 * DELETE /api/appointments/:profileId/:id
 * Delete appointment
 */
router.delete('/:profileId/:id', auth, asyncHandler(verifyProfileAccess), asyncHandler(async (req, res) => {
    const { profileId, id } = req.params;

    const appointment = await Appointment.findOneAndDelete({
        _id: id,
        profile: profileId
    });

    if (!appointment) {
        throw ApiError.notFound('Appointment not found');
    }

    sendSuccess(res, { id }, 'Appointment deleted');
}));

export default router;
