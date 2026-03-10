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
import HealthMetric from '../src/models/HealthMetric.js';

describe('Health Metrics', () => {
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
        it('should create a health metric with required fields', async () => {
            const metric = await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'steps',
                value: 8500
            });

            expect(metric).toBeDefined();
            expect(metric.type).toBe('steps');
            expect(metric.value).toBe(8500);
            expect(metric.source).toBe('manual');
        });

        it('should require profile field', async () => {
            await expect(
                HealthMetric.create({
                    user: testUser._id,
                    type: 'steps',
                    value: 5000
                })
            ).rejects.toThrow();
        });

        it('should require user field', async () => {
            await expect(
                HealthMetric.create({
                    profile: testProfile._id,
                    type: 'steps',
                    value: 5000
                })
            ).rejects.toThrow();
        });

        it('should require type field', async () => {
            await expect(
                HealthMetric.create({
                    profile: testProfile._id,
                    user: testUser._id,
                    value: 5000
                })
            ).rejects.toThrow();
        });

        it('should require value field', async () => {
            await expect(
                HealthMetric.create({
                    profile: testProfile._id,
                    user: testUser._id,
                    type: 'steps'
                })
            ).rejects.toThrow();
        });

        it('should reject invalid metric type', async () => {
            await expect(
                HealthMetric.create({
                    profile: testProfile._id,
                    user: testUser._id,
                    type: 'invalid_type',
                    value: 100
                })
            ).rejects.toThrow();
        });

        it('should accept all valid metric types', async () => {
            const validTypes = ['steps', 'sleep', 'weight', 'heart_rate', 'blood_pressure', 'glucose'];

            for (const type of validTypes) {
                const metric = await HealthMetric.create({
                    profile: testProfile._id,
                    user: testUser._id,
                    type,
                    value: 100
                });
                expect(metric.type).toBe(type);
            }
        });

        it('should list metrics for a profile', async () => {
            await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'steps',
                value: 8500
            });

            await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'weight',
                value: 72.5,
                unit: 'kg'
            });

            const metrics = await HealthMetric.find({ profile: testProfile._id });
            expect(metrics.length).toBe(2);
        });

        it('should update a metric', async () => {
            const metric = await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'weight',
                value: 72.5,
                unit: 'kg'
            });

            await HealthMetric.updateOne(
                { _id: metric._id },
                { $set: { value: 71.8 } }
            );

            const updated = await HealthMetric.findById(metric._id);
            expect(updated.value).toBe(71.8);
        });

        it('should delete a metric', async () => {
            const metric = await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'steps',
                value: 10000
            });

            await HealthMetric.deleteOne({ _id: metric._id });

            const found = await HealthMetric.findById(metric._id);
            expect(found).toBeNull();
        });
    });

    describe('Source Tracking', () => {
        it('should default source to manual', async () => {
            const metric = await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'steps',
                value: 5000
            });

            expect(metric.source).toBe('manual');
        });

        it('should accept valid source values', async () => {
            for (const source of ['manual', 'device', 'imported']) {
                const metric = await HealthMetric.create({
                    profile: testProfile._id,
                    user: testUser._id,
                    type: 'steps',
                    value: 5000,
                    source
                });
                expect(metric.source).toBe(source);
            }
        });

        it('should reject invalid source', async () => {
            await expect(
                HealthMetric.create({
                    profile: testProfile._id,
                    user: testUser._id,
                    type: 'steps',
                    value: 5000,
                    source: 'unknown'
                })
            ).rejects.toThrow();
        });
    });

    describe('Metadata', () => {
        it('should store blood pressure metadata', async () => {
            const metric = await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'blood_pressure',
                value: 120,
                unit: 'mmHg',
                metadata: {
                    systolic: 120,
                    diastolic: 80
                }
            });

            expect(metric.metadata.systolic).toBe(120);
            expect(metric.metadata.diastolic).toBe(80);
        });

        it('should store sleep metadata', async () => {
            const metric = await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'sleep',
                value: 7.5,
                unit: 'hours',
                metadata: {
                    bedtime: '22:30',
                    wakeTime: '06:00',
                    quality: 'good'
                }
            });

            expect(metric.metadata.bedtime).toBe('22:30');
            expect(metric.metadata.quality).toBe('good');
        });
    });

    describe('Static Query Methods', () => {
        it('should get metrics in a date range', async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

            await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'steps',
                value: 8000,
                recordedAt: yesterday
            });

            await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'steps',
                value: 10000,
                recordedAt: now
            });

            // Out of range
            await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'steps',
                value: 5000,
                recordedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
            });

            const results = await HealthMetric.getMetricsInRange(
                testProfile._id,
                'steps',
                twoDaysAgo,
                now
            );

            expect(results.length).toBe(2);
        });

        it('should get latest metric of a type', async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'weight',
                value: 72.0,
                recordedAt: yesterday
            });

            await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'weight',
                value: 71.5,
                recordedAt: now
            });

            const latest = await HealthMetric.getLatest(testProfile._id, 'weight');

            expect(latest.value).toBe(71.5);
        });

        it('should return null when no latest metric exists', async () => {
            const latest = await HealthMetric.getLatest(testProfile._id, 'glucose');
            expect(latest).toBeNull();
        });
    });

    describe('Timestamps', () => {
        it('should auto-set createdAt and updatedAt', async () => {
            const metric = await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'steps',
                value: 7000
            });

            expect(metric.createdAt).toBeDefined();
            expect(metric.updatedAt).toBeDefined();
        });

        it('should default recordedAt to now', async () => {
            const before = new Date();

            const metric = await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'steps',
                value: 7000
            });

            expect(metric.recordedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
        });

        it('should accept custom recordedAt', async () => {
            const customDate = new Date('2026-01-15T09:00:00Z');

            const metric = await HealthMetric.create({
                profile: testProfile._id,
                user: testUser._id,
                type: 'weight',
                value: 70,
                recordedAt: customDate
            });

            expect(metric.recordedAt.toISOString()).toBe(customDate.toISOString());
        });
    });
});
