import { Router } from 'express';
import { auth } from '../middleware/index.js';
import { sendSuccess, asyncHandler } from '../utils/response.js';
import { ApiError } from '../utils/apiError.js';
import Message from '../models/Message.js';

const router = Router();

/**
 * GET /api/messages/conversations
 * Get user's conversations
 */
router.get('/conversations', auth, asyncHandler(async (req, res) => {
    const { limit = 20 } = req.query;

    const conversations = await Message.getRecentConversations(
        req.userId,
        parseInt(limit)
    );

    sendSuccess(res, conversations);
}));

/**
 * GET /api/messages/unread
 * Get unread message count
 */
router.get('/unread', auth, asyncHandler(async (req, res) => {
    const count = await Message.getUnreadCount(req.userId);
    sendSuccess(res, { unreadCount: count });
}));

/**
 * GET /api/messages/conversation/:conversationId
 * Get messages in a conversation
 */
router.get('/conversation/:conversationId', auth, asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.getConversation(
        conversationId,
        parseInt(page),
        parseInt(limit)
    );

    // Mark as read
    await Message.markAsRead(conversationId, req.userId);

    sendSuccess(res, {
        messages,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit)
        }
    });
}));

/**
 * POST /api/messages
 * Send a new message
 */
router.post('/', auth, asyncHandler(async (req, res) => {
    const { recipientId, profileId, content, type, metadata, replyTo } = req.body;

    if (!recipientId || !content) {
        throw new ApiError(400, 'Recipient and content are required', 'VALIDATION_ERROR');
    }

    // Get or create conversation
    const conversationId = await Message.getOrCreateConversation(
        [req.userId, recipientId],
        profileId
    );

    const message = await Message.create({
        conversationId,
        participants: [
            { user: req.userId, role: 'patient' },
            { user: recipientId, role: 'caregiver' }
        ],
        profile: profileId,
        sender: req.userId,
        content,
        type: type || 'text',
        metadata,
        replyTo,
        readBy: [{ user: req.userId }]
    });

    await message.populate('sender', 'name avatar');

    sendSuccess(res, message, 'Message sent', 201);
}));

/**
 * POST /api/messages/system
 * Create a system message (medication update, symptom alert, etc.)
 */
router.post('/system', auth, asyncHandler(async (req, res) => {
    const { recipientId, profileId, type, metadata } = req.body;

    if (!recipientId || !type) {
        throw new ApiError(400, 'Recipient and type are required', 'VALIDATION_ERROR');
    }

    // Generate content based on type
    let content;
    switch (type) {
        case 'medication_update': {
            const { name, action } = metadata?.medication || {};
            content = `Medication update: ${name} was ${action}`;
            break;
        }
        case 'symptom_alert': {
            const { name: symptomName, severity } = metadata?.symptom || {};
            content = `Symptom alert: ${symptomName} logged with severity ${severity}/5`;
            break;
        }
        case 'summary_shared':
            content = 'A health summary has been shared with you';
            break;
        default:
            content = 'System notification';
    }

    const conversationId = await Message.getOrCreateConversation(
        [req.userId, recipientId],
        profileId
    );

    const message = await Message.create({
        conversationId,
        participants: [
            { user: req.userId },
            { user: recipientId }
        ],
        profile: profileId,
        sender: req.userId,
        content,
        type,
        metadata,
        readBy: [{ user: req.userId }]
    });

    sendSuccess(res, message, 'System message sent', 201);
}));

/**
 * PATCH /api/messages/conversation/:conversationId/read
 * Mark conversation as read
 */
router.patch('/conversation/:conversationId/read', auth, asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    await Message.markAsRead(conversationId, req.userId);

    sendSuccess(res, null, 'Marked as read');
}));

/**
 * DELETE /api/messages/:id
 * Delete a message (soft delete - marks as deleted)
 */
router.delete('/:id', auth, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const message = await Message.findOne({
        _id: id,
        sender: req.userId
    });

    if (!message) {
        throw ApiError.notFound('Message not found');
    }

    // Soft delete by updating content
    message.content = '[Message deleted]';
    message.metadata = {};
    await message.save();

    sendSuccess(res, { id }, 'Message deleted');
}));

export default router;
