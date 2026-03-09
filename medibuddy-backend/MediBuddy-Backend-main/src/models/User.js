import mongoose from 'mongoose';

/**
 * User Model
 * 
 * Represents an authenticated user in the system.
 * Per BACKEND_SKILL.md lines 157-178
 */
const UserSchema = new mongoose.Schema({
    phone: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    name: String,
    email: {
        type: String,
        unique: true,
        sparse: true
    },
    refreshTokenHash: String,
    timezone: {
        type: String,
        default: 'Africa/Lagos'
    },
    consent: {
        accepted: { type: Boolean, default: false },
        version: String,
        acceptedAt: Date
    },
    pushSubscription: {
        endpoint: String,
        keys: {
            p256dh: String,
            auth: String
        }
    },
    dataSaverMode: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    deletedAt: Date // Soft delete support
});

// Update timestamp on save
UserSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Exclude soft-deleted users by default
UserSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: { $exists: false } });
    next();
});

export default mongoose.model('User', UserSchema);
