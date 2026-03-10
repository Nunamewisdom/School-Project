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
import Medication from '../src/models/Medication.js';

describe('Medications', () => {
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
        it('should create a medication with required fields', async () => {
            const med = await Medication.create({
                profileId: testProfile._id,
                name: 'Metformin',
                dosage: '500mg',
                times: ['08:00', '20:00'],
                channels: ['push']
            });

            expect(med).toBeDefined();
            expect(med.name).toBe('Metformin');
            expect(med.dosage).toBe('500mg');
            expect(med.times).toEqual(['08:00', '20:00']);
            expect(med.isActive).toBe(true);
        });

        it('should reject medication with invalid time format', async () => {
            await expect(
                Medication.create({
                    profileId: testProfile._id,
                    name: 'Aspirin',
                    times: ['25:00'] // Invalid
                })
            ).rejects.toThrow();
        });

        it('should list medications for a profile', async () => {
            await Medication.create({
                profileId: testProfile._id,
                name: 'Metformin',
                times: ['08:00']
            });

            await Medication.create({
                profileId: testProfile._id,
                name: 'Aspirin',
                times: ['12:00']
            });

            const meds = await Medication.find({ profileId: testProfile._id });
            expect(meds.length).toBe(2);
        });

        it('should update a medication', async () => {
            const med = await Medication.create({
                profileId: testProfile._id,
                name: 'Metformin',
                dosage: '500mg',
                times: ['08:00']
            });

            await Medication.updateOne(
                { _id: med._id },
                { $set: { dosage: '1000mg' } }
            );

            const updated = await Medication.findById(med._id);
            expect(updated.dosage).toBe('1000mg');
        });

        it('should soft-delete a medication', async () => {
            const med = await Medication.create({
                profileId: testProfile._id,
                name: 'Metformin',
                times: ['08:00']
            });

            await Medication.updateOne(
                { _id: med._id },
                { $set: { deletedAt: new Date(), isActive: false } }
            );

            const updated = await Medication.findById(med._id);
            expect(updated.deletedAt).toBeDefined();
            expect(updated.isActive).toBe(false);
        });

        it('should not return soft-deleted medications in active query', async () => {
            await Medication.create({
                profileId: testProfile._id,
                name: 'Active Med',
                times: ['08:00']
            });

            const deleted = await Medication.create({
                profileId: testProfile._id,
                name: 'Deleted Med',
                times: ['09:00']
            });

            await Medication.updateOne(
                { _id: deleted._id },
                { $set: { deletedAt: new Date(), isActive: false } }
            );

            const activeMeds = await Medication.find({
                profileId: testProfile._id,
                deletedAt: { $exists: false }
            });

            expect(activeMeds.length).toBe(1);
            expect(activeMeds[0].name).toBe('Active Med');
        });
    });

    describe('Idempotency', () => {
        it('should store idempotency key', async () => {
            const med = await Medication.create({
                profileId: testProfile._id,
                name: 'Metformin',
                times: ['08:00'],
                idempotencyKey: 'test-key-123'
            });

            expect(med.idempotencyKey).toBe('test-key-123');
        });

        it('should find existing medication by idempotency key', async () => {
            await Medication.create({
                profileId: testProfile._id,
                name: 'Metformin',
                times: ['08:00'],
                idempotencyKey: 'unique-key-abc'
            });

            const existing = await Medication.findOne({ idempotencyKey: 'unique-key-abc' });
            expect(existing).toBeDefined();
            expect(existing.name).toBe('Metformin');
        });
    });

    describe('Schedule Metadata', () => {
        it('should store timezone correctly', async () => {
            const med = await Medication.create({
                profileId: testProfile._id,
                name: 'Insulin',
                times: ['07:00', '19:00'],
                timezone: 'Africa/Lagos'
            });

            expect(med.timezone).toBe('Africa/Lagos');
        });

        it('should default timezone to Africa/Lagos', async () => {
            const med = await Medication.create({
                profileId: testProfile._id,
                name: 'Aspirin',
                times: ['08:00']
            });

            expect(med.timezone).toBe('Africa/Lagos');
        });

        it('should store start and end dates', async () => {
            const start = new Date('2026-01-01');
            const end = new Date('2026-06-30');

            const med = await Medication.create({
                profileId: testProfile._id,
                name: 'Course Med',
                times: ['10:00'],
                startDate: start,
                endDate: end
            });

            expect(med.startDate.toISOString()).toBe(start.toISOString());
            expect(med.endDate.toISOString()).toBe(end.toISOString());
        });

        it('should default channels to push', async () => {
            const med = await Medication.create({
                profileId: testProfile._id,
                name: 'Aspirin',
                times: ['08:00']
            });

            expect(med.channels).toEqual(['push']);
        });
    });
});
