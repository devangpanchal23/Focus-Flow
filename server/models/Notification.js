import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    userId: { 
        type: String, // String to support both Local UUID and Clerk sub ID
        required: true 
    },
    type: { 
        type: String, 
        enum: ['PROMO', 'ACHIEVEMENT', 'PURCHASE', 'SYSTEM'], 
        required: true 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['UNREAD', 'READ', 'DISMISSED', 'DELETED'], 
        default: 'UNREAD' 
    },
    action: {
        type: { type: String, enum: ['VIEW_RECEIPT', 'CLAIM_REWARD', 'NAVIGATE', 'NONE'], default: 'NONE' },
        linkId: { type: String }, // e.g., Purchase _id or Reward _id
        url: { type: String }     // Fallback external link
    },
    expiresAt: { type: Date }, // Automatically clean up old promos
    createdAt: { type: Date, default: Date.now }
});

// Compound index for rapid fetching of a user's active notification panel
NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.model('Notification', NotificationSchema);
