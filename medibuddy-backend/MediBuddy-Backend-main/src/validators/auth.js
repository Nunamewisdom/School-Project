import { z } from 'zod';

/**
 * Auth Validators
 * 
 * Zod schemas for authentication endpoints.
 * Per BACKEND_SKILL.md lines 222-229
 */

// Phone number regex (international format)
const phoneRegex = /^\+?[1-9]\d{9,14}$/;

export const requestOtpSchema = z.object({
    phone: z.string()
        .regex(phoneRegex, 'Invalid phone number format. Use international format e.g., +2348012345678')
});

export const verifyOtpSchema = z.object({
    requestId: z.string().min(1, 'Request ID is required'),
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only digits')
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

export const updateConsentSchema = z.object({
    accepted: z.boolean(),
    version: z.string().min(1, 'Consent version is required')
});
