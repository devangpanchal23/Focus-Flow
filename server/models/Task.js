import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    completedAt: {
        type: Date,
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low', 'p4'],
        default: 'p4',
    },
    project: {
        type: String,
        default: 'Inbox',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    timeSpent: {
        type: Number,
        default: 0, // Time spent in seconds
    },
    estimatedTime: {
        type: Number,
        default: 0, // Estimated time in seconds
    },
    description: {
        type: String,
        default: '',
    },
    scheduledDate: {
        type: Date,
    },
    scheduledTime: {
        type: String,
    },
});

export default mongoose.model('Task', TaskSchema);
