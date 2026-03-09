import mongoose from 'mongoose';

/**
 * IdempotencyRecord Model
 * 
 * Stores processed idempotency keys to prevent double-processing.
 * Per BACKEND_SKILL.md lines 107-116
 */
const IdempotencyRecordSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    endpoint: String,
    method: String,
    responseStatus: Number,
    responseBody: mongoose.Schema.Types.Mixed,

    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL - auto-delete (typically 24h)
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('IdempotencyRecord', IdempotencyRecordSchema);
