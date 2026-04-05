import mongoose from 'mongoose';

const UserFocusScoreSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    taskCompletionScore: { type: Number, default: 0 },
    focusSessionScore: { type: Number, default: 0 },
    habitConsistencyScore: { type: Number, default: 0 },
    distractionControlScore: { type: Number, default: 0 },
    breakDisciplineScore: { type: Number, default: 0 },

    finalFocusScore: {
        type: Number,
        required: true,
        default: 0
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// One score per user per day
UserFocusScoreSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('UserFocusScore', UserFocusScoreSchema);
