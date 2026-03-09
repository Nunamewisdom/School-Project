import mongoose from 'mongoose';

/**
 * Health Metric Schema
 * 
 * Stores user health metrics like steps, sleep, and weight.
 */
const healthMetricSchema = new mongoose.Schema({
    // Reference to the profile
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: true,
        index: true
    },

    // Reference to the user who owns this profile
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Type of metric
    type: {
        type: String,
        enum: ['steps', 'sleep', 'weight', 'heart_rate', 'blood_pressure', 'glucose'],
        required: true,
        index: true
    },

    // The metric value
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    // Optional unit (e.g., 'kg', 'lbs', 'mg/dL')
    unit: {
        type: String,
        default: null
    },

    // Date when the metric was recorded
    recordedAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Source of the data (manual entry, device, etc.)
    source: {
        type: String,
        enum: ['manual', 'device', 'imported'],
        default: 'manual'
    },

    // Optional notes
    notes: {
        type: String,
        maxlength: 500
    },

    // Metadata for specific metric types
    metadata: {
        // For blood pressure: systolic, diastolic
        // For sleep: bedtime, wakeTime, quality
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
healthMetricSchema.index({ profile: 1, type: 1, recordedAt: -1 });
healthMetricSchema.index({ user: 1, type: 1, recordedAt: -1 });

/**
 * Get metrics for a date range
 */
healthMetricSchema.statics.getMetricsInRange = async function (profileId, type, startDate, endDate) {
    return this.find({
        profile: profileId,
        type,
        recordedAt: { $gte: startDate, $lte: endDate }
    }).sort({ recordedAt: 1 });
};

/**
 * Get latest metric of a type
 */
healthMetricSchema.statics.getLatest = async function (profileId, type) {
    return this.findOne({
        profile: profileId,
        type
    }).sort({ recordedAt: -1 });
};

/**
 * Get trend data (aggregated by day)
 */
healthMetricSchema.statics.getDailyTrend = async function (profileId, type, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return this.aggregate([
        {
            $match: {
                profile: new mongoose.Types.ObjectId(profileId),
                type,
                recordedAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$recordedAt' }
                },
                avgValue: { $avg: '$value' },
                minValue: { $min: '$value' },
                maxValue: { $max: '$value' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

const HealthMetric = mongoose.model('HealthMetric', healthMetricSchema);

export default HealthMetric;
