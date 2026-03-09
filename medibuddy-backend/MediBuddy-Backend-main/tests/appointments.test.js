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
import Appointment from '../src/models/Appointment.js';

describe('Appointments', () => {
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
        it('should create an appointment', async () => {
            const appointmentData = {
                profile: testProfile._id,
                user: testUser._id,
                doctor: {
                    name: 'Dr. Smith',
                    specialty: 'Cardiology'
                },
                dateTime: new Date('2026-03-15T10:00:00Z'),
                duration: 30,
                type: 'in-person',
                status: 'scheduled'
            };

            const appointment = await Appointment.create(appointmentData);

            expect(appointment).toBeDefined();
            expect(appointment.doctor.name).toBe('Dr. Smith');
            expect(appointment.status).toBe('scheduled');
        });

        it('should read appointments for a profile', async () => {
            await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Smith' },
                dateTime: new Date('2026-03-15T10:00:00Z')
            });

            await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Jones' },
                dateTime: new Date('2026-03-16T14:00:00Z')
            });

            const appointments = await Appointment.find({ profile: testProfile._id });

            expect(appointments.length).toBe(2);
        });

        it('should update an appointment', async () => {
            const appointment = await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Smith' },
                dateTime: new Date('2026-03-15T10:00:00Z'),
                status: 'scheduled'
            });

            await Appointment.updateOne(
                { _id: appointment._id },
                { status: 'confirmed' }
            );

            const updated = await Appointment.findById(appointment._id);
            expect(updated.status).toBe('confirmed');
        });

        it('should delete an appointment', async () => {
            const appointment = await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Smith' },
                dateTime: new Date('2026-03-15T10:00:00Z')
            });

            await Appointment.deleteOne({ _id: appointment._id });

            const found = await Appointment.findById(appointment._id);
            expect(found).toBeNull();
        });
    });

    describe('Filtering', () => {
        it('should filter by status', async () => {
            await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Smith' },
                dateTime: new Date('2026-03-15T10:00:00Z'),
                status: 'scheduled'
            });

            await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Jones' },
                dateTime: new Date('2026-03-16T14:00:00Z'),
                status: 'completed'
            });

            const scheduled = await Appointment.find({
                profile: testProfile._id,
                status: 'scheduled'
            });

            expect(scheduled.length).toBe(1);
            expect(scheduled[0].doctor.name).toBe('Dr. Smith');
        });

        it('should get upcoming appointments', async () => {
            const now = new Date();
            const future = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days
            const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

            await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Future' },
                dateTime: future,
                status: 'scheduled'
            });

            await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Past' },
                dateTime: past,
                status: 'completed'
            });

            const upcoming = await Appointment.getUpcoming(testProfile._id);

            expect(upcoming.length).toBe(1);
            expect(upcoming[0].doctor.name).toBe('Dr. Future');
        });
    });

    describe('Authorization', () => {
        it('should only return appointments for owned profiles', async () => {
            const otherUser = await createTestUser(User, { phone: '+15559999999' });
            const otherProfile = await createTestProfile(Profile, otherUser._id, { name: 'Other Patient' });

            await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Smith' },
                dateTime: new Date('2026-03-15T10:00:00Z')
            });

            await Appointment.create({
                profile: otherProfile._id,
                user: otherUser._id,
                doctor: { name: 'Dr. Other' },
                dateTime: new Date('2026-03-16T14:00:00Z')
            });

            // Query as testUser
            const userAppointments = await Appointment.find({ user: testUser._id });

            expect(userAppointments.length).toBe(1);
            expect(userAppointments[0].doctor.name).toBe('Dr. Smith');
        });
    });

    describe('Instance Methods', () => {
        it('should complete an appointment', async () => {
            const appointment = await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Smith' },
                dateTime: new Date('2026-03-15T10:00:00Z'),
                status: 'scheduled'
            });

            await appointment.complete('Follow-up in 3 months');

            expect(appointment.status).toBe('completed');
            expect(appointment.notes).toBe('Follow-up in 3 months');
        });

        it('should cancel an appointment', async () => {
            const appointment = await Appointment.create({
                profile: testProfile._id,
                user: testUser._id,
                doctor: { name: 'Dr. Smith' },
                dateTime: new Date('2026-03-15T10:00:00Z'),
                status: 'scheduled'
            });

            await appointment.cancel('Patient request');

            expect(appointment.status).toBe('cancelled');
            expect(appointment.notes).toContain('Cancelled');
        });
    });
});
