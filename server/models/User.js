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
    password: {
        type: String,
        required: true
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
    premiumActivatedAt: Date
});

export default mongoose.model('User', UserSchema);
