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
import ConsultationSummary from '../src/models/ConsultationSummary.js';

// Utils
import { generateSummaryPdf } from '../src/utils/pdfGenerator.js';

describe('Summaries', () => {
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

    describe('Summary Model', () => {
        it('should create a summary record', async () => {
            const summary = await ConsultationSummary.create({
                profileId: testProfile._id,
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-01-31'),
                status: 'pending'
            });

            expect(summary).toBeDefined();
            expect(summary.status).toBe('pending');
        });

        it('should update summary status', async () => {
            const summary = await ConsultationSummary.create({
                profileId: testProfile._id,
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-01-31'),
                status: 'pending'
            });

            await ConsultationSummary.updateOne(
                { _id: summary._id },
                { status: 'completed' }
            );

            const updated = await ConsultationSummary.findById(summary._id);
            expect(updated.status).toBe('completed');
        });

        it('should list summaries for a profile', async () => {
            await ConsultationSummary.create({
                profileId: testProfile._id,
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-01-31'),
                status: 'completed'
            });

            await ConsultationSummary.create({
                profileId: testProfile._id,
                startDate: new Date('2026-02-01'),
                endDate: new Date('2026-02-28'),
                status: 'completed'
            });

            const summaries = await ConsultationSummary.find({ profileId: testProfile._id });
            expect(summaries.length).toBe(2);
        });
    });

    describe('PDF Generation', () => {
        it('should generate PDF with basic data', async () => {
            const pdfData = {
                profile: testProfile,
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-01-31'),
                medications: [],
                symptoms: [],
                appointments: [],
                healthMetrics: []
            };

            const pdfBuffer = await generateSummaryPdf(pdfData);

            expect(pdfBuffer).toBeDefined();
            expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
            expect(pdfBuffer.length).toBeGreaterThan(0);
            // PDF files start with %PDF
            expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');
        });

        it('should generate PDF with medication data', async () => {
            const pdfData = {
                profile: testProfile,
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-01-31'),
                medications: [
                    { name: 'Lisinopril', dosage: '10mg', totalDoses: 30, takenDoses: 28 },
                    { name: 'Metformin', dosage: '500mg', totalDoses: 60, takenDoses: 55 }
                ],
                symptoms: [],
                appointments: [],
                healthMetrics: []
            };

            const pdfBuffer = await generateSummaryPdf(pdfData);

            expect(pdfBuffer).toBeDefined();
            expect(pdfBuffer.length).toBeGreaterThan(500); // Should have content
        });

        it('should generate PDF with all sections', async () => {
            const pdfData = {
                profile: {
                    ...testProfile.toObject(),
                    conditions: ['Hypertension', 'Type 2 Diabetes'],
                    allergies: ['Penicillin']
                },
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-01-31'),
                medications: [
                    { name: 'Lisinopril', dosage: '10mg', totalDoses: 30, takenDoses: 28 }
                ],
                symptoms: [
                    { name: 'Headache', severity: 5 },
                    { name: 'Fatigue', severity: 3 }
                ],
                appointments: [
                    { doctor: { name: 'Dr. Smith' }, dateTime: new Date('2026-01-15'), status: 'completed' }
                ],
                healthMetrics: [
                    { type: 'weight', value: 75 },
                    { type: 'steps', value: 8000 }
                ]
            };

            const pdfBuffer = await generateSummaryPdf(pdfData);

            expect(pdfBuffer).toBeDefined();
            expect(pdfBuffer.length).toBeGreaterThan(1000); // Comprehensive PDF
        });
    });
});
