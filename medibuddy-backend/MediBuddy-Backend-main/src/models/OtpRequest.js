import mongoose from 'mongoose';

/**
 * OtpRequest Model
 * 
 * Temporary storage for OTP verification flow.
 * Expires automatically after OTP_EXPIRY_MINUTES.
 */
const OtpRequestSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        index: true
    },
    otpHash: {
        type: String,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 3
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index - auto-delete when expired
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('OtpRequest', OtpRequestSchema);
