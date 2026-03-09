import mongoose from 'mongoose';

/**
 * Medication Model
 * 
 * Represents a medication with reminder schedule.
 * Per BACKEND_SKILL.md lines 196-212
 */
const MedicationSchema = new mongoose.Schema({
    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    dosage: String,
    times: {
        type: [String], // ["08:00", "20:00"] in HH:mm format
        required: true,
        validate: {
            validator: function (v) {
                return v.every(time => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time));
            },
            message: 'Times must be in HH:mm format'
        }
    },
    timezone: {
        type: String,
        default: 'Africa/Lagos'
    },
    channels: {
        type: [String],
        enum: ['push', 'sms'],
        default: ['push']
    },
    startDate: Date,
    endDate: Date,
    isActive: {
        type: Boolean,
        default: true
    },

    // Sync metadata
    clientId: String,
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
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    deletedAt: Date
});

// Compound index for profile + active medications
MedicationSchema.index({ profileId: 1, isActive: 1 });

// Update timestamp on save
MedicationSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    this.serverTs = new Date();
    next();
});

export default mongoose.model('Medication', MedicationSchema);
