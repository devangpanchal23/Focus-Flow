import mongoose from 'mongoose';

/**
 * App session / audit trail per user (works with Clerk string userId + local UUID).
 * Query in Compass: { userId: "user_xxx" } sorted by createdAt desc.
 */
const UserSessionLogSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    provider: { type: String, default: 'unknown' },
    event: {
        type: String,
        required: true,
        enum: ['APP_OPEN', 'APP_SYNC', 'STATE_PATCH', 'LOGOUT_MARKER'],
        default: 'APP_OPEN',
    },
    ipAddress: String,
    userAgent: String,
    payload: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
});

UserSessionLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('UserSessionLog', UserSessionLogSchema);
