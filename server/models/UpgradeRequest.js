import mongoose from 'mongoose';

const UpgradeRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    requestedRole: {
        type: String,
        enum: ["pro", "full"],
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('UpgradeRequest', UpgradeRequestSchema);
