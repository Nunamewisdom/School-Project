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

describe('Profiles', () => {
    let testUser;

    beforeAll(async () => {
        await connectTestDb();
    });

    afterAll(async () => {
        await closeTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
        testUser = await createTestUser(User);
    });

    describe('CRUD Operations', () => {
        it('should create a profile', async () => {
            const profile = await Profile.create({
                ownerId: testUser._id,
                name: 'John Doe',
                dob: new Date('1990-05-15'),
                relation: 'self'
            });

            expect(profile).toBeDefined();
            expect(profile.name).toBe('John Doe');
            expect(profile.ownerId.toString()).toBe(testUser._id.toString());
            expect(profile.relation).toBe('self');
        });

        it('should require ownerId', async () => {
            await expect(
                Profile.create({ name: 'No Owner' })
            ).rejects.toThrow();
        });

        it('should require name', async () => {
            await expect(
                Profile.create({ ownerId: testUser._id })
            ).rejects.toThrow();
        });

        it('should list profiles for an owner', async () => {
            await Profile.create({
                ownerId: testUser._id,
                name: 'Self',
                relation: 'self'
            });

            await Profile.create({
                ownerId: testUser._id,
                name: 'Child',
                relation: 'family'
            });

            const profiles = await Profile.find({ ownerId: testUser._id });
            expect(profiles.length).toBe(2);
        });

        it('should update a profile', async () => {
            const profile = await Profile.create({
                ownerId: testUser._id,
                name: 'Old Name',
                relation: 'self'
            });

            await Profile.updateOne(
                { _id: profile._id },
                { $set: { name: 'New Name' } }
            );

            const updated = await Profile.findById(profile._id);
            expect(updated.name).toBe('New Name');
        });

        it('should soft-delete a profile', async () => {
            const profile = await Profile.create({
                ownerId: testUser._id,
                name: 'To Delete',
                relation: 'self'
            });

            await Profile.updateOne(
                { _id: profile._id },
                { $set: { deletedAt: new Date() } }
            );

            // The pre-find hook should exclude soft-deleted profiles
            const profiles = await Profile.find({ ownerId: testUser._id });
            expect(profiles.length).toBe(0);

            // But direct findById still finds it (no pre-find filter on findById)
            const raw = await Profile.collection.findOne({ _id: profile._id });
            expect(raw.deletedAt).toBeDefined();
        });
    });

    describe('Ownership Isolation', () => {
        it('should not return profiles belonging to another user', async () => {
            const otherUser = await createTestUser(User);

            await Profile.create({
                ownerId: testUser._id,
                name: 'My Profile',
                relation: 'self'
            });

            await Profile.create({
                ownerId: otherUser._id,
                name: 'Other Profile',
                relation: 'self'
            });

            const myProfiles = await Profile.find({ ownerId: testUser._id });
            expect(myProfiles.length).toBe(1);
            expect(myProfiles[0].name).toBe('My Profile');
        });
    });

    describe('Conditions', () => {
        it('should store conditions array', async () => {
            const profile = await Profile.create({
                ownerId: testUser._id,
                name: 'Patient',
                conditions: ['diabetes', 'hypertension']
            });

            expect(profile.conditions).toEqual(['diabetes', 'hypertension']);
        });

        it('should default conditions to empty array', async () => {
            const profile = await Profile.create({
                ownerId: testUser._id,
                name: 'Healthy Person'
            });

            expect(profile.conditions).toEqual([]);
        });
    });

    describe('Timestamps', () => {
        it('should set createdAt and updatedAt', async () => {
            const profile = await Profile.create({
                ownerId: testUser._id,
                name: 'Timestamped'
            });

            expect(profile.createdAt).toBeDefined();
            expect(profile.updatedAt).toBeDefined();
        });

        it('should update serverTs on save', async () => {
            const profile = await Profile.create({
                ownerId: testUser._id,
                name: 'Sync Test'
            });

            const originalTs = profile.serverTs;

            // Wait a bit then trigger save
            await new Promise(r => setTimeout(r, 50));
            profile.name = 'Updated';
            await profile.save();

            expect(profile.serverTs.getTime()).toBeGreaterThanOrEqual(originalTs.getTime());
        });
    });

    describe('Relation Enum', () => {
        it('should accept valid relation values', async () => {
            for (const relation of ['self', 'family', 'other']) {
                const profile = await Profile.create({
                    ownerId: testUser._id,
                    name: `Relation: ${relation}`,
                    relation
                });
                expect(profile.relation).toBe(relation);
            }
        });

        it('should reject invalid relation value', async () => {
            await expect(
                Profile.create({
                    ownerId: testUser._id,
                    name: 'Bad Relation',
                    relation: 'stranger'
                })
            ).rejects.toThrow();
        });
    });
});
