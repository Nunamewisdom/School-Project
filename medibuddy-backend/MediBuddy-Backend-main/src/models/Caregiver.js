import mongoose from 'mongoose';

/**
 * Caregiver Model
 * 
 * Represents a caregiver who receives alerts for missed doses.
 * Per BACKEND_SKILL.md lines 271-278
 */
const CaregiverSchema = new mongoose.Schema({
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
    phone: {
        type: String,
        required: true
    },
    relation: String,

    // Alert settings
    alertOnMissedDose: {
        type: Boolean,
        default: true
    },
    alertThresholdMinutes: {
        type: Number,
        default: 30
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    lastAlertSentAt: Date,

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

CaregiverSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.model('Caregiver', CaregiverSchema);
