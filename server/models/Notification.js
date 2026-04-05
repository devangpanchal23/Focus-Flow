import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    recipientType: {
        type: String,
        enum: ['ALL', 'USER'],
        default: 'USER'
    },
    userId: {
        type: String, // Only required if recipientType is 'USER'
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying by user or broadcast
NotificationSchema.index({ recipientType: 1, userId: 1, createdAt: -1 });

export default mongoose.model('Notification', NotificationSchema);
