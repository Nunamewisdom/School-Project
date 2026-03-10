import { jest } from '@jest/globals';
import {
    connectTestDb,
    closeTestDb,
    clearTestDb,
    createTestUser,
    createTestProfile
} from './setup.js';

// Models
import User from '../src/models/User.js';
import Profile from '../src/models/Profile.js';
import SymptomLog from '../src/models/SymptomLog.js';

describe('Symptom Logs', () => {
    let testUser;
    let testProfile;

    beforeAll(async () => {
        await connectTestDb();
    });

    afterAll(async () => {
        await closeTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
        testUser = await createTestUser(User);
        testProfile = await createTestProfile(Profile, testUser._id);
    });

    describe('CRUD Operations', () => {
        it('should create a symptom log with required fields', async () => {
            const log = await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Headache',
                severity: 3,
                clientTs: new Date()
            });

            expect(log).toBeDefined();
            expect(log.symptom).toBe('Headache');
            expect(log.severity).toBe(3);
        });

        it('should require profileId', async () => {
            await expect(
                SymptomLog.create({
                    symptom: 'Headache',
                    severity: 3,
                    clientTs: new Date()
                })
            ).rejects.toThrow();
        });

        it('should require symptom name', async () => {
            await expect(
                SymptomLog.create({
                    profileId: testProfile._id,
                    severity: 3,
                    clientTs: new Date()
                })
            ).rejects.toThrow();
        });

        it('should require severity', async () => {
            await expect(
                SymptomLog.create({
                    profileId: testProfile._id,
                    symptom: 'Headache',
                    clientTs: new Date()
                })
            ).rejects.toThrow();
        });

        it('should require clientTs', async () => {
            await expect(
                SymptomLog.create({
                    profileId: testProfile._id,
                    symptom: 'Headache',
                    severity: 3
                })
            ).rejects.toThrow();
        });

        it('should list symptom logs for a profile', async () => {
            await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Headache',
                severity: 3,
                clientTs: new Date()
            });

            await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Nausea',
                severity: 2,
                clientTs: new Date()
            });

            const logs = await SymptomLog.find({ profileId: testProfile._id });
            expect(logs.length).toBe(2);
        });

        it('should delete a symptom log', async () => {
            const log = await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Headache',
                severity: 3,
                clientTs: new Date()
            });

            await SymptomLog.deleteOne({ _id: log._id });

            const found = await SymptomLog.findById(log._id);
            expect(found).toBeNull();
        });
    });

    describe('Severity Validation', () => {
        it('should accept severity values 1 through 5', async () => {
            for (let severity = 1; severity <= 5; severity++) {
                const log = await SymptomLog.create({
                    profileId: testProfile._id,
                    symptom: `Severity ${severity}`,
                    severity,
                    clientTs: new Date()
                });
                expect(log.severity).toBe(severity);
            }
        });

        it('should reject severity below 1', async () => {
            await expect(
                SymptomLog.create({
                    profileId: testProfile._id,
                    symptom: 'Low severity',
                    severity: 0,
                    clientTs: new Date()
                })
            ).rejects.toThrow();
        });

        it('should reject severity above 5', async () => {
            await expect(
                SymptomLog.create({
                    profileId: testProfile._id,
                    symptom: 'High severity',
                    severity: 6,
                    clientTs: new Date()
                })
            ).rejects.toThrow();
        });
    });

    describe('Optional Fields', () => {
        it('should store duration', async () => {
            const log = await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Headache',
                severity: 2,
                duration: '3 hours',
                clientTs: new Date()
            });

            expect(log.duration).toBe('3 hours');
        });

        it('should store notes', async () => {
            const log = await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Dizziness',
                severity: 4,
                notes: 'Happened after standing up quickly',
                clientTs: new Date()
            });

            expect(log.notes).toBe('Happened after standing up quickly');
        });

        it('should store voice note URL', async () => {
            const log = await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Chest pain',
                severity: 5,
                voiceNoteUrl: 'https://storage.example.com/voice/abc.mp3',
                clientTs: new Date()
            });

            expect(log.voiceNoteUrl).toBe('https://storage.example.com/voice/abc.mp3');
        });
    });

    describe('Idempotency', () => {
        it('should store idempotency key', async () => {
            const log = await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Headache',
                severity: 3,
                clientTs: new Date(),
                idempotencyKey: 'symptom-key-123'
            });

            expect(log.idempotencyKey).toBe('symptom-key-123');
        });

        it('should find existing log by idempotency key', async () => {
            await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Nausea',
                severity: 2,
                clientTs: new Date(),
                idempotencyKey: 'unique-symptom-key'
            });

            const existing = await SymptomLog.findOne({ idempotencyKey: 'unique-symptom-key' });
            expect(existing).toBeDefined();
            expect(existing.symptom).toBe('Nausea');
        });
    });

    describe('Sync Metadata', () => {
        it('should store clientId', async () => {
            const log = await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Headache',
                severity: 3,
                clientTs: new Date(),
                clientId: 'device-abc-123'
            });

            expect(log.clientId).toBe('device-abc-123');
        });

        it('should auto-set serverTs', async () => {
            const before = new Date();

            const log = await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Headache',
                severity: 3,
                clientTs: new Date()
            });

            expect(log.serverTs).toBeDefined();
            expect(log.serverTs.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
        });

        it('should store clientTs separately from createdAt', async () => {
            const clientDate = new Date('2026-01-20T08:00:00Z');

            const log = await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Fatigue',
                severity: 2,
                clientTs: clientDate
            });

            expect(log.clientTs.toISOString()).toBe(clientDate.toISOString());
            // createdAt should be the server time, not the client time
            expect(log.createdAt.toISOString()).not.toBe(clientDate.toISOString());
        });
    });

    describe('Date Range Queries', () => {
        it('should query symptoms by date range', async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Recent headache',
                severity: 2,
                clientTs: now,
                createdAt: now
            });

            await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Old headache',
                severity: 3,
                clientTs: lastWeek,
                createdAt: lastWeek
            });

            const recentLogs = await SymptomLog.find({
                profileId: testProfile._id,
                createdAt: { $gte: yesterday }
            });

            expect(recentLogs.length).toBe(1);
            expect(recentLogs[0].symptom).toBe('Recent headache');
        });

        it('should sort symptoms by createdAt descending', async () => {
            const now = new Date();
            const earlier = new Date(now.getTime() - 60 * 60 * 1000);

            await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'First',
                severity: 2,
                clientTs: earlier,
                createdAt: earlier
            });

            await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'Second',
                severity: 3,
                clientTs: now,
                createdAt: now
            });

            const logs = await SymptomLog.find({ profileId: testProfile._id })
                .sort({ createdAt: -1 });

            expect(logs[0].symptom).toBe('Second');
            expect(logs[1].symptom).toBe('First');
        });
    });

    describe('Profile Isolation', () => {
        it('should not return symptoms from another profile', async () => {
            const otherProfile = await createTestProfile(Profile, testUser._id, { name: 'Other Patient' });

            await SymptomLog.create({
                profileId: testProfile._id,
                symptom: 'My symptom',
                severity: 3,
                clientTs: new Date()
            });

            await SymptomLog.create({
                profileId: otherProfile._id,
                symptom: 'Other symptom',
                severity: 2,
                clientTs: new Date()
            });

            const myLogs = await SymptomLog.find({ profileId: testProfile._id });
            expect(myLogs.length).toBe(1);
            expect(myLogs[0].symptom).toBe('My symptom');
        });
    });
});
