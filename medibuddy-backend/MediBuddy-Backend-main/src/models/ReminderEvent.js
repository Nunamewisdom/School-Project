import mongoose from 'mongoose';

/**
 * ReminderEvent Model
 * 
 * Tracks reminder lifecycle: sent, acknowledged, missed, SMS fallback.
 * Per BACKEND_SKILL.md lines 296-308
 */
const ReminderEventSchema = new mongoose.Schema({
    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: true,
        index: true
    },
    medicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medication',
        required: true
    },
    scheduledTime: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'acknowledged', 'missed', 'sms_sent'],
        default: 'pending'
    },
    ackAction: {
        type: String,
        enum: ['taken', 'snooze', 'skip']
    },
    ackAt: Date,

    // Delivery tracking
    pushSentAt: Date,
    pushDeliveredAt: Date,
    smsSentAt: Date,
    smsDeliveredAt: Date,

    // Device info
    deviceId: String,

    // Sync metadata
    clientTs: Date,
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

// Index for finding unacknowledged reminders (SMS fallback)
ReminderEventSchema.index({ status: 1, scheduledTime: 1 });

export default mongoose.model('ReminderEvent', ReminderEventSchema);
