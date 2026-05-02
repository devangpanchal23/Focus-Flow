import mongoose from 'mongoose';

const LoginLogbookSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Might be null if a failed login attempt for a non-existent user
    },
    provider: {
        type: String,
        required: true,
        enum: ['local', 'clerk', 'google', 'github']
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    status: {
        type: String,
        required: true,
        enum: ['Success', 'Failed_Invalid_Creds', 'Failed_Locked', 'Failed_No_User']
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for quick lookups of a user's recent login history
LoginLogbookSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model('LoginLogbook', LoginLogbookSchema);
