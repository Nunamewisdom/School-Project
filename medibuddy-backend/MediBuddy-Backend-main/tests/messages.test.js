import { jest } from '@jest/globals';
import mongoose from 'mongoose';
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
import Message from '../src/models/Message.js';

describe('Messages', () => {
    let testUser;
    let caregiverUser;
    let testProfile;
    let conversationId;

    beforeAll(async () => {
        await connectTestDb();
    });

    afterAll(async () => {
        await closeTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
        testUser = await createTestUser(User, { name: 'Patient User' });
        caregiverUser = await createTestUser(User, { name: 'Caregiver User' });
        testProfile = await createTestProfile(Profile, testUser._id);
        conversationId = new mongoose.Types.ObjectId();
    });

    describe('CRUD Operations', () => {
        it('should create a text message', async () => {
            const message = await Message.create({
                participants: [
                    { user: testUser._id, role: 'patient' },
                    { user: caregiverUser._id, role: 'caregiver' }
                ],
                profile: testProfile._id,
                sender: testUser._id,
                content: 'Hello, I took my medication today.',
                type: 'text',
                conversationId
            });

            expect(message).toBeDefined();
            expect(message.content).toBe('Hello, I took my medication today.');
            expect(message.type).toBe('text');
            expect(message.status).toBe('sent');
        });

        it('should require sender', async () => {
            await expect(
                Message.create({
                    participants: [{ user: testUser._id }],
                    content: 'No sender message',
                    conversationId
                })
            ).rejects.toThrow();
        });

        it('should require content', async () => {
            await expect(
                Message.create({
                    participants: [{ user: testUser._id }],
                    sender: testUser._id,
                    conversationId
                })
            ).rejects.toThrow();
        });

        it('should list messages in a conversation', async () => {
            await Message.create({
                participants: [
                    { user: testUser._id, role: 'patient' },
                    { user: caregiverUser._id, role: 'caregiver' }
                ],
                sender: testUser._id,
                content: 'Message 1',
                conversationId
            });

            await Message.create({
                participants: [
                    { user: testUser._id, role: 'patient' },
                    { user: caregiverUser._id, role: 'caregiver' }
                ],
                sender: caregiverUser._id,
                content: 'Message 2',
                conversationId
            });

            const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
            expect(messages.length).toBe(2);
            expect(messages[0].content).toBe('Message 1');
            expect(messages[1].content).toBe('Message 2');
        });

        it('should delete a message', async () => {
            const message = await Message.create({
                participants: [{ user: testUser._id }],
                sender: testUser._id,
                content: 'Delete me',
                conversationId
            });

            await Message.deleteOne({ _id: message._id });

            const found = await Message.findById(message._id);
            expect(found).toBeNull();
        });
    });

    describe('Message Types', () => {
        it('should default type to text', async () => {
            const message = await Message.create({
                participants: [{ user: testUser._id }],
                sender: testUser._id,
                content: 'Default type',
                conversationId
            });

            expect(message.type).toBe('text');
        });

        it('should accept all valid message types', async () => {
            const validTypes = ['text', 'medication_update', 'symptom_alert', 'reminder', 'summary_shared', 'system'];

            for (const type of validTypes) {
                const message = await Message.create({
                    participants: [{ user: testUser._id }],
                    sender: testUser._id,
                    content: `Type: ${type}`,
                    type,
                    conversationId: new mongoose.Types.ObjectId()
                });
                expect(message.type).toBe(type);
            }
        });

        it('should reject invalid message type', async () => {
            await expect(
                Message.create({
                    participants: [{ user: testUser._id }],
                    sender: testUser._id,
                    content: 'Bad type',
                    type: 'invalid',
                    conversationId
                })
            ).rejects.toThrow();
        });
    });

    describe('Metadata', () => {
        it('should store medication update metadata', async () => {
            const message = await Message.create({
                participants: [
                    { user: testUser._id },
                    { user: caregiverUser._id }
                ],
                sender: testUser._id,
                content: 'Took Metformin',
                type: 'medication_update',
                metadata: {
                    medication: {
                        name: 'Metformin',
                        action: 'taken',
                        time: new Date()
                    }
                },
                conversationId
            });

            expect(message.metadata.medication.name).toBe('Metformin');
            expect(message.metadata.medication.action).toBe('taken');
        });

        it('should store symptom alert metadata', async () => {
            const message = await Message.create({
                participants: [
                    { user: testUser._id },
                    { user: caregiverUser._id }
                ],
                sender: testUser._id,
                content: 'Severe headache reported',
                type: 'symptom_alert',
                metadata: {
                    symptom: {
                        name: 'Headache',
                        severity: 4
                    }
                },
                conversationId
            });

            expect(message.metadata.symptom.name).toBe('Headache');
            expect(message.metadata.symptom.severity).toBe(4);
        });
    });

    describe('Read Status', () => {
        it('should track read status per user', async () => {
            const message = await Message.create({
                participants: [
                    { user: testUser._id },
                    { user: caregiverUser._id }
                ],
                sender: testUser._id,
                content: 'Read tracking test',
                conversationId
            });

            // Mark as read by caregiver
            await Message.updateOne(
                { _id: message._id },
                {
                    $push: { readBy: { user: caregiverUser._id, readAt: new Date() } }
                }
            );

            const updated = await Message.findById(message._id);
            expect(updated.readBy.length).toBe(1);
            expect(updated.readBy[0].user.toString()).toBe(caregiverUser._id.toString());
        });

        it('should count unread messages for a user', async () => {
            // Create messages where caregiver hasn't read them
            await Message.create({
                participants: [
                    { user: testUser._id },
                    { user: caregiverUser._id }
                ],
                sender: testUser._id,
                content: 'Unread 1',
                conversationId
            });

            await Message.create({
                participants: [
                    { user: testUser._id },
                    { user: caregiverUser._id }
                ],
                sender: testUser._id,
                content: 'Unread 2',
                conversationId
            });

            const unreadCount = await Message.getUnreadCount(caregiverUser._id);
            expect(unreadCount).toBe(2);
        });

        it('should mark messages as read', async () => {
            await Message.create({
                participants: [
                    { user: testUser._id },
                    { user: caregiverUser._id }
                ],
                sender: testUser._id,
                content: 'To be read',
                conversationId
            });

            await Message.markAsRead(conversationId, caregiverUser._id);

            const messages = await Message.find({ conversationId });
            expect(messages[0].readBy.length).toBe(1);
            expect(messages[0].status).toBe('read');
        });
    });

    describe('Delivery Status', () => {
        it('should default status to sent', async () => {
            const message = await Message.create({
                participants: [{ user: testUser._id }],
                sender: testUser._id,
                content: 'Status test',
                conversationId
            });

            expect(message.status).toBe('sent');
        });

        it('should accept valid status values', async () => {
            for (const status of ['sent', 'delivered', 'read']) {
                const message = await Message.create({
                    participants: [{ user: testUser._id }],
                    sender: testUser._id,
                    content: `Status: ${status}`,
                    status,
                    conversationId: new mongoose.Types.ObjectId()
                });
                expect(message.status).toBe(status);
            }
        });
    });

    describe('Conversation Threading', () => {
        it('should group messages by conversationId', async () => {
            const convo1 = new mongoose.Types.ObjectId();
            const convo2 = new mongoose.Types.ObjectId();

            await Message.create({
                participants: [{ user: testUser._id }],
                sender: testUser._id,
                content: 'Convo 1 msg',
                conversationId: convo1
            });

            await Message.create({
                participants: [{ user: testUser._id }],
                sender: testUser._id,
                content: 'Convo 2 msg',
                conversationId: convo2
            });

            const convo1Messages = await Message.find({ conversationId: convo1 });
            expect(convo1Messages.length).toBe(1);
            expect(convo1Messages[0].content).toBe('Convo 1 msg');
        });

        it('should support reply-to references', async () => {
            const original = await Message.create({
                participants: [{ user: testUser._id }, { user: caregiverUser._id }],
                sender: testUser._id,
                content: 'Original message',
                conversationId
            });

            const reply = await Message.create({
                participants: [{ user: testUser._id }, { user: caregiverUser._id }],
                sender: caregiverUser._id,
                content: 'Reply to original',
                replyTo: original._id,
                conversationId
            });

            expect(reply.replyTo.toString()).toBe(original._id.toString());
        });
    });

    describe('Timestamps', () => {
        it('should auto-set createdAt and updatedAt', async () => {
            const message = await Message.create({
                participants: [{ user: testUser._id }],
                sender: testUser._id,
                content: 'Timestamp test',
                conversationId
            });

            expect(message.createdAt).toBeDefined();
            expect(message.updatedAt).toBeDefined();
        });
    });
});
