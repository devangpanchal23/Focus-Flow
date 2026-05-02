import mongoose from 'mongoose';

const DailyStatsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    userEmail: {
        type: String
    },
    userDisplayName: {
        type: String
    },
    date: {
        type: String, // Storing as YYYY-MM-DD string for easy querying/grouping
        required: true,
    },
    tasksCreated: {
        type: Number,
        default: 0
    },
    tasksCompleted: {
        type: Number,
        default: 0
    },
    todayFocusTime: {
        type: Number,
        default: 0 // Renaming mental model: this is totalFocusTime
    },
    totalFocusTime: {
        type: Number,
        default: 0
    },
    distractions: {
        type: Number,
        default: 0
    },
    focusSessionsCount: {
        type: Number,
        default: 0
    },
    breaksTaken: {
        type: Number,
        default: 0
    },
    breaksSuggested: {
        type: Number,
        default: 0
    }
});

DailyStatsSchema.index({ userId: 1, date: 1 }, { unique: true });
DailyStatsSchema.index({ userEmail: 1 });
DailyStatsSchema.index({ userDisplayName: 1 });

export default mongoose.model('DailyStats', DailyStatsSchema);
