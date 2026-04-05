import mongoose from 'mongoose';

const HabitSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // Array of date strings like "2024-12-28"
    completions: {
        type: [String],
        default: []
    }
});

export default mongoose.model('Habit', HabitSchema);
