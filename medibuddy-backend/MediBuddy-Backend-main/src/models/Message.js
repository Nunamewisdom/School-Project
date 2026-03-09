import mongoose from 'mongoose';

/**
 * Message Schema
 * 
 * Stores messages between users/caregivers for communication.
 */
const messageSchema = new mongoose.Schema({
    // Conversation participants
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['patient', 'caregiver', 'doctor'],
            default: 'patient'
        },
        lastRead: {
            type: Date,
            default: Date.now
        }
    }],

    // The profile this conversation is about (for caregivers)
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        index: true
    },

    // Sender
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Message content
    content: {
        type: String,
        required: true,
        maxlength: 5000
    },

    // Message type
    type: {
        type: String,
        enum: ['text', 'medication_update', 'symptom_alert', 'reminder', 'summary_shared', 'system'],
        default: 'text'
    },

    // For system messages or attachments
    metadata: {
        // Medication update details
        medication: {
            name: String,
            action: String, // 'taken', 'missed', 'snoozed'
            time: Date
        },
        // Symptom alert details
        symptom: {
            name: String,
            severity: Number,
            logId: mongoose.Schema.Types.ObjectId
        },
        // Summary sharing
        summary: {
            id: mongoose.Schema.Types.ObjectId,
            startDate: Date,
            endDate: Date
        },
        // Attachments
        attachments: [{
            type: String,
            enum: ['image', 'document', 'voice'],
            url: String,
            name: String
        }]
    },

    // Read status by each participant
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Delivery status
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },

    // Conversation thread ID (groups related messages)
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },

    // Reply to another message
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }
}, {
    timestamps: true
});

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ 'participants.user': 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

/**
 * Get conversation messages
 */
messageSchema.statics.getConversation = async function (conversationId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    return this.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name avatar')
        .populate('replyTo', 'content sender');
};

/**
 * Get or create conversation between users
 */
messageSchema.statics.getOrCreateConversation = async function (userIds, profileId = null) {
    // Look for existing conversation with exactly these participants
    const existing = await this.findOne({
        'participants.user': { $all: userIds },
        profile: profileId
    }).distinct('conversationId');

    if (existing && existing.length > 0) {
        return existing[0];
    }

    // Create new conversation ID
    return new mongoose.Types.ObjectId();
};

/**
 * Get unread count for a user
 */
messageSchema.statics.getUnreadCount = async function (userId) {
    return this.countDocuments({
        'participants.user': userId,
        'readBy.user': { $ne: userId }
    });
};

/**
 * Mark messages as read
 */
messageSchema.statics.markAsRead = async function (conversationId, userId) {
    return this.updateMany(
        {
            conversationId,
            'readBy.user': { $ne: userId }
        },
        {
            $push: { readBy: { user: userId, readAt: new Date() } },
            $set: { status: 'read' }
        }
    );
};

/**
 * Get recent conversations for a user
 */
messageSchema.statics.getRecentConversations = async function (userId, limit = 20) {
    const conversations = await this.aggregate([
        { $match: { 'participants.user': new mongoose.Types.ObjectId(userId) } },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: '$conversationId',
                lastMessage: { $first: '$$ROOT' },
                unreadCount: {
                    $sum: {
                        $cond: [
                            { $not: { $in: [new mongoose.Types.ObjectId(userId), '$readBy.user'] } },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        { $sort: { 'lastMessage.createdAt': -1 } },
        { $limit: limit }
    ]);

    // Populate the last messages
    await this.populate(conversations, {
        path: 'lastMessage.sender lastMessage.profile',
        select: 'name avatar'
    });

    return conversations;
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
