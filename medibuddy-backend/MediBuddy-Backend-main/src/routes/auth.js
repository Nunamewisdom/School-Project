import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { validate, auth, otpLimiter, authLimiter } from '../middleware/index.js';
import { requestOtpSchema, verifyOtpSchema, refreshTokenSchema, updateConsentSchema } from '../validators/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import { ApiError } from '../utils/apiError.js';
import User from '../models/User.js';
import OtpRequest from '../models/OtpRequest.js';
import { sendSms } from '../adapters/sms/index.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Generate OTP
 */
function generateOtp() {
    const length = parseInt(process.env.OTP_LENGTH || '6');
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
}

/**
 * Generate JWT tokens
 */
function generateTokens(userId) {
    const accessToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
    );

    const refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' }
    );

    return { accessToken, refreshToken };
}

/**
 * POST /auth/otp
 * Request OTP for phone number
 */
router.post('/otp', otpLimiter, validate(requestOtpSchema), asyncHandler(async (req, res) => {
    const { phone } = req.validated;

    // Generate OTP
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    // Calculate expiry
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Create OTP request
    const otpRequest = await OtpRequest.create({
        phone,
        otpHash,
        expiresAt
    });

    // In development, log the OTP for convenience
    if (process.env.NODE_ENV !== 'production') {
        logger.info(`[DEV] OTP for ${phone}: ${otp}`);
    }

    // Send OTP via SMS
    try {
        await sendSms({
            to: phone,
            message: `Your MediBuddy verification code is: ${otp}. It expires in ${expiryMinutes} minutes.`
        });
    } catch (smsError) {
        logger.error('Failed to send OTP SMS', { phone, error: smsError.message });
        // In development, continue even if SMS fails (OTP is logged above)
        if (process.env.NODE_ENV === 'production') {
            await OtpRequest.deleteOne({ _id: otpRequest._id });
            throw ApiError.internal('Failed to send OTP. Please try again.', 'SMS_SEND_FAILED');
        }
    }

    sendSuccess(res, {
        requestId: otpRequest._id.toString(),
        expiresIn: expiryMinutes * 60 // seconds
    }, 'OTP sent successfully');
}));

/**
 * POST /auth/verify
 * Verify OTP and return tokens
 */
router.post('/verify', authLimiter, validate(verifyOtpSchema), asyncHandler(async (req, res) => {
    const { requestId, otp } = req.validated;

    // Find OTP request
    const otpRequest = await OtpRequest.findById(requestId);

    if (!otpRequest) {
        throw ApiError.badRequest('Invalid or expired OTP request', 'INVALID_OTP_REQUEST');
    }

    // Check if expired
    if (otpRequest.expiresAt < new Date()) {
        await OtpRequest.deleteOne({ _id: requestId });
        throw ApiError.badRequest('OTP has expired', 'OTP_EXPIRED');
    }

    // Check attempts
    if (otpRequest.attempts >= otpRequest.maxAttempts) {
        await OtpRequest.deleteOne({ _id: requestId });
        throw ApiError.tooManyRequests('Too many failed attempts', 'MAX_OTP_ATTEMPTS');
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRequest.otpHash);

    if (!isValid) {
        await OtpRequest.updateOne({ _id: requestId }, { $inc: { attempts: 1 } });
        throw ApiError.badRequest('Invalid OTP', 'INVALID_OTP');
    }

    // Delete OTP request
    await OtpRequest.deleteOne({ _id: requestId });

    // Find or create user
    let user = await User.findOne({ phone: otpRequest.phone });

    if (!user) {
        user = await User.create({ phone: otpRequest.phone });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store hashed refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await User.updateOne({ _id: user._id }, { refreshTokenHash });

    sendSuccess(res, {
        accessToken,
        refreshToken,
        user: {
            id: user._id,
            phone: user.phone,
            name: user.name,
            timezone: user.timezone,
            consent: user.consent
        }
    }, 'Authentication successful');
}));

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', authLimiter, validate(refreshTokenSchema), asyncHandler(async (req, res) => {
    const { refreshToken } = req.validated;

    try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        if (decoded.type !== 'refresh') {
            throw ApiError.unauthorized('Invalid token type', 'INVALID_TOKEN_TYPE');
        }

        // Find user and verify token hash
        const user = await User.findById(decoded.userId);

        if (!user || !user.refreshTokenHash) {
            throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
        }

        const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);

        if (!isValid) {
            throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
        }

        // Generate new tokens
        const tokens = generateTokens(user._id);

        // Update stored refresh token hash
        const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
        await User.updateOne({ _id: user._id }, { refreshTokenHash: newRefreshTokenHash });

        sendSuccess(res, {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        }, 'Token refreshed successfully');

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw ApiError.unauthorized('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
        }
        throw error;
    }
}));

/**
 * POST /auth/logout
 * Revoke refresh token
 */
router.post('/logout', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            await User.updateOne({ _id: decoded.userId }, { $unset: { refreshTokenHash: 1 } });
        } catch (err) {
            // Ignore token errors during logout
        }
    }

    sendSuccess(res, null, 'Logged out successfully');
}));

/**
 * PATCH /auth/consent
 * Record user consent acceptance
 */
router.patch('/consent', auth, validate(updateConsentSchema), asyncHandler(async (req, res) => {
    const { accepted, version } = req.validated;

    const consent = {
        accepted,
        version,
        acceptedAt: accepted ? new Date() : undefined
    };

    const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: { consent } },
        { new: true }
    ).select('-refreshTokenHash');

    if (!user) {
        throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }

    sendSuccess(res, { consent: user.consent }, 'Consent updated successfully');
}));

/**
 * DELETE /auth/account
 * Soft-delete the authenticated user's account.
 * Sets deletedAt timestamp; 30-day grace period before hard deletion.
 * During grace, the pre-find hook excludes the user so they appear "gone".
 * To restore within 30 days, an admin can unset deletedAt.
 */
router.delete('/account', auth, asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);

    if (!user) {
        throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }

    // Soft-delete: set deletedAt, revoke tokens, clear push subscription
    user.deletedAt = new Date();
    user.refreshTokenHash = undefined;
    user.pushSubscription = undefined;
    await user.save();

    logger.info(`Account soft-deleted for user ${req.userId} — 30-day grace period`);

    sendSuccess(res, {
        deletedAt: user.deletedAt.toISOString(),
        gracePeriodDays: 30
    }, 'Account scheduled for deletion. You have 30 days to restore it.');
}));

export default router;
