import mongoose from 'mongoose';

const BlockedWebsiteSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    domain: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent duplicate domains for the same user
BlockedWebsiteSchema.index({ userId: 1, domain: 1 }, { unique: true });

export default mongoose.model('BlockedWebsite', BlockedWebsiteSchema);
