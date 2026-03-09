import mongoose from 'mongoose';

/**
 * Appointment Schema
 * 
 * Stores user appointments with healthcare providers.
 */
const appointmentSchema = new mongoose.Schema({
    // Reference to the profile
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: true,
        index: true
    },

    // Reference to the user
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Doctor/provider information
    doctor: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        specialty: {
            type: String,
            trim: true
        },
        phone: String,
        email: String,
        avatar: String
    },

    // Appointment details
    title: {
        type: String,
        trim: true
    },

    // Date and time
    dateTime: {
        type: Date,
        required: true,
        index: true
    },

    // Duration in minutes
    duration: {
        type: Number,
        default: 30
    },

    // Location
    location: {
        name: String,
        address: String,
        city: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },

    // Type of appointment
    type: {
        type: String,
        enum: ['in-person', 'video', 'phone'],
        default: 'in-person'
    },

    // Status
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
        default: 'scheduled',
        index: true
    },

    // Notes
    notes: {
        type: String,
        maxlength: 2000
    },

    // Reminder settings
    reminders: [{
        type: {
            type: String,
            enum: ['push', 'sms', 'email'],
            default: 'push'
        },
        minutesBefore: {
            type: Number,
            default: 60
        },
        sent: {
            type: Boolean,
            default: false
        },
        sentAt: Date
    }],

    // Related summary (if generated after appointment)
    summary: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Summary'
    }
}, {
    timestamps: true
});

// Indexes
appointmentSchema.index({ profile: 1, dateTime: -1 });
appointmentSchema.index({ user: 1, dateTime: -1 });
appointmentSchema.index({ dateTime: 1, status: 1 });

/**
 * Get upcoming appointments
 */
appointmentSchema.statics.getUpcoming = async function (profileId, days = 7) {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.find({
        profile: profileId,
        dateTime: { $gte: now, $lte: endDate },
        status: { $in: ['scheduled', 'confirmed'] }
    }).sort({ dateTime: 1 });
};

/**
 * Get past appointments
 */
appointmentSchema.statics.getPast = async function (profileId, limit = 10) {
    const now = new Date();

    return this.find({
        profile: profileId,
        dateTime: { $lt: now }
    })
        .sort({ dateTime: -1 })
        .limit(limit);
};

/**
 * Mark as completed
 */
appointmentSchema.methods.complete = async function (notes) {
    this.status = 'completed';
    if (notes) this.notes = notes;
    return this.save();
};

/**
 * Cancel appointment
 */
appointmentSchema.methods.cancel = async function (reason) {
    this.status = 'cancelled';
    if (reason) this.notes = `Cancelled: ${reason}`;
    return this.save();
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
