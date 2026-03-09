import mongoose from 'mongoose';

/**
 * SymptomLog Model
 * 
 * Records symptom entries with severity and optional voice notes.
 * Per BACKEND_SKILL.md line 214 and PRD requirements
 */
const SymptomLogSchema = new mongoose.Schema({
    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: true,
        index: true
    },
    symptom: {
        type: String,
        required: true
    },
    severity: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    duration: String, // e.g., "2 hours", "1 day"
    notes: String,
    voiceNoteUrl: String,

    // Sync metadata
    clientId: String,
    clientTs: {
        type: Date,
        required: true
    },
    serverTs: {
        type: Date,
        default: Date.now
    },
    idempotencyKey: {
        type: String,
        sparse: true,
        index: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for date range queries
SymptomLogSchema.index({ profileId: 1, createdAt: -1 });

export default mongoose.model('SymptomLog', SymptomLogSchema);
