import mongoose from 'mongoose';

/**
 * ConsultationSummary Model
 * 
 * Stores generated PDF summaries for consultations.
 * Per BACKEND_SKILL.md lines 336-342
 */
const ConsultationSummarySchema = new mongoose.Schema({
    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: true,
        index: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'generating', 'completed', 'failed'],
        default: 'pending'
    },

    // PDF storage
    pdfKey: String, // S3 key
    pdfUrl: String, // Signed URL (temporary)
    pdfUrlExpiresAt: Date,

    // Summary data (cached for quick access)
    medicationCount: Number,
    symptomCount: Number,
    missedDoses: Number,

    // Processing metadata
    generatedAt: Date,
    errorMessage: String,

    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('ConsultationSummary', ConsultationSummarySchema);
