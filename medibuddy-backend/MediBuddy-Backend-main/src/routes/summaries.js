import { Router } from 'express';

import { auth, validate, validateParams } from '../middleware/index.js';
import { generateSummarySchema, summaryParamsSchema } from '../validators/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import { ApiError } from '../utils/apiError.js';
import { trackSummaryGenerated } from '../services/telemetry.js';
import { generateSummaryPdf } from '../utils/pdfGenerator.js';
import ConsultationSummary from '../models/ConsultationSummary.js';
import Profile from '../models/Profile.js';
import Medication from '../models/Medication.js';
import ReminderEvent from '../models/ReminderEvent.js';
import SymptomLog from '../models/SymptomLog.js';
import Appointment from '../models/Appointment.js';
import HealthMetric from '../models/HealthMetric.js';
import logger from '../utils/logger.js';

const router = Router({ mergeParams: true });

/**
 * POST /profiles/:profileId/summaries
 * Generate a consultation summary with PDF
 */
router.post('/', auth, validate(generateSummarySchema), asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { startDate, endDate } = req.validated;

    // Verify profile access
    const profile = await Profile.findOne({
        _id: profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Gather all data for the summary
    const [medications, symptoms, appointments, healthMetrics] = await Promise.all([
        // Get medication adherence data
        getMedicationAdherence(profileId, start, end),
        // Get symptom logs
        SymptomLog.find({
            profileId,
            createdAt: { $gte: start, $lte: end }
        }).sort({ createdAt: -1 }),
        // Get appointments
        Appointment.find({
            profile: profileId,
            dateTime: { $gte: start, $lte: end }
        }).sort({ dateTime: 1 }),
        // Get health metrics
        HealthMetric.find({
            profile: profileId,
            recordedAt: { $gte: start, $lte: end }
        }).sort({ recordedAt: -1 })
    ]);

    // Generate PDF to validate data is complete, then store metadata
    await generateSummaryPdf({
        profile,
        startDate: start,
        endDate: end,
        medications,
        symptoms,
        appointments,
        healthMetrics
    });

    // Create summary record
    const summary = await ConsultationSummary.create({
        profileId,
        startDate: start,
        endDate: end,
        status: 'completed',
        metadata: {
            medicationCount: medications.length,
            symptomCount: symptoms.length,
            appointmentCount: appointments.length,
            metricsCount: healthMetrics.length
        }
    });

    trackSummaryGenerated({
        profileId,
        summaryId: summary._id
    });

    sendSuccess(res, {
        id: summary._id,
        profileId,
        startDate: start,
        endDate: end,
        status: summary.status,
        metadata: summary.metadata,
        downloadUrl: `${req.baseUrl}/${summary._id}/download`,
        createdAt: summary.createdAt
    }, 'Summary generated successfully', 201);
}));

/**
 * GET /profiles/:profileId/summaries
 * List summaries for a profile
 */
router.get('/', auth, asyncHandler(async (req, res) => {
    const { profileId } = req.params;

    // Verify profile access
    const profile = await Profile.findOne({
        _id: profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    const summaries = await ConsultationSummary.find({
        profileId
    }).sort({ createdAt: -1 });

    sendSuccess(res, summaries);
}));

/**
 * GET /profiles/:profileId/summaries/:summaryId
 * Get a specific summary
 */
router.get('/:summaryId', auth, validateParams(summaryParamsSchema), asyncHandler(async (req, res) => {
    const { profileId, summaryId } = req.params;

    // Verify profile access
    const profile = await Profile.findOne({
        _id: profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    const summary = await ConsultationSummary.findOne({
        _id: summaryId,
        profileId
    });

    if (!summary) {
        throw ApiError.notFound('Summary not found');
    }

    sendSuccess(res, summary);
}));

/**
 * GET /profiles/:profileId/summaries/:summaryId/download
 * Download PDF for a summary (regenerate if needed)
 */
router.get('/:summaryId/download', auth, validateParams(summaryParamsSchema), asyncHandler(async (req, res) => {
    const { profileId, summaryId } = req.params;

    // Verify profile access
    const profile = await Profile.findOne({
        _id: profileId,
        ownerId: req.userId
    });

    if (!profile) {
        throw ApiError.notFound('Profile not found');
    }

    const summary = await ConsultationSummary.findOne({
        _id: summaryId,
        profileId
    });

    if (!summary) {
        throw ApiError.notFound('Summary not found');
    }

    // Regenerate PDF with current data
    const [medications, symptoms, appointments, healthMetrics] = await Promise.all([
        getMedicationAdherence(profileId, summary.startDate, summary.endDate),
        SymptomLog.find({
            profileId,
            createdAt: { $gte: summary.startDate, $lte: summary.endDate }
        }),
        Appointment.find({
            profile: profileId,
            dateTime: { $gte: summary.startDate, $lte: summary.endDate }
        }),
        HealthMetric.find({
            profile: profileId,
            recordedAt: { $gte: summary.startDate, $lte: summary.endDate }
        })
    ]);

    const pdfBuffer = await generateSummaryPdf({
        profile,
        startDate: summary.startDate,
        endDate: summary.endDate,
        medications,
        symptoms,
        appointments,
        healthMetrics
    });

    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="MediBuddy-Summary-${summaryId}.pdf"`,
        'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
}));

/**
 * Helper: Get medication adherence data from actual ReminderEvent records
 */
async function getMedicationAdherence(profileId, startDate, endDate) {
    try {
        const medications = await Medication.find({ profileId });

        const adherenceData = await Promise.all(medications.map(async (med) => {
            // Count expected doses in period
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const dosesPerDay = med.schedule?.timesPerDay || med.times?.length || 1;
            const totalDoses = daysDiff * dosesPerDay;

            // Query actual ReminderEvent records for this medication in the period
            const reminders = await ReminderEvent.find({
                profileId,
                medicationId: med._id,
                scheduledTime: { $gte: startDate, $lte: endDate }
            });

            const takenDoses = reminders.filter(r => r.status === 'acknowledged').length;

            return {
                name: med.name,
                dosage: med.dosage,
                totalDoses,
                takenDoses,
                adherenceRate: totalDoses > 0 ? takenDoses / totalDoses : 0
            };
        }));

        return adherenceData;
    } catch (error) {
        logger.warn('Error fetching medication adherence', { error: error.message });
        return [];
    }
}

export default router;
