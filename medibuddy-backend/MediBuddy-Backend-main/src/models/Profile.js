import mongoose from 'mongoose';

/**
 * Profile Model
 * 
 * Represents a person being cared for (can be self or family member).
 * Per BACKEND_SKILL.md lines 180-194
 */
const ProfileSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    dob: Date,
    relation: {
        type: String,
        enum: ['self', 'family', 'other'],
        default: 'self'
    },
    conditions: [String],

    // Sync metadata
    clientId: String,
    clientTs: Date,
    serverTs: {
        type: Date,
        default: Date.now
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    deletedAt: Date // Soft delete
});

// Update timestamp on save
ProfileSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    this.serverTs = new Date();
    next();
});

// Exclude soft-deleted profiles by default
ProfileSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: { $exists: false } });
    next();
});

export default mongoose.model('Profile', ProfileSchema);
