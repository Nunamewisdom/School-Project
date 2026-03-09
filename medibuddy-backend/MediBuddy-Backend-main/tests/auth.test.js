import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
    connectTestDb,
    closeTestDb,
    clearTestDb,
    mockRequest,
    mockResponse,
    createTestUser
} from './setup.js';

// Models
import User from '../src/models/User.js';
import OtpRequest from '../src/models/OtpRequest.js';

// Set test environment
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OTP_LENGTH = '6';
process.env.OTP_EXPIRY_MINUTES = '10';

describe('Auth Routes', () => {
    beforeAll(async () => {
        await connectTestDb();
    });

    afterAll(async () => {
        await closeTestDb();
    });

    afterEach(async () => {
        await clearTestDb();
    });

    describe('OTP Request', () => {
        it('should create OTP request for valid phone', async () => {
            const phone = '+15551234567';

            const otpRequest = await OtpRequest.create({
                phone,
                otpHash: await bcrypt.hash('123456', 10),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            });

            expect(otpRequest).toBeDefined();
            expect(otpRequest.phone).toBe(phone);
            expect(otpRequest.attempts).toBe(0);
        });

        it('should track OTP attempts', async () => {
            const phone = '+15551234567';

            const otpRequest = await OtpRequest.create({
                phone,
                otpHash: await bcrypt.hash('123456', 10),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            });

            await OtpRequest.updateOne(
                { _id: otpRequest._id },
                { $inc: { attempts: 1 } }
            );

            const updated = await OtpRequest.findById(otpRequest._id);
            expect(updated.attempts).toBe(1);
        });
    });

    describe('OTP Verification', () => {
        it('should verify correct OTP', async () => {
            const phone = '+15551234567';
            const otp = '123456';

            const otpRequest = await OtpRequest.create({
                phone,
                otpHash: await bcrypt.hash(otp, 10),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            });

            const isValid = await bcrypt.compare(otp, otpRequest.otpHash);
            expect(isValid).toBe(true);
        });

        it('should reject incorrect OTP', async () => {
            const phone = '+15551234567';
            const otp = '123456';

            const otpRequest = await OtpRequest.create({
                phone,
                otpHash: await bcrypt.hash(otp, 10),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            });

            const isValid = await bcrypt.compare('654321', otpRequest.otpHash);
            expect(isValid).toBe(false);
        });

        it('should reject expired OTP', async () => {
            const phone = '+15551234567';

            const otpRequest = await OtpRequest.create({
                phone,
                otpHash: await bcrypt.hash('123456', 10),
                expiresAt: new Date(Date.now() - 1000) // Expired
            });

            expect(otpRequest.expiresAt < new Date()).toBe(true);
        });
    });

    describe('Token Generation', () => {
        it('should generate valid JWT tokens', async () => {
            const user = await createTestUser(User);

            const accessToken = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
            expect(decoded.userId.toString()).toBe(user._id.toString());
        });

        it('should generate refresh token with type', async () => {
            const user = await createTestUser(User);

            const refreshToken = jwt.sign(
                { userId: user._id, type: 'refresh' },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
            expect(decoded.type).toBe('refresh');
        });
    });

    describe('Token Refresh', () => {
        it('should validate refresh token hash', async () => {
            const user = await createTestUser(User);

            const refreshToken = jwt.sign(
                { userId: user._id, type: 'refresh' },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
            await User.updateOne({ _id: user._id }, { refreshTokenHash });

            const updatedUser = await User.findById(user._id);
            const isValid = await bcrypt.compare(refreshToken, updatedUser.refreshTokenHash);

            expect(isValid).toBe(true);
        });

        it('should reject invalid refresh token', async () => {
            const user = await createTestUser(User);

            const refreshToken = jwt.sign(
                { userId: user._id, type: 'refresh' },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
            await User.updateOne({ _id: user._id }, { refreshTokenHash });

            const updatedUser = await User.findById(user._id);
            const isValid = await bcrypt.compare('invalid-token', updatedUser.refreshTokenHash);

            expect(isValid).toBe(false);
        });
    });
});
