/**
 * PDF Generator Job Processor
 * Generates consultation summary PDFs and uploads to storage
 */

import { pdfQueue } from './queues.js';
import { generateSummaryPdf } from '../services/pdf/summary.generator.js';
import { uploadFile, getSignedDownloadUrl } from '../services/storage/index.js';
import { trackSummaryGenerated } from '../services/telemetry.js';
import ConsultationSummary from '../models/ConsultationSummary.js';
import Profile from '../models/Profile.js';
import Medication from '../models/Medication.js';
import SymptomLog from '../models/SymptomLog.js';
import ReminderEvent from '../models/ReminderEvent.js';
import logger from '../utils/logger.js';

/**
 * Process PDF generation job
 */
pdfQueue.process(async (job) => {
    const { summaryId, profileId, startDate, endDate } = job.data;

    try {
        // Update status to generating
        await ConsultationSummary.findByIdAndUpdate(summaryId, {
            status: 'generating'
        });

        // Fetch all required data
        const profile = await Profile.findById(profileId);
        if (!profile) {
            throw new Error('Profile not found');
        }

        const medications = await Medication.find({
            profileId,
            isActive: true
        });

        const symptoms = await SymptomLog.find({
            profileId,
            loggedAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).sort({ loggedAt: -1 });

        const reminders = await ReminderEvent.find({
            profileId,
            scheduledTime: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        });

        // Calculate stats
        const totalReminders = reminders.length;
        const acknowledgedReminders = reminders.filter(r => r.status === 'acknowledged').length;
        const missedReminders = reminders.filter(r => ['missed', 'sms_sent'].includes(r.status)).length;
        const adherenceRate = totalReminders > 0
            ? Math.round((acknowledgedReminders / totalReminders) * 100)
            : 100;

        // Generate PDF
        const pdfBuffer = await generateSummaryPdf({
            profile,
            medications,
            symptoms,
            stats: {
                totalReminders,
                acknowledgedReminders,
                missedReminders,
                adherenceRate
            },
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        });

        // Upload to storage
        const pdfKey = `summaries/${profileId}/${summaryId}.pdf`;
        await uploadFile({
            key: pdfKey,
            buffer: pdfBuffer,
            contentType: 'application/pdf'
        });

        // Generate signed URL (expires in 24 hours)
        const signedUrl = await getSignedDownloadUrl(pdfKey, 60 * 60 * 24);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Update summary record
        await ConsultationSummary.findByIdAndUpdate(summaryId, {
            status: 'completed',
            pdfKey,
            pdfUrl: signedUrl,
            pdfUrlExpiresAt: expiresAt,
            medicationCount: medications.length,
            symptomCount: symptoms.length,
            missedDoses: missedReminders,
            generatedAt: new Date()
        });

        trackSummaryGenerated({ profileId, summaryId });

        return {
            success: true,
            summaryId,
            pdfKey
        };

    } catch (error) {
        // Update summary with error
        await ConsultationSummary.findByIdAndUpdate(summaryId, {
            status: 'failed',
            errorMessage: error.message
        });

        logger.error('PDF generation failed:', { error: error.message });
        throw error;
    }
});

export default pdfQueue;
