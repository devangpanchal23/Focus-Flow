import mongoose from 'mongoose';

const AuthProviderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    provider: {
        type: String,
        required: true,
        enum: ['local', 'clerk', 'google', 'github'] // Extensible for future providers
    },
    providerId: {
        type: String,
        required: true,
        // For local auth, this can be the email. For OAuth, it's the external ID.
    },
    credentials: {
        type: String,
        // Stores hashed password for local auth, or refresh tokens for OAuth if needed.
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user doesn't have duplicate providers of the same type unless intended (like multiple emails, but usually 1 providerId per provider is unique)
AuthProviderSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export default mongoose.model('AuthProvider', AuthProviderSchema);
