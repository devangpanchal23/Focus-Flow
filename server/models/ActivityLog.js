import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
    userId: {
        type: String, // ID of the user who the action was performed on/by
    },
    action: {
        type: String,
        required: true,
        enum: ['LOGIN', 'LOGOUT', 'DELETE_USER', 'BLOCK_USER', 'UNBLOCK_USER', 'SEND_NOTIFICATION', 'UPDATE_ROLE']
    },
    performedBy: {
        type: String, // userId of the admin/moderator who performed the action, or the user themselves
        required: true
    },
    ipAddress: {
        type: String
    },
    details: {
        type: mongoose.Schema.Types.Mixed // Optional extra info
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('ActivityLog', ActivityLogSchema);
