import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },

    displayName: {
        type: String
    },
    photoURL: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    notionConfig: {
        databaseId: String,
        isConnected: {
            type: Boolean,
            default: false
        },
        connectedAt: Date,
        resourceType: { type: String, enum: ['database', 'page'], default: 'database' }
    },
    role: {
        type: String,
        enum: ['admin', 'moderator', 'user', 'normal', 'pro', 'full'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    hasPro: {
        type: Boolean,
        default: false
    },
    hasFullAccess: {
        type: Boolean,
        default: false
    },
    razorpay_payment_id: String,
    razorpay_order_id: String,
    razorpay_signature: String,
    premiumActivatedAt: Date,
    planType: {
        type: String,
        enum: ['free', 'pro', 'full'],
        default: 'free'
    },
    paymentStatus: {
        type: String,
        default: 'pending'
    },
    planExpiry: Date,
    lastTransactionId: {
        type: String,
    },
    /** Client settings (persisted so Compass shows per-user prefs) */
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light',
        },
        soundEnabled: { type: Boolean, default: true },
        volume: { type: Number, default: 0.5, min: 0, max: 1 },
    },
    /** Component UI snapshots: sidebar order, last tab, focus/youtube auxiliary state */
    uiState: {
        sidebarOrder: { type: [String], default: [] },
        lastActiveTab: { type: String, default: 'dashboard' },
        focusSession: { type: mongoose.Schema.Types.Mixed },
        youtubeMusic: { type: mongoose.Schema.Types.Mixed },
    },
    lastSyncAt: Date,
});

export default mongoose.model('User', UserSchema);
